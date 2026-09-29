import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminAuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-none bg-white/90">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
