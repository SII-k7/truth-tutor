/**
 * Security Middleware
 * CORS, input validation, XSS protection, SQL injection prevention
 */

import { sanitizeInput } from './auth-service.mjs';

/**
 * CORS configuration
 */
const CORS_CONFIG = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3474', 'http://127.0.0.1:3474'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Apply CORS headers
 */
export function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (CORS_CONFIG.allowedOrigins.includes('*') || CORS_CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', CORS_CONFIG.credentials);
  res.setHeader('Access-Control-Max-Age', CORS_CONFIG.maxAge);
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  
  return false;
}

/**
 * Security headers
 */
export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
}

/**
 * Validate and sanitize request body
 */
export function sanitizeRequestBody(body) {
  if (typeof body !== 'object' || body === null) {
    return body;
  }
  
  if (Array.isArray(body)) {
    return body.map(item => sanitizeRequestBody(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate request parameters
 */
export function validateParams(params, schema) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = params[field];
    
    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation if not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type check
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
        continue;
      }
    }
    
    // String validations
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
    
    // Number validations
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }
    }
    
    // Array validations
    if (rules.type === 'array') {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`${field} must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`${field} must have at most ${rules.maxItems} items`);
      }
    }
    
    // Custom validator
    if (rules.validator) {
      const customError = rules.validator(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prevent SQL injection by validating identifiers
 */
export function isValidIdentifier(identifier) {
  // Only allow alphanumeric, underscore, and hyphen
  return /^[a-zA-Z0-9_-]+$/.test(identifier);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page, limit) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(100, Math.max(1, limitNum)), // Max 100 items per page
    offset: (Math.max(1, pageNum) - 1) * Math.min(100, Math.max(1, limitNum))
  };
}

/**
 * Validate sort parameters
 */
export function validateSort(sort, allowedFields) {
  if (!sort) return null;
  
  const [field, order] = sort.split(':');
  
  if (!allowedFields.includes(field)) {
    return null;
  }
  
  if (order && !['asc', 'desc'].includes(order.toLowerCase())) {
    return null;
  }
  
  return {
    field,
    order: (order || 'asc').toLowerCase()
  };
}

/**
 * Rate limit error response
 */
export function rateLimitError(retryAfter) {
  return {
    error: 'Too many requests',
    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    retryAfter
  };
}

/**
 * Validation error response
 */
export function validationError(errors) {
  return {
    error: 'Validation failed',
    errors
  };
}

/**
 * Authentication error response
 */
export function authError(message = 'Authentication required') {
  return {
    error: 'Unauthorized',
    message
  };
}

/**
 * Not found error response
 */
export function notFoundError(resource = 'Resource') {
  return {
    error: 'Not found',
    message: `${resource} not found`
  };
}

/**
 * Server error response
 */
export function serverError(message = 'Internal server error') {
  return {
    error: 'Server error',
    message
  };
}
