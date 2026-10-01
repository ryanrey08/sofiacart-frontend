import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-transparent">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-6">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
            <TopNav />
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Dashboard overview, customers and reports may use sample data. Product, category, inventory, order and finance pages require the merchant API and show errors when it is unavailable.
            </p>
            <main>{children}</main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
