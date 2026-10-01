"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, MapPin, StickyNote, User, Users } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomer, useUpdateCustomer } from "@/lib/hooks/customers";
import {
  buildCustomerPayload,
  customerDisplayName,
  customerToFormValues,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  emptyCustomerFormValues,
  mapCustomerApiError,
  type CustomerFormField,
} from "@/lib/merchant-customers";
import {
  CUSTOMER_EMAIL_MAX,
  CUSTOMER_GENDER_OPTIONS,
  CUSTOMER_NAME_MAX,
  CUSTOMER_NOTES_MAX,
  CUSTOMER_PHONE_MAX,
  CUSTOMER_TIN_MAX,
  customerFormSchema,
  type CustomerFormValues,
  type ValidatedCustomerForm,
} from "@/lib/validation/customer";
import type { CustomerResource } from "@/types/commerce";

export function CustomerForm({
  customer,
  onSaved,
  onCancel,
}: {
  customer?: CustomerResource;
  /** `mode` is "another" when the merchant chose Save & Add Another, so the caller stays on the form. */
  onSaved: (customer: CustomerResource, mode: "close" | "another") => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(customer);
  const [formError, setFormError] = useState<string | null>(null);
  const [addedAnother, setAddedAnother] = useState<string | null>(null);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues, unknown, ValidatedCustomerForm>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer ? customerToFormValues(customer) : emptyCustomerFormValues,
  });

  const onSubmit = async (values: ValidatedCustomerForm, mode: "close" | "another") => {
    setFormError(null);
    setAddedAnother(null);
    const payload = buildCustomerPayload(values);
    try {
      const saved = customer
        ? await updateMutation.mutateAsync({ id: customer.id, payload })
        : await createMutation.mutateAsync(payload);
      if (!customer && mode === "another") {
        reset(emptyCustomerFormValues);
        setAddedAnother(`${customerDisplayName(saved)} was added. The form is ready for the next customer.`);
        setFocus("firstName");
        onSaved(saved, "another");
        return;
      }
      onSaved(saved, "close");
    } catch (error) {
      const result = mapCustomerApiError(error, "The customer could not be saved. Please try again.");
      (Object.entries(result.fieldErrors) as Array<[CustomerFormField, string]>).forEach(([field, message]) =>
        setError(field, { type: "server", message }),
      );
      setFormError(result.formError);
    }
  };

  // The clicked button decides whether to leave the form or reset it for the next customer.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "another" ? "another" : "close";
    return handleSubmit((values) => onSubmit(values, mode))(event);
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      {!isEdit ? (
        <Button type="submit" name="intent" value="another" disabled={isSubmitting} variant="outline">
          Save &amp; Add Another
        </Button>
      ) : null}
      <Button type="submit" name="intent" value="close" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Save Customer"}
      </Button>
    </div>
  );

  return (
    <form className="space-y-6" onSubmit={handleFormSubmit} noValidate>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">{isEdit ? "Edit Customer" : "Add Customer"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? `Update ${customerDisplayName(customer!)}'s profile and contact details.` : "Create a customer record for orders and follow-ups."}
            </p>
          </div>
          <div className="hidden sm:block">{actions}</div>
        </div>
      </div>

      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {addedAnother ? <Notice tone="success">{addedAnother}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FormSection title="Personal Information" description="How this customer is identified on orders." icon={<User className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name *" htmlFor="customer-first-name" error={errors.firstName?.message}>
                <Input id="customer-first-name" placeholder="e.g. Maria" maxLength={CUSTOMER_NAME_MAX} hasError={!!errors.firstName} {...register("firstName")} />
              </Field>
              <Field label="Last Name" htmlFor="customer-last-name" error={errors.lastName?.message}>
                <Input id="customer-last-name" placeholder="e.g. Santos" maxLength={CUSTOMER_NAME_MAX} hasError={!!errors.lastName} {...register("lastName")} />
              </Field>
              <Field label="Email Address" htmlFor="customer-email" error={errors.email?.message}>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="customer@example.com"
                  maxLength={CUSTOMER_EMAIL_MAX}
                  aria-describedby="customer-contact-hint"
                  hasError={!!errors.email}
                  {...register("email")}
                />
              </Field>
              <Field label="Phone Number" htmlFor="customer-phone" error={errors.phone?.message}>
                <Input
                  id="customer-phone"
                  type="tel"
                  placeholder="+63 912 345 6789"
                  maxLength={CUSTOMER_PHONE_MAX}
                  aria-describedby="customer-contact-hint"
                  hasError={!!errors.phone}
                  {...register("phone")}
                />
              </Field>
              <p id="customer-contact-hint" className="text-xs text-muted-foreground sm:col-span-2">
                Provide at least an email address or a phone number.
              </p>
              <Field label="Birthday" htmlFor="customer-birthday" error={errors.birthday?.message}>
                <Input id="customer-birthday" type="date" max={new Date().toISOString().slice(0, 10)} hasError={!!errors.birthday} {...register("birthday")} />
              </Field>
              <Field label="Gender" htmlFor="customer-gender" error={errors.gender?.message}>
                <SelectInput id="customer-gender" className="h-10 w-full" {...register("gender")}>
                  <option value="">Not specified</option>
                  {CUSTOMER_GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </FormSection>

          <FormSection title="Address" description="Used as the default shipping address on new orders." icon={<MapPin className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street Address" htmlFor="customer-street" error={errors.street?.message} className="sm:col-span-2">
                <Input id="customer-street" placeholder="House/Unit number, street" hasError={!!errors.street} {...register("street")} />
              </Field>
              <Field label="Barangay" htmlFor="customer-barangay" error={errors.barangay?.message}>
                <Input id="customer-barangay" placeholder="Barangay" hasError={!!errors.barangay} {...register("barangay")} />
              </Field>
              <Field label="City / Municipality" htmlFor="customer-city" error={errors.city?.message}>
                <Input id="customer-city" placeholder="City" hasError={!!errors.city} {...register("city")} />
              </Field>
              <Field label="Province" htmlFor="customer-province" error={errors.province?.message}>
                <Input id="customer-province" placeholder="Province" hasError={!!errors.province} {...register("province")} />
              </Field>
              <Field label="Postal Code" htmlFor="customer-postal-code" error={errors.postalCode?.message}>
                <Input id="customer-postal-code" inputMode="numeric" placeholder="1000" hasError={!!errors.postalCode} {...register("postalCode")} />
              </Field>
              <Field label="Country" htmlFor="customer-country" error={errors.country?.message}>
                <Input id="customer-country" placeholder="Philippines" hasError={!!errors.country} {...register("country")} />
              </Field>
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Customer Type" description="Segment this customer for pricing and reporting." icon={<Users className="h-4 w-4" />}>
            <div className="space-y-4">
              <Field label="Type" htmlFor="customer-type" error={errors.customerType?.message}>
                <SelectInput id="customer-type" className="h-10 w-full" {...register("customerType")}>
                  {CUSTOMER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Status" htmlFor="customer-status" error={errors.status?.message}>
                <SelectInput id="customer-status" className="h-10 w-full" {...register("status")}>
                  {CUSTOMER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                Customers are store records, not sign-in accounts: SofiaCart has no customer login, password or welcome email to send from here.
              </p>
            </div>
          </FormSection>

          <FormSection title="Additional Information" description="Optional details for your team." icon={<StickyNote className="h-4 w-4" />}>
            <div className="space-y-4">
              <Field label="TIN" htmlFor="customer-tin" error={errors.tin?.message}>
                <Input id="customer-tin" placeholder="000-000-000-000" maxLength={CUSTOMER_TIN_MAX} hasError={!!errors.tin} {...register("tin")} />
              </Field>
              <Field label="Tags" htmlFor="customer-tags" error={errors.tags?.message}>
                <Input id="customer-tags" placeholder="wholesale, manila" aria-describedby="customer-tags-hint" hasError={!!errors.tags} {...register("tags")} />
                <p id="customer-tags-hint" className="mt-1 text-xs text-muted-foreground">
                  Separate tags with commas.
                </p>
              </Field>
              <Field label="Notes" htmlFor="customer-notes" error={errors.notes?.message}>
                <Textarea id="customer-notes" rows={4} maxLength={CUSTOMER_NOTES_MAX} placeholder="Delivery preferences, reminders…" hasError={!!errors.notes} {...register("notes")} />
              </Field>
            </div>
          </FormSection>
        </div>
      </div>

      <div className="sm:hidden">{actions}</div>
    </form>
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
