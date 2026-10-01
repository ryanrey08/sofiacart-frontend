"use client";

import { useMemo, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArrowLeft, Eye, ImageIcon, Info, Loader2, Search, Settings2, Trash2 } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { CategoryThumb } from "@/components/merchant/category-image";
import { ImageDropzone, useObjectUrl } from "@/components/merchant/image-dropzone";
import { RichTextEditor, sanitizeRichText } from "@/components/merchant/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCategoryOptions, useCreateCategory, useUpdateCategory, useUploadCategoryImage } from "@/lib/hooks/categories";
import {
  buildCategoryPayload,
  categoryImagePath,
  categoryToFormValues,
  emptyCategoryFormValues,
  mapCategoryApiError,
  type CategoryFormField,
} from "@/lib/merchant-categories";
import { cn, slugify } from "@/lib/utils";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_META_DESCRIPTION_HINT,
  CATEGORY_META_TITLE_HINT,
  CATEGORY_NAME_MAX,
  categoryFormSchema,
  richTextLength,
  richTextToPlainText,
  type CategoryFormValues,
  type ValidatedCategoryForm,
} from "@/lib/validation/category";
import type { CategoryResource } from "@/types";

export function CategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category?: CategoryResource;
  onSaved: (category: CategoryResource) => void;
  onCancel: () => void;
}) {
  // After a create succeeds but the image upload fails, later submits update the created record.
  const [savedCategory, setSavedCategory] = useState<CategoryResource | null>(category ?? null);
  const isEdit = Boolean(category);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const options = useCategoryOptions();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const uploadMutation = useUploadCategoryImage();

  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<CategoryFormValues, unknown, ValidatedCategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ? categoryToFormValues(category) : emptyCategoryFormValues,
  });

  const [name, description, metaTitle, metaDescription, image, isActive] = useWatch({
    control,
    name: ["name", "description", "metaTitle", "metaDescription", "image", "isActive"],
  });
  const imageUrl = useObjectUrl(image ?? null);
  const descriptionLength = richTextLength(description);

  // A category cannot be its own parent or the parent of one of its ancestors.
  const parentOptions = useMemo(() => {
    const all = options.data?.data ?? [];
    if (!savedCategory) return all;
    const excluded = new Set([savedCategory.id]);
    let grew = true;
    while (grew) {
      grew = false;
      all.forEach((option) => {
        if (option.parent_id && excluded.has(option.parent_id) && !excluded.has(option.id)) {
          excluded.add(option.id);
          grew = true;
        }
      });
    }
    return all.filter((option) => !excluded.has(option.id));
  }, [options.data, savedCategory]);
  const missingParent =
    category?.parent_id && options.data && !parentOptions.some((option) => option.id === category.parent_id) ? category : null;

  const onSubmit = async (values: ValidatedCategoryForm) => {
    setFormError(null);
    const cleanDescription = sanitizeRichText(values.description);
    const payload = buildCategoryPayload({ ...values, description: cleanDescription }, richTextLength(cleanDescription) > 0);

    let saved: CategoryResource;
    try {
      saved = savedCategory
        ? await updateMutation.mutateAsync({ id: savedCategory.id, payload })
        : await createMutation.mutateAsync(payload);
      setSavedCategory(saved);
    } catch (error) {
      const result = mapCategoryApiError(error, "The category could not be saved. Please try again.");
      (Object.entries(result.fieldErrors) as Array<[CategoryFormField, string]>).forEach(([field, message]) =>
        setError(field, { type: "server", message }),
      );
      setFormError(result.formError);
      return;
    }

    if (values.image) {
      try {
        saved = await uploadMutation.mutateAsync({ id: saved.id, file: values.image });
      } catch (error) {
        const result = mapCategoryApiError(error, "The image could not be uploaded.");
        setError("image", { type: "server", message: result.fieldErrors.image ?? result.formError ?? "The image could not be uploaded." });
        setFormError(`The category details were saved, but the image could not be uploaded. ${result.formError ?? ""}`.trim());
        return;
      }
    }

    onSaved(saved);
  };

  const nameField = register("name");
  const slugField = register("slug");
  const existingImage = savedCategory ? categoryImagePath(savedCategory) : null;
  const previewDescription = richTextToPlainText(description);

  const actions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Saving…" : "Save Category"}
      </Button>
    </div>
  );

  return (
    <form className="space-y-6 pb-24 sm:pb-0" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">{isEdit ? "Edit Category" : "Add Category"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? `Update ${category?.name} and how it appears in your store.` : "Create a new category to organize your products."}
            </p>
          </div>
          <div className="hidden sm:block">{actions}</div>
        </div>
      </div>

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FormSection title="Category Information" description="Basic details about this category." icon={<Info className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category Name *" htmlFor="category-name" error={errors.name?.message}>
                <Input
                  id="category-name"
                  placeholder="e.g. Electronics"
                  maxLength={CATEGORY_NAME_MAX}
                  hasError={!!errors.name}
                  {...nameField}
                  onChange={(event) => {
                    void nameField.onChange(event);
                    if (!slugTouched) setValue("slug", slugify(event.target.value), { shouldValidate: isSubmitted });
                  }}
                />
              </Field>
              <Field label="Parent Category" htmlFor="category-parent" error={errors.parentId?.message}>
                <SelectInput id="category-parent" className="h-10 w-full" disabled={options.isPending} {...register("parentId")}>
                  <option value="">{options.isPending ? "Loading categories…" : "None (Main Category)"}</option>
                  {missingParent ? (
                    <option value={String(missingParent.parent_id)}>{missingParent.parent?.name ?? `Category #${missingParent.parent_id}`}</option>
                  ) : null}
                  {parentOptions.map((option) => (
                    <option key={option.id} value={String(option.id)}>
                      {option.name}
                    </option>
                  ))}
                </SelectInput>
                {options.isError ? <p className="mt-1 text-xs text-amber-700">Parent categories couldn’t be loaded.</p> : null}
              </Field>
              <Field label="Slug *" htmlFor="category-slug" error={errors.slug?.message}>
                <Input
                  id="category-slug"
                  placeholder="e.g. electronics"
                  hasError={!!errors.slug}
                  aria-describedby="category-slug-hint"
                  {...slugField}
                  onChange={(event) => {
                    setSlugTouched(true);
                    void slugField.onChange(event);
                  }}
                />
                <p id="category-slug-hint" className="mt-1 text-xs text-muted-foreground">
                  Auto-generated from the name. Lowercase letters, numbers and hyphens only.
                </p>
              </Field>
              <Field label="Sort Order" htmlFor="category-sort-order" error={errors.sortOrder?.message}>
                <Input id="category-sort-order" inputMode="numeric" placeholder="0" hasError={!!errors.sortOrder} {...register("sortOrder")} />
                <p className="mt-1 text-xs text-muted-foreground">Lower numbers appear first.</p>
              </Field>
              <div className="sm:col-span-2">
                <Label id="category-description-label" htmlFor="category-description">
                  Description
                </Label>
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <RichTextEditor
                      id="category-description"
                      labelledBy="category-description-label"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter category description…"
                      length={descriptionLength}
                      maxLength={CATEGORY_DESCRIPTION_MAX}
                      hasError={!!errors.description}
                    />
                  )}
                />
                {errors.description?.message ? <p className="mt-2 text-sm text-red-600">{errors.description.message}</p> : null}
              </div>
            </div>
          </FormSection>

          <FormSection
            title="SEO Settings"
            description="Optional. Improve how this category appears in search results."
            icon={<Search className="h-4 w-4" />}
          >
            <div className="space-y-4">
              <Field label="Meta Title" htmlFor="category-meta-title" error={errors.metaTitle?.message}>
                <Input id="category-meta-title" placeholder="Enter meta title" hasError={!!errors.metaTitle} {...register("metaTitle")} />
                <CounterHint value={metaTitle.trim().length} hint={CATEGORY_META_TITLE_HINT} />
              </Field>
              <Field label="Meta Description" htmlFor="category-meta-description" error={errors.metaDescription?.message}>
                <Textarea
                  id="category-meta-description"
                  rows={3}
                  placeholder="Enter meta description"
                  hasError={!!errors.metaDescription}
                  {...register("metaDescription")}
                />
                <CounterHint value={metaDescription.trim().length} hint={CATEGORY_META_DESCRIPTION_HINT} />
              </Field>
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Category Image" description="Shown on category pages and menus." icon={<ImageIcon className="h-4 w-4" />}>
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <div className="space-y-3">
                  {imageUrl || existingImage ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- object URLs cannot be optimised by next/image.
                        <img src={imageUrl} alt="New category image preview" className="aspect-[3/2] w-full object-cover" />
                      ) : savedCategory ? (
                        <CategoryThumb category={savedCategory} className="aspect-[3/2] h-auto w-full rounded-none" />
                      ) : null}
                      {field.value ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-2"
                          onClick={() => {
                            field.onChange(null);
                            clearErrors("image");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {field.value ? <p className="truncate text-xs text-slate-600">{field.value.name}</p> : null}
                  <ImageDropzone
                    id="category-image"
                    describedBy="category-image-hint"
                    hasError={!!errors.image}
                    disabled={isSubmitting}
                    onSelect={(file) => {
                      clearErrors("image");
                      field.onChange(file);
                    }}
                    onInvalid={(message) => setError("image", { type: "manual", message })}
                  />
                  {errors.image?.message ? <p className="text-sm text-red-600">{errors.image.message}</p> : null}
                </div>
              )}
            />
          </FormSection>

          <FormSection title="Display Settings" description="Control where this category appears." icon={<Settings2 className="h-4 w-4" />}>
            <div className="space-y-3">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <ToggleRow
                    id="category-active"
                    label="Active"
                    description="Make this category visible to customers."
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="showInNav"
                render={({ field }) => (
                  <ToggleRow
                    id="category-show-in-nav"
                    label="Show in Navigation Menu"
                    description="Display this category in the store menu."
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </FormSection>

          <FormSection title="Live Preview" description="How this category will look." icon={<Eye className="h-4 w-4" />}>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URLs cannot be optimised by next/image.
                <img src={imageUrl} alt="" className="aspect-[3/2] w-full object-cover" />
              ) : (
                <CategoryThumb
                  category={{ name: name || "Category", image: savedCategory?.image, image_url: savedCategory?.image_url }}
                  className="aspect-[3/2] h-auto w-full rounded-none"
                />
              )}
              <div className="space-y-1.5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-navy-900">{name.trim() || "Category name"}</p>
                  <Badge variant={isActive ? "success" : "destructive"}>{isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{previewDescription || "Category description will appear here."}</p>
              </div>
            </div>
          </FormSection>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-soft sm:hidden">
        {actions}
      </div>
    </form>
  );
}

function CounterHint({ value, hint }: { value: number; hint: { min: number; max: number } }) {
  const inRange = value >= hint.min && value <= hint.max;
  return (
    <p className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
      <span>
        Recommended: {hint.min}–{hint.max} characters
      </span>
      <span className={cn(value > hint.max ? "font-semibold text-amber-700" : inRange ? "font-semibold text-green-700" : "")}>
        {value}/{hint.max}
      </span>
    </p>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium text-slate-800">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
          checked ? "bg-brand-600" : "bg-slate-300",
        )}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function FormSection({ title, description, icon, children }: { title: string; description?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          {icon ? <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</span> : null}
          <div>
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
