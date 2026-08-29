import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * Guard for server actions that call the LLM or reach out over the network.
 *
 * Each of those calls costs money and latency, so the default budget is far
 * tighter than the general 120/min. Returns a result rather than throwing, so
 * callers can surface it in their existing { success, error } shape.
 */
export async function guardExpensiveAction(
  scope: string,
  opts?: { limit?: number; windowMs?: number }
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }

  try {
    await enforceRateLimit({
      userId,
      scope,
      limit: opts?.limit ?? 10,
      windowMs: opts?.windowMs ?? 60_000,
    });
  } catch {
    return { ok: false, error: 'Too many requests. Please wait a moment and try again.' };
  }

  return { ok: true, userId };
}
