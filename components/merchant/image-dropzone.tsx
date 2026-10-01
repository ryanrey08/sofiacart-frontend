"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { CATEGORY_IMAGE_TYPES, categoryImageError } from "@/lib/validation/category";
import { cn } from "@/lib/utils";

// Drag-and-drop / click-to-browse picker for a single category image (PNG/JPG/WEBP, max 2MB).
export function ImageDropzone({
  id,
  onSelect,
  onInvalid,
  disabled,
  busy,
  compact,
  hasError,
  describedBy,
}: {
  id: string;
  onSelect: (file: File) => void;
  onInvalid: (message: string) => void;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  hasError?: boolean;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (!file) return;
    const message = categoryImageError(file);
    if (message) onInvalid(message);
    else onSelect(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) accept(event.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition",
        compact ? "px-3 py-4" : "px-4 py-7",
        dragging ? "border-brand-400 bg-brand-50" : hasError ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-slate-50/70",
        disabled && "opacity-60",
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
      </span>
      <p className="text-sm text-slate-700">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:pointer-events-none"
        >
          Click to upload
        </button>{" "}
        or drag and drop
      </p>
      <p id={describedBy} className="text-xs text-muted-foreground">
        PNG, JPG or WEBP (max. 2MB)
        {compact ? null : <span className="block">Recommended size: 600 × 400px</span>}
      </p>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={CATEGORY_IMAGE_TYPES.join(",")}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
