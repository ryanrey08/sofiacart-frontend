"use client";

import { useState, type FormEvent } from "react";
import { Modal, Notice } from "@/components/admin/ui";
import { ResourcePage } from "@/components/resource-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories, useDeleteCategory, useSaveCategory, type CategoryValues } from "@/lib/hooks/categories";
import { parseApiError } from "@/lib/admin/errors";
import { slugify } from "@/lib/utils";
import type { CategoryResource } from "@/types";

const emptyValues: CategoryValues = { name: "", slug: "", description: "" };

export default function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CategoryResource | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CategoryValues>(emptyValues);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const categories = useCategories(page);
  const save = useSaveCategory();
  const remove = useDeleteCategory();

  const openForm = (category: CategoryResource | null) => {
    setEditing(category);
    setValues(category ? { name: category.name, slug: category.slug, description: category.description } : emptyValues);
    save.reset();
    setOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({ id: editing?.id, values }, {
      onSuccess: (category) => {
        setOpen(false);
        if (!editing) setPage(1);
        setNotice({ tone: "success", text: `${category.name} was saved.` });
      },
    });
  };

  const deleteCategory = (category: CategoryResource) => {
    if (!window.confirm(`Delete ${category.name}? Products in this category may prevent deletion.`)) return;
    setNotice(null);
    remove.mutate(category.id, {
      onSuccess: () => { setPage(1); setNotice({ tone: "success", text: `${category.name} was deleted.` }); },
      onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
    });
  };

  const errors = save.error ? parseApiError(save.error) : null;
  return (
    <>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <ResourcePage<CategoryResource>
        title="Categories"
        description="Organize your store's products into categories."
        actions={<Button onClick={() => openForm(null)}>Add category</Button>}
        data={categories.data?.data ?? []}
        loading={categories.isPending}
        error={categories.isError ? categories.error : null}
        onRetry={() => void categories.refetch()}
        meta={categories.data?.meta}
        onPageChange={setPage}
        statusFilterEnabled={false}
        searchKeys={["name", "slug", "description"]}
        columns={[
          { key: "name", header: "Category", sortable: true },
          { key: "slug", header: "Slug", sortable: true },
          { key: "description", header: "Description" },
          { key: "actions", header: "Actions", render: (category) => (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openForm(category)}>Edit</Button>
              <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => deleteCategory(category)}>Delete</Button>
            </div>
          ) },
        ]}
      />
      <Modal open={open} title={editing ? "Edit category" : "Add category"} onClose={() => { if (!save.isPending) setOpen(false); }}>
        <form className="space-y-4" onSubmit={submit}>
          {errors ? <Notice tone="error">{errors.message}</Notice> : null}
          <label className="block text-sm font-medium">Name
            <Input required maxLength={255} value={values.name} onChange={(event) => setValues((current) => ({
              ...current, name: event.target.value, slug: current.slug === slugify(current.name) ? slugify(event.target.value) : current.slug,
            }))} />
            {errors?.fieldErrors.name?.[0] ? <span className="text-red-700">{errors.fieldErrors.name[0]}</span> : null}
          </label>
          <label className="block text-sm font-medium">Slug
            <Input required maxLength={255} pattern="[A-Za-z0-9_-]+" value={values.slug} onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))} />
            {errors?.fieldErrors.slug?.[0] ? <span className="text-red-700">{errors.fieldErrors.slug[0]}</span> : null}
          </label>
          <label className="block text-sm font-medium">Description
            <textarea className="w-full rounded-xl border border-border p-3" value={values.description ?? ""} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
            {errors?.fieldErrors.description?.[0] ? <span className="text-red-700">{errors.fieldErrors.description[0]}</span> : null}
          </label>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save category"}</Button>
        </form>
      </Modal>
    </>
  );
}
