/**
 * Input Validation Utilities for Zyp
 * 
 * Use these to validate user inputs before processing or storing.
 * Always validate on BOTH client and server side.
 */

// ==================== AMOUNT VALIDATION ====================

export const validateAmount = (amount) => {
  const errors = [];
  
  // Remove commas and convert to number
  const cleanAmount = typeof amount === 'string' 
    ? parseFloat(amount.replace(/,/g, '')) 
    : amount;
  
  if (isNaN(cleanAmount)) {
    errors.push('Please enter a valid number');
    return { isValid: false, errors, value: null };
  }
  
  if (cleanAmount <= 0) {
    errors.push('Amount must be greater than $0');
  }
  
  if (cleanAmount < 10) {
    errors.push('Minimum transfer amount is $10');
  }
  
  if (cleanAmount > 1000000) {
    errors.push('Maximum transfer amount is $1,000,000. Contact support for larger transfers.');
  }
  
  // Check for too many decimal places
  const decimalPlaces = (cleanAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    errors.push('Amount cannot have more than 2 decimal places');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? cleanAmount : null
  };
};

// ==================== BANK ACCOUNT VALIDATION ====================

export const validateBankAccountPH = (accountNumber) => {
  const errors = [];
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  
  if (!cleaned) {
    errors.push('Account number is required');
    return { isValid: false, errors };
  }
  
  if (!/^\d+$/.test(cleaned)) {
    errors.push('Account number must contain only digits');
  }
  
  if (cleaned.length < 10 || cleaned.length > 16) {
    errors.push('Account number must be 10-16 digits');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateBankAccountUS = (accountNumber) => {
  const errors = [];
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  
  if (!cleaned) {
    errors.push('Account number is required');
    return { isValid: false, errors };
  }
  
  if (!/^\d+$/.test(cleaned)) {
    errors.push('Account number must contain only digits');
  }
  
  if (cleaned.length < 4 || cleaned.length > 17) {
    errors.push('Account number must be 4-17 digits');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateRoutingNumber = (routingNumber) => {
  const errors = [];
  const cleaned = routingNumber.replace(/[\s-]/g, '');
  
  if (!cleaned) {
    errors.push('Routing number is required');
    return { isValid: false, errors };
  }
  
  if (!/^\d{9}$/.test(cleaned)) {
    errors.push('Routing number must be exactly 9 digits');
    return { isValid: false, errors };
  }
  
  // ABA routing number checksum validation
  const digits = cleaned.split('').map(Number);
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;
  
  if (checksum !== 0) {
    errors.push('Invalid routing number');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateSwiftCode = (swiftCode) => {
  const errors = [];
  const cleaned = swiftCode.replace(/\s/g, '').toUpperCase();
  
  if (!cleaned) {
    errors.push('SWIFT code is required');
    return { isValid: false, errors };
  }
  
  // SWIFT codes are 8 or 11 characters
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
    errors.push('Invalid SWIFT code format (should be 8 or 11 characters)');
  }
  
  return { isValid: errors.length === 0, errors, value: cleaned };
};

// ==================== EMAIL VALIDATION ====================

export const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (email.length > 254) {
    errors.push('Email address is too long');
  }
  
  return { isValid: errors.length === 0, errors };
};

// ==================== PASSWORD VALIDATION ====================

export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors, strength: 0 };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long');
  }
  
  // Calculate password strength
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  // Provide helpful suggestions
  if (strength < 3) {
    if (!/[A-Z]/.test(password)) {
      errors.push('Add an uppercase letter for stronger security');
    }
    if (!/\d/.test(password)) {
      errors.push('Add a number for stronger security');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Add a special character for stronger security');
    }
  }
  
  return { 
    isValid: password.length >= 8, 
    errors, 
    strength, // 0-5 scale
    strengthLabel: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][Math.min(strength, 4)]
  };
};

// ==================== NAME VALIDATION ====================

