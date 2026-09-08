import { AppShell } from '@/components/app/AppShell';
import { RoleProvider } from '@/components/app/RoleProvider';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AppShell>{children}</AppShell>
    </RoleProvider>
  );
}
