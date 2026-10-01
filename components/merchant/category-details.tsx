"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Eye, Package, Pencil, Power, Trash2, X } from "lucide-react";
import { ErrorState } from "@/components/admin/ui";
import { CategoryThumb } from "@/components/merchant/category-image";
import { ImageDropzone } from "@/components/merchant/image-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/admin/format";
import { useCategory, useUploadCategoryImage } from "@/lib/hooks/categories";
import { categoryImagePath, describeCategoryError, isCategoryActive } from "@/lib/merchant-categories";
import { richTextToPlainText } from "@/lib/validation/category";
import { cn } from "@/lib/utils";
import type { CategoryResource } from "@/types";

export function CategoryStatusBadge({ category }: { category: Pick<CategoryResource, "is_active"> }) {
  const active = isCategoryActive(category);
  return (
    <Badge variant={active ? "success" : "destructive"} className="gap-1.5">
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-green-600" : "bg-red-600")} />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700";

export function CategoryActionsMenu({
  category,
  trigger,
  disabled,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  category: CategoryResource;
  trigger: ReactNode;
  disabled?: boolean;
  onView?: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const active = isCategoryActive(category);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-soft">
          {onView ? (
            <DropdownMenu.Item className={itemClass} onSelect={onView}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item className={itemClass} onSelect={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} disabled={disabled} onSelect={onToggleStatus}>
            <Power className="h-4 w-4" />
            {active ? "Deactivate" : "Activate"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item
            className={cn(itemClass, "text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700")}
            disabled={disabled}
            onSelect={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function CategoryDetailsPanel({
  categoryId,
  busy,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
  onNotify,
}: {
  categoryId: number;
  busy: boolean;
  onClose: () => void;
  onEdit: (category: CategoryResource) => void;
  onToggleStatus: (category: CategoryResource) => void;
  onDelete: (category: CategoryResource) => void;
  onNotify: (tone: "success" | "error", text: string) => void;
}) {
  const query = useCategory(categoryId);
  const upload = useUploadCategoryImage();
  const [imageError, setImageError] = useState<string | null>(null);
  const [showDropzone, setShowDropzone] = useState(false);

  if (query.isPending) return <DetailsSkeleton />;
  if (query.isError) {
    return (
      <Card className="border-none bg-white/95">
        <CardContent className="p-4">
          <ErrorState error={query.error} title="Unable to load category" onRetry={() => void query.refetch()} />
        </CardContent>
      </Card>
    );
  }

  const category = query.data;
  const description = richTextToPlainText(category.description);
  const hasImage = Boolean(categoryImagePath(category));

  const uploadImage = (file: File) => {
    setImageError(null);
    upload.mutate(
      { id: category.id, file },
      {
        onSuccess: () => {
          setShowDropzone(false);
          onNotify("success", `${category.name} image updated.`);
        },
        onError: (error) => setImageError(describeCategoryError(error, "The image could not be uploaded.")),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-none bg-white/95">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CategoryThumb category={category} className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-lg font-semibold text-navy-900">{category.name}</h2>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" aria-label="Close category details" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{description || "No description"}</p>
              <div className="mt-2">
                <CategoryStatusBadge category={category} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onEdit(category)}>
              <Pencil className="h-4 w-4" />
              Edit Category
            </Button>
            <CategoryActionsMenu
              category={category}
              disabled={busy}
              onEdit={() => onEdit(category)}
              onToggleStatus={() => onToggleStatus(category)}
              onDelete={() => onDelete(category)}
              trigger={
                <Button variant="outline">
                  Actions
                  <ChevronDown className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-white/95">
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-navy-900">Category Information</h3>
          <dl className="space-y-2.5 text-sm">
            <InfoRow label="Category Name" value={category.name} />
            <InfoRow label="Slug" value={<span className="break-all font-mono text-xs">{category.slug}</span>} />
            <InfoRow label="Description" value={description || "—"} />
            <InfoRow label="Parent Category" value={category.parent?.name ?? (category.parent_id ? `Category #${category.parent_id}` : "None (Main Category)")} />
            <InfoRow label="Date Created" value={formatDateTime(category.created_at)} />
            <InfoRow label="Last Updated" value={formatDateTime(category.updated_at)} />
            <InfoRow label="Status" value={<CategoryStatusBadge category={category} />} />
          </dl>
        </CardContent>
      </Card>

      <Card className="border-none bg-white/95">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-navy-900">Category Image</h3>
            {hasImage ? (
              <Button size="sm" variant="outline" onClick={() => setShowDropzone((value) => !value)} aria-expanded={showDropzone}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : null}
          </div>
          {hasImage ? <CategoryThumb category={category} className="aspect-[3/2] h-auto w-full" /> : null}
          {!hasImage || showDropzone ? (
            <ImageDropzone
              id={`category-${category.id}-image`}
              compact
              busy={upload.isPending}
              disabled={upload.isPending}
              hasError={!!imageError}
              onSelect={uploadImage}
              onInvalid={setImageError}
            />
          ) : null}
          {imageError ? <p className="text-sm text-red-600">{imageError}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-none bg-white/95">
        <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product Count</p>
              <p className="text-xl font-bold text-navy-900">{category.products_count ?? "—"}</p>
            </div>
          </div>
          <Link href={`/sales/products?category_id=${category.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
            View Products
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-slate-900">{value}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <Card className="border-none bg-white/95" aria-busy="true" aria-label="Loading category details">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-3 w-full animate-pulse rounded bg-slate-100" />
        ))}
      </CardContent>
    </Card>
  );
}
