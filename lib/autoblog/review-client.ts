import type { ReviewActionResult } from '@/lib/autoblog/review-actions';

// Client-side caller for the two approval routes. Every surface that offers
// Promote/Reject (Approvals tab, Edit Post page, content-calendar cards) goes
// through this one function — the cross-DB logic lives server-side only.

export interface ReviewActionOutcome {
  /** done = all steps ok; partial = post moved but a mirror step failed;
   *  conflict = already actioned elsewhere; error = nothing changed. */
  status: 'done' | 'partial' | 'conflict' | 'error';
  message: string | null;
  result: ReviewActionResult | null;
}

export async function callReviewAction(
  action: 'promote' | 'reject',
  slug: string,
): Promise<ReviewActionOutcome> {
  let res: Response;
  try {
    res = await fetch(`/api/autoblog/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : `${action} failed`,
      result: null,
    };
  }

  const result = (await res.json().catch(() => null)) as ReviewActionResult | null;

  if (res.status === 409) {
    return {
      status: 'conflict',
      message: 'Already actioned by another reviewer.',
      result,
    };
  }
  if (!res.ok) {
    return {
      status: 'error',
      message: result?.marketing?.detail ?? `HTTP ${res.status}`,
      result,
    };
  }
  if (result && !result.ok) {
    const details = [result.engine, result.topic]
      .filter((s): s is NonNullable<typeof s> => s != null && !s.ok)
      .map((s) => s.detail);
    return {
      status: 'partial',
      message: `Partial: ${details.join('; ') || 'a follow-up step failed'}`,
      result,
    };
  }
  return { status: 'done', message: null, result };
}
