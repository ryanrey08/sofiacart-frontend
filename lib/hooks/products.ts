"use client";
import { mockProducts } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Product } from "@/types";
export function useProducts() { return useResourceQuery<Product[]>(["products"], "/api/v1/products", mockProducts); }
