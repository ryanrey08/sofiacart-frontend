"use client";

import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

// Lightweight auto-dismissing toast pinned to the bottom-right of the viewport.
export function Toast({ toast, onDismiss, duration = 5000 }: { toast: ToastMessage | null; onDismiss: () => void; duration?: number }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;
  const Icon = toast.tone === "success" ? CheckCircle2 : XCircle;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:justify-end">
      <div
        key={toast.id}
        role={toast.tone === "error" ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-soft",
          toast.tone === "success" ? "border-green-200 text-green-800" : "border-red-200 text-red-800",
        )}
      >
        <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1">{toast.text}</p>
        <button type="button" aria-label="Dismiss notification" onClick={onDismiss} className="rounded-md p-0.5 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
