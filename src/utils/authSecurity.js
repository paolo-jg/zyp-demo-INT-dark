/**
 * Authentication Security Utilities for Zyp
 * 
 * Implements:
 * - Session timeout (auto-logout after inactivity)
 * - Login attempt limiting (rate limiting)
 * - High-value transaction verification
 * - Email verification checks
 */

import { secureWarn } from './secureLogging';

// ==================== CONFIGURATION ====================

export const AUTH_CONFIG = {
  // Session timeout in milliseconds (5 minutes of inactivity)
  SESSION_TIMEOUT: 5 * 60 * 1000,
  
  // Warning before timeout (show warning 30 seconds before)
  SESSION_WARNING_BEFORE: 30 * 1000,
  
  // Max login attempts before lockout
  MAX_LOGIN_ATTEMPTS: 5,
  
  // Lockout duration in milliseconds (15 minutes)
  LOCKOUT_DURATION: 15 * 60 * 1000,
  
  // High-value transfer threshold requiring re-auth (in USD)
  HIGH_VALUE_THRESHOLD: 25000,
  
  // Large PHP transfer threshold requiring bank statements (in PHP)
  LARGE_PHP_THRESHOLD: 500000,
  
  // Re-authentication timeout (how long re-auth is valid)
  REAUTH_VALIDITY: 5 * 60 * 1000, // 5 minutes
};

// ==================== SESSION TIMEOUT ====================

let activityTimeout = null;
let warningTimeout = null;
let lastActivity = Date.now();

/**
 * Initialize session timeout monitoring
 * @param {Function} onTimeout - Called when session times out
 * @param {Function} onWarning - Called before timeout to show warning
 */
export const initSessionTimeout = (onTimeout, onWarning) => {
  // Reset timers
  clearTimeout(activityTimeout);
  clearTimeout(warningTimeout);
  
  lastActivity = Date.now();
  
  // Set warning timer
  warningTimeout = setTimeout(() => {
    if (onWarning) {
      onWarning(AUTH_CONFIG.SESSION_WARNING_BEFORE / 1000); // seconds remaining
    }
  }, AUTH_CONFIG.SESSION_TIMEOUT - AUTH_CONFIG.SESSION_WARNING_BEFORE);
  
  // Set timeout timer
  activityTimeout = setTimeout(() => {
    if (onTimeout) {
      onTimeout();
    }
  }, AUTH_CONFIG.SESSION_TIMEOUT);
};

/**
 * Reset session timeout on user activity
 * @param {Function} onTimeout - Called when session times out
 * @param {Function} onWarning - Called before timeout
 */
export const resetSessionTimeout = (onTimeout, onWarning) => {
  lastActivity = Date.now();
  initSessionTimeout(onTimeout, onWarning);
};

/**
 * Clear all session timers
 */
export const clearSessionTimeout = () => {
  clearTimeout(activityTimeout);
  clearTimeout(warningTimeout);
  activityTimeout = null;
  warningTimeout = null;
};

/**
 * Get time remaining in session (in seconds)
 */
export const getSessionTimeRemaining = () => {
  const elapsed = Date.now() - lastActivity;
  const remaining = AUTH_CONFIG.SESSION_TIMEOUT - elapsed;
  return Math.max(0, Math.floor(remaining / 1000));
};

// ==================== SERVER-SIDE RATE LIMITING ====================

/**
 * Check rate limit using server-side database function
 * @param {string} action - The action to check (login, transfer, etc.)
 * @param {Object} supabase - Supabase client instance
 * @param {number} maxAttempts - Max attempts allowed (default 5)
 * @param {number} windowMinutes - Time window in minutes (default 15)
 * @returns {Promise<Object>} { allowed: boolean, remaining: number, locked: boolean }
 */
export const checkServerRateLimit = async (action, supabase, maxAttempts = 5, windowMinutes = 15) => {
  if (!supabase) {
    return { allowed: true, remaining: 999, locked: false };
  }
  
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', { 
      action_name: action,
      max_attempts: maxAttempts,
      window_minutes: windowMinutes
    });
    
    if (error) {
      secureWarn('Rate limit check failed');
      return { allowed: true, remaining: 999, locked: false };
    }
    
    return data;
  } catch (e) {
    secureWarn('Rate limit service unavailable');
    return { allowed: true, remaining: 999, locked: false };
  }
};