export const validateName = (name, fieldName = 'Name') => {
  const errors = [];
  
  if (!name || !name.trim()) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }
  
  const cleaned = name.trim();
  
  if (cleaned.length < 2) {
    errors.push(`${fieldName} must be at least 2 characters`);
  }
  
  if (cleaned.length > 100) {
    errors.push(`${fieldName} is too long`);
  }
  
  // Check for suspicious characters (potential injection)
  if (/<|>|{|}|\||\\/.test(cleaned)) {
    errors.push(`${fieldName} contains invalid characters`);
  }
  
  return { isValid: errors.length === 0, errors, value: cleaned };
};

// ==================== PHONE VALIDATION ====================

export const validatePhone = (phone) => {
  const errors = [];
  
  if (!phone) {
    return { isValid: true, errors }; // Phone is optional
  }
  
  // Remove all non-digits except + at the start
  const cleaned = phone.replace(/(?!^\+)\D/g, '');
  
  if (cleaned.length < 10 || cleaned.length > 15) {
    errors.push('Please enter a valid phone number');
  }
  
  return { isValid: errors.length === 0, errors, value: cleaned };
};

// ==================== INVOICE VALIDATION ====================

export const validateInvoiceNumber = (invoiceNumber) => {
  const errors = [];
  
  if (!invoiceNumber) {
    errors.push('Invoice number is required');
    return { isValid: false, errors };
  }
  
  const cleaned = invoiceNumber.trim();
  
  if (cleaned.length < 3 || cleaned.length > 50) {
    errors.push('Invoice number must be 3-50 characters');
  }
  
  // Allow alphanumeric, dashes, underscores
  if (!/^[a-zA-Z0-9\-_]+$/.test(cleaned)) {
    errors.push('Invoice number can only contain letters, numbers, dashes, and underscores');
  }
  
  return { isValid: errors.length === 0, errors, value: cleaned };
};

export const validateDueDate = (dueDate) => {
  const errors = [];
  
  if (!dueDate) {
    errors.push('Due date is required');
    return { isValid: false, errors };
  }
  
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(date.getTime())) {
    errors.push('Please enter a valid date');
    return { isValid: false, errors };
  }
  
  // Due date shouldn't be more than 1 year in the past
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (date < oneYearAgo) {
    errors.push('Due date cannot be more than 1 year in the past');
  }
  
  // Due date shouldn't be more than 5 years in the future
  const fiveYearsFromNow = new Date();
  fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
  if (date > fiveYearsFromNow) {
    errors.push('Due date cannot be more than 5 years in the future');
  }
  
  return { isValid: errors.length === 0, errors };
};

// ==================== ADDRESS VALIDATION ====================

