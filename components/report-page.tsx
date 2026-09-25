"use client";

import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportData } from "@/types";

export function ReportPage({
  title,
  description,
  report,
  columns,
}: {
  title: string;
  description: string;
  report: ReportData;
  columns: DataTableColumn<Record<string, string | number>>[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {report.cards.map((card) => (
          <Card key={card.label} className="border-none bg-white/90">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-2 text-sm font-semibold text-brand-700">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-none bg-white/90">
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-80 pt-0">
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
