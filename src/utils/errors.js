/**
 * Application Error Hierarchy & Input Sanitization
 */

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {Object} [details]
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super('Too many requests, please slow down', 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSeconds });
  }
}

/**
 * XSS & HTML string sanitizer for frontline hazard text
 * @param {string} input
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Strip script injection angle brackets
    .trim()
    .slice(0, 2000); // Prevent payload DOS
}
