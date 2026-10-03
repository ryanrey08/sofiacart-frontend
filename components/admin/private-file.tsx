"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PREVIEWABLE = ["image/jpeg", "image/png", "image/webp"];

// Loads a protected admin file as a blob through the authenticated admin client so documents
// (merchant permits/IDs, return evidence) are never exposed through public URLs.
export function PrivateFile({ load, name, label }: { load: () => Promise<Blob>; name: string; label: string }) {
  const [state, setState] = useState<{ url: string; mime: string } | null>(null);
  const [error, setError] = useState<"missing" | "failed" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let url = "";
    load()
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setState({ url, mime: blob.type });
        setError(null);
      })
      .catch((failure: unknown) => {
        const status = (failure as { response?: { status?: number } })?.response?.status;
        if (active) setError(status === 404 ? "missing" : "failed");
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
    // `load` identity changes every render; the attempt counter drives explicit retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, name]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      {state ? (
        <>
          {PREVIEWABLE.includes(state.mime) ? (
            <Image src={state.url} alt={label} width={320} height={200} unoptimized className="max-h-48 w-full rounded-lg bg-slate-50 object-contain" />
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <FileText aria-hidden="true" className="h-8 w-8" />
            </div>
          )}
          <a href={state.url} download={name} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            <Download aria-hidden="true" className="h-4 w-4" />
            Download
          </a>
        </>
      ) : error ? (
        <div role="alert" className="space-y-2 text-sm text-red-700">
          <p>{error === "missing" ? "The file is not available in storage." : "Could not load this file."}</p>
          {error === "failed" ? (
            <Button size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      )}
    </div>
  );
}
