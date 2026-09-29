"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminSession } from "@/components/admin/admin-session";
import { AdminTable, EmptyState, ErrorState, LoadingState, Notice, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAdminSessions, revokeAdminSession } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime } from "@/lib/admin/format";
import type { AdminSession } from "@/types/admin";

export default function AdminSessionsPage() {
  const { logoutAll } = useAdminSession();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const query = useQuery({ queryKey: ["admin", "sessions"], queryFn: fetchAdminSessions });
  const revoke = useMutation({
    mutationFn: (session: AdminSession) => revokeAdminSession(session.id),
    onSuccess: async (_, session) => {
      setNotice({ tone: "success", text: `Session "${session.name}" was revoked.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active sessions"
        description="Admin API tokens issued to your account."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm("Sign out of all devices, including this one?")) void logoutAll();
            }}
          >
            Sign out of all devices
          </Button>
        }
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.length === 0 ? <EmptyState title="No active sessions" /> : null}
      {query.data && query.data.length > 0 ? (
        <AdminTable
          caption="Active admin sessions"
          rows={query.data}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "name",
              header: "Device",
              render: (row) => (
                <span className="font-semibold text-slate-900">
                  {row.name} {row.is_current ? <Badge>This session</Badge> : null}
                </span>
              ),
            },
            { key: "created", header: "Signed in", render: (row) => formatDateTime(row.created_at) },
            { key: "used", header: "Last used", render: (row) => formatDateTime(row.last_used_at) },
            { key: "expires", header: "Expires", render: (row) => formatDateTime(row.expires_at) },
            {
              key: "actions",
              header: "Actions",
              render: (row) =>
                row.is_current ? (
                  <span className="text-xs text-slate-400">Use Sign out</span>
                ) : (
                  <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(row)}>
                    Revoke
                  </Button>
                ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
