"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock3, Eye, FileQuestion, Inbox, RotateCcw, XCircle } from "lucide-react";
import { MerchantApplicationDetails, MerchantDocuments, OnboardingHistory, OnboardingProgress } from "@/components/admin/merchant-application";
import { MerchantStatusForm } from "@/components/admin/merchant-status-form";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import {
  AdminTable,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconAction,
  LoadingState,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  StatCard,
  StatGrid,
  StatusPill,
  Tabs,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMerchant, fetchMerchants, fetchMerchantSummary } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminMerchant } from "@/types/admin";

type Queue = "all" | "pending" | "information_requested" | "verified" | "rejected";

const QUEUES: Array<{ id: Queue; label: string; icon: typeof Inbox }> = [
  { id: "all", label: "All Applications", icon: ClipboardList },
  { id: "pending", label: "Pending Review", icon: Clock3 },
  { id: "information_requested", label: "Info Requested", icon: FileQuestion },
  { id: "verified", label: "Approved", icon: CheckCircle2 },
  { id: "rejected", label: "Rejected", icon: XCircle },
];

export default function AdminMerchantOnboardingPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.MERCHANTS_VIEW}>
      <OnboardingQueue />
    </RequirePermission>
  );
}

function OnboardingQueue() {
  const [queue, setQueue] = useState<Queue>("pending");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const invalidRange = Boolean(range.date_from && range.date_to && range.date_to < range.date_from);
  const params = {
    status: queue === "all" ? "" : queue,
    search: debouncedSearch,
    ...range,
    sort: queue === "pending" || queue === "information_requested" ? "oldest" : "newest",
    page,
    per_page: 10,
  };

  const summary = useQuery({ queryKey: ["admin", "merchants", "summary"], queryFn: fetchMerchantSummary });
  const query = useQuery({
    queryKey: ["admin", "merchants", "list", params],
    queryFn: () => fetchMerchants(params),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });
  const counts = summary.data?.by_status;

  return (
    <div className="space-y-5">
      <PageHeader icon={ClipboardList} title="Merchant Onboarding" description="Review merchant applications, verify documents, and record approval decisions." />

      <StatGrid>
        <StatCard icon={Clock3} tone="amber" label="Pending Review" value={counts?.pending ?? "—"} loading={summary.isPending} />
        <StatCard icon={FileQuestion} tone="blue" label="Info Requested" value={counts?.information_requested ?? "—"} loading={summary.isPending} />
        <StatCard icon={CheckCircle2} tone="green" label="Approved" value={counts?.verified ?? "—"} loading={summary.isPending} />
        <StatCard icon={XCircle} tone="red" label="Rejected" value={counts?.rejected ?? "—"} loading={summary.isPending} />
      </StatGrid>

      <Panel bodyClassName="pt-0">
        <Tabs
          label="Application status"
          tabs={QUEUES.map((item) => ({
            ...item,
            count: item.id === "all" ? summary.data?.total : counts?.[item.id],
          }))}
          value={queue}
          onChange={(value) => {
            setQueue(value);
            setPage(1);
          }}
        />
        <div className="pt-4">
          <FilterBar bare>
            <SearchField id="onboarding-search" value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search merchant name, email, business name…" />
            <Field label="Registered from" htmlFor="onboarding-from">
              <Input id="onboarding-from" type="date" value={range.date_from} onChange={(event) => { setRange((current) => ({ ...current, date_from: event.target.value })); setPage(1); }} />
            </Field>
            <Field label="Registered to" htmlFor="onboarding-to">
              <Input id="onboarding-to" type="date" value={range.date_to} hasError={invalidRange} onChange={(event) => { setRange((current) => ({ ...current, date_to: event.target.value })); setPage(1); }} />
            </Field>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setRange({ date_from: "", date_to: "" });
                setPage(1);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </FilterBar>
          {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}

          {query.isPending && !invalidRange ? <LoadingState /> : null}
          {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
          {query.data && query.data.data.length === 0 ? <EmptyState title="No applications in this queue" /> : null}
          {query.data && query.data.data.length > 0 ? (
            <>
              <AdminTable
                bare
                caption="Merchant applications"
                rows={query.data.data}
                rowKey={(row) => row.id}
                selectedKey={reviewingId}
                columns={[
                  {
                    key: "merchant",
                    header: "Merchant",
                    render: (row) => (
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                          {row.store_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/merchants/${row.id}`} className="block font-semibold text-navy-900 hover:text-brand-700">
                            {row.store_name}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{row.user?.email ?? row.contact_email ?? "—"}</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "business",
                    header: "Business Details",
                    render: (row) => (
                      <div className="text-xs">
                        <p className="font-medium text-navy-900">{row.business_name ?? "—"}</p>
                        <p className="text-muted-foreground">{row.business_category ?? "—"}</p>
                        <p className="text-muted-foreground">{[row.city, row.province].filter(Boolean).join(", ") || "—"}</p>
                      </div>
                    ),
                  },
                  {
                    key: "type",
                    header: "Application Type",
                    render: (row) => <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{row.business_type ?? "—"}</span>,
                  },
                  { key: "progress", header: "Onboarding Progress", className: "min-w-56", render: (row) => <OnboardingProgress merchant={row} compact /> },
                  { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
                  { key: "submitted", header: "Submitted Date", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
                  {
                    key: "actions",
                    header: <span className="sr-only">Actions</span>,
                    render: (row) => <IconAction icon={Eye} label={`Review ${row.store_name}`} onClick={() => setReviewingId(row.id)} />,
                  },
                ]}
              />
              <Pagination meta={query.data.meta} onPageChange={setPage} noun="applications" />
            </>
          ) : null}
        </div>
      </Panel>

      <ApplicationReview merchantId={reviewingId} onClose={() => setReviewingId(null)} />
    </div>
  );
}

function ApplicationReview({ merchantId, onClose }: { merchantId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const merchant = useQuery({
    queryKey: ["admin", "merchants", merchantId],
    queryFn: () => fetchMerchant(merchantId!),
    enabled: merchantId !== null,
  });
  const data = merchant.data;

  return (
    <Drawer
      open={merchantId !== null}
      onClose={onClose}
      title={data?.store_name ?? "Merchant application"}
      subtitle={data ? <StatusPill status={data.status} /> : undefined}
      footer={
        data ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/admin/merchants/${data.id}`}>Open full merchant profile</Link>
          </Button>
        ) : undefined
      }
    >
      {merchant.isPending ? <LoadingState /> : null}
      {merchant.isError ? <ErrorState error={merchant.error} onRetry={() => void merchant.refetch()} /> : null}
      {data ? (
        <>
          <OnboardingProgress merchant={data} />
          <Can permission={ADMIN_PERMISSIONS.MERCHANTS_MANAGE} fallback={<p className="text-sm text-muted-foreground">You can review applications but not record decisions.</p>}>
            <section className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <h3 className="text-sm font-bold text-navy-900">Decision</h3>
              <MerchantStatusForm
                key={data.id}
                merchant={data}
                onUpdated={(updated) => queryClient.setQueryData<AdminMerchant>(["admin", "merchants", data.id], { ...data, ...updated })}
              />
            </section>
          </Can>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-navy-900">Uploaded documents</h3>
            <MerchantDocuments merchant={data} />
          </section>
          <MerchantApplicationDetails merchant={data} />
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-navy-900">Approval / rejection history</h3>
            <OnboardingHistory merchantId={data.id} />
          </section>
        </>
      ) : null}
    </Drawer>
  );
}
