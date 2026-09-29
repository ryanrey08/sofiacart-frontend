"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useAdminSession } from "@/components/admin/admin-session";
import { PermissionChecklist } from "@/components/admin/permission-checklist";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, Notice, PageHeader, Pagination } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  fetchPermissions,
  fetchRoles,
  updatePermission,
  updateRole,
  type AdminRolePayload,
} from "@/lib/api/admin";
import { fieldErrorList, parseApiError } from "@/lib/admin/errors";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { cn } from "@/lib/utils";
import { adminPermissionSchema, adminRoleSchema, type AdminPermissionSchema, type AdminRoleSchema } from "@/lib/validation/admin";
import type { AdminPermission, AdminRole } from "@/types/admin";

type NoticeState = { tone: "success" | "error"; text: string };

function describeError(error: unknown) {
  const details = parseApiError(error);
  return [details.message, ...fieldErrorList(details).filter((message) => message !== details.message)].join(" ");
}

export default function AdminRolesPage() {
  return (
    <RequirePermission permission={{ anyOf: [ADMIN_PERMISSIONS.ROLES_VIEW, ADMIN_PERMISSIONS.PERMISSIONS_VIEW] }}>
      <RolesAndPermissions />
    </RequirePermission>
  );
}

function RolesAndPermissions() {
  const { can } = useAdminSession();
  const tabs = [
    { id: "roles" as const, label: "Roles", visible: can(ADMIN_PERMISSIONS.ROLES_VIEW) },
    { id: "permissions" as const, label: "Permissions", visible: can(ADMIN_PERMISSIONS.PERMISSIONS_VIEW) },
  ].filter((tab) => tab.visible);
  const [tab, setTab] = useState<"roles" | "permissions">(tabs[0]?.id ?? "roles");

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & permissions" description="Role-based access control for the admin console. System roles and permissions are read-only." />
      <div role="tablist" aria-label="Access control" className="inline-flex gap-1 rounded-2xl bg-white/80 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn("rounded-xl px-4 py-2 text-sm font-semibold", tab === item.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50")}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "roles" ? <RolesTab /> : <PermissionsTab />}
    </div>
  );
}

function RolesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ role: AdminRole | null } | null>(null);
  const [viewing, setViewing] = useState<AdminRole | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, page, per_page: 15 };

  const query = useQuery({ queryKey: ["admin", "roles", params], queryFn: () => fetchRoles(params), placeholderData: keepPreviousData });
  const deleteMutation = useMutation({
    mutationFn: (role: AdminRole) => deleteRole(role.id),
    onSuccess: async (_, role) => {
      setNotice({ tone: "success", text: `Role ${role.name} was deleted.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (error) => setNotice({ tone: "error", text: describeError(error) }),
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <Field label="Search roles" htmlFor="role-search" className="min-w-64 flex-1">
          <Input
            id="role-search"
            placeholder="Name or slug"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Can permission={ADMIN_PERMISSIONS.ROLES_MANAGE}>
          <Button onClick={() => setEditing({ role: null })}>New role</Button>
        </Can>
      </FilterBar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState title="No roles found" /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Admin roles"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "name",
                header: "Role",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.name} {row.is_system ? <Badge variant="muted">System</Badge> : null}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{row.slug}</p>
                  </div>
                ),
              },
              { key: "description", header: "Description", render: (row) => row.description ?? "—" },
              {
                key: "permissions",
                header: "Permissions",
                render: (row) => (
                  <Button size="sm" variant="outline" onClick={() => setViewing(row)}>
                    {row.permissions?.length ?? 0} permissions
                  </Button>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) =>
                  row.is_system ? (
                    <span className="text-xs text-slate-400">Read-only</span>
                  ) : (
                    <Can permission={ADMIN_PERMISSIONS.ROLES_MANAGE} fallback={<span className="text-xs text-slate-400">View only</span>}>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing({ role: row })}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete role ${row.name}?`)) deleteMutation.mutate(row);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </Can>
                  ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}

      <Modal open={viewing !== null} title={`${viewing?.name ?? "Role"} permissions`} onClose={() => setViewing(null)}>
        {viewing && (viewing.permissions ?? []).length === 0 ? <EmptyState title="No permissions assigned" /> : null}
        <ul className="grid gap-2 sm:grid-cols-2">
          {(viewing?.permissions ?? []).map((permission) => (
            <li key={permission.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <p className="font-semibold text-slate-900">{permission.label}</p>
              <p className="font-mono text-xs text-muted-foreground">{permission.name}</p>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={editing !== null} title={editing?.role ? `Edit ${editing.role.name}` : "New role"} onClose={() => setEditing(null)} wide>
        {editing ? (
          <RoleForm
            key={editing.role?.id ?? "new"}
            role={editing.role}
            onDone={(text) => {
              setEditing(null);
              setNotice({ tone: "success", text });
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function RoleForm({ role, onDone }: { role: AdminRole | null; onDone: (message: string) => void }) {
  const { can, permissions: actorPermissions } = useAdminSession();
  const queryClient = useQueryClient();
  const canPickPermissions = can(ADMIN_PERMISSIONS.PERMISSIONS_VIEW);
  const [formError, setFormError] = useState<string | null>(null);
  const permissions = useQuery({
    queryKey: ["admin", "permissions", "options"],
    queryFn: () => fetchPermissions({ per_page: 100 }),
    enabled: canPickPermissions,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminRoleSchema>({
    resolver: zodResolver(adminRoleSchema),
    defaultValues: {
      slug: role?.slug ?? "",
      name: role?.name ?? "",
      description: role?.description ?? "",
      permission_ids: role?.permissions?.map((permission) => permission.id) ?? [],
    },
  });

  // Mirrors AdminRoleController::assertDelegatablePermissions: only permissions the actor holds.
  const assignable = (permission: AdminPermission) => actorPermissions.includes(permission.name);

  const onSubmit = async (values: AdminRoleSchema) => {
    setFormError(null);
    const payload: AdminRolePayload = {
      slug: values.slug.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
    };
    if (canPickPermissions && permissions.data) payload.permission_ids = values.permission_ids;

    try {
      if (role) await updateRole(role.id, payload);
      else await createRole(payload);
      await queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      onDone(`Role ${values.name} was ${role ? "updated" : "created"}.`);
    } catch (error) {
      setFormError(describeError(error));
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="role-name" error={errors.name?.message}>
          <Input id="role-name" hasError={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Slug" htmlFor="role-slug" error={errors.slug?.message}>
          <Input id="role-slug" placeholder="e.g. finance-reviewer" hasError={!!errors.slug} {...register("slug")} />
        </Field>
        <Field label="Description" htmlFor="role-description" className="md:col-span-2">
          <Textarea id="role-description" className="min-h-[80px]" {...register("description")} />
        </Field>
      </div>
      {canPickPermissions ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Permissions</legend>
          {permissions.isPending ? <LoadingState label="Loading permissions…" /> : null}
          {permissions.isError ? <ErrorState error={permissions.error} onRetry={() => void permissions.refetch()} /> : null}
          {permissions.data ? (
            <Controller
              control={control}
              name="permission_ids"
              render={({ field }) => <PermissionChecklist permissions={permissions.data.data} value={field.value} onChange={field.onChange} isAssignable={assignable} />}
            />
          ) : null}
        </fieldset>
      ) : (
        <p className="text-sm text-muted-foreground">Selecting permissions requires the permissions.view permission; existing assignments are left unchanged.</p>
      )}
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : role ? "Save role" : "Create role"}
      </Button>
    </form>
  );
}

function PermissionsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ permission: AdminPermission | null } | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const debouncedGroup = useDebouncedValue(group);
  const params = { search: debouncedSearch, group: debouncedGroup.trim(), page, per_page: 50 };

  const query = useQuery({ queryKey: ["admin", "permissions", params], queryFn: () => fetchPermissions(params), placeholderData: keepPreviousData });
  const deleteMutation = useMutation({
    mutationFn: (permission: AdminPermission) => deletePermission(permission.id),
    onSuccess: async (_, permission) => {
      setNotice({ tone: "success", text: `Permission ${permission.name} was deleted.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    },
    onError: (error) => setNotice({ tone: "error", text: describeError(error) }),
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <Field label="Search permissions" htmlFor="permission-search" className="min-w-64 flex-1">
          <Input
            id="permission-search"
            placeholder="Name or label"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Group" htmlFor="permission-group">
          <Input
            id="permission-group"
            placeholder="e.g. merchants"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Can permission={ADMIN_PERMISSIONS.PERMISSIONS_MANAGE}>
          <Button onClick={() => setEditing({ permission: null })}>New permission</Button>
        </Can>
      </FilterBar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState title="No permissions found" /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Admin permissions"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "name",
                header: "Permission",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.label} {row.is_system ? <Badge variant="muted">System</Badge> : null}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{row.name}</p>
                  </div>
                ),
              },
              { key: "group", header: "Group", render: (row) => row.group },
              { key: "description", header: "Description", render: (row) => row.description ?? "—" },
              {
                key: "actions",
                header: "Actions",
                render: (row) =>
                  row.is_system ? (
                    <span className="text-xs text-slate-400">Read-only</span>
                  ) : (
                    <Can permission={ADMIN_PERMISSIONS.PERMISSIONS_MANAGE} fallback={<span className="text-xs text-slate-400">View only</span>}>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing({ permission: row })}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete permission ${row.name}?`)) deleteMutation.mutate(row);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </Can>
                  ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}

      <Modal open={editing !== null} title={editing?.permission ? `Edit ${editing.permission.name}` : "New permission"} onClose={() => setEditing(null)}>
        {editing ? (
          <PermissionForm
            key={editing.permission?.id ?? "new"}
            permission={editing.permission}
            onDone={(text) => {
              setEditing(null);
              setNotice({ tone: "success", text });
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function PermissionForm({ permission, onDone }: { permission: AdminPermission | null; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminPermissionSchema>({
    resolver: zodResolver(adminPermissionSchema),
    defaultValues: {
      name: permission?.name ?? "",
      group: permission?.group ?? "",
      label: permission?.label ?? "",
      description: permission?.description ?? "",
    },
  });

  const onSubmit = async (values: AdminPermissionSchema) => {
    setFormError(null);
    const payload = {
      name: values.name.trim(),
      group: values.group.trim(),
      label: values.label.trim(),
      description: values.description.trim() || null,
    };
    try {
      if (permission) await updatePermission(permission.id, payload);
      else await createPermission(payload);
      await queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
      onDone(`Permission ${payload.name} was ${permission ? "updated" : "created"}.`);
    } catch (error) {
      setFormError(describeError(error));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Notice tone="info">Custom permissions are stored for role assignment; backend routes only enforce the built-in permission names.</Notice>
      <Field label="Name" htmlFor="permission-name" error={errors.name?.message}>
        <Input id="permission-name" placeholder="e.g. merchants.export" hasError={!!errors.name} {...register("name")} />
      </Field>
      <Field label="Group" htmlFor="permission-group-input" error={errors.group?.message}>
        <Input id="permission-group-input" hasError={!!errors.group} {...register("group")} />
      </Field>
      <Field label="Label" htmlFor="permission-label" error={errors.label?.message}>
        <Input id="permission-label" hasError={!!errors.label} {...register("label")} />
      </Field>
      <Field label="Description" htmlFor="permission-description">
        <Textarea id="permission-description" className="min-h-[80px]" {...register("description")} />
      </Field>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : permission ? "Save permission" : "Create permission"}
      </Button>
    </form>
  );
}
