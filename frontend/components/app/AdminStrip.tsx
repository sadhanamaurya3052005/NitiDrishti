'use client';

import { useCallback, useEffect, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import {
  ApiError,
  assignAdminRoles,
  getAdminFlags,
  listAdminAudit,
  listAdminUsers,
  setAdminUserActive,
  type AdminAuditEntry,
  type AdminDirectoryUser,
  type AdminFlags,
} from '@/lib/api';
import { ROLE_LABELS, ROLE_ORDER } from '@/lib/workspaces';
import type { Role } from '@/types';

export function AdminStrip() {
  const { locale, desk } = useLocale();
  const { session } = useExperience();
  const copy = desk.welfare.admin;
  const authed = Boolean(session?.accessToken);
  const allowed = Boolean(session?.roles?.includes('ADMIN'));
  const [users, setUsers] = useState<AdminDirectoryUser[]>([]);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [flags, setFlags] = useState<AdminFlags | null>(null);
  const [gate, setGate] = useState<'guest' | 'ok' | 'forbidden' | 'error'>('guest');
  const [lookup, setLookup] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Role[]>>({});

  const load = useCallback(
    (email?: string) => {
      if (!authed) {
        setUsers([]);
        setAudit([]);
        setFlags(null);
        setGate('guest');
        return;
      }
      if (!allowed) {
        setUsers([]);
        setAudit([]);
        setFlags(null);
        setGate('forbidden');
        return;
      }
      void Promise.all([listAdminUsers(email), listAdminAudit(), getAdminFlags()])
        .then(([directory, trail, envFlags]) => {
          setUsers(directory.items);
          setAudit(trail.items);
          setFlags(envFlags);
          setDraft(Object.fromEntries(directory.items.map((row) => [row.id, [...row.roles]])));
          setGate('ok');
        })
        .catch((error: unknown) => {
          setUsers([]);
          setAudit([]);
          setFlags(null);
          if (error instanceof ApiError && error.status === 401) {
            setGate('guest');
            return;
          }
          if (error instanceof ApiError && error.status === 403) {
            setGate('forbidden');
            return;
          }
          setGate('error');
        });
    },
    [allowed, authed],
  );

  useEffect(() => {
    load();
  }, [load]);

  const saveRoles = (userId: string) => {
    const roles = draft[userId];
    if (!roles?.length) return;
    setBusyId(userId);
    setNotice(null);
    void assignAdminRoles(userId, roles)
      .then((row) => {
        setUsers((current) => current.map((item) => (item.id === row.id ? row : item)));
        setDraft((current) => ({ ...current, [row.id]: [...row.roles] }));
        setNotice(copy.saved);
        load();
      })
      .catch((error: unknown) => {
        setNotice(error instanceof ApiError ? error.message : copy.failed);
      })
      .finally(() => setBusyId(null));
  };

  const toggleActive = (row: AdminDirectoryUser) => {
    setBusyId(row.id);
    setNotice(null);
    void setAdminUserActive(row.id, !row.is_active)
      .then((updated) => {
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setNotice(copy.saved);
      })
      .catch((error: unknown) => {
        setNotice(error instanceof ApiError ? error.message : copy.failed);
      })
      .finally(() => setBusyId(null));
  };

  const toggleRole = (userId: string, role: Role) => {
    setDraft((current) => {
      const owned = new Set(current[userId] ?? []);
      if (owned.has(role)) owned.delete(role);
      else owned.add(role);
      const next = ROLE_ORDER.filter((code) => owned.has(code));
      return { ...current, [userId]: next.length ? next : ['CITIZEN'] };
    });
  };

  return (
    <section className="mb-4 nd-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{copy.notSelf}</p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>

      {gate === 'guest' ? (
        <p className="mt-2 text-sm text-ink-soft">{copy.signIn}</p>
      ) : null}
      {gate === 'forbidden' ? <p className="mt-2 text-sm text-ink-soft">{copy.forbidden}</p> : null}
      {gate === 'error' ? <p className="mt-2 text-sm text-ink-muted">{copy.failed}</p> : null}

      {gate === 'ok' ? (
        <>
          {flags ? (
            <p className="mt-3 text-[11px] text-ink-muted">
              {copy.flags} · {flags.environment} · {copy.envOnly}
              {': '}
              {Object.entries(flags.flags)
                .map(([key, value]) => `${key}=${value ? 'on' : 'off'}`)
                .join(' · ')}
            </p>
          ) : null}

          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              load(lookup.trim() || undefined);
            }}
          >
            <input
              type="email"
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              placeholder={copy.lookup}
              className="min-w-[220px] flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-pill border border-line px-3 py-1 text-xs font-semibold">
              {copy.find}
            </button>
          </form>

          {users.length === 0 ? <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p> : null}
          {users.length > 0 ? (
            <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto">
              {users.map((row) => (
                <li key={row.id} className="rounded-xl border border-line px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="block text-sm font-semibold">{row.display_name ?? row.email_masked}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-muted">
                        {row.email_masked}
                        {' · '}
                        {row.is_active ? copy.active : copy.inactive}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => toggleActive(row)}
                      className="rounded-pill border border-line px-3 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      {row.is_active ? copy.deactivate : copy.activate}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_ORDER.map((role) => {
                      const checked = (draft[row.id] ?? row.roles).includes(role);
                      return (
                        <label key={role} className="flex items-center gap-1 text-[11px] text-ink-muted">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRole(row.id, role)}
                          />
                          {ROLE_LABELS[role][locale === 'hi' ? 'hi' : 'en']}
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => saveRoles(row.id)}
                    className="mt-2 rounded-pill border border-line px-3 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    {busyId === row.id ? copy.busy : copy.save}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{copy.audit}</h3>
          {audit.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{copy.auditEmpty}</p> : null}
          {audit.length > 0 ? (
            <ul className="mt-2 max-h-[160px] space-y-1 overflow-y-auto text-[11px] text-ink-muted">
              {audit.map((item) => (
                <li key={item.id}>
                  {item.action}
                  {item.detail ? ` · ${item.detail}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
          {notice ? <p className="mt-2 text-xs text-ink-soft">{notice}</p> : null}
        </>
      ) : null}
    </section>
  );
}

export default AdminStrip;
