/**
 * useTransactions Hook
 * Handles transaction fetching and creation
 */

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { secureError } from '../utils/secureLogging';
import { logTransferEvent, AUDIT_EVENTS } from '../utils/auditLog';

export function useTransactions(userId, userData) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch sent transactions
      const { data: sentTxns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch received transactions
      const { data: receivedTxns } = await supabase
        .from('transactions')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      const allTransactions = [
        ...(sentTxns || []).map(txn => ({ ...txn, direction: 'sent' })),
        ...(receivedTxns || []).map(txn => ({ ...txn, direction: 'received' }))
      ];

      // Remove duplicates
      const uniqueTransactions = allTransactions.filter((txn, index, self) =>
        index === self.findIndex(t => t.id === txn.id)
      );

      const mappedTransactions = uniqueTransactions.map(txn => ({
        id: txn.transaction_number || txn.id,
        type: txn.direction === 'sent' ? 'Sent' : 'Received',
        recipient: txn.direction === 'sent' ? txn.recipient_name : txn.sender_name || 'Unknown',
        senderName: txn.sender_name,
        senderEmail: txn.sender_email,
        recipientName: txn.recipient_name,
        status: txn.status,
        amount: parseFloat(txn.amount_sent),
        amountReceived: parseFloat(txn.amount_received || 0),
        date: new Date(txn.created_at).toISOString().split('T')[0],
        direction: txn.direction,
        exchangeRate: txn.exchange_rate,
        fee: txn.fee,
        feePercentage: txn.fee_percentage,
        receivingCurrency: txn.receiving_currency || 'PHP',
        cybridTransferGuid: txn.cybrid_transfer_guid
      }));

      setTransactions(mappedTransactions);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addTransaction = useCallback(async (txn, recipient) => {
    const senderName = userData?.business_name || 
      `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Unknown';

    const { data, error } = await supabase.from('transactions').insert({
      user_id: userId,
      sender_name: senderName,
      sender_email: userData?.email,
      transaction_number: txn.id,
      recipient_id: recipient.zypUserId || null,
      recipient_local_id: recipient.id,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      recipient_bank: recipient.bank || recipient.bankName,
      recipient_account_last4: recipient.accountNumber?.slice(-4),
      amount_sent: txn.amount,
      fee: txn.fee || 0,
      receiver_fee: txn.receiverFee || 0,
      fee_percentage: txn.feePercentage || 0.5,
      amount_received: txn.phpAmount,
      receiving_currency: txn.receivingCurrency || 'PHP',
      // CRITICAL: Exchange rate must be provided - no fallback
      exchange_rate: txn.exchangeRate,
      status: txn.status,
      estimated_arrival: '1-2 hours',
      cybrid_transfer_guid: txn.cybrid_transfer_guid
    }).select().single();

    if (error) {
      secureError('Error creating transaction:', error);
      return null;
    }

    if (data) {
      // Add to transaction_logs
      await supabase.from('transaction_logs').insert({
        transaction_id: data.id,
        transaction_number: txn.id,
        action: 'initiated',
        actor_id: userId,
        actor_name: senderName,
        actor_type: 'sender',
        new_status: txn.status,
        amount_sent: txn.amount,
        amount_received: txn.phpAmount,
        metadata: {
          recipient_name: recipient.name,
          recipient_id: recipient.zypUserId,
          exchange_rate: txn.exchangeRate,
          fee: txn.fee || 0
        }
      });

      // Update recipient's total sent
      await supabase.from('recipients').update({
        total_sent: (recipient.totalSent || 0) + txn.amount,
        transaction_count: (recipient.transactionCount || 0) + 1,
        last_payment: new Date().toISOString()
      }).eq('id', recipient.id);

      // Add to payment history
      await supabase.from('payment_history').insert({
        recipient_id: recipient.id,
        transaction_id: data.id,
        amount: txn.amount,
        status: 'completed'
      });

      // Audit log
      await logTransferEvent(AUDIT_EVENTS.TRANSFER_COMPLETED, {
        ...txn,
        recipientId: recipient.id,
        recipientZypId: recipient.zypUserId
      });

      const newTransaction = {
        ...txn,
        direction: 'sent',
        type: 'Sent',
        recipient: recipient.name
      };
      setTransactions(prev => [newTransaction, ...prev]);

      return newTransaction;
    }
    return null;
  }, [userId, userData]);

  return {
    transactions,
    setTransactions,
    loading,
    fetchTransactions,
    addTransaction,
  };
}

export default useTransactions;