/**
 * Record a rate-limited action (increments the counter)
 * @param {string} action - The action to record
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} Rate limit status after recording
 */
export const recordRateLimitedAction = async (action, supabase) => {
  if (!supabase) {
    return { allowed: true, remaining: 999, locked: false };
  }
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: true, remaining: 999, locked: false };
    
    // Upsert rate limit record
    const { error } = await supabase
      .from('rate_limits')
      .upsert({
        user_id: user.id,
        action: action,
        attempts: 1,
        window_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,action',
        ignoreDuplicates: false
      });
    
    if (error) {
      // If upsert failed, try to increment
      await supabase.rpc('check_rate_limit', { 
        action_name: action,
        max_attempts: 5,
        window_minutes: 15
      });
    }
    
    return checkServerRateLimit(action, supabase);
  } catch (e) {
    secureWarn('Failed to record rate limited action');
    return { allowed: true, remaining: 999, locked: false };
  }
};

// ==================== LOGIN RATE LIMITING ====================

const LOGIN_ATTEMPTS_KEY = 'zyp_login_attempts';
const LOCKOUT_KEY = 'zyp_lockout_until';

/**
 * Get current login attempt info
 */
export const getLoginAttempts = () => {
  try {
    const attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0', 10);
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
    
    // Check if lockout has expired
    if (lockoutUntil && Date.now() > lockoutUntil) {
      localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      return { attempts: 0, isLockedOut: false, lockoutRemaining: 0 };
    }
    
    return {
      attempts,
      isLockedOut: lockoutUntil > Date.now(),
      lockoutRemaining: lockoutUntil ? Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000)) : 0
    };
  } catch {
    return { attempts: 0, isLockedOut: false, lockoutRemaining: 0 };
  }
};

/**
 * Record a failed login attempt
 * @returns {Object} { isLockedOut, attemptsRemaining, lockoutRemaining }
 */
export const recordFailedLogin = () => {
  try {
    const { attempts } = getLoginAttempts();
    const newAttempts = attempts + 1;
    
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, newAttempts.toString());
    
    if (newAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = Date.now() + AUTH_CONFIG.LOCKOUT_DURATION;
      localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
      return {
        isLockedOut: true,
        attemptsRemaining: 0,
        lockoutRemaining: AUTH_CONFIG.LOCKOUT_DURATION / 1000
      };
    }
    
    return {
      isLockedOut: false,
      attemptsRemaining: AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - newAttempts,
      lockoutRemaining: 0
    };
  } catch {
    return { isLockedOut: false, attemptsRemaining: AUTH_CONFIG.MAX_LOGIN_ATTEMPTS, lockoutRemaining: 0 };
  }
};

/**
 * Clear login attempts on successful login
 */
