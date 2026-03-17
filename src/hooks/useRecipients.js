/**
 * useRecipients Hook
 * Handles recipient CRUD operations
 */

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { sanitizeForDB, checkRateLimit } from '../utils/validators';
import { secureError } from '../utils/secureLogging';

export function useRecipients(userId) {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRecipients = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        secureError('Error fetching recipients:', error);
        return;
      }

      if (data) {
        const mappedRecipients = data.map(r => ({
          id: r.id,
          zypUserId: r.zyp_user_id,
          type: r.type,
          name: r.name,
          company: r.company,
          accountName: r.account_name,
          accountNumber: r.account_number,
          routingNumber: r.routing_number,
          bankName: r.bank_name,
          bank: r.bank_name,
          swiftCode: r.swift_code,
          email: r.email,
          phone: r.phone,
          country: r.country,
          receivingCurrency: r.receiving_currency || 'PHP',
          verificationStatus: r.verification_status,
          notes: r.notes,
          tags: r.tags || [],
          lastPayment: r.last_payment,
          totalSent: r.total_sent || 0,
          transactionCount: r.transaction_count || 0,
          paymentHistory: []
        }));
        setRecipients(mappedRecipients);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addRecipient = useCallback(async (recipient) => {
    if (!checkRateLimit('recipient')) {
      alert('Too many requests. Please wait a moment and try again.');
      return null;
    }

    const { data, error } = await supabase.from('recipients').insert({
      user_id: userId,
      zyp_user_id: recipient.zypUserId || null,
      type: sanitizeForDB(recipient.type),
      name: sanitizeForDB(recipient.name),
      company: sanitizeForDB(recipient.company || recipient.name),
      account_name: sanitizeForDB(recipient.accountName),
      account_number: sanitizeForDB(recipient.accountNumber),
      routing_number: recipient.routingNumber ? sanitizeForDB(recipient.routingNumber) : null,
      bank_name: sanitizeForDB(recipient.bankName || recipient.bank),
      swift_code: recipient.swiftCode ? sanitizeForDB(recipient.swiftCode) : null,
      email: recipient.email ? sanitizeForDB(recipient.email) : null,
      phone: recipient.phone ? sanitizeForDB(recipient.phone) : null,
      country: sanitizeForDB(recipient.country || 'Philippines'),
      receiving_currency: sanitizeForDB(recipient.receivingCurrency || 'PHP'),
      verification_status: recipient.verificationStatus || 'pending',
      notes: recipient.notes ? sanitizeForDB(recipient.notes) : null
    }).select().single();

    if (error) {
      secureError('Error adding recipient:', error);
      alert('Failed to add recipient. Please try again.');
      return null;
    }

    if (data) {
      const newRecipient = {
        ...recipient,
        id: data.id,
        zypUserId: data.zyp_user_id,
        receivingCurrency: data.receiving_currency
      };
      setRecipients(prev => [newRecipient, ...prev]);
      return newRecipient;
    }
    return null;
  }, [userId]);

  const updateRecipient = useCallback(async (id, updates) => {
    const { error } = await supabase.from('recipients').update({
      type: sanitizeForDB(updates.type),
      name: sanitizeForDB(updates.name),
      company: sanitizeForDB(updates.company),
      account_name: sanitizeForDB(updates.accountName),
      account_number: sanitizeForDB(updates.accountNumber),
      routing_number: updates.routingNumber ? sanitizeForDB(updates.routingNumber) : null,
      bank_name: sanitizeForDB(updates.bankName || updates.bank),
      swift_code: updates.swiftCode ? sanitizeForDB(updates.swiftCode) : null,
      email: updates.email ? sanitizeForDB(updates.email) : null,
      phone: updates.phone ? sanitizeForDB(updates.phone) : null,
      receiving_currency: sanitizeForDB(updates.receivingCurrency || 'PHP'),
      notes: updates.notes ? sanitizeForDB(updates.notes) : null,
      verification_status: updates.verificationStatus,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (error) {
      secureError('Error updating recipient:', error);
      return { error };
    }

    setRecipients(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    return { success: true };
  }, []);

  const deleteRecipient = useCallback(async (id) => {
    const { error } = await supabase.from('recipients').delete().eq('id', id);
    
    if (error) {
      secureError('Error deleting recipient:', error);
      return { error };
    }

    setRecipients(prev => prev.filter(r => r.id !== id));
    return { success: true };
  }, []);

  const bulkDeleteRecipients = useCallback(async (ids) => {
    for (const id of ids) {
      await supabase.from('recipients').delete().eq('id', id);
    }
    setRecipients(prev => prev.filter(r => !ids.includes(r.id)));
  }, []);

  return {
    recipients,
    setRecipients,
    loading,
    fetchRecipients,
    addRecipient,
    updateRecipient,
    deleteRecipient,
    bulkDeleteRecipients,
  };
}

export default useRecipients;
