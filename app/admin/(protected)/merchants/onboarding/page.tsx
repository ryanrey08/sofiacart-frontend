"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MerchantStatusForm } from "@/components/admin/merchant-status-form";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fetchMerchants } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { AdminMerchant } from "@/types/admin";

const QUEUES = [
  { value: "pending", label: "Pending review" },
  { value: "information_requested", label: "Information requested" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminMerchantOnboardingPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.MERCHANTS_VIEW}>
      <OnboardingQueue />
    </RequirePermission>
  );
}

function OnboardingQueue() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<AdminMerchant | null>(null);
  const params = { status, page, per_page: 15 };

  const query = useQuery({
    queryKey: ["admin", "merchants", "list", params],
    queryFn: () => fetchMerchants(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Merchant onboarding" description="Review merchant applications and update their verification status." />
      <FilterBar>
        <Field label="Queue" htmlFor="onboarding-queue">
          <SelectInput
            id="onboarding-queue"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {QUEUES.map((queue) => (
              <option key={queue.value} value={queue.value}>
                {queue.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState title="No merchants in this queue" /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Merchant onboarding queue"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "store",
                header: "Store",
                render: (row) => (
                  <Link href={`/admin/merchants/${row.id}`} className="font-semibold text-brand-700 hover:underline">
                    {row.store_name}
                  </Link>
                ),
              },
              { key: "business", header: "Business", render: (row) => `${row.business_name ?? "—"} · ${row.business_type ?? "—"}` },
              { key: "owner", header: "Owner", render: (row) => row.owner_name ?? row.user?.name ?? "—" },
              { key: "tin", header: "TIN", render: (row) => row.tin ?? "—" },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "submitted", header: "Submitted", render: (row) => formatDateTime(row.created_at) },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <Can permission={ADMIN_PERMISSIONS.MERCHANTS_MANAGE}>
                    <Button size="sm" variant="outline" onClick={() => setReviewing(row)}>
                      Review
                    </Button>
                  </Can>
                ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}

      <Modal open={reviewing !== null} title={`Review ${reviewing?.store_name ?? "merchant"}`} onClose={() => setReviewing(null)}>
        {reviewing ? <MerchantStatusForm key={reviewing.id} merchant={reviewing} onUpdated={(updated) => setReviewing(updated)} /> : null}
      </Modal>
    </div>
  );
}
