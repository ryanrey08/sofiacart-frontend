"use client";

import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ClipboardCheck, FileCheck2, FileText, ImageIcon, Loader2, Store, UploadCloud, UserCircle2 } from "lucide-react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepperNav, type StepItem } from "@/components/stepper-nav";
import api from "@/lib/api/axios";
import { getStoredAuth } from "@/lib/auth";
import { buildMerchantRegistrationFormData } from "@/lib/merchant-registration";
import { cn, slugify } from "@/lib/utils";
import {
  merchantRegistrationSchema,
  type MerchantRegistrationSchema,
  type ValidatedMerchantRegistration,
} from "@/lib/validation/merchant";
import type { MerchantRegistrationResponse } from "@/types";

const steps: StepItem[] = [
  { id: 1, title: "Business Details", description: "Verify legal business information" },
  { id: 2, title: "Store Information", description: "Set up your customer-facing storefront" },
  { id: 3, title: "Owner Information", description: "Confirm the authorized merchant owner" },
  { id: 4, title: "Review & Submit", description: "Double-check your application details" },
];

const fieldGroups: Record<number, (keyof MerchantRegistrationSchema)[]> = {
  1: ["name", "email", "password", "passwordConfirmation", "phone", "businessName", "businessType", "permitNumber", "tin", "businessCategory", "businessPermit", "businessAddress", "city", "province", "zipCode"],
  2: ["storeName", "storeSlug", "storeCategory", "storeDescription", "storeContactNumber", "storeEmail", "storeAddress", "storeLogo", "storeBanner", "facebook", "instagram", "tiktok", "website"],
  3: ["ownerFullName", "ownerPosition", "ownerEmail", "ownerContactNumber", "dateOfBirth", "governmentIdType", "governmentIdNumber", "governmentIdExpiry", "governmentIdFile"],
  4: [],
};

const defaultValues: MerchantRegistrationSchema = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  phone: "",
  businessName: "",
  businessType: "",
  permitNumber: "",
  tin: "",
  businessCategory: "",
  businessPermit: null,
  businessAddress: "",
  city: "",
  province: "",
  zipCode: "",
  storeName: "",
  storeSlug: "",
  storeCategory: "",
  storeDescription: "",
  storeContactNumber: "",
  storeEmail: "",
  storeAddress: "",
  storeLogo: null,
  storeBanner: null,
  facebook: "",
  instagram: "",
  tiktok: "",
  website: "",
  ownerFullName: "",
  ownerPosition: "",
  ownerEmail: "",
  ownerContactNumber: "",
  dateOfBirth: "",
  governmentIdType: "",
  governmentIdNumber: "",
  governmentIdExpiry: "",
  governmentIdFile: null,
};

const registrationErrorFields: Record<string, keyof MerchantRegistrationSchema> = {
  name: "name",
  email: "email",
  password: "password",
  password_confirmation: "passwordConfirmation",
  phone: "phone",
  business_name: "businessName",
  business_type: "businessType",
  business_permit_number: "permitNumber",
  tin: "tin",
  business_category: "businessCategory",
  business_permit: "businessPermit",
  business_address: "businessAddress",
  city: "city",
  province: "province",
  zip_code: "zipCode",
  store_name: "storeName",
  store_slug: "storeSlug",
  store_category: "storeCategory",
  store_description: "storeDescription",
  store_address: "storeAddress",
  contact_phone: "storeContactNumber",
  contact_email: "storeEmail",
  owner_name: "ownerFullName",
  owner_position: "ownerPosition",
  owner_email: "ownerEmail",
  owner_phone: "ownerContactNumber",
  owner_birth_date: "dateOfBirth",
  government_id_type: "governmentIdType",
  government_id_number: "governmentIdNumber",
  government_id_expiry_date: "governmentIdExpiry",
  government_id: "governmentIdFile",
  "social_links.facebook": "facebook",
  "social_links.instagram": "instagram",
  "social_links.tiktok": "tiktok",
  "social_links.website": "website",
};

