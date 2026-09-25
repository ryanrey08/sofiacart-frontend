import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const registered = params.registered;
  const registrationSuccess = Array.isArray(registered) ? registered.length > 0 : Boolean(registered);

  return <LoginForm registrationSuccess={registrationSuccess} />;
}
