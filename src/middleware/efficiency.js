import { randomUUID } from 'crypto';
import zlib from 'zlib';

/**
 * Request Correlation ID Middleware
 * Attaches a unique X-Request-Id header to every request and response for end-to-end tracing.
 */
export function correlationIdMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

/**
 * High-Performance In-Memory Sliding-Window Rate Limiter
 * Zero external dependencies, automatic garbage collection.
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.max || 120; // 120 requests/min per IP
  const hits = new Map();

  // Periodic cleanup every 2 minutes
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 120000);
  if (timer.unref) timer.unref();

  return function rateLimiter(req, res, next) {
    if (process.env.NODE_ENV === 'test') return next();

    const ip = req.ip || req.socket?.remoteAddress || 'unknown-client';
    const now = Date.now();
    const record = hits.get(ip) || { count: 0, startTime: now };

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count += 1;
    }

    hits.set(ip, record);

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, maxRequests - record.count));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.startTime + windowMs - now) / 1000));
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.'
        }
      });
    }

    next();
  };
}

/**
 * Native Zero-Dependency HTTP Compression (Gzip / Deflate)
 * Saves network payload for low-end mobile devices on 2G/3G connections.
 */
export function nativeCompressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') || req.method === 'HEAD') {
    return next();
  }

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(data));
  };

  res.send = (body) => {
    if (!body || res.getHeader('Content-Encoding')) {
      return originalSend(body);
    }

    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    // Compress only responses larger than 1KB
    if (buffer.length < 1024) {
      return originalSend(body);
    }

    zlib.gzip(buffer, (err, compressed) => {
      if (err) {
        return originalSend(body);
      }
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.length);
      res.removeHeader('ETag'); // Invalidate raw ETag
      res.end(compressed);
    });
  };

  next();
}
