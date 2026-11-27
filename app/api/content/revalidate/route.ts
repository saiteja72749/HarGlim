import { revalidateTag } from 'next/cache';
import { isRejectedEnvelope, record } from '@/lib/api-error';
import { API_URL } from '@/config/backend.mjs';

/** Only a backend-confirmed administrator may invalidate published CMS metadata. */
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ message: 'Authentication required.' }, { status: 401 });
  try {
    const response = await fetch(`${API_URL}/users/me/context`, {
      headers: { Authorization: authorization }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    });
    if (!response.ok) return Response.json({ message: 'Session verification failed.' }, { status: response.status === 401 ? 401 : 403 });
    const payload = record(await response.json());
    const context = record(payload.data ?? payload);
    if (isRejectedEnvelope(payload) || record(context.user).role !== 'admin' || record(context.user).isActive !== true || record(context.capabilities).canAdminister !== true) {
      return Response.json({ message: 'Administrator access required.' }, { status: 403 });
    }
    revalidateTag('public-content', { expire: 0 });
    return Response.json({ revalidated: true });
  } catch {
    return Response.json({ message: 'Session verification is unavailable. Retry later.' }, { status: 503 });
  }
}
