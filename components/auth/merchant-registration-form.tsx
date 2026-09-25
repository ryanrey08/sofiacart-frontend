"use client";

import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Building2, CheckCircle2, Loader2, ShieldCheck, Store, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepperNav, type StepItem } from "@/components/stepper-nav";
import api from "@/lib/api/axios";
import { slugify } from "@/lib/utils";
import { merchantRegistrationSchema, type MerchantRegistrationSchema } from "@/lib/validation/merchant";

const steps: StepItem[] = [
  { id: 1, title: "Business Details", description: "Verify legal business information" },
  { id: 2, title: "Store Information", description: "Set up your customer-facing storefront" },
  { id: 3, title: "Owner Information", description: "Confirm the authorized merchant owner" },
  { id: 4, title: "Review & Submit", description: "Double-check your application details" },
];

const fieldGroups: Record<number, (keyof MerchantRegistrationSchema)[]> = {
  1: ["businessName", "businessType", "permitNumber", "tin", "businessCategory", "businessPermit", "businessAddress", "city", "province", "zipCode"],
  2: ["storeName", "storeSlug", "storeCategory", "storeDescription", "storeContactNumber", "storeEmail", "storeAddress", "storeLogo", "storeBanner", "facebook", "instagram", "tiktok", "website"],
  3: ["ownerFullName", "ownerPosition", "ownerEmail", "ownerContactNumber", "dateOfBirth", "governmentIdType", "governmentIdNumber", "governmentIdExpiry", "governmentIdFile"],
  4: [],
};

const defaultValues: MerchantRegistrationSchema = {
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
        <p className="mt-2">Upload a PNG, JPG, or PDF file.</p>
      )}
      {file ? <p className="mt-2 truncate text-xs text-slate-500">{file.name}</p> : null}
    </div>
  );
}

export function MerchantRegistrationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    formState: { errors, isSubmitting },
  } = useForm<MerchantRegistrationSchema>({
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

  const slugAvailable = useMemo(() => storeSlug.length >= 4 && !storeSlug.includes("--"), [storeSlug]);

  const updatePreview = (file: File | null, setPreview: (value: string | null) => void) => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const nextStep = async () => {
    const isValid = await trigger(fieldGroups[currentStep]);
    if (isValid) {
      setCurrentStep((step) => Math.min(4, step + 1));
    }
  };

  const previousStep = () => setCurrentStep((step) => Math.max(1, step - 1));

  const submitApplication = async (values: MerchantRegistrationSchema) => {
    setSubmitError(null);

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value) {
        formData.append(key, value);
      }
    });

    try {
      await api.post("/api/merchant/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      router.push("/login?registered=1");
    } catch {
      setSubmitError("We could not submit the registration right now. Please check your API connection and try again.");
    }
  };

  const renderInput = (name: keyof MerchantRegistrationSchema, label: string, props?: Partial<ComponentProps<typeof Input>>) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} hasError={!!errors[name]} {...register(name)} {...props} />
      <FieldError message={errors[name]?.message as string | undefined} />
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-soft px-4 py-8 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[32px] bg-brand-gradient p-6 text-white shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">SC</div>
            <div>
              <p className="text-lg font-semibold">SofiaCart</p>
              <p className="text-sm text-white/80">Merchant registration</p>
            </div>
          </div>
          <div className="mt-8">
            <StepperNav steps={steps} currentStep={currentStep} orientation="vertical" />
          </div>
          <Card className="mt-8 border border-white/15 bg-white/10 text-white shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Why SofiaCart?</p>
              <ul className="mt-4 space-y-3 text-sm text-white/85">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Multi-merchant tools for catalog, orders, and reporting.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Flexible storefront branding with modern analytics.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Guided onboarding with document verification.</li>
              </ul>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <Card className="border-none bg-white/80">
            <CardContent className="p-5">
              <StepperNav steps={steps} currentStep={currentStep} />
            </CardContent>
          </Card>

          <Card className="border-none bg-white/92">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  {currentStep === 1 ? <Building2 className="h-6 w-6" /> : currentStep === 2 ? <Store className="h-6 w-6" /> : currentStep === 3 ? <ShieldCheck className="h-6 w-6" /> : <UserCircle2 className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-2xl">{steps[currentStep - 1]?.title}</CardTitle>
                  <CardDescription className="mt-1">{steps[currentStep - 1]?.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit(submitApplication)}>
                {currentStep === 1 ? (
                  <div className="grid gap-5 md:grid-cols-2">
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
                        <span className={slugAvailable ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>{slugAvailable ? "Available" : "Needs review"}</span>
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
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setValue("storeLogo", file, { shouldValidate: true });
                          updatePreview(file, setLogoPreview);
                        }}
                      />
                      <FieldError message={errors.storeLogo?.message as string | undefined} />
                    </div>
                    <div>
                      <Label htmlFor="storeBanner">Store Banner (Optional)</Label>
                      <Input
                        id="storeBanner"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setValue("storeBanner", file, { shouldValidate: true });
                          updatePreview(file, setBannerPreview);
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
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setValue("governmentIdFile", file, { shouldValidate: true });
                          updatePreview(file, setIdPreview);
                        }}
                      />
                      <p className="mt-2 text-xs text-slate-500">Use a clear image of the front of your valid ID.</p>
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
                  <Button type="button" variant="outline" onClick={previousStep} disabled={currentStep === 1 || isSubmitting}>Previous</Button>
                  {currentStep < 4 ? (
                    <Button type="button" onClick={nextStep}>Next Step</Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isSubmitting ? "Submitting..." : "Submit Merchant Registration"}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
