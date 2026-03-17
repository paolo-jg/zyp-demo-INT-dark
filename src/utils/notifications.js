// Notification service for triggering email notifications
// Calls the send-notification Edge Function

import { secureError } from './secureLogging';

const SUPABASE_URL = 'https://jgkievbnncwqixyzblzc.supabase.co';

/**
 * Send a notification to a user
 * @param {string} accessToken - User's access token
 * @param {string} userId - User ID to notify
 * @param {string} eventType - Type of event (transfer_completed, invoice_paid, etc.)
 * @param {object} data - Data to include in the notification
 */
export async function sendNotification(accessToken, userId, eventType, data) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          eventType,
          data,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      secureError('Notification failed');
      return { success: false, error };
    }

    return await response.json();
  } catch (error) {
    secureError('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// Notification event types
export const NOTIFICATION_EVENTS = {
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_FAILED: 'transfer_failed',
  INVOICE_PAID: 'invoice_paid',
  PAYMENT_RECEIVED: 'payment_received',
  SECURITY_ALERT: 'security_alert',
  LARGE_TRANSFER_ALERT: 'large_transfer_alert',
  AUTOPAY_PENDING: 'autopay_pending',
  AUTOPAY_EXECUTED: 'autopay_executed',
  AUTOPAY_FAILED: 'autopay_failed',
};

// Helper functions for common notification scenarios

export async function notifyTransferCompleted(accessToken, userId, transferData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.TRANSFER_COMPLETED, {
    amount: `$${transferData.amountUsd.toLocaleString()}`,
    amountReceived: `₱${transferData.amountPhp.toLocaleString()}`,
    recipientName: transferData.recipientName,
    fee: `$${(transferData.fee || 0).toFixed(2)}`,
    reference: transferData.reference || transferData.id,
  });
}

export async function notifyTransferFailed(accessToken, userId, transferData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.TRANSFER_FAILED, {
    amount: `$${transferData.amount.toLocaleString()}`,
    recipientName: transferData.recipientName,
    failureReason: transferData.failureReason || 'Unknown error',
  });
}

export async function notifyInvoicePaid(accessToken, userId, invoiceData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.INVOICE_PAID, {
    invoiceNumber: invoiceData.invoiceNumber,
    amount: `$${invoiceData.amount.toLocaleString()}`,
    paidBy: invoiceData.paidBy,
    paidDate: new Date().toLocaleDateString(),
  });
}

export async function notifyPaymentReceived(accessToken, userId, paymentData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
    senderName: paymentData.senderName,
    amount: `₱${paymentData.amount.toLocaleString()}`,
    reference: paymentData.reference,
  });
}

export async function notifySecurityAlert(accessToken, userId, alertData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.SECURITY_ALERT, {
    alertType: alertData.alertType,
    alertDetails: alertData.details,
    timestamp: new Date().toLocaleString(),
  });
}

export async function notifyLargeTransfer(accessToken, userId, transferData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.LARGE_TRANSFER_ALERT, {
    amount: `$${transferData.amount.toLocaleString()}`,
    recipientName: transferData.recipientName,
    timestamp: new Date().toLocaleString(),
  });
}

export async function notifyAutopayPending(accessToken, userId, autopayData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.AUTOPAY_PENDING, {
    senderName: autopayData.senderName,
    amount: `$${autopayData.amount.toLocaleString()}`,
    invoiceNumber: autopayData.invoiceNumber,
    dueDate: autopayData.dueDate,
    message: `Auto-pay pending approval: $${autopayData.amount.toLocaleString()} to ${autopayData.senderName}`,
  });
}

export async function notifyAutopayExecuted(accessToken, userId, autopayData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.AUTOPAY_EXECUTED, {
    senderName: autopayData.senderName,
    amount: `$${autopayData.amount.toLocaleString()}`,
    invoiceNumber: autopayData.invoiceNumber,
    message: `Auto-pay executed: $${autopayData.amount.toLocaleString()} paid to ${autopayData.senderName}`,
  });
}

export async function notifyAutopayFailed(accessToken, userId, autopayData) {
  return sendNotification(accessToken, userId, NOTIFICATION_EVENTS.AUTOPAY_FAILED, {
    senderName: autopayData.senderName,
    amount: `$${autopayData.amount.toLocaleString()}`,
    reason: autopayData.reason || 'Unknown error',
    message: `Auto-pay failed: ${autopayData.reason || 'Unknown error'}`,
  });
}

export default {
  sendNotification,
  NOTIFICATION_EVENTS,
  notifyTransferCompleted,
  notifyTransferFailed,
  notifyInvoicePaid,
  notifyPaymentReceived,
  notifySecurityAlert,
  notifyLargeTransfer,
  notifyAutopayPending,
  notifyAutopayExecuted,
  notifyAutopayFailed,
};
