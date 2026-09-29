"use client";

import type { AdminPermission } from "@/types/admin";

export function PermissionChecklist({
  permissions,
  value,
  onChange,
  isAssignable,
}: {
  permissions: AdminPermission[];
  value: number[];
  onChange: (value: number[]) => void;
  isAssignable: (permission: AdminPermission) => boolean;
}) {
  const groups = permissions.reduce<Record<string, AdminPermission[]>>((acc, permission) => {
    (acc[permission.group] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="rounded-2xl bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
          <div className="space-y-1">
            {items.map((permission) => {
              const checked = value.includes(permission.id);
              const disabled = !checked && !isAssignable(permission);
              return (
                <label key={permission.id} className="flex items-center gap-2 text-sm" title={disabled ? "You do not hold this permission" : permission.name}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.checked ? [...value, permission.id] : value.filter((id) => id !== permission.id))}
                  />
                  <span className={disabled ? "text-slate-400" : "text-slate-700"}>{permission.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
