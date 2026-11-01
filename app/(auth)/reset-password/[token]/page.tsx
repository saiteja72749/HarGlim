import { ResetPasswordForm } from "@/components/auth/reset-password-form";

/** /reset-password/<token>: the link in Forgot Password and author invitation emails. */
export default async function ResetPasswordTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