function hasRegisteredMerchant() {
  const user = getStoredAuth()?.user;
  return Boolean(user && (user.role === "merchant" || user.merchant));
}

function subscribeToAuth(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getMerchantAuthSnapshot(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  return hasRegisteredMerchant();
}

const options = {
  businessTypes: ["Sole Proprietorship", "Partnership", "Corporation", "Cooperative"],
  categories: ["Beauty", "Fashion", "Home", "Food", "Electronics", "Lifestyle"],
  provinces: ["Metro Manila", "Cebu", "Davao del Sur", "Laguna", "Pampanga"],
  idTypes: ["Passport", "Driver's License", "UMID", "PhilSys ID", "Postal ID"],
};

const selectClass = "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200";

function errorId(name: string) {
  return `${name}-error`;
}

function FieldError({ name, message }: { name: string; message?: string }) {
  if (!message) return null;
  return <p id={errorId(name)} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="md:col-span-2">
      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">{title}</h3>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function FileUploadField({
  id,
  label,
  accept,
  hint,
  error,
  file,
  onFileChange,
}: {
  id: string;
  label: string;
  accept: string;
  hint: string;
  error?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</p>
      <input
        id={id}
        type="file"
        accept={accept}
        className="peer sr-only"
        aria-labelledby={`${id}-label ${id}-action`}
        aria-describedby={error ? `${hintId} ${errorId(id)}` : hintId}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-[#faf9fe] px-3 py-3 transition hover:border-brand-400 hover:bg-brand-50 peer-focus-visible:border-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200",
          error ? "border-red-400" : "border-brand-200",
        )}
      >
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
          {file ? <FileCheck2 className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span id={`${id}-action`} className="block truncate text-sm font-semibold text-navy-900">{file ? file.name : "Click to upload a file"}</span>
          <span id={hintId} className="block text-xs text-slate-500">{hint}</span>
        </span>
        <span aria-hidden="true" className="hidden rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 sm:inline">{file ? "Replace" : "Browse"}</span>
      </label>
      <FieldError name={id} message={error} />
    </div>
  );
}

function PreviewTile({ label, file, preview, shape = "wide" }: { label: string; file: File | null; preview: string | null; shape?: "square" | "wide" }) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-3">
      <figcaption className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
        <span>{label}</span>
        {file ? <span className="truncate font-normal text-slate-400">{file.name}</span> : null}
      </figcaption>
      <div className={cn("relative mt-2 flex items-center justify-center overflow-hidden rounded-lg bg-[#f4f2fb] text-slate-400", shape === "square" ? "mx-auto aspect-square w-28" : "h-28 w-full")}>
        {preview ? (
          <Image src={preview} alt={`${label} of the selected file`} fill unoptimized className="object-cover" />
        ) : file ? (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-xs"><FileText aria-hidden="true" className="h-6 w-6" />Preview not available for this file type</span>
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-xs"><ImageIcon aria-hidden="true" className="h-6 w-6" />No image selected yet</span>
        )}
      </div>
    </figure>
  );
}

