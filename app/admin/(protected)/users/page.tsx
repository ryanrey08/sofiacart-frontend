"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { PermissionChecklist } from "@/components/admin/permission-checklist";
import { useAdminSession } from "@/components/admin/admin-session";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import {
  AdminTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  LoadingState,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  SelectInput,
  StatusPill,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUserActivity,
  fetchAdminUsers,
  fetchPermissions,
  fetchRoles,
  updateAdminUser,
  type AdminUserPayload,
} from "@/lib/api/admin";
import { fieldErrorList, parseApiError } from "@/lib/admin/errors";
import { formatDateTime } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { adminUserSchema, type AdminUserSchema } from "@/lib/validation/admin";
import type { AdminPermission, AdminRole, AdminUser } from "@/types/admin";

type NoticeState = { tone: "success" | "error"; text: string };
type Editing = { mode: "create" } | { mode: "edit"; user: AdminUser };

export default function AdminUsersPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.USERS_VIEW}>
      <UsersContent />
    </RequirePermission>
  );
}

function UsersContent() {
  const { user: currentUser } = useAdminSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [activityFor, setActivityFor] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, is_active: isActive, page, per_page: 15 };

  const query = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => fetchAdminUsers(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (user: AdminUser) => deleteAdminUser(user.id),
    onSuccess: async (_, user) => {
      setNotice({ tone: "success", text: `${user.name} was deleted.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Administrator accounts, their roles, and direct permissions."
        actions={
          <Can permission={ADMIN_PERMISSIONS.USERS_MANAGE}>
            <Button onClick={() => setEditing({ mode: "create" })}>Invite admin user</Button>
          </Can>
        }
      />
      <FilterBar>
        <Field label="Search" htmlFor="user-search" className="min-w-64 flex-1">
          <Input
            id="user-search"
            placeholder="Name, email or phone"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Status" htmlFor="user-active">
          <SelectInput
            id="user-active"
            value={isActive}
            onChange={(event) => {
              setIsActive(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </SelectInput>
        </Field>
      </FilterBar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No admin users match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Admin users"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "user",
                header: "User",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.name} {row.id === currentUser.id ? <Badge variant="info">You</Badge> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </div>
                ),
              },
              {
                key: "roles",
                header: "Roles",
                render: (row) =>
                  row.admin_roles && row.admin_roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.admin_roles.map((role) => (
                        <Badge key={role.id}>{role.name}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">None</span>
                  ),
              },
              { key: "direct", header: "Direct permissions", render: (row) => row.admin_permissions?.length ?? 0 },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.is_active ? "active" : "inactive"} /> },
              { key: "last", header: "Last login", render: (row) => formatDateTime(row.last_login_at) },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActivityFor(row)}>
                      Activity
                    </Button>
                    <Can permission={ADMIN_PERMISSIONS.USERS_MANAGE}>
                      <Button size="sm" variant="outline" onClick={() => setEditing({ mode: "edit", user: row })}>
                        Edit
                      </Button>
                      {row.id !== currentUser.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete admin user ${row.name}? Their sessions will be revoked.`)) deleteMutation.mutate(row);
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </Can>
                  </div>
                ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}

      <Modal open={editing !== null} title={editing?.mode === "edit" ? `Edit ${editing.user.name}` : "Invite admin user"} onClose={() => setEditing(null)} wide>
        {editing ? (
          <UserForm
            key={editing.mode === "edit" ? editing.user.id : "create"}
            editing={editing}
            onDone={(text) => {
              setEditing(null);
              setNotice({ tone: "success", text });
            }}
          />
        ) : null}
      </Modal>

      <Modal open={activityFor !== null} title={`Activity · ${activityFor?.name ?? ""}`} onClose={() => setActivityFor(null)} wide>
        {activityFor ? <UserActivity userId={activityFor.id} /> : null}
      </Modal>
    </div>
  );
}

function sameIds(a: number[], b: number[]) {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
}

