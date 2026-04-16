// Simple in-memory rate limiter for login attempts
// Tracks by IP address. Resets on server restart (acceptable for Vercel serverless).

const attempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minute lockout after max attempts

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  // Check lockout
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Reset window if expired
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  record.count++;

  if (record.count > MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_MS / 1000) };
  }

  return { allowed: true };
}

export function resetRateLimit(ip: string) {
  attempts.delete(ip);
}

// Cleanup old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS && (!record.lockedUntil || now > record.lockedUntil)) {
      attempts.delete(key);
    }
  }
}, 30 * 60 * 1000);
