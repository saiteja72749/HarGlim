import toast from "react-hot-toast";
import api from "@/lib/api";
import { isValidEmailAddress } from "@/lib/email";
import { accountId, adminResponse, adminUserRecord, verifyAdminAccount } from "@/lib/admin-account-api";

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
  } else if (user.emailSent === true) {
    toast.success(`Invitation sent to ${user.email}. Use the set-password link in the email.`, { duration: 6000 });
  }
}

/** POST /admin/users without a password: the backend emails the author a set-password link. */
export async function createAuthorUser(user: { name: string; email: string }) {
  if (!isValidEmailAddress(user.email) || isPlaceholderEmail(user.email)) throw new Error("A real author email address is required.");
  const res = await api.post("/admin/users", { ...user, role: "author", isActive: true });
  const saved = adminUserRecord(res.data);
  const id = accountId(saved);
  if (!id) throw new Error("The backend did not return a confirmed author account ID. Check Users & Accounts before retrying.");
  await verifyAdminAccount(id, { email: user.email, role: "author", isActive: true });
  announceInvite({
    email: user.email,
    invited: saved.invited === true,
    emailSent: typeof saved.emailSent === "boolean" ? saved.emailSent : undefined,
  });
  return res;
}

/** POST /admin/users/{id}/resend-invite. 409 once the author has already set a password. */
export async function resendAuthorInvite(userId: string) {
  const { data } = await api.post(`/admin/users/${encodeURIComponent(userId)}/resend-invite`);
  const saved = adminUserRecord(data);
  announceInvite({
    email: typeof saved.email === "string" ? saved.email : undefined,
    invited: saved.invited === true,
    emailSent: typeof saved.emailSent === "boolean" ? saved.emailSent : undefined,
  });
  return adminResponse(data);
}
