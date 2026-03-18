/**
 * Rate Limiting Service
 * In-memory rate limiting with optional Redis backend
 */

// In-memory store (use Redis in production)
const rateLimitStore = new Map();

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  default: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 login attempts per 15 minutes
  api: { windowMs: 60 * 1000, maxRequests: 60 },           // 60 requests per minute
  search: { windowMs: 60 * 1000, maxRequests: 30 },        // 30 searches per minute
  export: { windowMs: 60 * 1000, maxRequests: 10 },        // 10 exports per minute
  upload: { windowMs: 60 * 1000, maxRequests: 5 },         // 5 uploads per minute
};

/**
 * Check if request is rate limited
 */
export function checkRateLimit(identifier, limitType = 'default') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const key = `${limitType}:${identifier}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { requests: [], resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }
  
  // Reset if window expired
  if (now >= entry.resetAt) {
    entry.requests = [];
    entry.resetAt = now + config.windowMs;
  }
  
  // Remove old requests outside window
  entry.requests = entry.requests.filter(timestamp => timestamp > now - config.windowMs);
  
  // Check if limit exceeded
  if (entry.requests.length >= config.maxRequests) {
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    };
  }
  
  // Add current request
  entry.requests.push(now);
  
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.requests.length,
    resetAt: entry.resetAt,
    retryAfter: 0
  };
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(identifier, limitType = 'default') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const key = `${limitType}:${identifier}`;
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs
    };
  }
  
  // Remove old requests
  entry.requests = entry.requests.filter(timestamp => timestamp > now - config.windowMs);
  
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.requests.length),
    resetAt: entry.resetAt
  };
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier, limitType = 'default') {
  const key = `${limitType}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt && entry.requests.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limit middleware for HTTP requests
 */
export function rateLimitMiddleware(limitType = 'default') {
  return (req, identifier) => {
    const result = checkRateLimit(identifier, limitType);
    
    if (!result.allowed) {
      return {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': result.resetAt,
          'Retry-After': result.retryAfter
        },
        body: {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        }
      };
    }
    
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': result.resetAt
      }
    };
  };
}
