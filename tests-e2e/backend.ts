export type BackendSession = {
  token: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user: { _id?: string; id?: string; name: string; email: string; role: string; profilePicture?: string };
};

export const backendURL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';

/** Real HTTP only. Never log credentials, session tokens, or private response bodies. */
export async function backendGet(path: string, session?: BackendSession) {
  const response = await fetch(`${backendURL}${path}`, {
    headers: session ? { Authorization: `Bearer ${session.token}` } : {},
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Backend GET ${path} returned HTTP ${response.status}`);
  return response.json();
}

export async function loginBackend(role: 'AUTHOR' | 'ADMIN'): Promise<BackendSession> {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];
  if (!email || !password) throw new Error(`Set E2E_${role}_EMAIL and E2E_${role}_PASSWORD in .env.test.local before running real integration tests.`);
  const response = await fetch(`${backendURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Real ${role.toLowerCase()} login returned HTTP ${response.status}`);
  const payload = await response.json();
  const session: BackendSession = payload.data ?? payload;
  if (!session.token || session.user?.role !== role.toLowerCase()) throw new Error(`The backend did not grant the required ${role.toLowerCase()} session.`);
  return session;
}

export async function logoutBackend(session: BackendSession) {
  const response = await fetch(`${backendURL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Test-session logout returned HTTP ${response.status}`);
}

export const backendData = (payload: any) => payload?.data ?? payload;
export const backendList = (payload: any, key: string): any[] => {
  const data = backendData(payload);
  const list = [data?.[key], data?.items, data?.history, data, payload?.[key]].find(Array.isArray);
  if (!list) throw new Error(`Backend response has no ${key} list.`);
  return list;
};
