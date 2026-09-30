# Official MinIO Client (mc) — Docker Hub minio/mc was removed (2026).
# Quay.io/minio/mc is not anonymously pullable from this environment (401).
# Build from the last published official GitHub release binary instead.
FROM alpine:3.20

ARG MC_RELEASE=RELEASE.2025-08-13T08-35-41Z
RUN apk add --no-cache ca-certificates curl \
    && curl -fsSL \
      "https://github.com/minio/mc/releases/download/${MC_RELEASE}/mc.linux-amd64.${MC_RELEASE}" \
      -o /usr/bin/mc \
    && chmod +x /usr/bin/mc \
    && mc --version

ENTRYPOINT ["mc"]
