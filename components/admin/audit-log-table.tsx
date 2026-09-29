"use client";

import { useState } from "react";
import { AdminTable, JsonBlock } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/admin/format";
import type { AdminAuditLog } from "@/types/admin";

export function AuditLogTable({ logs, caption }: { logs: AdminAuditLog[]; caption: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <AdminTable
      caption={caption}
      rows={logs}
      rowKey={(row) => row.id}
      columns={[
        { key: "when", header: "When", render: (row) => formatDateTime(row.created_at) },
        { key: "actor", header: "Actor", render: (row) => (row.actor ? `${row.actor.name} (${row.actor.email})` : "System") },
        { key: "action", header: "Action", render: (row) => <code className="text-xs">{row.action}</code> },
        { key: "description", header: "Description", render: (row) => row.description ?? "—" },
        { key: "subject", header: "Subject", render: (row) => (row.subject_type ? `${row.subject_type.split("\\").pop()} #${row.subject_id}` : "—") },
        { key: "ip", header: "IP", render: (row) => row.ip_address ?? "—" },
        {
          key: "metadata",
          header: "Metadata",
          className: "min-w-40",
          render: (row) =>
            expanded === row.id ? (
              <div className="space-y-2">
                <JsonBlock value={row.metadata} />
                <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>
                  Hide
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setExpanded(row.id)}>
                Show
              </Button>
            ),
        },
      ]}
    />
  );
}