export function MerchantRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasMerchantOverride, setHasMerchantOverride] = useState<boolean | null>(null);
  const [registrationResponse, setRegistrationResponse] = useState<MerchantRegistrationResponse | null>(null);
  const merchantAuth = useSyncExternalStore<boolean | undefined>(
    subscribeToAuth,
    getMerchantAuthSnapshot,
    () => undefined,
  );
  const hasMerchant = hasMerchantOverride ?? merchantAuth === true;
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    getValues,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MerchantRegistrationSchema, unknown, ValidatedMerchantRegistration>({
    resolver: zodResolver(merchantRegistrationSchema),
    defaultValues,
    mode: "onTouched",
  });

  const storeName = useWatch({ control, name: "storeName" }) ?? "";
  const storeSlug = useWatch({ control, name: "storeSlug" }) ?? "";
  const storeDescription = useWatch({ control, name: "storeDescription" }) ?? "";
  const logoFile = useWatch({ control, name: "storeLogo" }) ?? null;
  const bannerFile = useWatch({ control, name: "storeBanner" }) ?? null;
  const governmentIdFile = useWatch({ control, name: "governmentIdFile" }) ?? null;
  const businessPermit = useWatch({ control, name: "businessPermit" }) ?? null;

  useEffect(() => {
    if (!slugEdited) {
      setValue("storeSlug", slugify(storeName), { shouldValidate: currentStep >= 2 });
    }
  }, [currentStep, setValue, slugEdited, storeName]);

  const slugFormatValid = useMemo(() => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug), [storeSlug]);

  useEffect(() => {
    return () => {
      [logoPreview, bannerPreview, idPreview].forEach((preview) => {
        if (preview?.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [bannerPreview, idPreview, logoPreview]);

  const updatePreview = (
    file: File | null,
    currentPreview: string | null,
    setPreview: (value: string | null) => void,
  ) => {
    if (currentPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }

    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }

    setPreview(URL.createObjectURL(file));
  };

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousRenderedStep = useRef(currentStep);
  useEffect(() => {
    if (previousRenderedStep.current === currentStep) return;
    previousRenderedStep.current = currentStep;
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  const nextStep = async () => {
    const isValid = await trigger(fieldGroups[currentStep], { shouldFocus: true });
    if (isValid) {
      setCurrentStep((step) => Math.min(4, step + 1));
    }
  };

  const previousStep = () => setCurrentStep((step) => Math.max(1, step - 1));

  const submitApplication = async (values: ValidatedMerchantRegistration) => {
    if (currentStep !== 4) return;
    setSubmitError(null);
    clearErrors();
    if (hasRegisteredMerchant()) {
      setHasMerchantOverride(true);
      return;
    }

    try {
      const response = await api.post<MerchantRegistrationResponse>(
        "/api/merchant/register",
        buildMerchantRegistrationFormData(values),
      );
      setRegistrationResponse(response.data);
    } catch (error: unknown) {
      if (isAxiosError<{ message?: string; errors?: Record<string, string | string[]> }>(error)) {
        const status = error.response?.status;
        const validationErrors = error.response?.data?.errors;
        if (!error.response) {
          setSubmitError("We couldn't reach the registration service. Check your internet connection, API URL, and backend CORS settings, then try again.");
          return;
        }
        if (status === 422 && validationErrors) {
          let earliestStep = 4;
          let mappedErrors = 0;
          for (const [backendField, messages] of Object.entries(validationErrors)) {
            const message = Array.isArray(messages) ? messages[0] : messages;
            if (!message) continue;
            const fields: (keyof MerchantRegistrationSchema)[] = backendField === "social_links"
              ? ["facebook", "instagram", "tiktok", "website"]
              : registrationErrorFields[backendField] ? [registrationErrorFields[backendField]] : [];
            fields.forEach((field) => {
              setError(field, { type: "server", message });
              mappedErrors += 1;
              const step = Object.entries(fieldGroups).find(([, groupFields]) => groupFields.includes(field))?.[0];
              if (step) earliestStep = Math.min(earliestStep, Number(step));
            });
          }
          if (mappedErrors > 0) setCurrentStep(earliestStep);
          setSubmitError(mappedErrors > 0
            ? "The server rejected some details. Please review the highlighted fields."
            : error.response?.data?.message ?? "Please review the registration details and try again.");
          return;
        }
        if (status === 409) {
          setSubmitError("A registration with one or more of these details already exists. Review your email, TIN, and store URL.");
          return;
        }
        if (status === 401 || status === 403) {
          setSubmitError("Your current session cannot submit this registration. Sign out and try again, or sign in to your existing merchant account.");
          return;
        }
        setSubmitError(error.response?.data?.message ?? "We could not submit your registration. Please try again.");
        return;
      }

      setSubmitError("We couldn't reach the registration service. Check your internet connection, API URL, and backend CORS settings, then try again.");
    }
  };

  const renderInput = (name: keyof MerchantRegistrationSchema, label: string, props?: Partial<ComponentProps<typeof Input>>) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} hasError={!!errors[name]} aria-describedby={errors[name] ? errorId(name) : undefined} {...register(name)} {...props} />
      <FieldError name={name} message={errors[name]?.message as string | undefined} />
    </div>
  );

  const renderSelect = (name: "businessType" | "businessCategory" | "province" | "storeCategory" | "governmentIdType", label: string, placeholder: string, values: string[]) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? errorId(name) : undefined}
        className={cn(selectClass, errors[name] ? "border-red-400" : "border-slate-200")}
        {...register(name)}
      >
        <option value="">{placeholder}</option>
        {values.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <FieldError name={name} message={errors[name]?.message} />
    </div>
  );

  if (merchantAuth === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#f6f5fb] px-4">
        <h1 className="text-2xl font-semibold text-navy-900">Merchant registration</h1>
        <p role="status" className="text-sm text-muted-foreground">Checking your account…</p>
      </div>
    );
  }

  if (hasMerchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5fb] px-4 py-8">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-navy-900">A merchant account is already signed in</CardTitle>
            <CardDescription>
              Sign out of your current merchant account before starting another registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild><Link href="/dashboard">Go to merchant dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationResponse) {
    const status = registrationResponse.merchant.status;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5fb] px-4 py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
            </div>
            <CardTitle className="text-3xl text-navy-900">Registration submitted</CardTitle>
            <CardDescription>{registrationResponse.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <p className="text-sm text-slate-700">
              Application status: <strong className="capitalize">{status.replaceAll("_", " ")}</strong>
              {status === "pending" ? " — your application is awaiting approval." : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Account created for {registrationResponse.user.name} ({registrationResponse.user.email}).
            </p>
            <Button asChild><Link href="/login">Continue to sign in</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeStep = steps[currentStep - 1];
  const StepIcon = currentStep === 1 ? Building2 : currentStep === 2 ? Store : currentStep === 3 ? UserCircle2 : ClipboardCheck;
  const progressPercent = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="min-h-screen bg-[#f6f5fb] lg:flex">
      <aside className="bg-brand-rail text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[300px] lg:shrink-0 lg:flex-col lg:overflow-y-auto xl:w-[340px]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-6 lg:pt-8">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-300">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sunset-500 to-brand-500 text-base font-bold shadow-lg shadow-black/20">SC</span>
            <span>
              <span className="block text-lg font-bold leading-tight">SofiaCart</span>
              <span className="block text-xs text-white/60">Merchant onboarding</span>
            </span>
          </Link>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold lg:hidden">Step {currentStep} of {steps.length}</span>
        </div>
        <div className="hidden px-6 lg:block">
          <h2 className="mt-6 text-2xl font-bold leading-snug">Start selling on SofiaCart</h2>
          <p className="mt-2 text-sm text-white/70">Complete four quick steps to submit your store for review.</p>
          <StepperNav steps={steps} currentStep={currentStep} variant="rail" className="mt-8" />
        </div>
        <div className="mt-auto hidden px-6 pb-8 pt-8 lg:block">
          <ul className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white/80">
            <li className="flex gap-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sunset-300" />Catalog, orders and reporting tools in one place.</li>
            <li className="flex gap-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sunset-300" />Flexible storefront branding.</li>
            <li className="flex gap-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sunset-300" />Guided onboarding with document verification.</li>
          </ul>
          <p className="mt-4 text-sm text-white/70">
            Already registered? <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Merchant registration</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">Create your merchant account</h1>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-4 shadow-card sm:px-6">
            <StepperNav steps={steps} currentStep={currentStep} className="hidden md:flex" />
            <div className="md:hidden">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-navy-900">Step {currentStep} of {steps.length}: {activeStep?.title}</span>
                <span className="text-brand-700">{progressPercent}%</span>
              </div>
              <div role="progressbar" aria-label="Registration progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep} aria-valuetext={`Step ${currentStep} of ${steps.length}: ${activeStep?.title}`} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-sunset-500 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <section aria-labelledby="registration-step-title" className="rounded-3xl border border-slate-200/70 bg-white shadow-card">
            <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <StepIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 id="registration-step-title" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-bold text-navy-900 focus:outline-none">{activeStep?.title}</h2>
                <p className="text-sm text-muted-foreground">{activeStep?.description}</p>
              </div>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <form className="space-y-5" onSubmit={handleSubmit(submitApplication)} aria-busy={isSubmitting} noValidate>
                <fieldset disabled={isSubmitting} className="min-w-0 space-y-5 border-0 p-0">
                {currentStep === 1 ? (
                  <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                    <SectionHeading title="Account details" description="These details will be used to create your SofiaCart sign-in." />
                    {renderInput("name", "Account Name", { autoComplete: "name" })}
                    {renderInput("email", "Account Email", { type: "email", autoComplete: "email" })}
                    {renderInput("password", "Password", { type: "password", autoComplete: "new-password" })}
                    {renderInput("passwordConfirmation", "Confirm Password", { type: "password", autoComplete: "new-password" })}
                    {renderInput("phone", "Account Phone", { type: "tel", autoComplete: "tel", placeholder: "+639XXXXXXXXX or 09XXXXXXXXX" })}
                    <SectionHeading title="Business details" />
                    {renderInput("businessName", "Business Name", { placeholder: "Registered business name" })}
                    {renderSelect("businessType", "Business Type", "Select business type", options.businessTypes)}
                    {renderInput("permitNumber", "DTI/SEC/Business Permit No.")}
                    {renderInput("tin", "TIN")}
                    {renderSelect("businessCategory", "Business Category", "Select category", options.categories)}
                    <FileUploadField
                      id="businessPermit"
                      label="Business Permit"
                      accept=".png,.jpg,.jpeg,.pdf"
                      hint="JPG, PNG or PDF"
                      file={businessPermit}
                      error={errors.businessPermit?.message as string | undefined}
                      onFileChange={(file) => setValue("businessPermit", file, { shouldValidate: true })}
                    />
                    <div className="md:col-span-2">{renderInput("businessAddress", "Business Address", { placeholder: "Street, barangay", autoComplete: "street-address" })}</div>
                    {renderInput("city", "City / Municipality")}
                    {renderSelect("province", "Province", "Select province", options.provinces)}
                    {renderInput("zipCode", "ZIP Code", { autoComplete: "postal-code" })}
                  </div>
                ) : null}

                {currentStep === 2 ? (
                  <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                    <SectionHeading title="Store profile" />
                    {renderInput("storeName", "Store Name", { placeholder: "Your store name" })}
                    <div>
                      <Label htmlFor="storeSlug">Store URL / Slug</Label>
                      <div className={cn("flex h-10 items-stretch overflow-hidden rounded-lg border bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200", errors.storeSlug ? "border-red-400" : "border-slate-200")}>
                        <span aria-hidden="true" className="flex items-center border-r border-slate-200 bg-[#f6f5fb] px-3 text-xs text-slate-500">sofiacart.shop/</span>
                        <input
                          id="storeSlug"
                          aria-invalid={errors.storeSlug ? true : undefined}
                          aria-describedby={errors.storeSlug ? `storeSlug-status ${errorId("storeSlug")}` : "storeSlug-status"}
                          className="min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-slate-400"
                          placeholder="your-store"
                          {...register("storeSlug", { onChange: () => setSlugEdited(true) })}
                        />
                      </div>
                      <div id="storeSlug-status" className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-500">{storeSlug ? `sofiacart.shop/${storeSlug}` : "Your store URL will appear here"}</span>
                        <span className={slugFormatValid ? "shrink-0 font-semibold text-green-600" : "shrink-0 font-semibold text-amber-600"}>{slugFormatValid ? "Format looks good" : "Needs review"}</span>
                      </div>
                      <FieldError name="storeSlug" message={errors.storeSlug?.message} />
                    </div>
                    {renderSelect("storeCategory", "Store Category", "Select store category", options.categories)}
                    {renderInput("storeEmail", "Email Address", { type: "email", autoComplete: "email" })}
                    <div className="md:col-span-2">
                      <Label htmlFor="storeDescription">Store Description</Label>
                      <Textarea id="storeDescription" hasError={!!errors.storeDescription} aria-describedby={errors.storeDescription ? `storeDescription-hint ${errorId("storeDescription")}` : "storeDescription-hint"} maxLength={240} placeholder="Tell customers what makes your store unique." {...register("storeDescription")} />
                      <div id="storeDescription-hint" className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>Recommended: highlight your products, service area, and fulfillment promise.</span>
                        <span className="shrink-0">{storeDescription.length}/240</span>
                      </div>
                      <FieldError name="storeDescription" message={errors.storeDescription?.message} />
                    </div>
                    {renderInput("storeContactNumber", "Contact Number", { type: "tel" })}
                    {renderInput("storeAddress", "Store Address")}

                    <SectionHeading title="Branding" description="Upload JPG or PNG images. Previews are only shown on this device until you submit." />
                    <FileUploadField
                      id="storeLogo"
                      label="Store Logo"
                      accept=".jpg,.jpeg,.png"
                      hint="Square JPG or PNG"
                      file={logoFile}
                      error={errors.storeLogo?.message as string | undefined}
                      onFileChange={(file) => {
                        setValue("storeLogo", file, { shouldValidate: true });
                        updatePreview(file, logoPreview, setLogoPreview);
                      }}
                    />
                    <FileUploadField
                      id="storeBanner"
                      label="Store Banner (Optional)"
                      accept=".jpg,.jpeg,.png"
                      hint="Wide JPG or PNG"
                      file={bannerFile}
                      error={errors.storeBanner?.message as string | undefined}
                      onFileChange={(file) => {
                        setValue("storeBanner", file, { shouldValidate: true });
                        updatePreview(file, bannerPreview, setBannerPreview);
                      }}
                    />
                    <PreviewTile label="Logo Preview" file={logoFile} preview={logoPreview} shape="square" />
                    <PreviewTile label="Banner Preview" file={bannerFile} preview={bannerPreview} />

                    <SectionHeading title="Social links" description="Optional — add the channels where customers already find you." />
                    {renderInput("facebook", "Facebook (Optional)", { type: "url", placeholder: "https://facebook.com/yourstore" })}
                    {renderInput("instagram", "Instagram (Optional)", { type: "url", placeholder: "https://instagram.com/yourstore" })}
                    {renderInput("tiktok", "TikTok (Optional)", { type: "url", placeholder: "https://tiktok.com/@yourstore" })}
                    {renderInput("website", "Website (Optional)", { type: "url", placeholder: "https://yourstore.com" })}
                  </div>
                ) : null}

                {currentStep === 3 ? (
                  <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                    <SectionHeading title="Owner details" description="The authorized person responsible for this merchant account." />
                    {renderInput("ownerFullName", "Full Name", { autoComplete: "name" })}
                    {renderInput("ownerPosition", "Position / Designation", { autoComplete: "organization-title" })}
                    {renderInput("ownerEmail", "Email Address", { type: "email", autoComplete: "email" })}
                    {renderInput("ownerContactNumber", "Contact Number", { type: "tel", autoComplete: "tel" })}
                    {renderInput("dateOfBirth", "Date of Birth", { type: "date", autoComplete: "bday" })}
                    <SectionHeading title="Identity verification" />
                    {renderSelect("governmentIdType", "Government ID Type", "Select ID type", options.idTypes)}
                    {renderInput("governmentIdNumber", "Government ID Number")}
                    {renderInput("governmentIdExpiry", "Date of Expiry", { type: "date" })}
                    <FileUploadField
                      id="governmentIdFile"
                      label="Upload Government ID"
                      accept=".jpg,.jpeg,.png,.pdf"
                      hint="Clear JPG, PNG or PDF of your valid ID"
                      file={governmentIdFile}
                      error={errors.governmentIdFile?.message as string | undefined}
                      onFileChange={(file) => {
                        setValue("governmentIdFile", file, { shouldValidate: true });
                        updatePreview(file, idPreview, setIdPreview);
                      }}
                    />
                    <PreviewTile label="Government ID Preview" file={governmentIdFile} preview={idPreview} />
                  </div>
                ) : null}

                {currentStep === 4 ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {[
                      {
                        title: "Business Details",
                        step: 1,
                        icon: Building2,
                        entries: {
                          "Account Name": getValues("name"),
                          "Account Email": getValues("email"),
                          "Account Phone": getValues("phone"),
                          "Business Name": getValues("businessName"),
                          "Business Type": getValues("businessType"),
                          "Permit Number": getValues("permitNumber"),
                          TIN: getValues("tin"),
                          Category: getValues("businessCategory"),
                          Address: `${getValues("businessAddress")}, ${getValues("city")}, ${getValues("province")} ${getValues("zipCode")}`,
                        },
                      },
                      {
                        title: "Store Information",
                        step: 2,
                        icon: Store,
                        entries: {
                          "Store Name": getValues("storeName"),
                          Slug: getValues("storeSlug"),
                          Category: getValues("storeCategory"),
                          Email: getValues("storeEmail"),
                          Contact: getValues("storeContactNumber"),
                          Address: getValues("storeAddress"),
                        },
                      },
                      {
                        title: "Owner Information",
                        step: 3,
                        icon: UserCircle2,
                        entries: {
                          Name: getValues("ownerFullName"),
                          Position: getValues("ownerPosition"),
                          Email: getValues("ownerEmail"),
                          Contact: getValues("ownerContactNumber"),
                          "Date of Birth": getValues("dateOfBirth"),
                          "Government ID": `${getValues("governmentIdType")} • ${getValues("governmentIdNumber")}`,
                        },
                      },
                    ].map((section) => {
                      const Icon = section.icon;
                      return (
                        <div key={section.title} className="rounded-2xl border border-slate-200/80 bg-[#faf9fe] p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true" className="rounded-lg bg-white p-2 text-brand-700 shadow-sm"><Icon className="h-4 w-4" /></span>
                              <h3 className="text-sm font-bold text-navy-900">{section.title}</h3>
                            </div>
                            <button type="button" onClick={() => setCurrentStep(section.step)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Edit ${section.title}`}>
                              Edit
                            </button>
                          </div>
                          <dl className="mt-3 space-y-2.5">
                            {Object.entries(section.entries).map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
                                <dd className="mt-0.5 break-words text-sm text-slate-700">{String(value) || "—"}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {submitError ? <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div> : null}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" onClick={previousStep} disabled={currentStep === 1 || isSubmitting}>
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Previous
                  </Button>
                  {currentStep < 4 ? (
                    <Button type="button" onClick={nextStep} disabled={isSubmitting} className="sm:min-w-40">
                      Next Step
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" variant="accent" disabled={isSubmitting} className="sm:min-w-56">
                      {isSubmitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                      {isSubmitting ? "Submitting..." : "Submit Merchant Registration"}
                    </Button>
                  )}
                </div>
                </fieldset>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
