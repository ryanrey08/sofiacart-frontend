"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Field, Notice } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdjustInventory } from "@/lib/hooks/products";
import { mapInventoryApiError, type InventoryAdjustField } from "@/lib/merchant-products";
import { inventoryAdjustSchema, type InventoryAdjustValues, type ValidatedInventoryAdjust } from "@/lib/validation/product";
import type { InventoryAdjustResponse, ProductResource } from "@/types";

export function InventoryAdjustForm({
  product,
  onSaved,
  onCancel,
}: {
  product: ProductResource;
  onSaved: (response: InventoryAdjustResponse) => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useAdjustInventory(product.id);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InventoryAdjustValues, unknown, ValidatedInventoryAdjust>({
    resolver: zodResolver(inventoryAdjustSchema),
    defaultValues: { quantityChange: "", reason: "", notes: "" },
  });

  const change = Number(useWatch({ control, name: "quantityChange" }));
  const preview = Number.isInteger(change) ? product.stock_quantity + change : null;

  const onSubmit = async (values: ValidatedInventoryAdjust) => {
    setFormError(null);
    if (product.stock_quantity + Number(values.quantityChange) < 0) {
      setError("quantityChange", { type: "validate", message: "The resulting stock cannot be negative." });
      return;
    }
    try {
      onSaved(await mutation.mutateAsync(values));
    } catch (error) {
      const result = mapInventoryApiError(error);
      (Object.entries(result.fieldErrors) as Array<[InventoryAdjustField, string]>).forEach(([field, message]) =>
        setError(field, { type: "server", message }),
      );
      setFormError(result.formError);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-muted-foreground">
        Current stock for <span className="font-semibold text-slate-900">{product.name}</span>: {product.stock_quantity}
      </p>
      <Field label="Quantity change *" htmlFor="adjust-quantity" error={errors.quantityChange?.message}>
        <Input id="adjust-quantity" inputMode="numeric" placeholder="e.g. 5 or -3" hasError={!!errors.quantityChange} {...register("quantityChange")} />
        {preview !== null && preview !== product.stock_quantity ? (
          <p className="mt-1 text-xs text-muted-foreground">Resulting stock: {preview}</p>
        ) : null}
      </Field>
      <Field label="Reason *" htmlFor="adjust-reason" error={errors.reason?.message}>
        <Input id="adjust-reason" placeholder="e.g. restock, damage, correction" hasError={!!errors.reason} {...register("reason")} />
      </Field>
      <Field label="Notes" htmlFor="adjust-notes" error={errors.notes?.message}>
        <Textarea id="adjust-notes" className="min-h-20" hasError={!!errors.notes} {...register("notes")} />
      </Field>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Saving…" : "Adjust stock"}
        </Button>
      </div>
    </form>
  );
}
