# NitiDrishti local PostgreSQL 18 backup drill (native, not Docker).
# Never prints passwords. Fail-closed if pg_dump is missing.
# Usage (repo root):
#   powershell -File scripts\backup-drill.ps1
#   powershell -File scripts\backup-drill.ps1 -DryRun
#   powershell -File scripts\backup-drill.ps1 -RestoreDb nitidrishti_scratch_drill
# Restore always uses a scratch database. The source database is never overwritten.
# The scratch database is dropped after success and after a failed verify.

param(
    [switch]$DryRun,
    [string]$RestoreDb = ""
)

$ErrorActionPreference = "Stop"
if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Import-DotEnv([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
        $pair = $line.Split("=", 2)
        $name = $pair[0].Trim()
        $value = $pair[1].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } else {
            $comment = $value.IndexOf(" #")
            if ($comment -ge 0) { $value = $value.Substring(0, $comment).Trim() }
        }
        if ($name -and -not (Test-Path "Env:$name")) {
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

Import-DotEnv (Join-Path $Root ".env")
Import-DotEnv (Join-Path $Root "backend\.env")

$User = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "nitidrishti" }
$Db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "nitidrishti_dev" }
$HostName = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$Port = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }
if ($env:POSTGRES_PASSWORD) { $env:PGPASSWORD = $env:POSTGRES_PASSWORD }

function Find-PgTool([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $roots = @(
        "HKLM:\SOFTWARE\PostgreSQL\Installations",
        "HKLM:\SOFTWARE\WOW6432Node\PostgreSQL\Installations"
    )
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($install in (Get-ChildItem $root -ErrorAction SilentlyContinue)) {
            $base = (Get-ItemProperty $install.PSPath -ErrorAction SilentlyContinue)."Base Directory"
            if (-not $base) { continue }
            $candidate = Join-Path $base "bin\$Name.exe"
            if (Test-Path $candidate) { return $candidate }
        }
    }
    foreach ($ver in @("18", "17", "16")) {
        $candidate = Join-Path ${env:ProgramFiles} "PostgreSQL\$ver\bin\$Name.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    throw "$Name is not on PATH and was not found in the PostgreSQL registry. Docker is not used."
}

$PgDump = Find-PgTool "pg_dump"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutDir = Join-Path $Root "storage\backups"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$DumpFile = Join-Path $OutDir "$Db-$Stamp.dump"

Write-Host "pg_dump=$PgDump"
Write-Host "database=$Db host=$HostName port=$Port user=$User"
Write-Host "outfile=$DumpFile"
Write-Host "password=*** (from POSTGRES_PASSWORD / PGPASSWORD; not printed)"

if ($DryRun) {
    Write-Host "dry-run: dump and restore were not executed"
    exit 0
}

& $PgDump -h $HostName -p $Port -U $User -d $Db -Fc -f $DumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
Write-Host "dump_ok=$DumpFile"

if (-not $RestoreDb) {
    Write-Host "restore skipped (pass -RestoreDb nitidrishti_verify to restore into a check database)"
    exit 0
}

if ($RestoreDb -notmatch '^[A-Za-z][A-Za-z0-9_]*$') {
    throw "RestoreDb must be a plain database name"
}
if ($RestoreDb -eq $Db -or $RestoreDb -eq "postgres") {
    throw "Refusing to restore into the source database ($Db)"
}

$PgRestore = Find-PgTool "pg_restore"
$Psql = Find-PgTool "psql"
$created = $false
try {
    $exists = & $Psql -h $HostName -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$RestoreDb'"
    if (-not $exists) {
        Write-Host "creating scratch database $RestoreDb"
        & $Psql -h $HostName -p $Port -U $User -d postgres -c "CREATE DATABASE `"$RestoreDb`""
        if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed" }
        $created = $true
    }

    & $PgRestore -h $HostName -p $Port -U $User -d $RestoreDb --clean --if-exists $DumpFile
    if ($LASTEXITCODE -gt 1) { throw "pg_restore failed" }
    if ($LASTEXITCODE -eq 1) { Write-Host "pg_restore_warnings=1 (clean on a new database is expected)" }

    $env:POSTGRES_DB = $RestoreDb
    if ($env:DATABASE_URL) { Remove-Item Env:DATABASE_URL }
    Set-Location (Join-Path $Root "backend")
    if (Test-Path ".\.venv\Scripts\Activate.ps1") {
        . .\.venv\Scripts\Activate.ps1
    }
    python -m scripts.backup_verify
    if ($LASTEXITCODE -ne 0) { throw "restore verify failed" }
    Write-Host "restore_verify_ok database=$RestoreDb"
} finally {
    if ($created) {
        Set-Location $Root
        & $Psql -h $HostName -p $Port -U $User -d postgres -c "DROP DATABASE IF EXISTS `"$RestoreDb`" WITH (FORCE)"
        if ($LASTEXITCODE -eq 0) { Write-Host "scratch_dropped=$RestoreDb" }
        else { Write-Host "scratch_drop_failed=$RestoreDb" }
    }
}
