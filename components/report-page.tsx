"use client";

import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageIntro, SampleDataBadge } from "@/components/merchant/page-intro";
import type { ReportData } from "@/types";

export function ReportPage<T extends object>({
  title,
  description,
  report,
  columns,
  isSample = false,
}: {
  title: string;
  description: string;
  report: ReportData<T>;
  columns: DataTableColumn<T>[];
  isSample?: boolean;
}) {
  return (
    <div className="space-y-5">
      <PageIntro eyebrow="Reports" title={title} description={description} badge={isSample ? <SampleDataBadge /> : null} />
      {isSample ? (
        <p className="rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The reports API did not return data, so this report shows sample preview figures. They are not live store results.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.cards.map((card, index) => (
          <Card key={card.label} className="relative overflow-hidden">
            <span aria-hidden="true" className={index % 2 === 0 ? "absolute inset-x-0 top-0 h-1 bg-brand-600" : "absolute inset-x-0 top-0 h-1 bg-sunset-500"} />
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-navy-900">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-brand-700">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-72 pt-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece7ff" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" radius={[14, 14, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <DataTable data={report.table} columns={columns} pageSize={5} />
    </div>
  );
}
