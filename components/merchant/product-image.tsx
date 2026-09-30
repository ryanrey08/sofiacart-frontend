"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { productImageUrl } from "@/lib/merchant-products";
import { cn } from "@/lib/utils";

export function ProductImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl bg-slate-100 text-slate-400", className)} title="Image unavailable">
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }

  return (
    <Image
      src={productImageUrl(path, base)}
      alt={alt}
      width={160}
      height={160}
      unoptimized
      onError={() => setFailed(true)}
      className={cn("rounded-xl object-cover", className)}
    />
  );
}