export const validateAddress = (address) => {
  const errors = [];
  
  if (!address || !address.trim()) {
    errors.push('Address is required');
    return { isValid: false, errors };
  }
  
  if (address.length < 5) {
    errors.push('Please enter a complete address');
  }
  
  if (address.length > 200) {
    errors.push('Address is too long');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateZipCode = (zipCode, country = 'US') => {
  const errors = [];
  
  if (!zipCode) {
    errors.push('ZIP/Postal code is required');
    return { isValid: false, errors };
  }
  
  const cleaned = zipCode.trim();
  
  if (country === 'US' || country === 'United States') {
    // US ZIP: 5 digits or 5+4
    if (!/^\d{5}(-\d{4})?$/.test(cleaned)) {
      errors.push('Please enter a valid US ZIP code (e.g., 12345 or 12345-6789)');
    }
  } else if (country === 'Philippines') {
    // PH ZIP: 4 digits
    if (!/^\d{4}$/.test(cleaned)) {
      errors.push('Please enter a valid Philippine postal code (4 digits)');
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// ==================== SANITIZATION ====================

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Remove all HTML tags from input
 */
export const stripHtml = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Deep sanitize an object - recursively sanitize all string values
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeInput(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Sanitize for database storage - removes dangerous characters
 */
export const sanitizeForDB = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes and control characters
  let cleaned = input.replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned;
};

/**
 * Validate and sanitize user input before storage
 */
export const prepareForStorage = (data) => {
  const prepared = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      prepared[key] = null;
      continue;
    }
    
    if (typeof value === 'string') {
      // Strip HTML and sanitize
      prepared[key] = sanitizeForDB(stripHtml(value));
    } else if (typeof value === 'number') {
      // Ensure valid number
      prepared[key] = isNaN(value) ? null : value;
    } else if (typeof value === 'boolean') {
      prepared[key] = value;
    } else if (Array.isArray(value)) {
      prepared[key] = value.map(v => 
        typeof v === 'string' ? sanitizeForDB(stripHtml(v)) : v
      );
    } else if (typeof value === 'object') {
      prepared[key] = prepareForStorage(value);
    } else {
      prepared[key] = value;
    }
  }
  
  return prepared;
};

// ==================== RATE LIMITING ====================

/**
 * Simple client-side rate limiter for API calls
 * Note: Server-side rate limiting is also required for security
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }
  
  /**
   * Check if action is rate limited
   * @param {string} key - Unique identifier (e.g., 'login', 'transfer')
   * @param {number} maxRequests - Max requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} { allowed: boolean, remaining: number, resetAt: Date }
   */
  check(key, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or initialize request log
    let log = this.requests.get(key) || [];
    
    // Filter out old requests
    log = log.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (log.length >= maxRequests) {
      const oldestRequest = Math.min(...log);
      const resetAt = new Date(oldestRequest + windowMs);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((oldestRequest + windowMs - now) / 1000),
      };
    }
    
    // Add current request
    log.push(now);
    this.requests.set(key, log);
    
    return {
      allowed: true,
      remaining: maxRequests - log.length,
      resetAt: new Date(now + windowMs),
    };
  }
  
  /**
   * Reset rate limit for a key
   */
  reset(key) {
    this.requests.delete(key);
  }
  
  /**
   * Clear all rate limits
   */
  clear() {
    this.requests.clear();
  }
}

// Singleton rate limiter instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  transfer: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  invoice: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  recipient: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  export: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 exports per minute
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  onboarding: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  profile: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
};

/**
 * Check rate limit for a specific action
 */
export const checkRateLimit = (action, userId = 'anonymous') => {
  const config = RATE_LIMITS[action];
  if (!config) return { allowed: true };
  
  const key = `${action}:${userId}`;
  return rateLimiter.check(key, config.maxRequests, config.windowMs);
};

// ==================== COMPOSITE VALIDATORS ====================

/**
 * Validate entire transfer request
 */
export const validateTransfer = (transfer) => {
  const errors = {};
  
  const amountResult = validateAmount(transfer.amount);
  if (!amountResult.isValid) {
    errors.amount = amountResult.errors;
  }
  
  if (!transfer.recipientId && !transfer.recipientEmail) {
    errors.recipient = ['Please select a recipient'];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate entire recipient form
 */
export const validateRecipient = (recipient, country = 'PH') => {
  const errors = {};
  
  const nameResult = validateName(recipient.name || recipient.company, 'Name');
  if (!nameResult.isValid) {
    errors.name = nameResult.errors;
  }
  
  const emailResult = validateEmail(recipient.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.errors;
  }
  
  if (country === 'PH' || country === 'Philippines') {
    const accountResult = validateBankAccountPH(recipient.accountNumber);
    if (!accountResult.isValid) {
      errors.accountNumber = accountResult.errors;
    }
    
    if (recipient.swiftCode) {
      const swiftResult = validateSwiftCode(recipient.swiftCode);
      if (!swiftResult.isValid) {
        errors.swiftCode = swiftResult.errors;
      }
    }
  } else {
    const accountResult = validateBankAccountUS(recipient.accountNumber);
    if (!accountResult.isValid) {
      errors.accountNumber = accountResult.errors;
    }
    
    if (recipient.routingNumber) {
      const routingResult = validateRoutingNumber(recipient.routingNumber);
      if (!routingResult.isValid) {
        errors.routingNumber = routingResult.errors;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  validateAmount,
  validateBankAccountPH,
  validateBankAccountUS,
  validateRoutingNumber,
  validateSwiftCode,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateInvoiceNumber,
  validateDueDate,
  validateAddress,
  validateZipCode,
  sanitizeInput,
  stripHtml,
  validateTransfer,
  validateRecipient
};
