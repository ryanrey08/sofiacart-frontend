import { AdminResetPasswordForm } from "@/components/admin/admin-password-forms";

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AdminResetPasswordForm
      token={typeof params.token === "string" ? params.token : ""}
      email={typeof params.email === "string" ? params.email : ""}
    />
  );
}