export const clearLoginAttempts = () => {
  try {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Format lockout time remaining
 */
export const formatLockoutTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

// ==================== HIGH-VALUE TRANSACTION VERIFICATION ====================

const REAUTH_KEY = 'zyp_reauth_timestamp';

/**
 * Check if transfer requires re-authentication
 * @param {number} amount - Transfer amount in USD
 */
export const requiresReauth = (amount) => {
  return amount >= AUTH_CONFIG.HIGH_VALUE_THRESHOLD;
};

/**
 * Check if user has recently re-authenticated
 */
export const hasValidReauth = () => {
  try {
    const reauthTimestamp = parseInt(localStorage.getItem(REAUTH_KEY) || '0', 10);
    return reauthTimestamp && (Date.now() - reauthTimestamp) < AUTH_CONFIG.REAUTH_VALIDITY;
  } catch {
    return false;
  }
};

/**
 * Record successful re-authentication
 */
export const recordReauth = () => {
  try {
    localStorage.setItem(REAUTH_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear re-auth on logout
 */
export const clearReauth = () => {
  try {
    localStorage.removeItem(REAUTH_KEY);
  } catch {
    // Ignore storage errors
  }
};

// ==================== EMAIL VERIFICATION ====================

/**
 * Check if user's email is verified
 * @param {Object} user - Supabase user object
 */
export const isEmailVerified = (user) => {
  return user?.email_confirmed_at != null || user?.confirmed_at != null;
};

// ==================== SECURITY UTILITIES ====================

/**
 * Hash a string (for storing sensitive data)
 * Note: This is a simple hash for client-side use only
 */
export const simpleHash = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a random verification code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Mask sensitive data for display
 */
export const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-***-${digits.slice(-4)}`;
};

export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return '';
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
};

// ==================== TRANSACTION PIN ====================

// IMPORTANT: This salt MUST match the server-side SQL function salt
// and the original salt used to hash existing PINs
const PIN_SALT = 'zyp_transaction_pin_salt_2025';

/**
 * Hash a PIN using server-side database function (SECURE)
 * Falls back to client-side hashing if server unavailable
 * @param {string} pin - The PIN to hash
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<string>} The hashed PIN
 */
export const hashPin = async (pin, supabase = null) => {
  // Try server-side hashing first (more secure)
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('hash_pin', { pin });
      if (!error && data) {
        return data;
      }
      secureWarn('Server-side PIN hashing failed');
    } catch (e) {
      secureWarn('Server-side PIN hashing unavailable');
    }
  }
  
  // Fallback to client-side using SAME salt as server
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verify a PIN using server-side database function (SECURE)
 * Includes server-side rate limiting
 * @param {string} pin - The PIN to verify
 * @param {string} storedHash - The stored hash (used for fallback only)
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} { valid: boolean, attemptsRemaining?: number, locked?: boolean }
 */
export const verifyPin = async (pin, storedHash, supabase = null) => {
  if (!pin) return { valid: false, error: 'PIN required' };
  
  // Try server-side verification first (includes rate limiting)
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('verify_user_pin', { input_pin: pin });
      
      if (error) {
        secureWarn('Server-side PIN verification error');
        // Fall through to client-side
      } else if (data) {
        return data;
      }
    } catch (e) {
      secureWarn('Server-side PIN verification unavailable');
    }
  }
  
  // Fallback to client-side (less secure, no rate limiting)
  if (!storedHash) return { valid: false, error: 'No PIN set' };
  const inputHash = await hashPin(pin, null); // Explicitly pass null to use client-side
  return { valid: inputHash === storedHash };
};

/**
 * Change PIN - verifies current PIN then updates to new PIN
 * @param {string} currentPin - Current PIN
 * @param {string} newPin - New PIN
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export const changePin = async (currentPin, newPin, supabase) => {
  if (!supabase) {
    return { success: false, error: 'Supabase client required' };
  }
  
  try {
    // First verify current PIN
    const verifyResult = await verifyPin(currentPin, null, supabase);
    if (!verifyResult.valid) {
      return { success: false, error: 'Current PIN is incorrect' };
    }
    
    // Hash new PIN server-side
    const newHash = await hashPin(newPin, supabase);
    
    // Update in database
    const { error } = await supabase
      .from('users')
      .update({ transaction_pin: newHash })
      .eq('id', (await supabase.auth.getUser()).data.user.id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

/**
 * Validate PIN format (4-6 digits, no simple patterns)
 * @param {string} pin - The PIN to validate
 * @returns {Object} { isValid, error }
 */
export const validatePin = (pin) => {
  if (!pin) return { isValid: false, error: 'PIN is required' };
  if (!/^\d+$/.test(pin)) return { isValid: false, error: 'PIN must contain only numbers' };
  if (pin.length !== 4) return { isValid: false, error: 'PIN must be exactly 4 digits' };
  
  // Check for simple patterns
  if (/^(\d)\1+$/.test(pin)) {
    return { isValid: false, error: 'PIN cannot be all the same digit' };
  }
  
  const simpleSequences = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  if (simpleSequences.includes(pin)) {
    return { isValid: false, error: 'PIN cannot be a simple sequence' };
  }
  
  return { isValid: true, error: null };
};

// ==================== EXPORTS ====================

export default {
  AUTH_CONFIG,
  initSessionTimeout,
  resetSessionTimeout,
  clearSessionTimeout,
  getSessionTimeRemaining,
  getLoginAttempts,
  recordFailedLogin,
  clearLoginAttempts,
  formatLockoutTime,
  requiresReauth,
  hasValidReauth,
  recordReauth,
  clearReauth,
  isEmailVerified,
  simpleHash,
  generateVerificationCode,
  maskEmail,
  maskPhone,
  maskAccountNumber,
  hashPin,
  verifyPin,
  validatePin,
  changePin,
  checkServerRateLimit,
  recordRateLimitedAction
};
