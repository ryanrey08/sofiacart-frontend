"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUp, Boxes, Eye, ImagePlus, Info, Layers, Loader2, Plus, Tag, Trash2, Wallet, X } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { humanize } from "@/lib/admin/format";
import { useCreateProduct, useProductCategories, useUpdateProduct } from "@/lib/hooks/products";
import {
  emptyProductFormValues,
  emptyProductVariant,
  formatTags,
  mapProductApiError,
  parseTags,
  productToFormValues,
  type ProductFormErrorPath,
} from "@/lib/merchant-products";
import { cn, slugify } from "@/lib/utils";
import {
  MERCHANT_SELECTABLE_PRODUCT_STATUSES,
  PRODUCT_CONDITIONS,
  PRODUCT_FULL_DESCRIPTION_MAX,
  PRODUCT_IMAGE_MAX_KB,
  PRODUCT_IMAGE_TYPES,
  PRODUCT_SHORT_DESCRIPTION_MAX,
  productFormSchema,
  type ProductFormValues,
  type ValidatedProductForm,
} from "@/lib/validation/product";
import type { ProductResource } from "@/types";

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
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<ProductFormValues, unknown, ValidatedProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productToFormValues(product) : emptyProductFormValues,
  });

  const variants = useFieldArray({ control, name: "variants" });
  const trackInventory = useWatch({ control, name: "trackInventory" });
  const previewName = useWatch({ control, name: "name" });
  const [tagText, setTagText] = useState(() => formatTags(product?.tags ?? []));

  const statusOptions: string[] = [...MERCHANT_SELECTABLE_PRODUCT_STATUSES];
  if (product && !statusOptions.includes(product.status)) statusOptions.push(product.status);
  const conditionOptions: string[] = [...PRODUCT_CONDITIONS];
  if (product?.condition && !conditionOptions.includes(product.condition)) conditionOptions.push(product.condition);
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
      (Object.entries(result.fieldErrors) as Array<[ProductFormErrorPath, string]>).forEach(([field, message]) =>
        setError(field as never, { type: "server", message }),
      );
      setFormError(result.formError);
    }
  };

  const nameField = register("name");
  const slugField = register("slug");

  const actions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Save product"}
      </Button>
    </div>
  );

  return (
    <form className="space-y-6 pb-24 lg:pb-0" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" aria-label="Back to products" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Products</p>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">{isEdit ? "Edit product" : "Add product"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? `Update ${product?.name} and keep your catalogue accurate.` : "Fill in the details below to list a new product."}
            </p>
          </div>
        </div>
        <div className="hidden sm:block">{actions}</div>
      </div>

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FormSection title="Basic information" description="How the product appears across your store." icon={<Info className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name *" htmlFor="product-name" error={errors.name?.message} className="sm:col-span-2">
                <Input
                  id="product-name"
                  placeholder="e.g. Hand-woven rattan basket"
                  hasError={!!errors.name}
                  {...nameField}
                  onChange={(event) => {
                    void nameField.onChange(event);
                    if (!slugTouched) setValue("slug", slugify(event.target.value), { shouldValidate: isSubmitted });
                  }}
                />
              </Field>
              <Field label="SKU *" htmlFor="product-sku" error={errors.sku?.message}>
                <Input id="product-sku" placeholder="e.g. SC-RATTAN-01" hasError={!!errors.sku} {...register("sku")} />
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
              <Field
                label="Short description"
                htmlFor="product-short-description"
                error={errors.shortDescription?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="product-short-description"
                  placeholder="One line shown on product cards"
                  maxLength={PRODUCT_SHORT_DESCRIPTION_MAX}
                  hasError={!!errors.shortDescription}
                  {...register("shortDescription")}
                />
                <p className="mt-1 text-xs text-muted-foreground">Up to {PRODUCT_SHORT_DESCRIPTION_MAX} characters.</p>
              </Field>
              <Field label="Full description" htmlFor="product-description" error={errors.fullDescription?.message} className="sm:col-span-2">
                <Textarea
                  id="product-description"
                  rows={6}
                  maxLength={PRODUCT_FULL_DESCRIPTION_MAX}
                  placeholder="Describe materials, sizing, care instructions…"
                  hasError={!!errors.fullDescription}
                  {...register("fullDescription")}
                />
                <p className="mt-1 text-xs text-muted-foreground">Up to {PRODUCT_FULL_DESCRIPTION_MAX} characters.</p>
              </Field>
            </div>
          </FormSection>

          <FormSection title="Pricing" description="Set what buyers pay and what the item costs you." icon={<Wallet className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Regular price (PHP) *" htmlFor="product-regular-price" error={errors.regularPrice?.message}>
                <Input id="product-regular-price" inputMode="decimal" placeholder="0.00" hasError={!!errors.regularPrice} {...register("regularPrice")} />
              </Field>
              <Field label="Sale price (PHP)" htmlFor="product-sale-price" error={errors.salePrice?.message}>
                <Input id="product-sale-price" inputMode="decimal" placeholder="0.00" hasError={!!errors.salePrice} {...register("salePrice")} />
              </Field>
              <Field label="Cost price (PHP)" htmlFor="product-cost-price" error={errors.costPrice?.message}>
                <Input id="product-cost-price" inputMode="decimal" placeholder="0.00" hasError={!!errors.costPrice} {...register("costPrice")} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">The sale price must be lower than or equal to the regular price.</p>
          </FormSection>

          <FormSection title="Product details" description="Help shoppers and couriers understand the item." icon={<Tag className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand" htmlFor="product-brand" error={errors.brand?.message}>
                <Input id="product-brand" placeholder="e.g. SofiaCrafts" hasError={!!errors.brand} {...register("brand")} />
              </Field>
              <Field label="Condition" htmlFor="product-condition" error={errors.condition?.message}>
                <SelectInput id="product-condition" className="w-full" {...register("condition")}>
                  <option value="">Not specified</option>
                  {conditionOptions.map((condition) => (
                    <option key={condition} value={condition}>
                      {humanize(condition)}
                    </option>
                  ))}
                </SelectInput>
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
              <Field label="Weight (kg)" htmlFor="product-weight" error={errors.weight?.message}>
                <Input id="product-weight" inputMode="decimal" placeholder="0.000" hasError={!!errors.weight} {...register("weight")} />
              </Field>
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <Field label="Tags" htmlFor="product-tags" error={errors.tags?.message} className="sm:col-span-2">
                    <Input
                      id="product-tags"
                      placeholder="handmade, rattan, home"
                      value={tagText}
                      hasError={!!errors.tags}
                      onChange={(event) => {
                        setTagText(event.target.value);
                        field.onChange(parseTags(event.target.value));
                      }}
                      onBlur={() => {
                        setTagText(formatTags(parseTags(tagText)));
                        field.onBlur();
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
                  </Field>
                )}
              />
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium text-slate-700">Dimensions (cm)</legend>
                <div className="mt-2 grid gap-4 sm:grid-cols-3">
                  <Field label="Length" htmlFor="product-length" error={errors.length?.message}>
                    <Input id="product-length" inputMode="decimal" placeholder="0.00" hasError={!!errors.length} {...register("length")} />
                  </Field>
                  <Field label="Width" htmlFor="product-width" error={errors.width?.message}>
                    <Input id="product-width" inputMode="decimal" placeholder="0.00" hasError={!!errors.width} {...register("width")} />
                  </Field>
                  <Field label="Height" htmlFor="product-height" error={errors.height?.message}>
                    <Input id="product-height" inputMode="decimal" placeholder="0.00" hasError={!!errors.height} {...register("height")} />
                  </Field>
                </div>
              </fieldset>
            </div>
          </FormSection>

          <FormSection title="Images" description="The first image is the primary one shown in listings." icon={<ImagePlus className="h-4 w-4" />}>
            <ProductImagesEditor control={control} isEdit={isEdit} error={errors.images?.message} productName={previewName || product?.name || "Product"} />
          </FormSection>

          <FormSection
            title="Variants"
            description="Optional colour, size or style options with their own SKU, price and stock."
            icon={<Layers className="h-4 w-4" />}
            actions={
              <Button type="button" variant="outline" size="sm" onClick={() => variants.append({ ...emptyProductVariant })}>
                <Plus className="h-4 w-4" />
                Add variant
              </Button>
            }
          >
            {variants.fields.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
                No variants yet. Add one if this product is sold in different colours or sizes.
              </p>
            ) : (
              <ul className="space-y-4">
                {variants.fields.map((variantField, index) => (
                  <li key={variantField.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Variant {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove variant ${index + 1}`}
                        onClick={() => variants.remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="SKU *" htmlFor={`variant-sku-${index}`} error={errors.variants?.[index]?.sku?.message}>
                        <Input
                          id={`variant-sku-${index}`}
                          hasError={!!errors.variants?.[index]?.sku}
                          {...register(`variants.${index}.sku` as const)}
                        />
                      </Field>
                      <Field label="Colour" htmlFor={`variant-color-${index}`} error={errors.variants?.[index]?.color?.message}>
                        <Input id={`variant-color-${index}`} {...register(`variants.${index}.color` as const)} />
                      </Field>
                      <Field label="Size" htmlFor={`variant-size-${index}`} error={errors.variants?.[index]?.size?.message}>
                        <Input id={`variant-size-${index}`} {...register(`variants.${index}.size` as const)} />
                      </Field>
                      <Field label="Price (PHP) *" htmlFor={`variant-price-${index}`} error={errors.variants?.[index]?.price?.message}>
                        <Input
                          id={`variant-price-${index}`}
                          inputMode="decimal"
                          placeholder="0.00"
                          hasError={!!errors.variants?.[index]?.price}
                          {...register(`variants.${index}.price` as const)}
                        />
                      </Field>
                      <Field label="Stock *" htmlFor={`variant-stock-${index}`} error={errors.variants?.[index]?.stock?.message}>
                        <Input
                          id={`variant-stock-${index}`}
                          inputMode="numeric"
                          hasError={!!errors.variants?.[index]?.stock}
                          {...register(`variants.${index}.stock` as const)}
                        />
                      </Field>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {isEdit && variants.fields.length ? (
              <p className="mt-3 text-xs text-muted-foreground">Saving replaces the stored variants with the list above.</p>
            ) : null}
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Inventory" description="Stock on hand and low-stock alerts." icon={<Boxes className="h-4 w-4" />}>
            <Controller
              control={control}
              name="trackInventory"
              render={({ field }) => (
                <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-brand-600"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    onBlur={field.onBlur}
                  />
                  <span>
                    <span className="font-medium text-slate-800">Track inventory</span>
                    <span className="block text-xs text-muted-foreground">Flag this product when stock falls to the threshold.</span>
                  </span>
                </label>
              )}
            />
            <div className="mt-4 space-y-4">
              <Field label="Total stock *" htmlFor="product-stock" error={errors.stockQuantity?.message}>
                <Input id="product-stock" inputMode="numeric" hasError={!!errors.stockQuantity} {...register("stockQuantity")} />
                {isEdit ? <p className="mt-1 text-xs text-muted-foreground">Use “Adjust stock” to record a logged inventory change.</p> : null}
              </Field>
              <Field label="Low stock threshold *" htmlFor="product-low-stock" error={errors.lowStockThreshold?.message}>
                <Input
                  id="product-low-stock"
                  inputMode="numeric"
                  hasError={!!errors.lowStockThreshold}
                  {...register("lowStockThreshold")}
                />
                {!trackInventory ? (
                  <p className="mt-1 text-xs text-muted-foreground">Saved but unused while inventory tracking is off.</p>
                ) : null}
              </Field>
            </div>
          </FormSection>

          <FormSection title="Visibility" description="Control where this product appears." icon={<Eye className="h-4 w-4" />}>
            <Field label="Status *" htmlFor="product-status" error={errors.status?.message}>
              <SelectInput id="product-status" className="w-full" {...register("status")}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">
              Drafts stay hidden, active products are listed, and archived products are kept for your records.
            </p>
          </FormSection>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-soft sm:hidden">
        {actions}
      </div>
    </form>
  );
}

function FormSection({
  title,
  description,
  icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon ? <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</span> : null}
            <div>
              <h2 className="text-base font-semibold text-navy-900">{title}</h2>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          {actions}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

type ImagesControl = ReturnType<typeof useForm<ProductFormValues, unknown, ValidatedProductForm>>["control"];

function ProductImagesEditor({
  control,
  isEdit,
  error,
  productName,
}: {
  control: ImagesControl;
  isEdit: boolean;
  error?: string;
  productName: string;
}) {
  return (
    <Controller
      control={control}
      name="primaryImage"
      render={({ field: primaryField }) => (
        <Controller
          control={control}
          name="existingImages"
          render={({ field: existingField }) => (
            <Controller
              control={control}
              name="images"
              render={({ field: filesField }) => {
                const files = filesField.value;
                const existing = existingField.value;
                const replacesGallery = isEdit && files.length > 0;

                const move = (index: number, direction: -1 | 1) => {
                  const next = [...existing];
                  const target = index + direction;
                  if (target < 0 || target >= next.length) return;
                  [next[index], next[target]] = [next[target], next[index]];
                  existingField.onChange(next);
                };
                const removeExisting = (id: number) => {
                  const next = existing.filter((image) => image.id !== id);
                  existingField.onChange(next);
                  if (primaryField.value === `existing:${id}`) primaryField.onChange(next[0] ? `existing:${next[0].id}` : "");
                };
                const removeFile = (index: number) => {
                  filesField.onChange(files.filter((_, fileIndex) => fileIndex !== index));
                  if (primaryField.value === `new:${index}`) primaryField.onChange("");
                };

                return (
                  <div>
                    <Label htmlFor="product-images">Upload images</Label>
                    <input
                      id="product-images"
                      type="file"
                      multiple
                      accept={PRODUCT_IMAGE_TYPES.join(",")}
                      className="mt-1 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700"
                      onChange={(event) => {
                        filesField.onChange([...files, ...Array.from(event.target.files ?? [])]);
                        event.target.value = "";
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP, up to {PRODUCT_IMAGE_MAX_KB} KB each.</p>
                    {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

                    {replacesGallery ? (
                      <div className="mt-3">
                        <Notice tone="info">
                          The API replaces the whole gallery when new files are uploaded, so the images below will take over from the current
                          ones. Remove the uploads to keep the existing gallery instead.
                        </Notice>
                      </div>
                    ) : null}

                    {existing.length ? (
                      <div className={cn("mt-4", replacesGallery && "opacity-60")}>
                        <p className="mb-2 text-sm font-medium text-slate-700">Current images</p>
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {existing.map((image, index) => (
                            <li key={image.id} className="rounded-2xl border border-slate-200 p-2">
                              <ProductImage path={image.path} alt={`${productName} image ${index + 1}`} className="h-24 w-full" />
                              <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                                <input
                                  type="radio"
                                  name="primary-image"
                                  className="h-3.5 w-3.5 accent-brand-600"
                                  disabled={replacesGallery}
                                  checked={primaryField.value === `existing:${image.id}`}
                                  onChange={() => primaryField.onChange(`existing:${image.id}`)}
                                />
                                Primary
                              </label>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Move image ${index + 1} earlier`}
                                    disabled={index === 0 || replacesGallery}
                                    onClick={() => move(index, -1)}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Move image ${index + 1} later`}
                                    disabled={index === existing.length - 1 || replacesGallery}
                                    onClick={() => move(index, 1)}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5 rotate-180" />
                                  </Button>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Remove image ${index + 1}`}
                                  disabled={replacesGallery}
                                  onClick={() => removeExisting(image.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {files.length ? (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-medium text-slate-700">New uploads</p>
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {files.map((file, index) => (
                            <li key={`${file.name}-${index}`} className="rounded-2xl border border-slate-200 p-2">
                              <FilePreview file={file} alt={`${file.name} preview`} />
                              <p className="mt-2 truncate text-xs text-slate-600" title={file.name}>
                                {file.name}
                              </p>
                              <label className="mt-1 flex items-center gap-2 text-xs text-slate-700">
                                <input
                                  type="radio"
                                  name="primary-image"
                                  className="h-3.5 w-3.5 accent-brand-600"
                                  checked={primaryField.value === `new:${index}` || (!primaryField.value.startsWith("new:") && index === 0)}
                                  onChange={() => primaryField.onChange(`new:${index}`)}
                                />
                                Primary
                              </label>
                              <div className="mt-1 flex justify-end">
                                <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${file.name}`} onClick={() => removeFile(index)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
          )}
        />
      )}
    />
  );
}

function FilePreview({ file, alt }: { file: File; alt: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element -- object URLs cannot be optimised by next/image.
  return <img src={url} alt={alt} className="h-24 w-full rounded-xl object-cover" />;
}
