"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, Modal, Notice, SelectInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateMerchantProfile } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { useProvinceCities, useRegistrationOptions } from "@/lib/hooks/registration-options";
import {
  MERCHANT_DOCUMENTS,
  MERCHANT_FIELD_GROUPS,
  MERCHANT_FIELD_LABELS,
  MERCHANT_MULTILINE_FIELDS,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  fieldLabel,
  validateDocument,
} from "@/lib/merchant-profile";
import { withCurrentValue } from "@/lib/registration-options";
import { merchantProfileSchema } from "@/lib/validation/merchant-profile";
import type { AdminMerchant, MerchantDocument } from "@/types/admin";

// Details only SofiaCart may change (the merchant's own Store Profile cannot edit these).
const ADMIN_FIELDS = [
  { key: "tin", label: "TIN" },
  { key: "business_permit_number", label: "DTI/SEC/Business Permit No." },
  { key: "owner_birth_date", label: "Owner birth date", type: "date" },
  { key: "government_id_type", label: "Government ID type" },
  { key: "government_id_number", label: "Government ID number" },
  { key: "government_id_expiry_date", label: "Government ID expiry date", type: "date" },
] as const;

type ProfileField = (typeof MERCHANT_FIELD_GROUPS)[number]["fields"][number];
type AdminField = (typeof ADMIN_FIELDS)[number]["key"];
type FormField = ProfileField | AdminField | (typeof SOCIAL_LINK_KEYS)[number];
type Values = Record<FormField, string>;

const OPTIONAL_FIELDS = new Set<FormField>(["store_description", ...SOCIAL_LINK_KEYS]);

function initialValues(merchant: AdminMerchant): Values {
  const values = {} as Values;
  for (const group of MERCHANT_FIELD_GROUPS) {
    for (const field of group.fields) values[field] = merchant[field] ?? "";
  }
  for (const { key } of ADMIN_FIELDS) values[key] = merchant[key] ?? "";
  for (const key of SOCIAL_LINK_KEYS) values[key] = merchant.social_links?.[key] ?? "";
  return values;
}

function without<T extends object>(record: T, key: string): T {
  const next = { ...record };
  delete next[key as keyof T];
  return next;
}

function label(field: FormField) {
  return ADMIN_FIELDS.find((item) => item.key === field)?.label ?? SOCIAL_LINK_LABELS[field as (typeof SOCIAL_LINK_KEYS)[number]] ?? MERCHANT_FIELD_LABELS[field as ProfileField];
}

// Maps a Laravel error key (social_links.facebook, tin, ...) to a form field or document.
function errorTarget(apiField: string): string {
  return apiField.match(/^social_links\.(\w+)$/)?.[1] ?? apiField;
}

/**
 * Super Admin edit of a merchant's details and documents. Saved changes are live immediately (no
 * approval step), unlike the merchant's own Store Profile edits.
 */
