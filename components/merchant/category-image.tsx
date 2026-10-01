import { Tags } from "lucide-react";
import { ProductImage } from "@/components/merchant/product-image";
import { categoryImagePath } from "@/lib/merchant-categories";
import { cn } from "@/lib/utils";
import type { CategoryResource } from "@/types";

export function CategoryThumb({
  category,
  className,
}: {
  category: Pick<CategoryResource, "name" | "image" | "image_url">;
  className?: string;
}) {
  const path = categoryImagePath(category);
  if (path) return <ProductImage key={path} path={path} alt={category.name} className={cn("shrink-0", className)} />;
  return (
    <div aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600", className)}>
      <Tags className="h-1/2 max-h-6 w-1/2 max-w-6" />
    </div>
  );
}
