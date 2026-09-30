import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#ff8b59_5%,#7c22cf_50%,#f43f5e_100%)]">{children}</div>;
}