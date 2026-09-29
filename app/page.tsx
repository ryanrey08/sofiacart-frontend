import Link from "next/link";
import { ArrowRight, ChartColumn, ShieldCheck, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
  {
    title: "Merchant dashboard",
    description: "Track orders, products, customers, payments, and reports from one clean workspace.",
    icon: ChartColumn,
  },
  {
    title: "Guided onboarding",
    description: "Register your business and storefront with a step-by-step merchant application flow.",
    icon: Store,
  },
  {
    title: "Protected management",
    description: "Keep dashboard tools accessible only to authenticated merchant users.",
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-brand-soft px-4 py-8 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center gap-10">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-brand-700 shadow-soft">
              <Users className="h-4 w-4" />
              Multi-merchant e-commerce platform
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Launch, manage, and grow your store with SofiaCart.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              SofiaCart gives merchants a polished storefront, step-by-step onboarding, and a secure dashboard for orders, finance, inventory, and reports.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">
                  Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register/merchant">Register Merchant</Link>
              </Button>
            </div>
          </div>

          <Card className="border-none bg-brand-gradient text-white">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold">SC</div>
                <div>
                  <p className="text-lg font-semibold">SofiaCart</p>
                  <p className="text-sm text-white/80">Merchant command center</p>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                {highlights.map((highlight) => {
                  const Icon = highlight.icon;
                  return (
                    <div key={highlight.title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white/15 p-3">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{highlight.title}</p>
                          <p className="mt-1 text-sm text-white/80">{highlight.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
