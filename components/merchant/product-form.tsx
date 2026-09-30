"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2, X } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { humanize } from "@/lib/admin/format";
import { useCreateProduct, useProductCategories, useUpdateProduct } from "@/lib/hooks/products";
import { mapProductApiError, productToFormValues, type ProductFormField } from "@/lib/merchant-products";
import { slugify } from "@/lib/utils";
import {
  MERCHANT_SELECTABLE_PRODUCT_STATUSES,
  PRODUCT_IMAGE_MAX_KB,
  PRODUCT_IMAGE_TYPES,
  productFormSchema,
  type ProductFormValues,
  type ValidatedProductForm,
} from "@/lib/validation/product";
import type { ProductResource } from "@/types";

const emptyValues: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  categoryId: "",
  status: "draft",
  price: "",
  stockQuantity: "0",
  images: [],
};

export function ProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product?: ProductResource;
  onSaved: (product: ProductResource) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(product);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const categories = useProductCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(product?.id ?? 0);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, unknown, ValidatedProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productToFormValues(product) : emptyValues,
  });

  const statusOptions: string[] = [...MERCHANT_SELECTABLE_PRODUCT_STATUSES];
  if (product && !statusOptions.includes(product.status)) statusOptions.push(product.status);
  const categoryOptions = categories.data?.data ?? [];
  const missingCategoryId =
    product?.category_id && categories.data && !categoryOptions.some((category) => category.id === product.category_id)
      ? product.category_id
      : null;

  const onSubmit = async (values: ValidatedProductForm) => {
    setFormError(null);
    try {
      const saved = isEdit ? await updateMutation.mutateAsync(values) : await createMutation.mutateAsync(values);
      onSaved(saved);
    } catch (error) {
      const result = mapProductApiError(error, "The product could not be saved. Please try again.");
      (Object.entries(result.fieldErrors) as Array<[ProductFormField, string]>).forEach(([field, message]) =>
        setError(field, { type: "server", message }),
      );
      setFormError(result.formError);
    }
  };

  const nameField = register("name");
  const slugField = register("slug");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name *" htmlFor="product-name" error={errors.name?.message} className="sm:col-span-2">
          <Input
            id="product-name"
            hasError={!!errors.name}
            {...nameField}
            onChange={(event) => {
              void nameField.onChange(event);
              if (!slugTouched) setValue("slug", slugify(event.target.value));
            }}
          />
        </Field>
        <Field label="Slug *" htmlFor="product-slug" error={errors.slug?.message}>
          <Input
            id="product-slug"
            hasError={!!errors.slug}
            {...slugField}
            onChange={(event) => {
              setSlugTouched(true);
              void slugField.onChange(event);
            }}
          />
        </Field>
        <Field label="SKU *" htmlFor="product-sku" error={errors.sku?.message}>
          <Input id="product-sku" hasError={!!errors.sku} {...register("sku")} />
        </Field>
        <Field label="Price (PHP) *" htmlFor="product-price" error={errors.price?.message}>
          <Input id="product-price" inputMode="decimal" placeholder="0.00" hasError={!!errors.price} {...register("price")} />
        </Field>
        <Field label="Stock quantity *" htmlFor="product-stock" error={errors.stockQuantity?.message}>
          <Input id="product-stock" inputMode="numeric" hasError={!!errors.stockQuantity} {...register("stockQuantity")} />
          {isEdit ? <p className="mt-1 text-xs text-muted-foreground">Use “Adjust stock” to record a logged inventory change.</p> : null}
        </Field>
        <Field label="Category" htmlFor="product-category" error={errors.categoryId?.message}>
          <SelectInput id="product-category" className="w-full" disabled={categories.isPending} {...register("categoryId")}>
            <option value="">{categories.isPending ? "Loading categories…" : "No category"}</option>
            {missingCategoryId ? (
              <option value={String(missingCategoryId)}>{product?.category?.name ?? `Category #${missingCategoryId}`}</option>
            ) : null}
            {categoryOptions.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </SelectInput>
          {categories.isError ? (
            <p className="mt-1 text-xs text-amber-700">Your categories couldn’t be loaded. You can save without a category.</p>
          ) : null}
          {categories.data && categoryOptions.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Your store has no categories yet.</p>
          ) : null}
        </Field>
        <Field label="Status *" htmlFor="product-status" error={errors.status?.message}>
          <SelectInput id="product-status" className="w-full" {...register("status")}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Description" htmlFor="product-description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea id="product-description" hasError={!!errors.description} {...register("description")} />
        </Field>
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <Field label="Images" htmlFor="product-images" error={errors.images?.message} className="sm:col-span-2">
              {product?.images?.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {product.images.map((path) => (
                    <ProductImage key={path} path={path} alt={product.name} className="h-16 w-16" />
                  ))}
                </div>
              ) : null}
              <input
                id="product-images"
                type="file"
                multiple
                accept={PRODUCT_IMAGE_TYPES.join(",")}
                className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700"
                onChange={(event) => {
                  field.onChange([...field.value, ...Array.from(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                JPG or PNG, up to {PRODUCT_IMAGE_MAX_KB} KB each.
                {isEdit ? " Uploading new images replaces all current images." : ""}
              </p>
              {field.value.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {field.value.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5">
                      <span className="truncate">
                        {file.name} <span className="text-xs text-muted-foreground">({Math.ceil(file.size / 1024)} KB)</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => field.onChange(field.value.filter((_, fileIndex) => fileIndex !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
          )}
        />
      </div>

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
