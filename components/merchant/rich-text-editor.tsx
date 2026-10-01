"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED_TAGS = new Set(["P", "BR", "DIV", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A"]);
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH"]);
const SAFE_HREF = /^(https?:|mailto:)/i;

// Whitelist sanitizer: keeps simple formatting tags, unwraps anything else, and strips every attribute
// except a safe `href` on links. DOMParser documents are inert, so nothing executes while parsing.
export function sanitizeRichText(html: string) {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

  const clean = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (DROPPED_TAGS.has(child.tagName)) {
        child.remove();
        return;
      }
      clean(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }
      const href = child.tagName === "A" ? child.getAttribute("href")?.trim() ?? "" : "";
      Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
      if (child.tagName === "A") {
        if (SAFE_HREF.test(href)) {
          child.setAttribute("href", href);
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        } else {
          child.replaceWith(...Array.from(child.childNodes));
        }
      }
    });
  };

  clean(doc.body);
  return doc.body.innerHTML;
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Keep the editor selection while clicking the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  length,
  maxLength,
  hasError,
  labelledBy,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  length: number;
  maxLength: number;
  hasError?: boolean;
  labelledBy?: string;
  describedBy?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Only push external values (initial load / reset) into the DOM so typing never moves the caret.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.innerHTML === value) return;
    editor.innerHTML = sanitizeRichText(value);
  }, [value]);

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.textContent?.trim() ?? "";
    onChange(text ? editor.innerHTML : "");
  };

  const exec = (command: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)", "https://");
    if (!url) return;
    if (!SAFE_HREF.test(url.trim())) {
      window.alert("Links must start with http://, https:// or mailto:");
      return;
    }
    exec("createLink", url.trim());
    // Re-sanitize so new links get target/rel attributes.
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = sanitizeRichText(editor.innerHTML);
      emit();
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white transition focus-within:ring-2",
        hasError ? "border-red-400 focus-within:ring-red-100" : "border-slate-200 focus-within:border-brand-400 focus-within:ring-brand-200",
      )}
    >
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Bulleted list" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert link" onClick={addLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Clear formatting" onClick={() => exec("removeFormat")}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="relative">
        {length === 0 && placeholder ? (
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400">
            {placeholder}
          </span>
        ) : null}
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={onBlur}
          onPaste={(event) => {
            // Paste as plain text so foreign markup never enters the description.
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
            emit();
          }}
          className="min-h-32 px-3 py-2.5 text-sm text-slate-800 outline-none [&_a]:text-brand-700 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
      <p className={cn("border-t border-slate-100 px-3 py-1.5 text-right text-xs", length > maxLength ? "font-semibold text-red-600" : "text-muted-foreground")}>
        {length}/{maxLength}
      </p>
    </div>
  );
}
