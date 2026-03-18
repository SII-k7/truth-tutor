/**
 * User Management Service
 * Handle user registration, login, profile management
 */

import { hashPassword, verifyPassword, generateApiKey, hashApiKey } from './auth-service.mjs';
import { getDb } from '../database/db.mjs';

/**
 * Register new user
 */
export async function registerUser(email, password, name) {
  const db = getDb();
  
  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('User already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(email, passwordHash, name);
  
  return {
    id: result.lastInsertRowid,
    email,
    name,
    createdAt: new Date().toISOString()
  };
}

/**
 * Login user
 */
export async function loginUser(email, password) {
  const db = getDb();
  
  // Get user
  const user = db.prepare(`
    SELECT id, email, password_hash, name, created_at
    FROM users
    WHERE email = ?
  `).get(email);
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }
  
  // Update last login
  db.prepare(`
    UPDATE users
    SET last_login_at = datetime('now')
    WHERE id = ?
  `).run(user.id);
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at
  };
}

/**
 * Get user by ID
 */
export function getUserById(userId) {
  const db = getDb();
  
  const user = db.prepare(`
    SELECT id, email, name, created_at, last_login_at
    FROM users
    WHERE id = ?
  `).get(userId);
  
  return user;
}

/**
 * Get user by email
 */
export function getUserByEmail(email) {
  const db = getDb();
  
  const user = db.prepare(`
    SELECT id, email, name, created_at, last_login_at
    FROM users
    WHERE email = ?
  `).get(email);
  
  return user;
}

/**
 * Update user profile
 */
export function updateUserProfile(userId, updates) {
  const db = getDb();
  
  const allowedFields = ['name', 'email'];
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (fields.length === 0) {
    return getUserById(userId);
  }
  
  values.push(userId);
  
  db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);
  
  return getUserById(userId);
}

/**
 * Change user password
 */
export async function changePassword(userId, oldPassword, newPassword) {
  const db = getDb();
  
  // Get current password hash
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify old password
  const valid = await verifyPassword(oldPassword, user.password_hash);
  if (!valid) {
    throw new Error('Invalid current password');
  }
  
  // Hash new password
  const newHash = await hashPassword(newPassword);
  
  // Update password
  db.prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `).run(newHash, userId);
  
  return true;
}

/**
 * Create API key for user
 */
export function createApiKey(userId, name) {
  const db = getDb();
  
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  
  db.prepare(`
    INSERT INTO api_keys (user_id, key_hash, name, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(userId, keyHash, name);
  
  // Return the plain API key (only time it's visible)
  return apiKey;
}

/**
 * List user's API keys
 */
export function listApiKeys(userId) {
  const db = getDb();
  
  return db.prepare(`
    SELECT id, name, created_at, last_used_at
    FROM api_keys
    WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY created_at DESC
  `).all(userId);
}

/**
 * Revoke API key
 */
export function revokeApiKey(userId, keyId) {
  const db = getDb();
  
  db.prepare(`
    UPDATE api_keys
    SET revoked_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(keyId, userId);
  
  return true;
}

/**
 * Verify API key and get user
 */
export function verifyApiKeyAndGetUser(apiKey) {
  const db = getDb();
  
  const keyHash = hashApiKey(apiKey);
  
  const result = db.prepare(`
    SELECT ak.id as key_id, ak.user_id, u.email, u.name
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = ? AND ak.revoked_at IS NULL
  `).get(keyHash);
  
  if (!result) {
    return null;
  }
  
  // Update last used
  db.prepare(`
    UPDATE api_keys
    SET last_used_at = datetime('now')
    WHERE id = ?
  `).run(result.key_id);
  
  return {
    userId: result.user_id,
    email: result.email,
    name: result.name
  };
}

/**
 * Delete user account
 */
export function deleteUser(userId) {
  const db = getDb();
  
  // In production, you might want to soft delete or anonymize instead
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  
  return true;
}

/**
 * Get user statistics
 */
export function getUserStats(userId) {
  const db = getDb();
  
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM papers WHERE user_id = ?) as papers_count,
      (SELECT COUNT(*) FROM annotations WHERE user_id = ?) as annotations_count,
      (SELECT COUNT(*) FROM search_history WHERE user_id = ?) as searches_count,
      (SELECT COUNT(*) FROM saved_searches WHERE user_id = ?) as saved_searches_count
  `).get(userId, userId, userId, userId);
  
  return stats;
}
