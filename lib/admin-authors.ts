import toast from "react-hot-toast";
import api from "@/lib/api";

/** Internal placeholder address for an author without an email; no invitation can reach it. */
const isPlaceholderEmail = (email?: string) => /@harglim\.internal$/i.test(email || "");

/**
 * Tells the admin whether the invitation email went out. POST /admin/users answers
 * { invited, emailSent }; emailSent=false means the account exists but the mail failed.
 */
export function announceInvite(user: { email?: string; invited?: boolean; emailSent?: boolean } | null | undefined) {
  if (!user?.invited || isPlaceholderEmail(user.email)) return;
  if (user.emailSent === false) {
    toast.error(`The invitation email to ${user.email} could not be sent. Use Resend Invite in Users & Accounts.`, { duration: 8000 });
  } else {
    toast.success(`Invitation sent to ${user.email}. The set-password link is valid for 7 days.`, { duration: 6000 });
  }
}

/** POST /admin/users without a password: the backend emails the author a set-password link. */
export async function createAuthorUser(user: { name: string; email: string }) {
  const res = await api.post("/admin/users", { ...user, role: "author", isActive: true });
  announceInvite(res.data?.data);
  return res;
}

/** POST /admin/users/{id}/resend-invite. 409 once the author has already set a password. */
export async function resendAuthorInvite(userId: string) {
  const { data } = await api.post(`/admin/users/${userId}/resend-invite`);
  announceInvite(data?.data);
  return data?.data;
}
