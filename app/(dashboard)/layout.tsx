import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
          <TopNav />
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
