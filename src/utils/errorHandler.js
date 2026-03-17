// Error handling utilities with user-friendly messages, retry logic, and offline queue

import { secureLog, secureError, secureWarn } from './secureLogging';

// User-friendly error messages mapped from technical errors
const ERROR_MESSAGES = {
  // Network errors
  'Failed to fetch': 'Unable to connect. Please check your internet connection.',
  'NetworkError': 'Network error. Please check your connection and try again.',
  'TypeError: Failed to fetch': 'Connection failed. Please try again.',
  'net::ERR_INTERNET_DISCONNECTED': 'No internet connection. Your changes will be saved when you reconnect.',
  'net::ERR_CONNECTION_REFUSED': 'Server unavailable. Please try again later.',
  'net::ERR_CONNECTION_TIMED_OUT': 'Connection timed out. Please try again.',
  
  // Supabase errors
  'JWT expired': 'Your session has expired. Please sign in again.',
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'User already registered': 'An account with this email already exists.',
  'Email not confirmed': 'Please check your email to confirm your account.',
  'Invalid Refresh Token': 'Your session has expired. Please sign in again.',
  'new row violates row-level security': 'You don\'t have permission to perform this action.',
  'duplicate key value': 'This record already exists.',
  'violates foreign key constraint': 'This action cannot be completed due to linked records.',
  
  // Validation errors
  'invalid input syntax': 'Invalid data format. Please check your input.',
  'value too long': 'Input exceeds maximum length.',
  'null value in column': 'Required field is missing.',
  
  // Rate limiting
  'rate limit': 'Too many requests. Please wait a moment and try again.',
  '429': 'Too many requests. Please slow down.',
  
  // Generic
  'PGRST': 'Database error. Please try again.',
  '500': 'Server error. Our team has been notified.',
  '503': 'Service temporarily unavailable. Please try again later.',
};

// Parse error and return user-friendly message
export function getUserFriendlyError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const errorString = error.message || error.toString() || '';
  const errorCode = error.code || error.status || '';
  
  // Check for matching error patterns
  for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorString.includes(pattern) || errorCode.toString().includes(pattern)) {
      return message;
    }
  }
  
  // Return original message if it's already user-friendly (no technical jargon)
  if (errorString.length < 100 && !errorString.includes('Error:') && !errorString.includes('exception')) {
    return errorString;
  }
  
  return 'Something went wrong. Please try again.';
}

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'Failed to fetch',
    'NetworkError',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    '500',
    '502',
    '503',
    '504',
  ],
};

// Check if error is retryable
function isRetryableError(error) {
  const errorString = (error.message || error.toString() || '').toLowerCase();
  const errorCode = (error.code || error.status || '').toString();
  
  return DEFAULT_RETRY_CONFIG.retryableErrors.some(
    retryable => errorString.includes(retryable.toLowerCase()) || errorCode.includes(retryable)
  );
}

// Calculate delay with exponential backoff
function calculateDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  // Add jitter (±20%)
  return delay * (0.8 + Math.random() * 0.4);
}

// Retry wrapper for async functions
export async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      const delay = calculateDelay(attempt, config);
      secureLog(`Retry attempt ${attempt + 1}/${config.maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Offline Queue for storing actions when offline
const OFFLINE_QUEUE_KEY = 'zyp-offline-queue';

class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isOnline = navigator.onLine;
    this.listeners = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  loadQueue() {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  saveQueue() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      secureError('Failed to save offline queue:', e);
    }
  }
  
  // Add action to queue
  enqueue(action) {
    const queuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...action,
    };
    
    this.queue.push(queuedAction);
    this.saveQueue();
    this.notifyListeners();
    
    return queuedAction.id;
  }
  
  // Remove action from queue
  dequeue(id) {
    this.queue = this.queue.filter(action => action.id !== id);
    this.saveQueue();
    this.notifyListeners();
  }
  
  // Get all queued actions
  getQueue() {
    return [...this.queue];
  }
  
  // Get queue length
  get length() {
    return this.queue.length;
  }
  
  // Process queue when back online
  async processQueue(handlers) {
    if (!this.isOnline || this.queue.length === 0) return;
    
    const actionsToProcess = [...this.queue];
    const results = [];
    
    for (const action of actionsToProcess) {
      const handler = handlers[action.type];
      if (!handler) {
        secureWarn(`No handler for action type: ${action.type}`);
        continue;
      }
      
      try {
        await handler(action.data);
        this.dequeue(action.id);
        results.push({ id: action.id, success: true });
      } catch (error) {
        secureError(`Failed to process queued action:`, error);
        results.push({ id: action.id, success: false, error });
      }
    }
    
    return results;
  }
  
  // Handle coming back online
  handleOnline() {
    this.isOnline = true;
    this.notifyListeners();
    secureLog('Back online');
  }
  
  // Handle going offline
  handleOffline() {
    this.isOnline = false;
    this.notifyListeners();
    secureLog('Gone offline');
  }
  
  // Subscribe to queue changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notifyListeners() {
    this.listeners.forEach(listener => listener({
      queue: this.queue,
      isOnline: this.isOnline,
    }));
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// Hook for React components
export function useOfflineQueue() {
  const [state, setState] = React.useState({
    queue: offlineQueue.getQueue(),
    isOnline: offlineQueue.isOnline,
  });
  
  React.useEffect(() => {
    return offlineQueue.subscribe(setState);
  }, []);
  
  return state;
}

// Import React for the hook
import React from 'react';

// Toast notification helper
export function showErrorToast(error, setToast) {
  const message = getUserFriendlyError(error);
  setToast?.({
    type: 'error',
    message,
    duration: 5000,
  });
}

// Wrapper for Supabase operations with error handling
export async function safeSupabaseCall(supabasePromise, options = {}) {
  const { 
    retry = true, 
    queueOnOffline = false, 
    actionType = null,
    actionData = null,
  } = options;
  
  // Check if offline and should queue
  if (!navigator.onLine && queueOnOffline && actionType) {
    offlineQueue.enqueue({ type: actionType, data: actionData });
    return { 
      data: null, 
      error: null, 
      queued: true,
      message: 'Action saved. It will be processed when you\'re back online.',
    };
  }
  
  const execute = async () => {
    const { data, error } = await supabasePromise;
    if (error) throw error;
    return { data, error: null };
  };
  
  try {
    if (retry) {
      return await withRetry(execute);
    }
    return await execute();
  } catch (error) {
    return { 
      data: null, 
      error,
      message: getUserFriendlyError(error),
    };
  }
}
