"use client";

import type { ComponentProps } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Building2, CheckCircle2, Loader2, UserCircle2, Store, Users, BarChart3, ShieldCheck, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepperNav, type StepItem } from "@/components/stepper-nav";
import {VerticalStepper } from "@/components/side-stepper";
import api from "@/lib/api/axios";
import { getStoredAuth } from "@/lib/auth";
import { buildMerchantRegistrationFormData } from "@/lib/merchant-registration";
import { slugify } from "@/lib/utils";
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-red-600">{message}</p>;
}

function PreviewTile({ label, file, preview }: { label: string; file: File | null; preview: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-slate-700">{label}</p>
      {preview ? (
        <div className="relative mt-3 h-28 w-full overflow-hidden rounded-xl">
          <Image src={preview} alt={label} fill unoptimized className="object-cover" />
        </div>
      ) : (
        <p className="mt-2">Upload an image file to preview it here.</p>
      )}
      {file ? <p className="mt-2 truncate text-xs text-slate-500">{file.name}</p> : null}
    </div>
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

  const features = [
    {
      title: "Sell Online",
      description: "Showcase your products 24/7",
      icon: Store,
      badgeBg: "bg-[#FF6B00]", // Bright Orange
    },
    {
      title: "Reach More Customers",
      description: "Grow your business nationwide",
      icon: Users,
      badgeBg: "bg-[#5B3DF5]", // Deep Indigo/Purple
    },
    {
      title: "Easy Store Management",
      description: "Manage products, orders and sales in one dashboard",
      icon: BarChart3,
      badgeBg: "bg-[#FF2A7A]", // Hot Pink
    },
    {
      title: "Secure & Reliable",
      description: "Safe payments and trusted platform",
      icon: ShieldCheck,
      badgeBg: "bg-[#0099FF]", // Electric Blue
    },
  ];

  const registrationCards = [
    {
      title: "Create Your Online Store",
        subtitle: "with SofiaCart",
        imageSrc: "/assets/house.png",
        features: [
          { id: 1, text: "Custom Shop URL", icon: Store, badgeBg: "bg-orange-500" },
          { id: 2, text: "Instant Verification", icon: Zap, badgeBg: "bg-purple-600" },
          { id: 3, text: "Encrypted Transactions", icon: Shield, badgeBg: "bg-blue-500" },
        ],
    },
    {
      title: "We Value Your Trust",
        subtitle: "with SofiaCart",
        imageSrc: "/assets/shield.png",
        features: [
          { id: 1, text: "Custom Shop URL", icon: Store, badgeBg: "bg-orange-500" },
          { id: 2, text: "Instant Verification", icon: Zap, badgeBg: "bg-purple-600" },
          { id: 3, text: "Encrypted Transactions", icon: Shield, badgeBg: "bg-blue-500" },
        ],
    },
    {
      title: "Almost There",
        subtitle: "with SofiaCart",
        imageSrc: "/assets/shield2.png",
        features: [
          { id: 1, text: "Custom Shop URL", icon: Store, badgeBg: "bg-orange-500" },
          { id: 2, text: "Instant Verification", icon: Zap, badgeBg: "bg-purple-600" },
          { id: 3, text: "Encrypted Transactions", icon: Shield, badgeBg: "bg-blue-500" },
        ],
    },
    {
      title: "Almost There",
        subtitle: "with SofiaCart",
        imageSrc: "/assets/shield2.png",
        features: [
          { id: 1, text: "Custom Shop URL", icon: Store, badgeBg: "bg-orange-500" },
          { id: 2, text: "Instant Verification", icon: Zap, badgeBg: "bg-purple-600" },
          { id: 3, text: "Encrypted Transactions", icon: Shield, badgeBg: "bg-blue-500" },
        ],
    }
  ]

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

  const nextStep = async () => {
    const isValid = await trigger(fieldGroups[currentStep]);
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
      <Input id={name} hasError={!!errors[name]} {...register(name)} {...props} />
      <FieldError message={errors[name]?.message as string | undefined} />
    </div>
  );

  if (merchantAuth === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-brand-soft px-4">
        <h1 className="text-2xl font-semibold text-slate-900">Merchant registration</h1>
        <p className="text-sm text-muted-foreground">Checking your account…</p>
      </div>
    );
  }

  if (hasMerchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-soft px-4 py-8">
        <Card className="w-full max-w-xl border-none bg-white/92">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">A merchant account is already signed in</CardTitle>
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
      <div className="flex min-h-screen items-center justify-center bg-brand-soft px-4 py-8">
        <Card className="w-full max-w-2xl border-none bg-white/92">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="text-3xl">Registration submitted</CardTitle>
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

  return (
    <div className="min-h-screen bg-brand-soft px-4 py-8 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[32px] p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex w-full items-center justify-center text-lg font-bold">
              <Image src="/assets/logo/sofia-cart-logo-no-bg.png" alt="SofiaCart Logo" width={300} height={300} />
            </div>
            {/* <div>
              <p className="text-xl font-semibold">Sofia<span className="text-[#fe8d1e]">Cart</span></p>
              <p className="text-sm text-white/80">Everything in one cart</p>
            </div> */}
          </div>
          <div className="mt-8">
            {
              currentStep === 1 ? <>
              <p className="text-xl font-semibold">Be a SofiaCart Merchant</p>
              <p className="text-sm text-white/80">open your online store and reach thousand of customers</p> 
              </>:
              <VerticalStepper steps={steps} currentStep={currentStep} promoCardProps={registrationCards[currentStep - 1]}/>
            }
          </div>
          {
            currentStep === 1 && 
            <>
                        <Card className="border-none mt-5 bg-transparent text-white shadow-soft-none">
            <CardContent className="p-0">
              <ul className="space-y-6">
                {features.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={index} className="flex items-center gap-4">
                      {/* Rounded Icon Badge */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.badgeBg} text-white shadow-md`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Text Content */}
                      <div className="flex flex-col">
                        <h4 className="text-lg font-bold text-white leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-sm text-white/90 font-normal leading-tight">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <div className="mt-8 flex w-full justify-center pt-4">
          <img
            src="/assets/logo/laptop-image.png"
            alt="SofiaCart Dashboard Preview"
            /* Adjust 'max-w-md' (or max-w-sm, max-w-lg, max-w-[320px]) to set your desired maximum size */
            className="h-auto w-full max-w-md object-contain drop-shadow-2xl transition-all duration-300"
          />
        </div>
            </>
          }
        </aside>

        <section className="space-y-6">
          {/* <Card className="border-none bg-white/80">
            <CardContent className="p-5">
              <StepperNav steps={steps} currentStep={currentStep} />
            </CardContent>
          </Card> */}

          <Card className="border-none bg-white/92">
            <CardHeader className="border-b border-slate-100">
            <CardContent className="p-5">
            <CardTitle className="text-2xl">Merchant <span className="text-[#FF8B59]">Registration</span></CardTitle>
            <CardDescription className="mb-3">Create your merchant account and start selling in SofiaCart</CardDescription>
              <StepperNav steps={steps} currentStep={currentStep} />
            </CardContent>
            </CardHeader>
            <CardContent className="px-6 pb-6">
            <div className="flex items-start gap-4 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                  {currentStep === 1 ? <Building2 className="h-6 w-6" /> : currentStep === 2 ? <Store className="h-6 w-6" /> : currentStep === 3 ? <ShieldCheck className="h-6 w-6" /> : <UserCircle2 className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-2xl">{steps[currentStep - 1]?.title}</CardTitle>
                  <CardDescription className="mt-1">{steps[currentStep - 1]?.description}</CardDescription>
                </div>
              </div>
              <form className="space-y-6" onSubmit={handleSubmit(submitApplication)}>
                <fieldset disabled={isSubmitting} className="space-y-6">
                {currentStep === 1 ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <h3 className="font-semibold text-slate-900">Account details</h3>
                      <p className="mt-1 text-sm text-muted-foreground">These details will be used to create your SofiaCart sign-in.</p>
                    </div>
                    {renderInput("name", "Account Name", { autoComplete: "name" })}
                    {renderInput("email", "Account Email", { type: "email", autoComplete: "email" })}
                    {renderInput("password", "Password", { type: "password", autoComplete: "new-password" })}
                    {renderInput("passwordConfirmation", "Confirm Password", { type: "password", autoComplete: "new-password" })}
                    {renderInput("phone", "Account Phone", { type: "tel", placeholder: "+639XXXXXXXXX or 09XXXXXXXXX" })}
                    <div className="md:col-span-2">
                      <h3 className="font-semibold text-slate-900">Business details</h3>
                    </div>
                    {renderInput("businessName", "Business Name", { placeholder: "Sofia Lifestyle Ventures" })}
                    <div>
                      <Label htmlFor="businessType">Business Type</Label>
                      <select id="businessType" className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400" {...register("businessType")}>
                        <option value="">Select business type</option>
                        {options.businessTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <FieldError message={errors.businessType?.message} />
                    </div>
                    {renderInput("permitNumber", "DTI/SEC/Business Permit No.")}
                    {renderInput("tin", "TIN")}
                    <div>
                      <Label htmlFor="businessCategory">Business Category</Label>
                      <select id="businessCategory" className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400" {...register("businessCategory")}>
                        <option value="">Select category</option>
                        {options.categories.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <FieldError message={errors.businessCategory?.message} />
                    </div>
                    <div>
                      <Label htmlFor="businessPermit">Business Permit</Label>
                      <Input id="businessPermit" type="file" hasError={!!errors.businessPermit} accept=".png,.jpg,.jpeg,.pdf" onChange={(event) => setValue("businessPermit", event.target.files?.[0] ?? null, { shouldValidate: true })} />
                      <FieldError message={errors.businessPermit?.message as string | undefined} />
                      {businessPermit ? <p className="mt-2 text-xs text-slate-500">{businessPermit.name}</p> : null}
                    </div>
                    <div className="md:col-span-2">{renderInput("businessAddress", "Business Address", { placeholder: "123 Sofia Street, Barangay Central" })}</div>
                    {renderInput("city", "City / Municipality")}
                    <div>
                      <Label htmlFor="province">Province</Label>
                      <select id="province" className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400" {...register("province")}>
                        <option value="">Select province</option>
                        {options.provinces.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <FieldError message={errors.province?.message} />
                    </div>
                    {renderInput("zipCode", "ZIP Code")}
                  </div>
                ) : null}

                {currentStep === 2 ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    {renderInput("storeName", "Store Name", { placeholder: "Sofia Lifestyle Store" })}
                    <div>
                      <Label htmlFor="storeSlug">Store URL / Slug</Label>
                      <Input id="storeSlug" hasError={!!errors.storeSlug} placeholder="sofia-lifestyle" {...register("storeSlug", { onChange: () => setSlugEdited(true) })} />
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{storeSlug ? `sofiacart.shop/${storeSlug}` : "Your store URL will appear here"}</span>
                        <span className={slugFormatValid ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>{slugFormatValid ? "Format looks good" : "Needs review"}</span>
                      </div>
                      <FieldError message={errors.storeSlug?.message} />
                    </div>
                    <div>
                      <Label htmlFor="storeCategory">Store Category</Label>
                      <select id="storeCategory" className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400" {...register("storeCategory")}>
                        <option value="">Select store category</option>
                        {options.categories.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <FieldError message={errors.storeCategory?.message} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="storeDescription">Store Description</Label>
                      <Textarea id="storeDescription" hasError={!!errors.storeDescription} maxLength={240} placeholder="Tell customers what makes your store unique." {...register("storeDescription")} />
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Recommended: highlight your products, service area, and fulfillment promise.</span>
                        <span>{storeDescription.length}/240</span>
                      </div>
                      <FieldError message={errors.storeDescription?.message} />
                    </div>
                    {renderInput("storeContactNumber", "Contact Number")}
                    {renderInput("storeEmail", "Email Address", { type: "email" })}
                    <div className="md:col-span-2">{renderInput("storeAddress", "Store Address")}</div>
                    <div>
                      <Label htmlFor="storeLogo">Store Logo</Label>
                      <Input
                        id="storeLogo"
                        type="file"
                        hasError={!!errors.storeLogo}
                        accept=".jpg,.jpeg,.png"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setValue("storeLogo", file, { shouldValidate: true });
                          updatePreview(file, logoPreview, setLogoPreview);
                        }}
                      />
                      <FieldError message={errors.storeLogo?.message as string | undefined} />
                    </div>
                    <div>
                      <Label htmlFor="storeBanner">Store Banner (Optional)</Label>
                      <Input
                        id="storeBanner"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setValue("storeBanner", file, { shouldValidate: true });
                          updatePreview(file, bannerPreview, setBannerPreview);
                        }}
                      />
                    </div>
                    <PreviewTile label="Logo Preview" file={logoFile} preview={logoPreview} />
                    <PreviewTile label="Banner Preview" file={bannerFile} preview={bannerPreview} />
                    {renderInput("facebook", "Facebook (Optional)", { placeholder: "https://facebook.com/yourstore" })}
                    {renderInput("instagram", "Instagram (Optional)", { placeholder: "https://instagram.com/yourstore" })}
                    {renderInput("tiktok", "TikTok (Optional)", { placeholder: "https://tiktok.com/@yourstore" })}
                    {renderInput("website", "Website (Optional)", { placeholder: "https://yourstore.com" })}
                  </div>
                ) : null}

                {currentStep === 3 ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    {renderInput("ownerFullName", "Full Name")}
                    {renderInput("ownerPosition", "Position / Designation")}
                    {renderInput("ownerEmail", "Email Address", { type: "email" })}
                    {renderInput("ownerContactNumber", "Contact Number")}
                    {renderInput("dateOfBirth", "Date of Birth", { type: "date" })}
                    <div>
                      <Label htmlFor="governmentIdType">Government ID Type</Label>
                      <select id="governmentIdType" className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400" {...register("governmentIdType")}>
                        <option value="">Select ID type</option>
                        {options.idTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <FieldError message={errors.governmentIdType?.message} />
                    </div>
                    {renderInput("governmentIdNumber", "Government ID Number")}
                    {renderInput("governmentIdExpiry", "Date of Expiry", { type: "date" })}
                    <div>
                      <Label htmlFor="governmentIdFile">Upload Government ID</Label>
                      <Input
                        id="governmentIdFile"
                        type="file"
                        hasError={!!errors.governmentIdFile}
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setValue("governmentIdFile", file, { shouldValidate: true });
                          updatePreview(file, idPreview, setIdPreview);
                        }}
                      />
                      <p className="mt-2 text-xs text-slate-500">Upload a clear JPG, PNG, or PDF of your valid ID.</p>
                      <FieldError message={errors.governmentIdFile?.message as string | undefined} />
                    </div>
                    <PreviewTile label="Government ID Preview" file={governmentIdFile} preview={idPreview} />
                  </div>
                ) : null}

                {currentStep === 4 ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {[
                      {
                        title: "Business Details",
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
                        <Card key={section.title} className="border border-slate-100 bg-slate-50 shadow-none">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-white p-3 text-brand-700"><Icon className="h-5 w-5" /></div>
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            {Object.entries(section.entries).map(([label, value]) => (
                              <div key={label}>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                                <p className="mt-1 text-sm text-slate-700">{String(value) || "—"}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : null}

                {submitError ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div> : null}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" onClick={previousStep} disabled={currentStep === 1 || isSubmitting}>Cancel</Button>
                  {currentStep < 4 ? (
                    <Button type="button" onClick={nextStep} disabled={isSubmitting}>Next Step</Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isSubmitting ? "Submitting..." : "Submit Merchant Registration"}
                    </Button>
                  )}
                </div>
                </fieldset>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}