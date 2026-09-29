import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirect = typeof params.redirect === "string" ? params.redirect : null;
  const reset = typeof params.reset === "string";

  return <AdminLoginForm redirect={redirect} passwordReset={reset} />;
}
