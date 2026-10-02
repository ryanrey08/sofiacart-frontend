import { z } from "zod";

// Mirrors sofiacart-backend AdjustInventoryRequest (adjustment_type + quantity path).
export const STOCK_ADJUSTMENT_TYPES = ["increase", "decrease", "set"] as const;
export const STOCK_ADJUSTMENT_MAX = 1000000;

export const STOCK_ADJUSTMENT_LABELS: Record<(typeof STOCK_ADJUSTMENT_TYPES)[number], string> = {
  increase: "Add Stock (Increase)",
  decrease: "Deduct Stock (Decrease)",
  set: "Set Stock (Replace)",
};

// reference_type is free text on the backend; these are the options the UI offers.
export const STOCK_REFERENCE_TYPES = ["purchase_order", "sales_order", "stock_transfer", "adjustment", "return", "damage", "other"] as const;

export const stockUpdateSchema = z
  .object({
    productVariantId: z.string(),
    adjustmentType: z.enum(STOCK_ADJUSTMENT_TYPES, { message: "Select an update type" }),
    quantity: z
      .string()
      .trim()
      .regex(/^\d+$/, "Enter a whole number of 0 or more")
      .refine((value) => Number(value) <= STOCK_ADJUSTMENT_MAX, "Quantity is too large"),
    reason: z.string().trim().max(255, "Reason may not be longer than 255 characters"),
    referenceType: z.string(),
    referenceNumber: z.string().trim().max(100, "Reference number may not be longer than 100 characters"),
    supplier: z.string().trim().max(255, "Supplier may not be longer than 255 characters"),
    referenceDate: z.string(),
    notes: z.string().trim().max(500, "Remarks may not be longer than 500 characters"),
  })
  .superRefine((values, ctx) => {
    // increase/decrease require at least 1 unit; set allows 0 (clear stock).
    if (values.adjustmentType !== "set" && Number(values.quantity) < 1) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter a quantity of 1 or more" });
    }
  });

export type StockUpdateValues = z.input<typeof stockUpdateSchema>;
export type ValidatedStockUpdate = z.output<typeof stockUpdateSchema>;
export type StockUpdateField = keyof StockUpdateValues;

// Maps Laravel validation error fields to this form's fields.
const FIELD_MAP: Record<string, StockUpdateField> = {
  adjustment_type: "adjustmentType",
  quantity: "quantity",
  quantity_change: "quantity",
  product_variant_id: "productVariantId",
  reason: "reason",
  reference_type: "referenceType",
  reference_number: "referenceNumber",
  supplier: "supplier",
  reference_date: "referenceDate",
  notes: "notes",
};

export function mapStockUpdateErrorField(apiField: string): StockUpdateField | null {
  return FIELD_MAP[apiField] ?? null;
}
