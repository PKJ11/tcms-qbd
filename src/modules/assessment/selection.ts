import { createHmac } from 'crypto'

// Deterministic question selection for an assessment attempt.
//
// The set of questions issued for attempt N of an assignment is derived from
// HMAC(secret, `${assignmentId}:${attemptNo}`), so /attempt/start and
// /attempt/submit independently arrive at exactly the same questions without
// storing them. That lets submit grade against the full issued set (an
// unanswered question counts as wrong) instead of trusting whichever question
// IDs the client chose to send back. The secret keeps the selection
// unpredictable to the trainee; reloading the start screen returns the same
// questions rather than a fresh draw.

function attemptSeed(assignmentId: string, attemptNo: number): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('Server is missing NEXTAUTH_SECRET; cannot issue assessment questions')
  return createHmac('sha256', secret).update(`assessment:${assignmentId}:${attemptNo}`).digest()
}

// mulberry32 — small, fast, deterministic PRNG seeded from 32 bits
function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function selectAttemptQuestions<T extends { id: string }>(
  pool:         T[],
  count:        number,
  assignmentId: string,
  attemptNo:    number,
): T[] {
  const rand = prng(attemptSeed(assignmentId, attemptNo).readUInt32BE(0))
  // Sort first so the result never depends on database row order
  const items = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items.slice(0, Math.min(count, items.length))
}
