"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, CircleDollarSign, ClipboardList, CreditCard, Package, Receipt, RotateCcw, ShoppingCart, Store, Users } from "lucide-react";
import { CustomersList } from "@/components/admin/lists/customers-list";
import { FinanceOverview } from "@/components/admin/lists/finance-list";
import { InventoryOverview } from "@/components/admin/lists/inventory-list";
import { OrdersList } from "@/components/admin/lists/orders-list";
import { ProductsList } from "@/components/admin/lists/products-list";
import { ReturnsList } from "@/components/admin/lists/returns-list";
import { MerchantApplicationDetails, MerchantDocuments, OnboardingHistory, OnboardingProgress } from "@/components/admin/merchant-application";
import { MerchantBillingPanel } from "@/components/admin/merchant-billing-panel";
import { MerchantStatusForm } from "@/components/admin/merchant-status-form";
import { useAdminSession } from "@/components/admin/admin-session";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatCard, StatGrid, StatusPill, Tabs, type TabItem } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fetchMerchant } from "@/lib/api/admin";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS, type PermissionRequirement } from "@/lib/admin/permissions";
import type { AdminMerchant } from "@/types/admin";

type DetailTab = "overview" | "products" | "inventory" | "orders" | "returns" | "customers" | "finance" | "billing";

const TABS: Array<TabItem<DetailTab> & { permission: PermissionRequirement }> = [
  { id: "overview", label: "Overview", icon: Store, permission: ADMIN_PERMISSIONS.MERCHANTS_VIEW },
  { id: "products", label: "Products", icon: Package, permission: ADMIN_PERMISSIONS.PRODUCTS_VIEW },
  { id: "inventory", label: "Inventory", icon: Boxes, permission: ADMIN_PERMISSIONS.PRODUCTS_INVENTORY },
  { id: "orders", label: "Orders", icon: ShoppingCart, permission: ADMIN_PERMISSIONS.ORDERS_VIEW },
  { id: "returns", label: "Returns", icon: RotateCcw, permission: ADMIN_PERMISSIONS.ORDERS_VIEW },
  { id: "customers", label: "Customers", icon: Users, permission: ADMIN_PERMISSIONS.CUSTOMERS_VIEW },
  { id: "finance", label: "Payments & Refunds", icon: CreditCard, permission: ADMIN_PERMISSIONS.PAYMENTS_VIEW },
  { id: "billing", label: "Billing", icon: Receipt, permission: ADMIN_PERMISSIONS.MERCHANTS_BILLING_VIEW },
];

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
  const validId = Number.isInteger(merchantId) && merchantId > 0;
  const queryClient = useQueryClient();
  const { can } = useAdminSession();
  const [tab, setTab] = useState<DetailTab>("overview");
  const tabs = useMemo(() => TABS.filter((item) => can(item.permission)), [can]);

  const merchant = useQuery({
    queryKey: ["admin", "merchants", merchantId],
    queryFn: () => fetchMerchant(merchantId),
    enabled: validId,
  });

  if (!validId) return <EmptyState title="Invalid merchant" />;
  if (merchant.isPending) return <LoadingState />;
  if (merchant.isError) return <ErrorState error={merchant.error} onRetry={() => void merchant.refetch()} />;

  const data = merchant.data;
  return (
    <div className="space-y-5">
      <PageHeader
        icon={Store}
        title={data.store_name}
        description={`${data.business_name ?? "—"} · ${data.store_category ?? "No category"} · Joined ${formatDateTime(data.created_at)}`}
        actions={
          <>
            <StatusPill status={data.status} />
            <Button asChild variant="outline">
              <Link href="/admin/merchants">
                <ArrowLeft className="h-4 w-4" />
                Back to merchants
              </Link>
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatCard icon={ShoppingCart} tone="purple" label="Orders" value={(data.orders_count ?? 0).toLocaleString()} />
        <StatCard icon={Package} tone="blue" label="Products" value={(data.products_count ?? 0).toLocaleString()} />
        <StatCard icon={Users} tone="amber" label="Customers" value={(data.customers_count ?? 0).toLocaleString()} />
        <StatCard
          icon={CircleDollarSign}
          tone="green"
          label="Collected payments"
          value={formatMoney(data.payments_sum_amount)}
          hint={`${data.transactions_count ?? 0} transactions · ${data.refunds_count ?? 0} refunds`}
        />
      </StatGrid>

      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <div className="px-4 sm:px-5">
          <Tabs label="Merchant sections" tabs={tabs} value={tab} onChange={setTab} />
        </div>
        <div className="p-4 sm:p-5">
          {tab === "overview" ? <MerchantOverview merchant={data} onUpdated={(updated) => queryClient.setQueryData<AdminMerchant>(["admin", "merchants", merchantId], { ...data, ...updated })} /> : null}
          {tab === "products" ? <ProductsList merchantId={merchantId} /> : null}
          {tab === "inventory" ? <InventoryOverview merchantId={merchantId} /> : null}
          {tab === "orders" ? <OrdersList merchantId={merchantId} /> : null}
          {tab === "returns" ? <ReturnsList merchantId={merchantId} /> : null}
          {tab === "customers" ? <CustomersList merchantId={merchantId} /> : null}
          {tab === "finance" ? <FinanceOverview merchantId={merchantId} /> : null}
          {tab === "billing" ? <MerchantBillingPanel merchantId={merchantId} /> : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Promotions/vouchers and subscription plans are not part of the current backend, so they are not shown for merchants.
      </p>
    </div>
  );
}

function MerchantOverview({ merchant, onUpdated }: { merchant: AdminMerchant; onUpdated: (merchant: AdminMerchant) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
      <div className="space-y-5">
        <Panel icon={ClipboardList} title="Onboarding progress">
          <OnboardingProgress merchant={merchant} />
        </Panel>
        <Panel title="Application details">
          <MerchantApplicationDetails merchant={merchant} />
        </Panel>
        <Panel title="Uploaded documents">
          <MerchantDocuments merchant={merchant} />
        </Panel>
      </div>
      <div className="space-y-5">
        <Can permission={ADMIN_PERMISSIONS.MERCHANTS_MANAGE}>
          <Panel title="Onboarding decision" description="Approve, reject, request information or change the account status.">
            <MerchantStatusForm key={merchant.id} merchant={merchant} onUpdated={onUpdated} />
          </Panel>
        </Can>
        <Panel title="Approval / rejection history">
          <OnboardingHistory merchantId={merchant.id} />
        </Panel>
      </div>
    </div>
  );
}
