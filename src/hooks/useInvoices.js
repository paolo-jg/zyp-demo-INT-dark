/**
 * useInvoices Hook
 * Handles invoice CRUD operations and status management
 */

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { sanitizeForDB, checkRateLimit } from '../utils/validators';
import { secureError } from '../utils/secureLogging';

export function useInvoices(userId, userData) {
  const [invoices, setInvoices] = useState([]);
  const [statusLogs, setStatusLogs] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch sent invoices
      const { data: sentInvoices, error: sentError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (sentError) secureError('Error fetching sent invoices:', sentError);

      // Fetch received invoices
      const { data: receivedInvoices, error: receivedError } = await supabase
        .from('invoices')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (receivedError) secureError('Error fetching received invoices:', receivedError);

      const allInvoices = [
        ...(sentInvoices || []).map(inv => ({ ...inv, direction: 'sent' })),
        ...(receivedInvoices || []).map(inv => ({ ...inv, direction: 'received' }))
      ];

      // Remove duplicates
      const uniqueInvoices = allInvoices.filter((inv, index, self) =>
        index === self.findIndex(i => i.id === inv.id)
      );

      const mappedInvoices = uniqueInvoices.map(inv => ({
        id: inv.id,
        zyp_id: inv.zyp_id,  // Zyp ID from database
        date: new Date(inv.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
        invoiceNumber: inv.invoice_number,
        pdf: inv.pdf_data ? 'has-pdf' : 'No file',
        businessName: inv.direction === 'sent' ? inv.recipient_name : (inv.sender_name || inv.recipient_name),
        senderName: inv.sender_name,
        senderEmail: inv.sender_email,
        recipientId: inv.recipient_id || '',
        type: inv.direction === 'sent' ? 'Receivable' : 'Payable',
        direction: inv.direction,
        status: inv.status,
        amount: `$${parseFloat(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        invoiceData: inv.line_items ? {
          ...inv.line_items,
          lineItems: inv.line_items.lineItems || [],
          total: inv.amount,
          subtotal: inv.subtotal,
          customer: inv.recipient_name,
          sender: inv.sender_name
        } : null,
        pdfData: inv.pdf_data
      }));

      setInvoices(mappedInvoices);

      // Fetch status logs
      if (uniqueInvoices.length > 0) {
        const { data: logs } = await supabase
          .from('status_logs')
          .select('*')
          .in('invoice_id', uniqueInvoices.map(i => i.id))
          .order('created_at', { ascending: true });

        if (logs) {
          const logsMap = {};
          logs.forEach(log => {
            const invoice = uniqueInvoices.find(i => i.id === log.invoice_id);
            if (invoice) {
              const invNumber = invoice.invoice_number;
              if (!logsMap[invNumber]) logsMap[invNumber] = [];
              logsMap[invNumber].push({
                status: log.new_status,
                date: new Date(log.created_at).toLocaleString(),
                updatedBy: log.updated_by || 'System'
              });
            }
          });
          setStatusLogs(logsMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addInvoice = useCallback(async (invoice) => {
    if (!checkRateLimit('invoice')) {
      alert('Too many requests. Please wait a moment and try again.');
      return null;
    }

    const senderName = userData?.business_name || 
      `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Unknown';

    const { data, error } = await supabase.from('invoices').insert({
      user_id: userId,
      sender_name: sanitizeForDB(senderName),
      sender_email: userData?.email,
      invoice_number: sanitizeForDB(invoice.invoiceNumber),
      title: invoice.invoiceData?.title ? sanitizeForDB(invoice.invoiceData.title) : null,
      recipient_id: invoice.recipientUserId || null,
      recipient_name: sanitizeForDB(invoice.businessName),
      type: 'Receivable',
      amount: parseFloat(invoice.amount.replace(/[$,]/g, '')),
      status: 'sent',
      date: new Date(),
      due_date: invoice.dueDate ? (() => {
        const parts = invoice.dueDate.split('/');
        return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      })() : null,
      subtotal: invoice.invoiceData?.subtotal,
      tax: invoice.invoiceData?.tax || 0,
      discount: invoice.invoiceData?.discount || 0,
      service_charge: invoice.invoiceData?.serviceCharge || 0,
      line_items: invoice.invoiceData,
      notes: invoice.invoiceData?.notes ? sanitizeForDB(invoice.invoiceData.notes) : null,
      is_recurring: invoice.invoiceData?.isRecurring || false,
      recurring_frequency: invoice.invoiceData?.recurringFrequency,
      pdf_data: invoice.pdfData
    }).select().single();

    if (error) {
      secureError('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
      return null;
    }

    if (data) {
      // Add invoice log
      try {
        await supabase.from('invoice_logs').insert({
          invoice_id: data.id,
          invoice_number: sanitizeForDB(invoice.invoiceNumber),
          action: 'created',
          actor_id: userId,
          actor_name: sanitizeForDB(senderName),
          actor_type: 'sender',
          new_status: 'sent',
          amount: parseFloat(invoice.amount.replace(/[$,]/g, '')),
          metadata: {
            recipient_name: sanitizeForDB(invoice.businessName),
            recipient_id: invoice.recipientUserId
          }
        });
      } catch (logError) {
        secureError('Failed to create invoice log:', logError);
      }

      // Add status log
      try {
        await supabase.from('status_logs').insert({
          invoice_id: data.id,
          new_status: 'Sent',
          updated_by: 'System'
        });
      } catch (statusError) {
        secureError('Failed to create status log:', statusError);
      }

      const newInvoice = { 
        ...invoice, 
        id: data.id, 
        zyp_id: data.zyp_id,  // Include Zyp ID from database
        direction: 'sent', 
        type: 'Receivable' 
      };
      setInvoices(prev => [newInvoice, ...prev]);
      setStatusLogs(prev => ({
        ...prev,
        [invoice.invoiceNumber]: [{ status: 'Sent', date: new Date().toLocaleString(), updatedBy: 'System' }]
      }));

      return newInvoice;
    }
    return null;
  }, [userId, userData]);

  const updateInvoiceStatus = useCallback(async (invoiceNumber, newStatus) => {
    const invoice = invoices.find(i => i.invoiceNumber === invoiceNumber);
    if (!invoice) return;

    const oldStatus = invoice.status;
    const actorName = userData?.business_name || 
      `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'User';

    await supabase.from('invoices').update({
      status: newStatus.toLowerCase().replace(' ', '_'),
      updated_at: new Date().toISOString()
    }).eq('id', invoice.id);

    // Log to invoice_logs
    await supabase.from('invoice_logs').insert({
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      action: 'status_changed',
      actor_id: userId,
      actor_name: actorName,
      actor_type: invoice.direction === 'sent' ? 'sender' : 'recipient',
      old_status: oldStatus,
      new_status: newStatus,
      amount: parseFloat(invoice.amount?.replace(/[$,]/g, '') || 0)
    });

    // Legacy status_logs
    await supabase.from('status_logs').insert({
      invoice_id: invoice.id,
      new_status: newStatus,
      updated_by: actorName
    });

    setStatusLogs(prev => ({
      ...prev,
      [invoiceNumber]: [
        ...(prev[invoiceNumber] || []),
        { status: newStatus, date: new Date().toLocaleString(), updatedBy: actorName }
      ]
    }));

    // Update invoice in state
    setInvoices(prev => prev.map(inv => 
      inv.invoiceNumber === invoiceNumber ? { ...inv, status: newStatus } : inv
    ));
  }, [invoices, userId, userData]);

  return {
    invoices,
    setInvoices,
    statusLogs,
    setStatusLogs,
    loading,
    fetchInvoices,
    addInvoice,
    updateInvoiceStatus,
  };
}

export default useInvoices;
