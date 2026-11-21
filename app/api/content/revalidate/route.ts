import { revalidateTag } from 'next/cache';
import { record } from '@/lib/api-error';

/** Only a backend-confirmed administrator may invalidate published CMS metadata. */
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ message: 'Authentication required.' }, { status: 401 });
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';
  try {
    const response = await fetch(`${apiURL}/users/me/context`, {
      headers: { Authorization: authorization }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return Response.json({ message: 'Session verification failed.' }, { status: response.status === 401 ? 401 : 403 });
    const payload = record(await response.json());
    const context = record(payload.data ?? payload);
    if (record(context.user).role !== 'admin' || record(context.user).isActive !== true || record(context.capabilities).canAdminister !== true) {
      return Response.json({ message: 'Administrator access required.' }, { status: 403 });
    }
    revalidateTag('public-content', { expire: 0 });
    return Response.json({ revalidated: true });
  } catch {
    return Response.json({ message: 'Session verification is unavailable. Retry later.' }, { status: 503 });
  }
}
