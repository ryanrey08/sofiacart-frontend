"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Eye, FileText, RotateCcw } from "lucide-react";
import { RequirePermission } from "@/components/admin/require-permission";
import {
  AdminTable,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconAction,
  JsonBlock,
  LoadingState,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  SelectInput,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSystemLogs } from "@/lib/api/admin";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminAuditLog } from "@/types/admin";

// Modules are the second segment of the audit action name (admin.<module>.<action>), which the
// backend filters with `module`. Older entries recorded before routes were named use "METHOD path".
const MODULES = [
  "auth",
  "merchants",
  "orders",
  "returns",
  "products",
  "inventory",
  "payments",
  "transactions",
  "refunds",
  "customers",
  "settings",
  "users",
  "roles",
  "permissions",
];

const EMPTY_FILTERS = { search: "", module: "", actor_id: "", subject_id: "", date_from: "", date_to: "" };

const moduleOf = (action: string) => (action.startsWith("admin.") ? action.split(".")[1] : null);
const entityOf = (log: AdminAuditLog) => (log.subject_type ? `${log.subject_type.split("\\").pop()} #${log.subject_id}` : "—");

export default function AdminLogsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.LOGS_VIEW}>
      <SystemLogs />
    </RequirePermission>
  );
}

function SystemLogs() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);
  const debounced = useDebouncedValue(filters);
  const idOnly = (value: string) => (/^\d+$/.test(value.trim()) ? value.trim() : undefined);
  const invalidRange = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const params = {
    search: debounced.search.trim(),
    module: debounced.module,
    actor_id: idOnly(debounced.actor_id),
    subject_id: idOnly(debounced.subject_id),
    date_from: debounced.date_from,
    date_to: debounced.date_to,
    page,
    per_page: 15,
  };

  const query = useQuery({
    queryKey: ["admin", "logs", params],
    queryFn: () => fetchSystemLogs(params),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={FileText} title="System Logs" description="Audit trail of administrative actions and sign-ins. Sensitive metadata is redacted by the backend." />
      <Panel icon={FileText} title="Activity Logs" description="Who did what, to which record, and when.">
        <FilterBar bare>
          <SearchField id="log-search" value={filters.search} onChange={(value) => update("search", value)} placeholder="Search action or description…" />
          <Field label="Module" htmlFor="log-module">
            <SelectInput id="log-module" value={filters.module} onChange={(event) => update("module", event.target.value)}>
              <option value="">All Modules</option>
              {MODULES.map((module) => (
                <option key={module} value={module}>
                  {humanize(module)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Actor ID" htmlFor="log-actor">
            <Input id="log-actor" className="w-24" inputMode="numeric" value={filters.actor_id} onChange={(event) => update("actor_id", event.target.value)} />
          </Field>
          <Field label="Entity ID" htmlFor="log-subject">
            <Input id="log-subject" className="w-24" inputMode="numeric" value={filters.subject_id} onChange={(event) => update("subject_id", event.target.value)} />
          </Field>
          <Field label="From" htmlFor="log-from">
            <Input id="log-from" type="date" value={filters.date_from} onChange={(event) => update("date_from", event.target.value)} />
          </Field>
          <Field label="To" htmlFor="log-to">
            <Input id="log-to" type="date" value={filters.date_to} hasError={invalidRange} onChange={(event) => update("date_to", event.target.value)} />
          </Field>
          <Button variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </FilterBar>
        {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}

        {query.isPending && !invalidRange ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
        {query.data && query.data.data.length === 0 ? <EmptyState title="No log entries match these filters" /> : null}
        {query.data && query.data.data.length > 0 ? (
          <>
            <AdminTable
              bare
              caption="System audit logs"
              rows={query.data.data}
              rowKey={(row) => row.id}
              selectedKey={selected?.id}
              columns={[
                { key: "when", header: "Date & Time", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
                {
                  key: "actor",
                  header: "User",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-navy-900">{row.actor?.name ?? "System"}</p>
                      <p className="text-xs text-muted-foreground">{row.actor?.email ?? "—"}</p>
                    </div>
                  ),
                },
                { key: "action", header: "Action", render: (row) => <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">{row.action}</code> },
                { key: "module", header: "Module", render: (row) => humanize(moduleOf(row.action) ?? "—") },
                { key: "description", header: "Description", className: "max-w-64", render: (row) => <span className="line-clamp-2">{row.description ?? "—"}</span> },
                { key: "entity", header: "Entity", render: (row) => entityOf(row) },
                { key: "ip", header: "IP Address", render: (row) => row.ip_address ?? "—" },
                { key: "view", header: <span className="sr-only">Details</span>, render: (row) => <IconAction icon={Eye} label={`View log ${row.id}`} onClick={() => setSelected(row)} /> },
              ]}
            />
            <Pagination meta={query.data.meta} onPageChange={setPage} noun="logs" />
          </>
        ) : null}
      </Panel>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="Log Details" subtitle={selected ? `LOG-${selected.id}` : undefined}>
        {selected ? (
          <>
            <DetailList
              columns={1}
              items={[
                { label: "Action", value: <code className="text-xs">{selected.action}</code> },
                { label: "Description", value: selected.description ?? "—" },
                { label: "User", value: selected.actor ? `${selected.actor.name} (${selected.actor.email})` : "System" },
                { label: "Module", value: humanize(moduleOf(selected.action) ?? "—") },
                { label: "Entity", value: entityOf(selected) },
                { label: "IP address", value: selected.ip_address ?? "—" },
                { label: "Timestamp", value: formatDateTime(selected.created_at) },
              ]}
            />
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-navy-900">Additional data</h3>
              <JsonBlock value={selected.metadata} />
            </section>
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
