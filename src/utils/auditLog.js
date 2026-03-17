/**
 * Transaction Audit Logging for Zyp
 * 
 * Records all sensitive operations for compliance and security
 */

import { supabase } from '../supabaseClient';
import { secureLog, secureError, secureWarn } from './secureLogging';

// Event types
export const AUDIT_EVENTS = {
  // Transfer events
  TRANSFER_INITIATED: 'transfer_initiated',
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_FAILED: 'transfer_failed',
  TRANSFER_CANCELLED: 'transfer_cancelled',
  
  // High-value events
  HIGH_VALUE_REAUTH: 'high_value_reauth',
  LARGE_TRANSFER_DOCS_UPLOADED: 'large_transfer_docs_uploaded',
  LARGE_TRANSFER_DOCS_VERIFIED: 'large_transfer_docs_verified',
  
  // Invoice events
  INVOICE_CREATED: 'invoice_created',
  INVOICE_UPDATED: 'invoice_updated',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_DELETED: 'invoice_deleted',
  
  // Recipient events
  RECIPIENT_ADDED: 'recipient_added',
  RECIPIENT_UPDATED: 'recipient_updated',
  RECIPIENT_DELETED: 'recipient_deleted',
  
  // Auth events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGED: 'password_changed',
  SESSION_TIMEOUT: 'session_timeout',
  
  // Account events
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_UPDATED: 'account_updated',
  ACCOUNT_DELETED: 'account_deleted',
  KYB_SUBMITTED: 'kyb_submitted',
  BANK_ACCOUNT_LINKED: 'bank_account_linked',
};

/**
 * Log an audit event to Supabase
 * @param {string} eventType - Type of event (from AUDIT_EVENTS)
 * @param {object} details - Event details
 * @param {string} userId - User ID (optional, will use current session if not provided)
 */
export const logAuditEvent = async (eventType, details = {}, userId = null) => {
  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    
    const auditEntry = {
      user_id: userId,
      event_type: eventType,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : null,
      },
      ip_address: null, // Would be set server-side in production
      created_at: new Date().toISOString(),
    };
    
    // Try to log to Supabase
    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);
    
    if (error) {
      // If table doesn't exist, log to console and localStorage as fallback
      secureWarn('Audit log to Supabase failed, using fallback');
      logToLocalStorage(auditEntry);
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      secureLog(`[AUDIT] ${eventType}`, details);
    }
    
    return { success: true };
  } catch (err) {
    secureError('Audit logging error:', err);
    // Don't throw - audit logging should never break the app
    return { success: false, error: err.message };
  }
};

/**
 * Fallback: Log to localStorage if Supabase is unavailable
 */
const logToLocalStorage = (entry) => {
  try {
    const STORAGE_KEY = 'zyp_audit_log';
    const MAX_ENTRIES = 500;
    
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    logs.unshift(entry);
    
    // Keep only recent entries
    if (logs.length > MAX_ENTRIES) {
      logs.length = MAX_ENTRIES;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get audit logs from localStorage (for debugging)
 */
export const getLocalAuditLogs = () => {
  try {
    return JSON.parse(localStorage.getItem('zyp_audit_log') || '[]');
  } catch {
    return [];
  }
};

// ==================== SPECIALIZED LOGGING FUNCTIONS ====================

/**
 * Log a transfer event with full details
 */
export const logTransferEvent = async (eventType, transfer, additionalDetails = {}) => {
  return logAuditEvent(eventType, {
    transfer_id: transfer.id,
    amount_usd: transfer.amount,
    amount_php: transfer.phpAmount,
    fee: transfer.fee,
    fee_percentage: transfer.feePercentage,
    exchange_rate: transfer.exchangeRate,
    recipient_id: transfer.recipientId,
    recipient_name: transfer.recipient,
    ...additionalDetails,
  });
};

/**
 * Log an invoice event
 */
export const logInvoiceEvent = async (eventType, invoice, additionalDetails = {}) => {
  return logAuditEvent(eventType, {
    invoice_number: invoice.invoiceNumber,
    amount: invoice.amount,
    type: invoice.type,
    business_name: invoice.businessName,
    status: invoice.status,
    ...additionalDetails,
  });
};

/**
 * Log a recipient event
 */
export const logRecipientEvent = async (eventType, recipient, additionalDetails = {}) => {
  return logAuditEvent(eventType, {
    recipient_id: recipient.id,
    recipient_name: recipient.name,
    bank_name: recipient.bankName || recipient.bank,
    // Don't log full account number for security
    account_last_4: recipient.accountNumber?.slice(-4),
    ...additionalDetails,
  });
};

/**
 * Log an authentication event
 */
export const logAuthEvent = async (eventType, additionalDetails = {}) => {
  return logAuditEvent(eventType, {
    ...additionalDetails,
  });
};

/**
 * Log high-value transfer verification
 */
export const logHighValueVerification = async (amount, phpAmount, verificationMethod) => {
  return logAuditEvent(AUDIT_EVENTS.HIGH_VALUE_REAUTH, {
    amount_usd: amount,
    amount_php: phpAmount,
    verification_method: verificationMethod,
  });
};

/**
 * Log large transfer document upload
 */
export const logLargeTransferDocs = async (phpAmount, documentCount) => {
  return logAuditEvent(AUDIT_EVENTS.LARGE_TRANSFER_DOCS_UPLOADED, {
    amount_php: phpAmount,
    document_count: documentCount,
    document_type: 'bank_statements_3_months',
  });
};

export default {
  AUDIT_EVENTS,
  logAuditEvent,
  logTransferEvent,
  logInvoiceEvent,
  logRecipientEvent,
  logAuthEvent,
  logHighValueVerification,
  logLargeTransferDocs,
  getLocalAuditLogs,
};
