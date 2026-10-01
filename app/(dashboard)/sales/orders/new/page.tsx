"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ErrorState, Field, LoadingState, Notice } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateOrder, useOrderCustomers, useOrderProducts } from "@/lib/hooks/orders";
import { parseApiError, fieldErrorList } from "@/lib/admin/errors";

const schema = z.object({
  customer_id: z.coerce.number<number>().int().positive(),
  notes: z.string().max(5000),
  items: z.array(z.object({
    product_id: z.coerce.number<number>().int().positive(),
    product_variant_id: z.string(),
    quantity: z.coerce.number<number>().int().positive(),
  })).min(1),
});
type Values = z.infer<typeof schema>;

export default function CreateOrderPage() {
  const router = useRouter();
  const customers = useOrderCustomers();
  const products = useOrderProducts();
  const create = useCreateOrder();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { customer_id: 0, notes: "", items: [{ product_id: 0, product_variant_id: "", quantity: 1 }] },
  });
  const fields = useFieldArray({ control: form.control, name: "items" });
  const values = useWatch({ control: form.control, name: "items" });
  const error = create.isError ? parseApiError(create.error) : null;
  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title="Create order" description="Select existing customers and active products. The backend sets prices and totals when you submit." actions={<Button variant="outline" asChild><Link href="/sales/orders">Back to orders</Link></Button>} />
    {customers.isPending || products.isPending ? <LoadingState /> :
      customers.isError || products.isError ? <ErrorState error={customers.error ?? products.error} onRetry={() => { void customers.refetch(); void products.refetch(); }} /> :
      <form className="space-y-5 rounded-2xl bg-white p-5" onSubmit={form.handleSubmit(async (data) => {
        create.reset();
        try {
          const result = await create.mutateAsync([
            data.customer_id, data.items.map((item) => ({
              product_id: item.product_id, quantity: item.quantity,
              ...(item.product_variant_id ? { product_variant_id: Number(item.product_variant_id) } : {}),
            })), data.notes.trim(),
          ]);
          router.push(`/sales/orders/${result.id}`);
        } catch { /* The API response is displayed below. */ }
      })}>
        {!customers.data?.length && <Notice tone="info">Add a customer in Sales &gt; Customers before creating an order.</Notice>}
        {!products.data?.length && <Notice tone="info">Add an active product in Sales &gt; Products before creating an order.</Notice>}
        <Field label="Customer" htmlFor="new-order-customer"><select id="new-order-customer" className="h-10 w-full rounded-lg border p-2" {...form.register("customer_id")}>
          <option value="0">Select customer</option>{customers.data?.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} {customer.email ? `(${customer.email})` : ""}</option>)}
        </select></Field>
        {form.formState.errors.customer_id && <p role="alert" className="text-red-700">Select a customer.</p>}
        <fieldset className="space-y-3"><legend className="font-semibold">Order items</legend>
          {fields.fields.map((field, index) => {
            const selected = products.data?.find((product) => product.id === Number(values[index]?.product_id));
            return <div key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
              <Field label={`Product ${index + 1}`} htmlFor={`order-product-${index}`}>
                <select id={`order-product-${index}`} className="h-10 w-full rounded-lg border p-2" {...form.register(`items.${index}.product_id`, { onChange: () => form.setValue(`items.${index}.product_variant_id`, "") })}>
                  <option value="0">Select product</option>{products.data?.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                </select>
              </Field>
              <Field label={`Variant ${index + 1}`} htmlFor={`order-variant-${index}`}>
                <select id={`order-variant-${index}`} className="h-10 w-full rounded-lg border p-2" {...form.register(`items.${index}.product_variant_id`)}>
                  <option value="">No variant</option>{selected?.variants?.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku} {variant.color ?? ""} {variant.size ?? ""}</option>)}
                </select>
              </Field>
              <Field label={`Quantity ${index + 1}`} htmlFor={`order-quantity-${index}`}>
                <Input id={`order-quantity-${index}`} type="number" min={1} max={selected?.variants?.length && values[index]?.product_variant_id ?
                  selected.variants.find((variant) => variant.id === Number(values[index].product_variant_id))?.stock : selected?.stock_quantity}
                {...form.register(`items.${index}.quantity`)} />
              </Field>
              <div className="sm:col-span-3">{fields.fields.length > 1 && <Button type="button" variant="outline" onClick={() => fields.remove(index)}>Remove item {index + 1}</Button>}</div>
              {form.formState.errors.items?.[index] && <p role="alert" className="text-red-700 sm:col-span-3">Choose a product and a positive whole-number quantity.</p>}
            </div>;
          })}
        </fieldset>
        <Button type="button" variant="outline" onClick={() => fields.append({ product_id: 0, product_variant_id: "", quantity: 1 })}>Add item</Button>
        <Field label="Notes (optional)" htmlFor="order-notes"><textarea id="order-notes" className="w-full rounded-lg border p-2" rows={3} {...form.register("notes")} /></Field>
        {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}
        <p className="text-sm text-slate-600">Displayed catalog prices are indicative only. The server calculates the final amount and checks stock on submission.</p>
        <Button type="submit" disabled={create.isPending || !customers.data?.length || !products.data?.length}>{create.isPending ? "Creating…" : "Create order"}</Button>
      </form>}
  </div>;
}
