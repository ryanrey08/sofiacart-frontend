import type { Metadata } from "next";
import { VerifyEmailScreen } from "@/components/auth/email-verification";

export const metadata: Metadata = {
  title: "Verify your email | SofiaCart",
  // The URL can carry a single-use verification token; never send it to other sites.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" && params.token.trim() !== "" ? params.token.trim() : null;

  return <VerifyEmailScreen token={token} />;
}