function UserForm({ editing, onDone }: { editing: Editing; onDone: (message: string) => void }) {
  const { user: currentUser, can, permissions: actorPermissions } = useAdminSession();
  const queryClient = useQueryClient();
  const target = editing.mode === "edit" ? editing.user : null;
  const isSelf = target?.id === currentUser.id;
  // Mirrors AdminAuthorizationService: role assignment needs users.assign_roles, direct grants need
  // permissions.manage, and nobody may change their own assignments.
  const canAssignRoles = !isSelf && can({ allOf: [ADMIN_PERMISSIONS.USERS_ASSIGN_ROLES, ADMIN_PERMISSIONS.ROLES_VIEW] });
  const canGrantPermissions = !isSelf && can({ allOf: [ADMIN_PERMISSIONS.PERMISSIONS_MANAGE, ADMIN_PERMISSIONS.PERMISSIONS_VIEW] });
  const [formError, setFormError] = useState<string | null>(null);

  const initialRoleIds = useMemo(() => target?.admin_roles?.map((role) => role.id) ?? [], [target]);
  const initialPermissionIds = useMemo(() => target?.admin_permissions?.map((permission) => permission.id) ?? [], [target]);

  const roles = useQuery({ queryKey: ["admin", "roles", "options"], queryFn: () => fetchRoles({ per_page: 100 }), enabled: canAssignRoles });
  const permissions = useQuery({
    queryKey: ["admin", "permissions", "options"],
    queryFn: () => fetchPermissions({ per_page: 100 }),
    enabled: canGrantPermissions,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminUserSchema>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      name: target?.name ?? "",
      email: target?.email ?? "",
      phone: target?.phone ?? "",
      is_active: target?.is_active ?? true,
      role_ids: initialRoleIds,
      permission_ids: initialPermissionIds,
    },
  });

  const roleAssignable = (role: AdminRole) =>
    (role.permissions ?? []).every((permission) => actorPermissions.includes(permission.name)) &&
    (role.slug !== "super-admin" || can(ADMIN_PERMISSIONS.USERS_ASSIGN_SUPER_ADMIN));
  const permissionAssignable = (permission: AdminPermission) =>
    actorPermissions.includes(permission.name) &&
    (permission.name !== ADMIN_PERMISSIONS.USERS_ASSIGN_SUPER_ADMIN || can(ADMIN_PERMISSIONS.USERS_ASSIGN_SUPER_ADMIN));

  const onSubmit = async (values: AdminUserSchema) => {
    setFormError(null);
    const payload: AdminUserPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      is_active: values.is_active,
    };
    if (target && isSelf) delete payload.is_active;
    if (canAssignRoles && (!target || !sameIds(values.role_ids, initialRoleIds))) payload.role_ids = values.role_ids;
    if (canGrantPermissions && (!target ? values.permission_ids.length > 0 : !sameIds(values.permission_ids, initialPermissionIds))) {
      payload.permission_ids = values.permission_ids;
    }

    try {
      if (target) {
        await updateAdminUser(target.id, payload);
        await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        onDone(`${values.name} was updated.`);
      } else {
        const response = await createAdminUser(payload);
        await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        onDone(`${response.message} A password setup link was sent to ${response.password_setup.email}.`);
      }
    } catch (error) {
      const details = parseApiError(error);
      setFormError([details.message, ...fieldErrorList(details).filter((message) => message !== details.message)].join(" "));
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {!target ? <Notice tone="info">The new admin receives an email link to set their password.</Notice> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" htmlFor="user-name" error={errors.name?.message}>
          <Input id="user-name" hasError={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="user-email" error={errors.email?.message}>
          <Input id="user-email" type="email" hasError={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Phone (optional)" htmlFor="user-phone" error={errors.phone?.message}>
          <Input id="user-phone" hasError={!!errors.phone} {...register("phone")} />
        </Field>
        {!isSelf ? (
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
            <input type="checkbox" {...register("is_active")} />
            Active account
          </label>
        ) : null}
      </div>

      {canAssignRoles ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">Roles</legend>
          {roles.isPending ? <LoadingState label="Loading roles…" /> : null}
          {roles.isError ? <ErrorState error={roles.error} onRetry={() => void roles.refetch()} /> : null}
          {roles.data ? (
            <Controller
              control={control}
              name="role_ids"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {roles.data.data.map((role) => {
                    const checked = field.value.includes(role.id);
                    const disabled = !checked && !roleAssignable(role);
                    return (
                      <label key={role.id} className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) =>
                            field.onChange(event.target.checked ? [...field.value, role.id] : field.value.filter((id) => id !== role.id))
                          }
                        />
                        <span>
                          <span className="font-semibold text-slate-900">{role.name}</span>
                          {disabled ? <span className="block text-xs text-amber-700">Requires permissions you do not hold</span> : null}
                          {role.description ? <span className="block text-xs text-muted-foreground">{role.description}</span> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          ) : null}
        </fieldset>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isSelf ? "You cannot change your own roles or direct permissions." : "Role assignment requires the users.assign_roles and roles.view permissions."}
        </p>
      )}

      {canGrantPermissions ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">Direct permissions</legend>
          {permissions.isPending ? <LoadingState label="Loading permissions…" /> : null}
          {permissions.isError ? <ErrorState error={permissions.error} onRetry={() => void permissions.refetch()} /> : null}
          {permissions.data ? (
            <Controller
              control={control}
              name="permission_ids"
              render={({ field }) => <PermissionChecklist permissions={permissions.data.data} value={field.value} onChange={field.onChange} isAssignable={permissionAssignable} />}
            />
          ) : null}
        </fieldset>
      ) : null}

      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : target ? "Save changes" : "Create admin user"}
      </Button>
    </form>
  );
}

function UserActivity({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "users", userId, "activity", page],
    queryFn: () => fetchAdminUserActivity(userId, { page, per_page: 10 }),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.data.length === 0) return <EmptyState title="No activity recorded" />;

  return (
    <div className="space-y-3">
      <AuditLogTable logs={query.data.data} caption="Admin user activity" />
      <Pagination meta={query.data.meta} onPageChange={setPage} />
    </div>
  );
}
