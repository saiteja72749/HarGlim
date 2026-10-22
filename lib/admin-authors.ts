import api from "@/lib/api";
import { generateTempPassword } from "@/lib/utils";

/**
 * POST /admin/users for a new author account.
 *
 * Sent without a password first so the backend can email the author an invite to set their own
 * (BACKEND_ALIGNMENT_REPORT.md §6). While the backend still requires a password, the 400 about it
 * triggers one retry with a throwaway password; the author then uses Forgot Password.
 */
export async function createAuthorUser(user: { name: string; email: string }) {
  const body = { ...user, role: "author", isActive: true };
  try {
    return await api.post("/admin/users", body);
  } catch (err: any) {
    const message = JSON.stringify(err?.response?.data ?? "");
    if (err?.response?.status !== 400 || !/password/i.test(message)) throw err;
    return api.post("/admin/users", { ...body, password: generateTempPassword() });
  }
}
