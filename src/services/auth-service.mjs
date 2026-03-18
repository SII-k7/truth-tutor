/**
 * Authentication Service
 * JWT-based authentication with bcrypt password hashing
 */

import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

// Simple JWT implementation (in production, use jsonwebtoken library)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

/**
 * Hash password using scrypt
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  const derivedKey = await scrypt(password, salt, 64);
  return key === derivedKey.toString('hex');
}

/**
 * Generate JWT token
 */
export function generateToken(userId, email) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Generate API key
 */
export function generateApiKey() {
  return `tt_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify API key
 */
export function verifyApiKey(apiKey, hash) {
  const computedHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return computedHash === hash;
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader) {
  if (!authHeader) return null;
  
  // Support both "Bearer <token>" and "<token>"
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : authHeader;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password);
}

// Helper functions
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  // Add padding
  str += '='.repeat((4 - str.length % 4) % 4);
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(str, 'base64').toString('utf-8');
}
