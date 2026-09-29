"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { EmptyState, ErrorState, Field, LoadingState, Notice, PageHeader, SelectInput } from "@/components/admin/ui";
import { useAdminSession } from "@/components/admin/admin-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchSettings, updateSettings } from "@/lib/api/admin";
import { fieldErrorList, parseApiError } from "@/lib/admin/errors";
import { formatDateTime } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { AdminSetting } from "@/types/admin";

type ValueFormat = "text" | "json";
type NoticeState = { tone: "success" | "error"; text: string };

// Settings values are stored as JSON (AdminSetting casts `value` to array/JSON).
function parseValue(raw: string, format: ValueFormat): { ok: true; value: unknown } | { ok: false; error: string } {
  if (format === "text") return { ok: true, value: raw };
  try {
    return { ok: true, value: raw.trim() === "" ? null : JSON.parse(raw) };
  } catch {
    return { ok: false, error: "Value must be valid JSON." };
  }
}

function describeError(error: unknown) {
  const details = parseApiError(error);
  return [details.message, ...fieldErrorList(details).filter((message) => message !== details.message)].join(" ");
}

export default function AdminSettingsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.SETTINGS_VIEW}>
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const query = useQuery({ queryKey: ["admin", "settings"], queryFn: fetchSettings });

  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description="Platform-wide configuration. Secret values are never returned by the API." />
      <Can permission={ADMIN_PERMISSIONS.SETTINGS_MANAGE}>
        <NewSettingCard />
      </Can>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.length === 0 ? <EmptyState title="No settings configured" /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {query.data?.map((setting) => <SettingCard key={setting.id} setting={setting} />)}
      </div>
    </div>
  );
}

function SettingCard({ setting }: { setting: AdminSetting }) {
  const { can } = useAdminSession();
  const queryClient = useQueryClient();
  const canManage = can(ADMIN_PERMISSIONS.SETTINGS_MANAGE);
  const format: ValueFormat = typeof setting.value === "string" ? "text" : "json";
  const initialValue = setting.is_secret ? "" : format === "text" ? String(setting.value) : JSON.stringify(setting.value, null, 2);
  const [value, setValue] = useState(initialValue);
  const [description, setDescription] = useState(setting.description ?? "");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const secretConfigured = setting.is_secret && typeof setting.value === "object" && setting.value !== null && (setting.value as { configured?: boolean }).configured;

  const mutation = useMutation({
    mutationFn: (payload: { key: string; value?: unknown; description: string | null }) => updateSettings([payload]),
    onSuccess: async () => {
      setNotice({ tone: "success", text: "Setting saved." });
      if (setting.is_secret) setValue("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (error) => setNotice({ tone: "error", text: describeError(error) }),
  });

  const save = () => {
    setNotice(null);
    const payload: { key: string; value?: unknown; description: string | null } = { key: setting.key, description: description.trim() || null };
    if (setting.is_secret) {
      // Omitting `value` keeps the stored secret (SettingController preserves it).
      if (value !== "") payload.value = value;
    } else {
      const parsed = parseValue(value, format);
      if (!parsed.ok) {
        setNotice({ tone: "error", text: parsed.error });
        return;
      }
      payload.value = parsed.value;
    }
    mutation.mutate(payload);
  };

  return (
    <Card className="border-none bg-white/90">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-mono text-base">{setting.key}</CardTitle>
          <p className="text-xs text-muted-foreground">Updated {formatDateTime(setting.updated_at)}</p>
        </div>
        {setting.is_secret ? <Badge variant={secretConfigured ? "success" : "warning"}>{secretConfigured ? "Secret · configured" : "Secret · not set"}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {setting.is_secret ? (
          <Field label="New secret value (leave blank to keep current)" htmlFor={`setting-value-${setting.id}`}>
            <Input id={`setting-value-${setting.id}`} type="password" autoComplete="off" disabled={!canManage} value={value} onChange={(event) => setValue(event.target.value)} />
          </Field>
        ) : format === "text" ? (
          <Field label="Value" htmlFor={`setting-value-${setting.id}`}>
            <Input id={`setting-value-${setting.id}`} disabled={!canManage} value={value} onChange={(event) => setValue(event.target.value)} />
          </Field>
        ) : (
          <Field label="Value (JSON)" htmlFor={`setting-value-${setting.id}`}>
            <Textarea id={`setting-value-${setting.id}`} className="min-h-[110px] font-mono text-xs" disabled={!canManage} value={value} onChange={(event) => setValue(event.target.value)} />
          </Field>
        )}
        <Field label="Description" htmlFor={`setting-description-${setting.id}`}>
          <Input id={`setting-description-${setting.id}`} disabled={!canManage} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        {canManage ? (
          <Button onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NewSettingCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ key: "", value: "", format: "text" as ValueFormat, description: "", is_secret: false });
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { key: string; value: unknown; description: string | null; is_secret: boolean }) => updateSettings([payload]),
    onSuccess: async () => {
      setNotice({ tone: "success", text: "Setting created." });
      setForm({ key: "", value: "", format: "text", description: "", is_secret: false });
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (error) => setNotice({ tone: "error", text: describeError(error) }),
  });

  const submit = () => {
    setNotice(null);
    const key = form.key.trim();
    if (!key || key.length > 255) {
      setNotice({ tone: "error", text: "Key is required (max 255 characters)." });
      return;
    }
    const parsed = parseValue(form.value, form.is_secret ? "text" : form.format);
    if (!parsed.ok) {
      setNotice({ tone: "error", text: parsed.error });
      return;
    }
    mutation.mutate({ key, value: parsed.value, description: form.description.trim() || null, is_secret: form.is_secret });
  };

  return (
    <Card className="border-none bg-white/90">
      <CardHeader>
        <CardTitle>Add or overwrite a setting</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
        <Field label="Key" htmlFor="new-setting-key">
          <Input id="new-setting-key" maxLength={255} value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} />
        </Field>
        <Field label="Value format" htmlFor="new-setting-format">
          <SelectInput
            id="new-setting-format"
            className="w-full"
            disabled={form.is_secret}
            value={form.is_secret ? "text" : form.format}
            onChange={(event) => setForm((current) => ({ ...current, format: event.target.value as ValueFormat }))}
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
          </SelectInput>
        </Field>
        <Field label="Value" htmlFor="new-setting-value" className="md:col-span-2">
          <Textarea
            id="new-setting-value"
            className="min-h-[80px] font-mono text-xs"
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
          />
        </Field>
        <Field label="Description" htmlFor="new-setting-description">
          <Input id="new-setting-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
          <input type="checkbox" checked={form.is_secret} onChange={(event) => setForm((current) => ({ ...current, is_secret: event.target.checked }))} />
          Secret (value hidden in API responses; only applies to new keys)
        </label>
        {notice ? (
          <div className="md:col-span-2">
            <Notice tone={notice.tone}>{notice.text}</Notice>
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save setting"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
