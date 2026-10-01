import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MerchantShell } from "@/components/merchant/merchant-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <MerchantShell>{children}</MerchantShell>
    </AuthGuard>
  );
}
