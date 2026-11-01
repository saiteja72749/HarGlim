import { ResetPasswordForm } from "@/components/auth/reset-password-form";

/** /reset-password?token=<token>: the same page for emails that send the token as a query value. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}
