/**
 * CSRF Protection Utility for Zyp
 * 
 * Implements CSRF token generation and validation.
 * Note: Supabase already includes some CSRF protection via its auth tokens,
 * but this adds an additional layer for sensitive operations.
 */

const CSRF_TOKEN_KEY = 'zyp_csrf_token';
const CSRF_TOKEN_EXPIRY = 'zyp_csrf_expiry';
const TOKEN_VALIDITY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cryptographically secure random token
 */
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Get or generate a CSRF token
 * @returns {string} The CSRF token
 */
export const getCSRFToken = () => {
  try {
    const existingToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY);
    
    // Check if token exists and is still valid
    if (existingToken && expiry && Date.now() < parseInt(expiry, 10)) {
      return existingToken;
    }
    
    // Generate new token
    const newToken = generateToken();
    const newExpiry = Date.now() + TOKEN_VALIDITY_MS;
    
    sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
    sessionStorage.setItem(CSRF_TOKEN_EXPIRY, newExpiry.toString());
    
    return newToken;
  } catch (e) {
    // If sessionStorage is unavailable, generate a one-time token
    return generateToken();
  }
};

/**
 * Validate a CSRF token
 * @param {string} token - The token to validate
 * @returns {boolean} Whether the token is valid
 */
export const validateCSRFToken = (token) => {
  if (!token) return false;
  
  try {
    const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY);
    
    if (!storedToken || !expiry) return false;
    if (Date.now() >= parseInt(expiry, 10)) return false;
    
    // Constant-time comparison to prevent timing attacks
    if (token.length !== storedToken.length) return false;
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    
    return result === 0;
  } catch (e) {
    return false;
  }
};

/**
 * Regenerate the CSRF token (call after sensitive operations)
 * @returns {string} The new token
 */
export const regenerateCSRFToken = () => {
  try {
    const newToken = generateToken();
    const newExpiry = Date.now() + TOKEN_VALIDITY_MS;
    
    sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
    sessionStorage.setItem(CSRF_TOKEN_EXPIRY, newExpiry.toString());
    
    return newToken;
  } catch (e) {
    return generateToken();
  }
};

/**
 * Clear the CSRF token (call on logout)
 */
export const clearCSRFToken = () => {
  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_EXPIRY);
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Add CSRF token to request headers
 * @param {Object} headers - Existing headers object
 * @returns {Object} Headers with CSRF token added
 */
export const addCSRFHeader = (headers = {}) => {
  return {
    ...headers,
    'X-CSRF-Token': getCSRFToken()
  };
};

/**
 * Create a protected form submission handler
 * @param {Function} submitHandler - The actual form submission logic
 * @returns {Function} A wrapped handler that validates CSRF
 */
export const withCSRFProtection = (submitHandler) => {
  return async (event, ...args) => {
    // For form submissions, get token from hidden field
    const formToken = event?.target?.querySelector?.('[name="csrf_token"]')?.value;
    
    if (formToken && !validateCSRFToken(formToken)) {
      throw new Error('Invalid security token. Please refresh and try again.');
    }
    
    const result = await submitHandler(event, ...args);
    
    // Regenerate token after sensitive operations
    regenerateCSRFToken();
    
    return result;
  };
};

/**
 * React hook-style CSRF protection
 * Use this in components for sensitive operations
 */
export const useCSRFProtection = () => {
  const token = getCSRFToken();
  
  const validateAndProceed = (callback) => {
    return async (...args) => {
      if (!validateCSRFToken(token)) {
        throw new Error('Security validation failed. Please refresh the page.');
      }
      
      const result = await callback(...args);
      regenerateCSRFToken();
      return result;
    };
  };
  
  return {
    token,
    validateAndProceed,
    regenerate: regenerateCSRFToken
  };
};

export default {
  getCSRFToken,
  validateCSRFToken,
  regenerateCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
  withCSRFProtection,
  useCSRFProtection
};
