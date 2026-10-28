"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ListChecks, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { useAdminSession } from "@/components/admin/admin-session";
import { EmptyState, ErrorState, Field, IconAction, LoadingState, Modal, Notice, PageHeader, Panel, SearchField, SelectInput, StatusPill, Tabs } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCity,
  createProvince,
  createRegistrationOption,
  deleteCity,
  deleteProvince,
  deleteRegistrationOption,
  fetchAdminCities,
  fetchAdminProvinces,
  fetchRegistrationOptionGroups,
  reorderRegistrationOptions,
  updateCity,
  updateProvince,
  updateRegistrationOption,
} from "@/lib/api/admin";
import { fieldErrorList, parseApiError } from "@/lib/admin/errors";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { REGISTRATION_OPTIONS_QUERY_KEY } from "@/lib/registration-options";
import type { AdminCity, AdminProvince, AdminRegistrationOption, AdminRegistrationOptionGroup, RegistrationOptionType } from "@/types/admin";

type TabId = RegistrationOptionType | "locations";
type NoticeState = { tone: "success" | "error"; text: string };

// What each list feeds, shown under its heading.
const USED_FOR: Record<RegistrationOptionType, string> = {
  business_type: "Business Type in merchant registration and Store Profile.",
  category: "Business Category and Store Category in merchant registration and Store Profile.",
  government_id_type: "Government ID Type in merchant registration.",
};

const GROUPS_KEY = ["admin", "registration-options"] as const;
const PROVINCES_KEY = ["admin", "provinces"] as const;

function describeError(error: unknown) {
  const details = parseApiError(error);
  return [details.message, ...fieldErrorList(details).filter((message) => message !== details.message)].join(" ");
}

function usageLabel(count: number) {
  return count === 0 ? "Not used" : `${count} store${count === 1 ? "" : "s"}`;
}

export default function AdminRegistrationOptionsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.SETTINGS_VIEW}>
      <RegistrationOptionsContent />
    </RequirePermission>
  );
}

function RegistrationOptionsContent() {
  const [tab, setTab] = useState<TabId>("business_type");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const groups = useQuery({ queryKey: GROUPS_KEY, queryFn: fetchRegistrationOptionGroups });
  const group = groups.data?.find((item) => item.type === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ListChecks}
        title="Registration Options"
        description="The dropdown choices merchants pick from when they register and edit their Store Profile. Stores keep their saved value when an option is renamed or deactivated."
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Tabs<TabId>
        label="Dropdown list"
        value={tab}
        onChange={(next) => {
          setTab(next);
          setNotice(null);
        }}
        tabs={[
          { id: "business_type", label: "Business types" },
          { id: "category", label: "Categories" },
          { id: "government_id_type", label: "Government ID types" },
          { id: "locations", label: "Provinces & cities" },
        ]}
      />
      {tab === "locations" ? (
        <LocationsManager onNotice={setNotice} />
      ) : (
        <>
          {groups.isPending ? <LoadingState /> : null}
          {groups.isError ? <ErrorState error={groups.error} onRetry={() => void groups.refetch()} /> : null}
          {group ? <OptionList key={group.type} group={group} onNotice={setNotice} /> : null}
        </>
      )}
    </div>
  );
}

function useInvalidateLists() {
  const queryClient = useQueryClient();
  return async (...keys: ReadonlyArray<readonly unknown[]>) => {
    await Promise.all([
      ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      queryClient.invalidateQueries({ queryKey: REGISTRATION_OPTIONS_QUERY_KEY }),
    ]);
  };
}

