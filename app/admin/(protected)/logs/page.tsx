"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { RequirePermission } from "@/components/admin/require-permission";
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, PageHeader, Pagination } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSystemLogs } from "@/lib/api/admin";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";

const EMPTY_FILTERS = { search: "", action: "", actor_id: "", subject_type: "", subject_id: "" };

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
  const debounced = useDebouncedValue(filters);
  const idOnly = (value: string) => (/^\d+$/.test(value.trim()) ? value.trim() : undefined);
  const params = {
    search: debounced.search.trim(),
    action: debounced.action.trim(),
    actor_id: idOnly(debounced.actor_id),
    subject_type: debounced.subject_type.trim(),
    subject_id: idOnly(debounced.subject_id),
    page,
    per_page: 25,
  };

  const query = useQuery({ queryKey: ["admin", "logs", params], queryFn: () => fetchSystemLogs(params), placeholderData: keepPreviousData });

  const update = (key: keyof typeof EMPTY_FILTERS) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="System logs" description="Audit trail of administrative actions. Sensitive metadata is redacted by the backend." />
      <FilterBar>
        <Field label="Search" htmlFor="log-search" className="min-w-56 flex-1">
          <Input id="log-search" placeholder="Action or description" value={filters.search} onChange={update("search")} />
        </Field>
        <Field label="Action" htmlFor="log-action">
          <Input id="log-action" placeholder="e.g. admin.login" value={filters.action} onChange={update("action")} />
        </Field>
        <Field label="Actor ID" htmlFor="log-actor">
          <Input id="log-actor" inputMode="numeric" value={filters.actor_id} onChange={update("actor_id")} />
        </Field>
        <Field label="Subject type" htmlFor="log-subject-type">
          <Input id="log-subject-type" value={filters.subject_type} onChange={update("subject_type")} />
        </Field>
        <Field label="Subject ID" htmlFor="log-subject-id">
          <Input id="log-subject-id" inputMode="numeric" value={filters.subject_id} onChange={update("subject_id")} />
        </Field>
        <Button
          variant="outline"
          onClick={() => {
            setFilters(EMPTY_FILTERS);
            setPage(1);
          }}
        >
          Reset
        </Button>
      </FilterBar>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState title="No log entries match these filters" /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AuditLogTable logs={query.data.data} caption="System audit logs" />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
