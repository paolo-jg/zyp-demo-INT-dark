/**
 * Cybrid API Integration Helpers
 * 
 * These functions call Supabase Edge Functions that interact with Cybrid's API.
 */

import { secureError } from './secureLogging';

/**
 * Create a Cybrid customer for the current user
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} { success, customer_guid, kyc_required, error }
 */
export const createCybridCustomer = async (supabase) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-customer', {
      body: {}
    });

    if (error) {
      secureError('Error creating Cybrid customer:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to create Cybrid customer:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Create identity verification (Persona KYC) for US users
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} { success, inquiry_id, error }
 */
export const createIdentityVerification = async (supabase) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-identity-verification', {
      body: {}
    });

    if (error) {
      secureError('Error creating identity verification:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to create identity verification:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Link bank account via Plaid
 * @param {Object} supabase - Supabase client
 * @param {string} publicToken - Plaid public token from Link
 * @param {string} accountId - Selected Plaid account ID
 * @returns {Promise<Object>} { success, bank_account_guid, error }
 */
export const linkBankAccount = async (supabase, publicToken, accountId) => {
  try {
    const { data, error } = await supabase.functions.invoke('link-bank-account', {
      body: {
        plaid_public_token: publicToken,
        plaid_account_id: accountId
      }
    });

    if (error) {
      secureError('Error linking bank account:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to link bank account:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Get Plaid Link token to open Plaid Link
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} { success, plaid_link_token, workflow_guid, error }
 */
export const getPlaidLinkToken = async (supabase) => {
  try {
    const { data, error } = await supabase.functions.invoke('get-plaid-link-token', {
      body: {}
    });

    if (error) {
      secureError('Error getting Plaid link token:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to get Plaid link token:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Create fiat account for the user
 * @param {Object} supabase - Supabase client
 * @param {boolean} usOnly - If true, use US-only endpoint
 * @returns {Promise<Object>} { success, account_guid, error }
 */
export const createFiatAccount = async (supabase, usOnly = false) => {
  try {
    const functionName = usOnly ? 'create-fiat-account-us' : 'create-fiat-account';
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {}
    });

    if (error) {
      secureError('Error creating fiat account:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to create fiat account:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Complete full onboarding flow for US users
 * 1. Create customer
 * 2. Create identity verification (returns Persona inquiry ID)
 * 
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} { success, inquiry_id, error }
 */
export const startUSOnboarding = async (supabase) => {
  // Step 1: Create Cybrid customer
  const customerResult = await createCybridCustomer(supabase);
  if (!customerResult.success) {
    return { success: false, error: customerResult.error, step: 'create_customer' };
  }

  // Step 2: Create identity verification
  const verificationResult = await createIdentityVerification(supabase);
  if (!verificationResult.success) {
    return { success: false, error: verificationResult.error, step: 'identity_verification' };
  }

  return {
    success: true,
    customer_guid: customerResult.customer_guid,
    inquiry_id: verificationResult.inquiry_id
  };
};

/**
 * Complete full onboarding flow for PH users
 * 1. Create customer
 * 2. Create fiat account
 * 
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} { success, error }
 */
export const startPHOnboarding = async (supabase) => {
  // Step 1: Create Cybrid customer
  const customerResult = await createCybridCustomer(supabase);
  if (!customerResult.success) {
    return { success: false, error: customerResult.error, step: 'create_customer' };
  }

  // Step 2: Create fiat account
  const accountResult = await createFiatAccount(supabase, false);
  if (!accountResult.success) {
    return { success: false, error: accountResult.error, step: 'create_account' };
  }

  return {
    success: true,
    customer_guid: customerResult.customer_guid,
    account_guid: accountResult.account_guid
  };
};

/**
 * Complete US onboarding after Plaid
 * Called after Plaid Link completes successfully
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} publicToken - Plaid public token
 * @param {string} accountId - Plaid account ID
 * @returns {Promise<Object>} { success, error }
 */
export const completeUSOnboarding = async (supabase, publicToken, accountId) => {
  // Step 1: Link bank account
  const bankResult = await linkBankAccount(supabase, publicToken, accountId);
  if (!bankResult.success) {
    return { success: false, error: bankResult.error, step: 'link_bank' };
  }

  // Step 2: Create fiat account
  const accountResult = await createFiatAccount(supabase, true);
  if (!accountResult.success) {
    return { success: false, error: accountResult.error, step: 'create_account' };
  }

  return {
    success: true,
    bank_account_guid: bankResult.bank_account_guid,
    account_guid: accountResult.account_guid
  };
};

/**
 * Execute a transfer with fresh sanctions check
 * @param {Object} supabase - Supabase client
 * @param {number} amount - Amount in USD
 * @param {Object} recipient - Recipient details
 * @returns {Promise<Object>} { success, transfer_guid, error }
 */
export const executeTransfer = async (supabase, amount, recipient) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-transfer', {
      body: { amount, recipient }
    });

    if (error) {
      secureError('Error executing transfer:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to execute transfer:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Execute a transfer with counterparty GUID reuse
 * @param {Object} supabase - Supabase client
 * @param {number} amount - Amount in USD
 * @param {Object} recipient - Recipient details
 * @param {string} recipientUserId - Optional: recipient's user ID if they're a registered user
 * @returns {Promise<Object>} { success, transfer_guid, error }
 */
export const executeTransferReuse = async (supabase, amount, recipient, recipientUserId = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-transferREUSEGUID', {
      body: { amount, recipient, recipient_user_id: recipientUserId }
    });

    if (error) {
      secureError('Error executing transfer:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to execute transfer:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Get a quote for a transfer (shows fees and exchange rate)
 * @param {Object} supabase - Supabase client
 * @param {number} amountUsd - Amount in USD
 * @param {string} recipientId - Optional recipient ID
 * @returns {Promise<Object>} { success, quote_guid, amount_php, exchange_rate, fee_usd, fee_percent, ... }
 */
export const getQuote = async (supabase, amountUsd, recipientId = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-quote', {
      body: { amount_usd: amountUsd, recipient_id: recipientId }
    });

    if (error) {
      secureError('Error getting quote:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to get quote:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Get transfer status from Cybrid
 * @param {Object} supabase - Supabase client
 * @param {string} transferGuid - Cybrid transfer GUID
 * @param {string} transactionId - Optional local transaction ID
 * @returns {Promise<Object>} { success, state, status_display, ... }
 */
export const getTransferStatus = async (supabase, transferGuid = null, transactionId = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('get-transfer-status', {
      body: { transfer_guid: transferGuid, transaction_id: transactionId }
    });

    if (error) {
      secureError('Error getting transfer status:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (e) {
    secureError('Failed to get transfer status:', e);
    return { success: false, error: e.message };
  }
};

export default {
  createCybridCustomer,
  createIdentityVerification,
  linkBankAccount,
  getPlaidLinkToken,
  createFiatAccount,
  startUSOnboarding,
  startPHOnboarding,
  completeUSOnboarding,
  executeTransfer,
  executeTransferReuse,
  getQuote,
  getTransferStatus
};
