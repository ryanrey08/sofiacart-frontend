import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SofiaCart Super Admin",
  description: "Platform administration console for SofiaCart.",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-brand-soft">{children}</div>;
}
