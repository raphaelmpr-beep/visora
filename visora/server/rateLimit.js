// rateLimit.js — Simple in-memory rate limiter per IP
const rateLimits = {};
const DEFAULT_LIMIT = 5; // default daily limit
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
let rateLimitEnabled = true;

function setRateLimitEnabled(enabled) {
  rateLimitEnabled = enabled;
}

function setRateLimitValue(limit) {
  rateLimits._limit = limit;
}

function getRateLimitValue() {
  return rateLimits._limit || DEFAULT_LIMIT;
}

function getRateLimitEnabled() {
  return rateLimitEnabled;
}

function checkRateLimit(ip) {
  if (!rateLimitEnabled) return { allowed: true };
  const now = Date.now();
  if (!rateLimits[ip] || now - rateLimits[ip].start > WINDOW_MS) {
    rateLimits[ip] = { count: 1, start: now };
    return { allowed: true };
  }
  if (rateLimits[ip].count < getRateLimitValue()) {
    rateLimits[ip].count++;
    return { allowed: true };
  }
  return { allowed: false, retryAfter: rateLimits[ip].start + WINDOW_MS - now };
}

export { checkRateLimit, setRateLimitEnabled, setRateLimitValue, getRateLimitValue, getRateLimitEnabled };
