import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/payments";

// Mirrors sofiacart-backend StorePaymentRequest (merchant Record Payment path).
export const PAYMENT_AMOUNT_MAX = 9999999999.99;

export const recordPaymentSchema = z.object({
  orderId: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter the order ID the payment is for"),
  method: z.enum(PAYMENT_METHODS as [string, ...string[]], { message: "Select a payment method" }),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places")
    .refine((value) => Number(value) > 0, "Amount must be greater than 0")
    .refine((value) => Number(value) <= PAYMENT_AMOUNT_MAX, "Amount is too large"),
  markReceived: z.boolean(),
  reference: z.string().trim().max(255, "Reference may not be longer than 255 characters"),
  gatewayReference: z.string().trim().max(255, "Transaction ID may not be longer than 255 characters"),
  notes: z.string().trim().max(500, "Notes may not be longer than 500 characters"),
});

export type RecordPaymentValues = z.input<typeof recordPaymentSchema>;
export type ValidatedRecordPayment = z.output<typeof recordPaymentSchema>;
export type RecordPaymentField = keyof RecordPaymentValues;

const FIELD_MAP: Record<string, RecordPaymentField> = {
  order_id: "orderId",
  method: "method",
  gateway: "method",
  amount: "amount",
  status: "markReceived",
  reference: "reference",
  gateway_reference: "gatewayReference",
  notes: "notes",
};

export function mapRecordPaymentErrorField(apiField: string): RecordPaymentField | null {
  return FIELD_MAP[apiField] ?? null;
}