function OptionList({ group, onNotice }: { group: AdminRegistrationOptionGroup; onNotice: (notice: NoticeState | null) => void }) {
  const { can } = useAdminSession();
  const canManage = can(ADMIN_PERMISSIONS.SETTINGS_MANAGE);
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLists();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<AdminRegistrationOption | null>(null);
  const [deleting, setDeleting] = useState<AdminRegistrationOption | null>(null);
  const options = group.options;

  const onError = (failure: unknown) => onNotice({ tone: "error", text: describeError(failure) });

  const create = useMutation({
    mutationFn: () => createRegistrationOption(group.type, name.trim()),
    onSuccess: async (result) => {
      setName("");
      await invalidate(GROUPS_KEY);
      onNotice({ tone: "success", text: `“${result.data.name}” added.` });
    },
    onError,
  });

  const toggle = useMutation({
    mutationFn: (option: AdminRegistrationOption) => updateRegistrationOption(option.id, { is_active: !option.is_active }),
    onSuccess: async (result) => {
      await invalidate(GROUPS_KEY);
      onNotice({ tone: "success", text: `“${result.data.name}” ${result.data.is_active ? "is now shown" : "is now hidden"} in the dropdown.` });
    },
    onError,
  });

  const move = useMutation({
    mutationFn: (ids: number[]) => reorderRegistrationOptions(group.type, ids),
    onSuccess: async (data) => {
      queryClient.setQueryData(GROUPS_KEY, data);
      await invalidate();
    },
    onError,
  });

  const moveBy = (index: number, offset: number) => {
    const ids = options.map((option) => option.id);
    const target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    move.mutate(ids);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return onNotice({ tone: "error", text: "Enter a name for the new option." });
    create.mutate();
  };

  return (
    <Panel icon={ListChecks} title={group.label} description={`Used for ${USED_FOR[group.type]}`}>
      <div className="space-y-4">
        {canManage ? (
          <form className="flex flex-wrap items-end gap-2" onSubmit={submit} noValidate>
            <Field label="New option" htmlFor="new-option" className="min-w-56 flex-1">
              <Input id="new-option" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder={`Add to ${group.label.toLowerCase()}`} />
            </Field>
            <Button type="submit" disabled={create.isPending}>
              <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
              {create.isPending ? "Adding…" : "Add option"}
            </Button>
          </form>
        ) : null}
        {options.length === 0 ? (
          <EmptyState title="No options yet" description="Merchants cannot complete this field until at least one active option is added." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3">Order</th>
                  <th scope="col" className="py-2 pr-3">Option</th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2 pr-3">Used by</th>
                  {canManage ? <th scope="col" className="py-2 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {options.map((option, index) => (
                  <tr key={option.id}>
                    <td className="py-2.5 pr-3">
                      {canManage ? (
                        <div className="flex gap-1">
                          <IconAction label={`Move ${option.name} up`} icon={ArrowUp} onClick={() => moveBy(index, -1)} />
                          <IconAction label={`Move ${option.name} down`} icon={ArrowDown} onClick={() => moveBy(index, 1)} />
                        </div>
                      ) : (
                        <span className="text-slate-500">{index + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-navy-900">{option.name}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={option.is_active ? "active" : "inactive"} label={option.is_active ? "Shown" : "Hidden"} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{usageLabel(option.stores_using)}</td>
                    {canManage ? (
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggle.mutate(option)} disabled={toggle.isPending}>
                            {option.is_active ? "Hide" : "Show"}
                          </Button>
                          <IconAction label={`Rename ${option.name}`} icon={Pencil} onClick={() => setEditing(option)} />
                          {option.stores_using === 0 ? (
                            <IconAction label={`Delete ${option.name}`} icon={Trash2} tone="danger" onClick={() => setDeleting(option)} />
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RenameModal
        open={editing !== null}
        title={editing ? `Rename “${editing.name}”` : ""}
        initial={editing?.name ?? ""}
        hint={editing && editing.stores_using > 0 ? `${usageLabel(editing.stores_using)} keep “${editing.name}” as saved; new selections use the new name.` : undefined}
        onClose={() => setEditing(null)}
        save={(value) => updateRegistrationOption(editing!.id, { name: value })}
        onSaved={async (message) => {
          setEditing(null);
          await invalidate(GROUPS_KEY);
          onNotice({ tone: "success", text: message });
        }}
      />
      <DeleteModal
        open={deleting !== null}
        title={deleting ? `Delete “${deleting.name}”?` : ""}
        body="It is removed from the dropdown permanently. No store uses it."
        onClose={() => setDeleting(null)}
        remove={() => deleteRegistrationOption(deleting!.id)}
        onDeleted={async (message) => {
          setDeleting(null);
          await invalidate(GROUPS_KEY);
          onNotice({ tone: "success", text: message });
        }}
        onError={onError}
      />
    </Panel>
  );
}

function LocationsManager({ onNotice }: { onNotice: (notice: NoticeState | null) => void }) {
  const { can } = useAdminSession();
  const canManage = can(ADMIN_PERMISSIONS.SETTINGS_MANAGE);
  const invalidate = useInvalidateLists();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState<"province" | "city" | null>(null);
  const [editingProvince, setEditingProvince] = useState<AdminProvince | null>(null);
  const [editingCity, setEditingCity] = useState<AdminCity | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "province"; item: AdminProvince } | { kind: "city"; item: AdminCity } | null>(null);
  const provinces = useQuery({ queryKey: [...PROVINCES_KEY, debounced], queryFn: () => fetchAdminProvinces(debounced.trim() || undefined) });
  const selected = provinces.data?.find((province) => province.id === selectedId) ?? null;
  const cities = useQuery({
    queryKey: [...PROVINCES_KEY, selectedId, "cities"],
    queryFn: () => fetchAdminCities(selectedId!),
    enabled: selectedId !== null,
  });

  const onError = (failure: unknown) => onNotice({ tone: "error", text: describeError(failure) });
  const done = async (message: string) => {
    await invalidate(PROVINCES_KEY);
    onNotice({ tone: "success", text: message });
  };

  const toggleProvince = useMutation({
    mutationFn: (province: AdminProvince) => updateProvince(province.id, { is_active: !province.is_active }),
    onSuccess: (result) => done(`${result.data.name} ${result.data.is_active ? "is now shown" : "is now hidden"} in registration.`),
    onError,
  });
  const toggleCity = useMutation({
    mutationFn: (city: AdminCity) => updateCity(city.id, { is_active: !city.is_active }),
    onSuccess: (result) => done(`${result.data.name} ${result.data.is_active ? "is now shown" : "is now hidden"} in registration.`),
    onError,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Panel
        icon={MapPin}
        title="Provinces"
        description="Metro Manila is listed as one province. Hidden provinces are not offered to new merchants."
        actions={
          <Can permission={ADMIN_PERMISSIONS.SETTINGS_MANAGE}>
            <Button size="sm" onClick={() => setAdding("province")}>
              <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Add province
            </Button>
          </Can>
        }
      >
        <div className="space-y-3">
          <SearchField id="province-search" value={search} onChange={setSearch} placeholder="Search provinces" label="Search provinces" />
          {provinces.isPending ? <LoadingState /> : null}
          {provinces.isError ? <ErrorState error={provinces.error} onRetry={() => void provinces.refetch()} /> : null}
          {provinces.data?.length === 0 ? <EmptyState title="No provinces found" /> : null}
          <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
            {provinces.data?.map((province) => (
              <li key={province.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(province.id)}
                  aria-current={province.id === selectedId ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-brand-50 ${province.id === selectedId ? "bg-brand-50" : ""}`}
                >
                  <span>
                    <span className="block font-semibold text-navy-900">{province.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {province.cities_count === 0 ? "No cities listed (typed city)" : `${province.active_cities_count} of ${province.cities_count} cities shown`}
                      {province.region ? ` · ${province.region}` : ""}
                    </span>
                  </span>
                  {province.is_active ? null : <StatusPill status="inactive" label="Hidden" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel
        icon={MapPin}
        title={selected ? `Cities and municipalities in ${selected.name}` : "Cities and municipalities"}
        description={
          selected
            ? `${usageLabel(selected.stores_using)} in this province. When cities are listed, merchants must pick one; otherwise they type their city.`
            : "Select a province to manage its cities."
        }
        actions={
          selected ? (
            <Can permission={ADMIN_PERMISSIONS.SETTINGS_MANAGE}>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleProvince.mutate(selected)} disabled={toggleProvince.isPending}>
                  {selected.is_active ? "Hide province" : "Show province"}
                </Button>
                <IconAction label={`Rename ${selected.name}`} icon={Pencil} onClick={() => setEditingProvince(selected)} />
                {selected.stores_using === 0 ? (
                  <IconAction label={`Delete ${selected.name}`} icon={Trash2} tone="danger" onClick={() => setDeleting({ kind: "province", item: selected })} />
                ) : null}
                <Button size="sm" onClick={() => setAdding("city")}>
                  <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
                  Add city
                </Button>
              </div>
            </Can>
          ) : null
        }
      >
        {!selected ? <EmptyState title="No province selected" /> : null}
        {selected && cities.isPending ? <LoadingState /> : null}
        {selected && cities.isError ? <ErrorState error={cities.error} onRetry={() => void cities.refetch()} /> : null}
        {selected && cities.data?.length === 0 ? (
          <EmptyState title="No cities listed" description="Merchants in this province type their city or municipality." />
        ) : null}
        {selected && cities.data && cities.data.length > 0 ? (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3">Name</th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2 pr-3">Used by</th>
                  {canManage ? <th scope="col" className="py-2 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cities.data.map((city) => (
                  <tr key={city.id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-navy-900">{city.name}</span>
                      {city.kind ? <span className="ml-2 text-xs capitalize text-muted-foreground">{city.kind}</span> : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={city.is_active ? "active" : "inactive"} label={city.is_active ? "Shown" : "Hidden"} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{usageLabel(city.stores_using)}</td>
                    {canManage ? (
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleCity.mutate(city)} disabled={toggleCity.isPending}>
                            {city.is_active ? "Hide" : "Show"}
                          </Button>
                          <IconAction label={`Rename ${city.name}`} icon={Pencil} onClick={() => setEditingCity(city)} />
                          {city.stores_using === 0 ? (
                            <IconAction label={`Delete ${city.name}`} icon={Trash2} tone="danger" onClick={() => setDeleting({ kind: "city", item: city })} />
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <LocationModal
        open={adding !== null}
        kind={adding ?? "province"}
        provinceName={selected?.name}
        onClose={() => setAdding(null)}
        save={(name, extra) =>
          adding === "city"
            ? createCity(selectedId!, { name, kind: (extra || null) as AdminCity["kind"] })
            : createProvince({ name, region: extra || null })
        }
        onSaved={async (message, id) => {
          if (adding === "province") setSelectedId(id);
          setAdding(null);
          await done(message);
        }}
      />
      <RenameModal
        open={editingProvince !== null}
        title={editingProvince ? `Rename ${editingProvince.name}` : ""}
        initial={editingProvince?.name ?? ""}
        hint={editingProvince && editingProvince.stores_using > 0 ? `${usageLabel(editingProvince.stores_using)} keep “${editingProvince.name}” as saved.` : undefined}
        onClose={() => setEditingProvince(null)}
        save={(name) => updateProvince(editingProvince!.id, { name })}
        onSaved={async (message) => {
          setEditingProvince(null);
          await done(message);
        }}
      />
      <RenameModal
        open={editingCity !== null}
        title={editingCity ? `Rename ${editingCity.name}` : ""}
        initial={editingCity?.name ?? ""}
        hint={editingCity && editingCity.stores_using > 0 ? `${usageLabel(editingCity.stores_using)} keep “${editingCity.name}” as saved.` : undefined}
        onClose={() => setEditingCity(null)}
        save={(name) => updateCity(editingCity!.id, { name })}
        onSaved={async (message) => {
          setEditingCity(null);
          await done(message);
        }}
      />
      <DeleteModal
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.item.name}?` : ""}
        body={
          deleting?.kind === "province"
            ? `The province and its ${deleting.item.cities_count} listed cities are removed permanently. No store uses it.`
            : "The city is removed from the dropdown permanently. No store uses it."
        }
        onClose={() => setDeleting(null)}
        remove={() => (deleting!.kind === "province" ? deleteProvince(deleting!.item.id) : deleteCity(deleting!.item.id))}
        onDeleted={async (message) => {
          if (deleting?.kind === "province") setSelectedId(null);
          setDeleting(null);
          await done(message);
        }}
        onError={onError}
      />
    </div>
  );
}

function RenameModal({
  open,
  title,
  initial,
  hint,
  onClose,
  save,
  onSaved,
}: {
  open: boolean;
  title: string;
  initial: string;
  hint?: string;
  onClose: () => void;
  save: (name: string) => Promise<{ message: string }>;
  onSaved: (message: string) => Promise<void>;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      {open ? <RenameForm key={initial} initial={initial} hint={hint} onClose={onClose} save={save} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function RenameForm({
  initial,
  hint,
  onClose,
  save,
  onSaved,
}: {
  initial: string;
  hint?: string;
  onClose: () => void;
  save: (name: string) => Promise<{ message: string }>;
  onSaved: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => save(name.trim()),
    onSuccess: (result) => onSaved(result.message),
    onError: (failure) => setError(describeError(failure)),
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!name.trim()) return setError("Enter a name.");
        mutation.mutate();
      }}
    >
      <Field label="Name" htmlFor="rename-value">
        <Input id="rename-value" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </Field>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function LocationModal({
  open,
  kind,
  provinceName,
  onClose,
  save,
  onSaved,
}: {
  open: boolean;
  kind: "province" | "city";
  provinceName?: string;
  onClose: () => void;
  save: (name: string, extra: string) => Promise<{ data: { id: number }; message: string }>;
  onSaved: (message: string, id: number) => Promise<void>;
}) {
  return (
    <Modal open={open} title={kind === "city" ? `Add a city or municipality to ${provinceName ?? ""}` : "Add a province"} onClose={onClose}>
      {open ? <LocationForm key={kind} kind={kind} onClose={onClose} save={save} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function LocationForm({
  kind,
  onClose,
  save,
  onSaved,
}: {
  kind: "province" | "city";
  onClose: () => void;
  save: (name: string, extra: string) => Promise<{ data: { id: number }; message: string }>;
  onSaved: (message: string, id: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => save(name.trim(), extra.trim()),
    onSuccess: (result) => onSaved(result.message, result.data.id),
    onError: (failure) => setError(describeError(failure)),
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!name.trim()) return setError("Enter a name.");
        mutation.mutate();
      }}
    >
      <Field label={kind === "city" ? "City or municipality name" : "Province name"} htmlFor="location-name">
        <Input id="location-name" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </Field>
      {kind === "city" ? (
        <Field label="Type (optional)" htmlFor="location-kind">
          <SelectInput id="location-kind" value={extra} onChange={(event) => setExtra(event.target.value)}>
            <option value="">Not specified</option>
            <option value="city">City</option>
            <option value="municipality">Municipality</option>
          </SelectInput>
        </Field>
      ) : (
        <Field label="Region (optional)" htmlFor="location-region">
          <Input id="location-region" maxLength={255} value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="e.g. Central Visayas (Region VII)" />
        </Field>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Adding…" : "Add"}
        </Button>
      </div>
    </form>
  );
}

function DeleteModal({
  open,
  title,
  body,
  onClose,
  remove,
  onDeleted,
  onError,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  remove: () => Promise<{ data: { message: string } }>;
  onDeleted: (message: string) => Promise<void>;
  onError: (failure: unknown) => void;
}) {
  const mutation = useMutation({
    mutationFn: remove,
    onSuccess: (response) => onDeleted(response.data.message),
    onError: (failure) => {
      onError(failure);
      onClose();
    },
  });

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-700">
        <p>{body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
