import { BarChart3, Landmark, Scale, Store, Users, type LucideIcon } from 'lucide-react';

import type { WorkspaceId } from '@/lib/i18n/landing';
import type { Accent, Role } from '@/types';

export interface WorkspaceRoute {
  id: WorkspaceId;
  href: string;
  icon: LucideIcon;
  accent: Accent;
  /** Short desk label shown in the topbar and command palette. */
  status: string;
  /** Roles allowed on the server (`require_workspace`). */
  roles: readonly Role[];
}

/** Single source of truth for workspace navigation, order and access. */
export const WORKSPACE_ROUTES: readonly WorkspaceRoute[] = [
  {
    id: 'citizen',
    href: '/citizen',
    icon: Users,
    accent: 'mint',
    status: 'Citizen desk',
    roles: ['CITIZEN', 'STUDENT', 'CSC_OPERATOR', 'ADMIN'],
  },
  {
    id: 'csc',
    href: '/csc',
    icon: Store,
    accent: 'peach',
    status: 'CSC desk',
    roles: ['CSC_OPERATOR', 'ADMIN'],
  },
  {
    id: 'nyaymitra',
    href: '/nyay-mitra',
    icon: Scale,
    accent: 'violet',
    status: 'Policy intelligence',
    roles: ['POLICY_ANALYST', 'WELFARE_OFFICER', 'ADMIN'],
  },
  {
    id: 'officer',
    href: '/welfare',
    icon: Landmark,
    accent: 'primary',
    status: 'Welfare desk',
    roles: ['WELFARE_OFFICER', 'ADMIN'],
  },
  {
    id: 'analytics',
    href: '/analytics',
    icon: BarChart3,
    accent: 'sky',
    status: 'District analytics',
    roles: ['WELFARE_OFFICER', 'POLICY_ANALYST', 'ADMIN'],
  },
];

export const ROLE_LABELS: Record<Role, { en: string; hi: string }> = {
  CITIZEN: { en: 'Citizen', hi: 'नागरिक' },
  STUDENT: { en: 'Student', hi: 'विद्यार्थी' },
  CSC_OPERATOR: { en: 'CSC operator', hi: 'CSC संचालक' },
  WELFARE_OFFICER: { en: 'Welfare officer', hi: 'कल्याण अधिकारी' },
  POLICY_ANALYST: { en: 'Policy analyst', hi: 'नीति विश्लेषक' },
  ADMIN: { en: 'Administrator', hi: 'प्रशासक' },
};

export const ROLE_ORDER: readonly Role[] = [
  'CITIZEN',
  'STUDENT',
  'CSC_OPERATOR',
  'WELFARE_OFFICER',
  'POLICY_ANALYST',
  'ADMIN',
];

export function workspaceById(id: WorkspaceId): WorkspaceRoute {
  const found = WORKSPACE_ROUTES.find((workspace) => workspace.id === id);
  if (!found) throw new Error(`Unknown workspace: ${id}`);
  return found;
}

export function canAccess(workspace: WorkspaceRoute, role: Role): boolean {
  return workspace.roles.includes(role);
}
