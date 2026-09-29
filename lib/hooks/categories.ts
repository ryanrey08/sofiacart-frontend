"use client";
import { mockCategories } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Category } from "@/types";
export function useCategories() { return useResourceQuery<Category[]>(["categories"], "/api/v1/categories", mockCategories); }
