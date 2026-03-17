/**
 * Secure Logging Utility for Zyp
 * 
 * Use this instead of console.log for any data that might contain
 * sensitive information. It automatically masks PII and sensitive fields.
 */

// Fields that should be masked in logs
const SENSITIVE_FIELDS = [
  'password',
  'pin',
  'transaction_pin',
  'transactionPin',
  'account_number',
  'accountNumber',
  'routing_number',
  'routingNumber',
  'swift_code',
  'swiftCode',
  'ssn',
  'social_security',
  'email',
  'phone',
  'address',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'credit_card',
  'creditCard',
  'cvv',
  'expiry'
];

// Check if we're in development mode
const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : (typeof window !== 'undefined' && window.location?.hostname === 'localhost');

/**
 * Mask a sensitive string value
 */
const maskValue = (value) => {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '****' + value.slice(-2);
};

/**
 * Deep clone and mask sensitive fields in an object
 */
const maskSensitiveData = (data, depth = 0) => {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (data === null || data === undefined) return data;
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, depth + 1));
  }
  
  const masked = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive field
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      masked[key] = maskValue(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

/**
 * Secure log - masks sensitive data before logging
 * Only logs in development mode unless forced
 */
export const secureLog = (message, data = null, forceLog = false) => {
  if (!isDev && !forceLog) return;
  
  if (data) {
    console.log(message, maskSensitiveData(data));
  } else {
    console.log(message);
  }
};

/**
 * Secure error log - always logs but masks sensitive data
 */
export const secureError = (message, error = null, data = null) => {
  const safeError = error ? {
    message: error.message,
    code: error.code,
    // Don't log full stack traces in production
    ...(isDev && { stack: error.stack })
  } : null;
  
  if (data) {
    console.error(message, safeError, maskSensitiveData(data));
  } else if (safeError) {
    console.error(message, safeError);
  } else {
    console.error(message);
  }
};

/**
 * Secure warn log
 */
export const secureWarn = (message, data = null) => {
  if (data) {
    console.warn(message, maskSensitiveData(data));
  } else {
    console.warn(message);
  }
};

/**
 * Log an audit event (for security-relevant actions)
 * This could be extended to send to a server-side audit log
 */
export const logSecurityEvent = (event, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details: maskSensitiveData(details),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };
  
  // In production, you might want to send this to a server
  if (isDev) {
    console.log('[SECURITY EVENT]', logEntry);
  }
  
  // Could also store in localStorage for debugging
  // but be careful not to store sensitive data
};

/**
 * Disable console methods in production (optional, aggressive)
 */
export const disableConsoleLogs = () => {
  if (!isDev) {
    console.log = () => {};
    console.debug = () => {};
    // Keep error and warn for debugging production issues
  }
};

export default {
  secureLog,
  secureError,
  secureWarn,
  logSecurityEvent,
  maskSensitiveData,
  disableConsoleLogs
};