export function MerchantEditModal({
  merchant,
  open,
  onClose,
  onSaved,
}: {
  merchant: AdminMerchant;
  open: boolean;
  onClose: () => void;
  onSaved: (merchant: AdminMerchant, message: string) => void;
}) {
  return (
    <Modal open={open} title={`Edit ${merchant.store_name}`} onClose={onClose} wide>
      {open ? <MerchantEditForm merchant={merchant} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function MerchantEditForm({
  merchant,
  onClose,
  onSaved,
}: {
  merchant: AdminMerchant;
  onClose: () => void;
  onSaved: (merchant: AdminMerchant, message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => initialValues(merchant));
  const [uploads, setUploads] = useState<Partial<Record<MerchantDocument, File>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const registrationOptions = useRegistrationOptions();
  const catalog = registrationOptions.data;
  const provinceCities = useProvinceCities(catalog, values.province);

  const set = (field: FormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value, ...(field === "province" ? { city: "" } : {}) }));
    setErrors((current) => without(current, field));
  };

  // A list renders a dropdown, `undefined` a loading dropdown, `null` a text input.
  const choicesFor = (field: FormField): readonly string[] | undefined | null => {
    if (registrationOptions.isError) return null;
    const current = (merchant as unknown as Record<string, string | null>)[field] ?? null;
    switch (field) {
      case "business_type":
        return catalog && withCurrentValue(catalog.business_types, current);
      case "business_category":
      case "store_category":
        return catalog && withCurrentValue(catalog.categories, current);
      case "government_id_type":
        return catalog && withCurrentValue(catalog.government_id_types, current);
      case "province":
        return catalog && withCurrentValue(catalog.provinces.map((item) => item.name), current);
      case "city":
        if (!catalog) return undefined;
        if (!provinceCities.cities || provinceCities.isError) return null;
        if (provinceCities.isLoading) return undefined;
        return values.province === merchant.province ? withCurrentValue(provinceCities.cities, current) : provinceCities.cities;
      default:
        return null;
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      for (const group of MERCHANT_FIELD_GROUPS) {
        for (const field of group.fields) data.append(field, values[field].trim());
      }
      for (const { key } of ADMIN_FIELDS) data.append(key, values[key].trim());
      const links = SOCIAL_LINK_KEYS.filter((key) => values[key].trim());
      if (links.length === 0) data.append("social_links", "");
      for (const key of links) data.append(`social_links[${key}]`, values[key].trim());
      for (const [key, file] of Object.entries(uploads)) if (file) data.append(key, file);
      return updateMerchantProfile(merchant.id, data);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "merchants", merchant.id, "history"] });
      onSaved(result.data, result.message);
    },
    onError: (failure) => {
      const details = parseApiError(failure, "The merchant details could not be saved.");
      const mapped: Record<string, string> = {};
      for (const [apiField, messages] of Object.entries(details.fieldErrors)) {
        if (apiField !== "changes" && messages[0]) mapped[errorTarget(apiField)] = messages[0];
      }
      setErrors(mapped);
      setFormError(Object.keys(mapped).length > 0 ? "Some details need attention. Review the highlighted fields." : (details.fieldErrors.changes?.[0] ?? details.message));
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    const parsed = merchantProfileSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        found[key] ??= issue.message;
      }
    }
    for (const { key, label: name } of ADMIN_FIELDS) {
      if (!values[key].trim()) found[key] = `${name} is required`;
    }
    for (const [key, file] of Object.entries(uploads)) {
      const problem = file ? validateDocument(key as MerchantDocument, file) : null;
      if (problem) found[key] = problem;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return setFormError("Some details need attention. Review the highlighted fields.");
    mutation.mutate();
  };

  const renderField = (field: FormField, type?: string) => {
    const id = `merchant-edit-${field}`;
    const choices = choicesFor(field);
    const required = !OPTIONAL_FIELDS.has(field);
    return (
      <Field
        key={field}
        label={`${label(field)}${required ? " *" : ""}`}
        htmlFor={id}
        error={errors[field]}
        className={MERCHANT_MULTILINE_FIELDS.has(field as ProfileField) ? "sm:col-span-2" : undefined}
      >
        {MERCHANT_MULTILINE_FIELDS.has(field as ProfileField) ? (
          <Textarea id={id} className="min-h-20" hasError={!!errors[field]} value={values[field]} onChange={(event) => set(field, event.target.value)} />
        ) : choices !== null ? (
          <SelectInput
            id={id}
            className={errors[field] ? "w-full border-red-400" : "w-full"}
            aria-invalid={errors[field] ? true : undefined}
            disabled={!choices}
            value={values[field]}
            onChange={(event) => set(field, event.target.value)}
          >
            <option value="">{choices ? `Select ${label(field).toLowerCase()}` : "Loading choices…"}</option>
            {choices?.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </SelectInput>
        ) : (
          <Input
            id={id}
            type={type ?? (field.endsWith("email") ? "email" : field.endsWith("phone") ? "tel" : SOCIAL_LINK_KEYS.includes(field as never) ? "url" : "text")}
            hasError={!!errors[field]}
            value={values[field]}
            onChange={(event) => set(field, event.target.value)}
          />
        )}
      </Field>
    );
  };

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <Notice tone="info">Changes you save here are applied immediately. They do not need approval and the merchant is notified.</Notice>
      {merchant.pending_change_request ? (
        <Notice tone="info">
          The merchant also has changes awaiting your review ({merchant.pending_change_request.fields.map(fieldLabel).join(", ")}). Approving them later
          replaces those fields with the merchant&apos;s requested values.
        </Notice>
      ) : null}
      <fieldset disabled={mutation.isPending} className="space-y-6">
        {MERCHANT_FIELD_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-sm font-semibold text-navy-900">{group.title}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">{group.fields.map((field) => renderField(field))}</div>
          </section>
        ))}
        <section>
          <h3 className="text-sm font-semibold text-navy-900">Compliance details</h3>
          <p className="text-xs text-muted-foreground">Only SofiaCart can change these. The store URL is not edited here.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">{ADMIN_FIELDS.map((item) => renderField(item.key, "type" in item ? item.type : undefined))}</div>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-navy-900">Social links</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">{SOCIAL_LINK_KEYS.map((key) => renderField(key))}</div>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-navy-900">Replace files</h3>
          <p className="text-xs text-muted-foreground">Leave empty to keep the current file.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {MERCHANT_DOCUMENTS.map((doc) => (
              <Field key={doc.key} label={`${doc.label} (${doc.description})`} htmlFor={`merchant-edit-${doc.key}`} error={errors[doc.key]}>
                <Input
                  id={`merchant-edit-${doc.key}`}
                  type="file"
                  accept={doc.accept}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setUploads((current) => (file ? { ...current, [doc.key]: file } : without(current, doc.key)));
                    setErrors((current) => without(current, doc.key));
                  }}
                />
              </Field>
            ))}
          </div>
        </section>
      </fieldset>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
