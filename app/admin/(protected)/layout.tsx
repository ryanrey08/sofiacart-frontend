import type { ReactNode } from "react";
import { AdminSessionProvider } from "@/components/admin/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
