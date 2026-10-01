import { z } from "zod";

// Mirrors sofiacart-backend StoreCategoryRequest / UpdateCategoryRequest and the category image upload rule
// (`image|mimes:png,jpg,jpeg,webp|max:2048`).
export const CATEGORY_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const CATEGORY_IMAGE_MAX_KB = 2048;
export const CATEGORY_DESCRIPTION_MAX = 500;
export const CATEGORY_NAME_MAX = 255;
export const CATEGORY_META_TITLE_MAX = 255;
export const CATEGORY_META_DESCRIPTION_MAX = 500;
// Search-engine guidance shown as hints next to the SEO counters (not enforced).
export const CATEGORY_META_TITLE_HINT = { min: 50, max: 60 } as const;
export const CATEGORY_META_DESCRIPTION_HINT = { min: 150, max: 160 } as const;
export const CATEGORY_SORT_ORDER_MAX = 2147483647;

export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

// The description is stored as HTML from the rich-text editor; its 500 character limit applies to the visible text.
export function richTextToPlainText(html: string | null | undefined) {
  if (!html) return "";
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, entity: string) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}

export function richTextLength(html: string | null | undefined) {
  return richTextToPlainText(html).length;
}

export function categoryImageError(file: { type: string; size: number }) {
  if (!CATEGORY_IMAGE_TYPES.includes(file.type)) return "Image must be a PNG, JPG or WEBP file";
  if (file.size > CATEGORY_IMAGE_MAX_KB * 1024) return "Image must be no larger than 2MB";
  return null;
}

const isFile = (value: unknown): value is File => typeof File !== "undefined" && value instanceof File;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(CATEGORY_NAME_MAX, `Category name may not be longer than ${CATEGORY_NAME_MAX} characters`),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255, "Slug may not be longer than 255 characters")
    .regex(CATEGORY_SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens (e.g. home-living)"),
  parentId: z.string().regex(/^\d*$/, "Select a valid parent category"),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d*$/, "Sort order must be a whole number of 0 or more")
    .refine((value) => value === "" || Number(value) <= CATEGORY_SORT_ORDER_MAX, "Sort order is too large"),
  description: z
    .string()
    .refine(
      (value) => richTextLength(value) <= CATEGORY_DESCRIPTION_MAX,
      `Description may not be longer than ${CATEGORY_DESCRIPTION_MAX} characters`,
    ),
  metaTitle: z
    .string()
    .trim()
    .max(CATEGORY_META_TITLE_MAX, `Meta title may not be longer than ${CATEGORY_META_TITLE_MAX} characters`),
  metaDescription: z
    .string()
    .trim()
    .max(CATEGORY_META_DESCRIPTION_MAX, `Meta description may not be longer than ${CATEGORY_META_DESCRIPTION_MAX} characters`),
  image: z
    .custom<File | null>((value) => value === null || isFile(value), "Upload an image file")
    .superRefine((file, ctx) => {
      const message = file ? categoryImageError(file) : null;
      if (message) ctx.addIssue({ code: "custom", message });
    }),
  isActive: z.boolean(),
  showInNav: z.boolean(),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
export type ValidatedCategoryForm = z.output<typeof categoryFormSchema>;
