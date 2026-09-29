"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { MerchantBillingPanel } from "@/components/admin/merchant-billing-panel";
import { MerchantStatusForm } from "@/components/admin/merchant-status-form";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, DetailList, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMerchant, fetchMerchantOnboardingHistory } from "@/lib/api/admin";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminMerchantDetailPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.MERCHANTS_VIEW}>
      <MerchantDetail />
    </RequirePermission>
  );
}

function MerchantDetail() {
  const params = useParams<{ id: string }>();
  const merchantId = Number(params.id);
  const queryClient = useQueryClient();
  const [historyPage, setHistoryPage] = useState(1);
  const validId = Number.isInteger(merchantId) && merchantId > 0;

  const merchant = useQuery({
    queryKey: ["admin", "merchants", merchantId],
    queryFn: () => fetchMerchant(merchantId),
    enabled: validId,
  });
  const history = useQuery({
    queryKey: ["admin", "merchants", merchantId, "history", historyPage],
    queryFn: () => fetchMerchantOnboardingHistory(merchantId, { page: historyPage, per_page: 10 }),
    enabled: validId,
    placeholderData: keepPreviousData,
  });

  if (!validId) return <EmptyState title="Invalid merchant" />;
  if (merchant.isPending) return <LoadingState />;
  if (merchant.isError) return <ErrorState error={merchant.error} onRetry={() => void merchant.refetch()} />;

  const data = merchant.data;
  return (
    <div className="space-y-6">
      <PageHeader
        title={data.store_name}
        description={`${data.business_name ?? "—"} · ${data.store_slug ?? "no slug"}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/merchants">Back to merchants</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card className="border-none bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile</CardTitle>
            <StatusPill status={data.status} />
          </CardHeader>
          <CardContent className="pt-0">
            <DetailList
              items={[
                { label: "Business type", value: data.business_type },
                { label: "Business category", value: data.business_category },
                { label: "Permit number", value: data.business_permit_number },
                { label: "TIN", value: data.tin },
                { label: "Business address", value: [data.business_address, data.city, data.province, data.zip_code].filter(Boolean).join(", ") || "—" },
                { label: "Store category", value: data.store_category },
                { label: "Store contact", value: [data.contact_email, data.contact_phone].filter(Boolean).join(" · ") || "—" },
                { label: "Owner", value: [data.owner_name, data.owner_position].filter(Boolean).join(" · ") || "—" },
                { label: "Owner contact", value: [data.owner_email, data.owner_phone].filter(Boolean).join(" · ") || "—" },
                { label: "Government ID", value: humanize(data.government_id_type) },
                { label: "Account", value: data.user ? `${data.user.name} (${data.user.email})` : "—" },
                { label: "Orders / products", value: `${data.orders_count ?? 0} / ${data.products_count ?? 0}` },
                { label: "Collected payments", value: formatMoney(data.payments_sum_amount) },
                { label: "Registered", value: formatDateTime(data.created_at) },
              ]}
            />
          </CardContent>
        </Card>
        <Can permission={ADMIN_PERMISSIONS.MERCHANTS_MANAGE}>
          <Card className="h-fit border-none bg-white/90">
            <CardHeader>
              <CardTitle>Onboarding decision</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MerchantStatusForm
                merchant={data}
                onUpdated={(updated) => queryClient.setQueryData(["admin", "merchants", merchantId], { ...data, ...updated })}
              />
            </CardContent>
          </Card>
        </Can>
      </div>

      <Can permission={ADMIN_PERMISSIONS.MERCHANTS_BILLING_VIEW}>
        <Card className="border-none bg-white/90">
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MerchantBillingPanel merchantId={merchantId} />
          </CardContent>
        </Card>
      </Can>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Onboarding history</h2>
        {history.isPending ? <LoadingState /> : null}
        {history.isError ? <ErrorState error={history.error} onRetry={() => void history.refetch()} /> : null}
        {history.data && history.data.data.length === 0 ? <EmptyState title="No onboarding activity recorded" /> : null}
        {history.data && history.data.data.length > 0 ? (
          <>
            <AdminTable
              caption="Merchant onboarding history"
              rows={history.data.data}
              rowKey={(row) => row.id}
              columns={[
                { key: "when", header: "When", render: (row) => formatDateTime(row.created_at) },
                { key: "actor", header: "Admin", render: (row) => row.actor?.name ?? "System" },
                { key: "action", header: "Action", render: (row) => row.description ?? row.action },
                {
                  key: "details",
                  header: "Details",
                  render: (row) => {
                    const metadata = (row.metadata ?? {}) as { status?: string; reason?: string | null };
                    return (
                      <div className="space-y-1">
                        {metadata.status ? <StatusPill status={metadata.status} /> : null}
                        {metadata.reason ? <p className="text-xs text-muted-foreground">{metadata.reason}</p> : null}
                      </div>
                    );
                  },
                },
              ]}
            />
            <Pagination meta={history.data.meta} onPageChange={setHistoryPage} />
          </>
        ) : null}
      </section>
    </div>
  );
}
