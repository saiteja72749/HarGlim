import api from "@/lib/api";
import { record } from "@/lib/api-error";

export function adminResponse(input: unknown) {
  const envelope = record(input);
  if (envelope.success === false || envelope.status === "error") {
    throw new Error(typeof envelope.message === "string" ? envelope.message : "The backend rejected the change.");
  }
  return envelope.data ?? input;
}

export function adminUserRecord(input: unknown) {
  const data = adminResponse(input);
  const envelope = record(input);
  const fields = record(data);
  return { ...fields, ...record(fields.user ?? envelope.user ?? data) };
}

export function adminRows<T>(input: unknown, ...keys: string[]): T[] {
  const data = adminResponse(input);
  const rows = [...keys.flatMap(key => [record(data)[key], record(input)[key]]), record(data).items, record(data).docs, data].find(Array.isArray);
  if (!rows || rows.some(row => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new Error("The backend returned an invalid record list. Please retry.");
  }
  return rows as T[];
}

export function accountId(user: { _id?: unknown; id?: unknown }) {
  const id = user._id || user.id;
  return typeof id === "string" ? id : "";
}

export function accountRole(role: unknown) {
  const value = typeof role === "string" ? role.toLowerCase() : "";
  return value === "user" ? "reader" : value;
}

export function accountActive(user: { isActive?: unknown; status?: unknown }) {
  if (typeof user.isActive === "boolean") return user.isActive;
  const status = typeof user.status === "string" ? user.status.toLowerCase() : "";
  if (status === "active" || status === "suspended") return status === "active";
  return undefined;
}

export async function verifyAdminAccount(id: string, expected: { role?: string; isActive: boolean; email?: string }) {
  try {
    const { data } = await api.get(`/admin/users/${encodeURIComponent(id)}`, { cache: "no-store" });
    const user = adminUserRecord(data);
    if (accountId(user) === id && accountActive(user) === expected.isActive
      && (!expected.role || accountRole(user.role) === accountRole(expected.role))
      && (!expected.email || (typeof user.email === "string" && user.email.toLowerCase() === expected.email.toLowerCase()))) return;
  } catch {
    // A failed readback leaves the preceding write's outcome uncertain.
  }
  throw new Error("The backend accepted the request, but the saved account could not be confirmed. Refresh Users & Accounts before retrying.");
}
