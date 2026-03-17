import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, Plus, X, Check, AlertCircle, Trash2, Edit2, 
  DollarSign, Calendar, Clock, Building, ToggleLeft, ToggleRight,
  ChevronRight, Shield, Play, Pause
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { executeTransfer } from '../../utils/cybrid';
import { secureLog, secureError } from '../../utils/secureLogging';
import { notifyAutopayPending, notifyAutopayExecuted, notifyAutopayFailed } from '../../utils/notifications';
import { StyledCheckbox } from '../shared/StyledInputs';

const RULE_TYPES = {
  all: { label: 'All Invoices', description: 'Auto-pay all invoices from this sender' },
  under_amount: { label: 'Under Amount', description: 'Auto-pay invoices under a specified amount' },
};

const TIMING_OPTIONS = {
  on_due_date: { label: 'On Due Date', description: 'Pay on the invoice due date' },
  days_before: { label: 'Days Before Due', description: 'Pay a set number of days before due date' },
  on_receipt: { label: 'On Receipt', description: 'Pay immediately when invoice is received' },
};

function AutoPayRules({ user, invoices = [], recipients = [], onNavigate, embedded = false }) {
  const [rules, setRules] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(null);

  // Get unique senders from payable invoices
  const uniqueSenders = React.useMemo(() => {
    const senders = new Map();
    invoices
      .filter(inv => inv.type === 'Payable')
      .forEach(inv => {
        const key = inv.senderName || inv.businessName;
        if (key && !senders.has(key)) {
          senders.set(key, {
            name: key,
            email: inv.senderEmail || '',
            invoiceCount: invoices.filter(i => 
              i.type === 'Payable' && (i.senderName === key || i.businessName === key)
            ).length
          });
        }
      });
    return Array.from(senders.values());
  }, [invoices]);

  // Form state
  const [formData, setFormData] = useState({
    sender_name: '',
    rule_type: 'all',
    amount_threshold: '',
    timing: 'on_due_date',
    days_before_due: 3,
    requires_approval: true,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  // Fetch autopay rules
  const fetchRules = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('autopay_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Handle missing table gracefully - just show empty state
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
          // Table doesn't exist yet - show empty state
          setRules([]);
          setPendingPayments([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setRules(data || []);

      // Fetch pending autopay approvals
      const { data: pending, error: pendingError } = await supabase
        .from('autopay_pending')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!pendingError) {
        setPendingPayments(pending || []);
      } else if (pendingError.code !== '42P01' && !pendingError.message?.includes('does not exist')) {
        // Only log if it's not a missing table error
        secureError('Error fetching pending payments:', pendingError);
      }
    } catch (err) {
      secureError('Error fetching autopay rules:', err);
      // Show empty state instead of error for table-not-found issues
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setRules([]);
        setPendingPayments([]);
      } else {
        setError('Failed to load autopay rules. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Reset form
  const resetForm = () => {
    setFormData({
      sender_name: '',
      rule_type: 'all',
      amount_threshold: '',
      timing: 'on_due_date',
      days_before_due: 3,
      requires_approval: true,
      is_active: true
    });
  };

  // Create rule
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.sender_name) {
      setError('Please select a sender');
      return;
    }

    if (formData.rule_type === 'under_amount' && (!formData.amount_threshold || parseFloat(formData.amount_threshold) <= 0)) {
      setError('Please enter a valid amount threshold');
      return;
    }

    // Check for duplicate rule
    const existingRule = rules.find(r => r.sender_name === formData.sender_name);
    if (existingRule) {
      setError('An autopay rule already exists for this sender');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('autopay_rules')
        .insert({
          user_id: user.id,
          sender_name: formData.sender_name,
          rule_type: formData.rule_type,
          amount_threshold: formData.rule_type === 'under_amount' ? parseFloat(formData.amount_threshold) : null,
          timing: formData.timing,
          days_before_due: formData.timing === 'days_before' ? parseInt(formData.days_before_due) : null,
          requires_approval: formData.requires_approval,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          throw new Error('Auto-pay tables not set up yet. Please run the database migration (007_autopay_rules.sql).');
        }
        throw error;
      }

      setRules([data, ...rules]);
      setShowCreateModal(false);
      resetForm();
      setSuccess('Autopay rule created successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      secureLog('Autopay rule created', { id: data.id, sender: formData.sender_name });
    } catch (err) {
      secureError('Error creating autopay rule:', err);
      // Provide user-friendly error message
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setError('Auto-pay feature requires database setup. Please run the migration file.');
      } else {
        setError(err.message || 'Failed to create autopay rule');
      }
    } finally {
      setSaving(false);
    }
  };

  // Update rule
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedRule) return;
    
    setError('');
    setSaving(true);

    try {
      const updates = {
        rule_type: formData.rule_type,
        amount_threshold: formData.rule_type === 'under_amount' ? parseFloat(formData.amount_threshold) : null,
        timing: formData.timing,
        days_before_due: formData.timing === 'days_before' ? parseInt(formData.days_before_due) : null,
        requires_approval: formData.requires_approval,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('autopay_rules')
        .update(updates)
        .eq('id', selectedRule.id);

      if (error) throw error;

      setRules(rules.map(r => r.id === selectedRule.id ? { ...r, ...updates } : r));
      setShowEditModal(false);
      setSelectedRule(null);
      resetForm();
      setSuccess('Autopay rule updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error updating autopay rule:', err);
      setError(err.message || 'Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  // Toggle rule active/inactive
  const handleToggleActive = async (rule) => {
    try {
      const newStatus = !rule.is_active;
      
      const { error } = await supabase
        .from('autopay_rules')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', rule.id);

      if (error) throw error;

      setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: newStatus } : r));
      setSuccess(newStatus ? 'Autopay rule activated' : 'Autopay rule paused');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error toggling autopay rule:', err);
      setError('Failed to update rule');
    }
  };

  // Delete rule
  const handleDelete = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this autopay rule?')) return;

    try {
      const { error } = await supabase
        .from('autopay_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.filter(r => r.id !== ruleId));
      setSuccess('Autopay rule deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error deleting autopay rule:', err);
      setError('Failed to delete rule');
    }
  };

  // Approve and execute pending payment
  const handleApprovePending = async (pending) => {
    setProcessing(pending.id);
    setError('');

    try {
      // Find recipient data for this sender
      const recipient = recipients.find(r => 
        r.name === pending.sender_name || 
        r.company === pending.sender_name ||
        r.email === pending.sender_email
      );

      if (!recipient) {
        throw new Error('Recipient not found. Please add this sender to your recipients first.');
      }

      // Execute transfer via Cybrid
      const result = await executeTransfer(supabase, pending.amount, recipient);

      if (!result.success) {
        // Send failure notification
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await notifyAutopayFailed(session.access_token, user.id, {
            senderName: pending.sender_name,
            amount: pending.amount,
            reason: result.error || 'Transfer failed'
          });
        }
        throw new Error(result.error || 'Transfer failed');
      }

      // Update pending status
      await supabase
        .from('autopay_pending')
        .update({
          status: 'completed',
          executed_at: new Date().toISOString(),
          cybrid_transfer_guid: result.transfer_guid
        })
        .eq('id', pending.id);

      // Update invoice status if linked
      if (pending.invoice_id) {
        await supabase
          .from('invoices')
          .update({ status: 'fully_paid' })
          .eq('id', pending.invoice_id);
      }

      // Send success notification
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await notifyAutopayExecuted(session.access_token, user.id, {
          senderName: pending.sender_name,
          amount: pending.amount,
          invoiceNumber: pending.invoice_number || 'N/A'
        });
      }

      setPendingPayments(pendingPayments.filter(p => p.id !== pending.id));
      setSuccess('Payment executed successfully');
      setTimeout(() => setSuccess(''), 3000);

      secureLog('Autopay executed', { pending_id: pending.id, amount: pending.amount });
    } catch (err) {
      secureError('Error executing autopay:', err);
      setError(err.message || 'Failed to execute payment');
    } finally {
      setProcessing(null);
    }
  };

  // Reject pending payment
  const handleRejectPending = async (pendingId) => {
    try {
      await supabase
        .from('autopay_pending')
        .update({ status: 'rejected' })
        .eq('id', pendingId);

      setPendingPayments(pendingPayments.filter(p => p.id !== pendingId));
      setSuccess('Payment rejected');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error rejecting pending payment:', err);
    }
  };

  // Edit rule
  const openEditModal = (rule) => {
    setSelectedRule(rule);
    setFormData({
      sender_name: rule.sender_name,
      rule_type: rule.rule_type,
      amount_threshold: rule.amount_threshold?.toString() || '',
      timing: rule.timing,
      days_before_due: rule.days_before_due || 3,
      requires_approval: rule.requires_approval,
      is_active: rule.is_active
    });
    setShowEditModal(true);
  };

  // Get rule description
  const getRuleDescription = (rule) => {
    let desc = RULE_TYPES[rule.rule_type]?.label || 'All Invoices';
    if (rule.rule_type === 'under_amount' && rule.amount_threshold) {
      desc = `Under $${rule.amount_threshold.toLocaleString()}`;
    }
    
    let timing = TIMING_OPTIONS[rule.timing]?.label || 'On Due Date';
    if (rule.timing === 'days_before' && rule.days_before_due) {
      timing = `${rule.days_before_due} days before due`;
    }
    
    return { desc, timing };
  };

  if (loading) {
    return (
      <div className={embedded ? '' : 'p-4 md:p-8'}>
        <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-32 bg-gray-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'p-4 md:p-8'}>
      <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Auto-Pay Rules</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Automatically pay invoices from specific senders
            </p>
          </div>
          
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            disabled={uniqueSenders.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>New Rule</span>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Pending Approvals */}
        {pendingPayments.length > 0 && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-yellow-500/30 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h2 className="font-semibold text-yellow-400">Pending Approvals ({pendingPayments.length})</h2>
            </div>
            <div className="divide-y divide-yellow-500/20">
              {pendingPayments.map((pending) => (
                <div key={pending.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{pending.sender_name}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Invoice: {pending.invoice?.invoice_number || 'N/A'} • Due: {pending.invoice?.due_date ? new Date(pending.invoice.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${pending.amount?.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectPending(pending.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleApprovePending(pending)}
                      disabled={processing === pending.id}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                    >
                      {processing === pending.id ? (
                        <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Senders Message */}
        {uniqueSenders.length === 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center mb-6">
            <Building className="w-12 h-12 mx-auto mb-4 text-gray-500 dark:text-gray-400 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Payable Invoices Yet</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Once you receive invoices from other businesses, you can set up autopay rules for them here.
            </p>
          </div>
        )}

        {/* Rules List */}
        {rules.length === 0 && uniqueSenders.length > 0 ? (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-gray-500 dark:text-gray-400 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Autopay Rules</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Set up automatic payments for invoices from your regular vendors
            </p>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Rule
            </button>
          </div>
        ) : rules.length > 0 && (
          <div className="space-y-4">
            {rules.map((rule) => {
              const { desc, timing } = getRuleDescription(rule);
              return (
                <div
                  key={rule.id}
                  className={`bg-gray-800 rounded-2xl border p-4 transition-colors ${
                    rule.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        rule.is_active ? 'bg-emerald-500/20' : 'bg-gray-700'
                      }`}>
                        <Building className={`w-6 h-6 ${rule.is_active ? 'text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{rule.sender_name}</h3>
                          {!rule.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 dark:text-gray-600 rounded-full">Paused</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          {desc} • {timing}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {rule.requires_approval && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Requires approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.is_active 
                            ? 'text-emerald-400 hover:bg-emerald-500/20' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-700'
                        }`}
                        title={rule.is_active ? 'Pause rule' : 'Activate rule'}
                      >
                        {rule.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => openEditModal(rule)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit rule"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 bg-gray-800/50 rounded-2xl border border-gray-700 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            How Auto-Pay Works
          </h3>
          <ul className="text-sm text-gray-400 dark:text-gray-500 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">1.</span>
              Create a rule for a specific sender (company you receive invoices from)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">2.</span>
              Set conditions: pay all invoices, or only those under a certain amount
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">3.</span>
              Choose timing: on due date, days before, or immediately on receipt
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">4.</span>
              Enable "Requires approval" to review each payment before it's sent
            </li>
          </ul>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center sm:p-4 z-50">
            <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl border border-gray-700 w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                <h2 className="text-base sm:text-lg font-semibold">Create Auto-Pay Rule</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Sender Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Sender (Company)
                  </label>
                  <select
                    value={formData.sender_name}
                    onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select a sender</option>
                    {uniqueSenders
                      .filter(s => !rules.find(r => r.sender_name === s.name))
                      .map((sender) => (
                        <option key={sender.name} value={sender.name}>
                          {sender.name} ({sender.invoiceCount} invoice{sender.invoiceCount !== 1 ? 's' : ''})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Rule Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Pay Automatically
                  </label>
                  <div className="space-y-2">
                    {Object.entries(RULE_TYPES).map(([key, info]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          formData.rule_type === key
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rule_type"
                          value={key}
                          checked={formData.rule_type === key}
                          onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{info.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{info.description}</p>
                        </div>
                        {formData.rule_type === key && <Check className="w-5 h-5 text-emerald-400" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amount Threshold */}
                {formData.rule_type === 'under_amount' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Maximum Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="text" inputMode="decimal"
                        
                        
                        value={formData.amount_threshold}
                        onChange={(e) => setFormData({ ...formData, amount_threshold: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    When to Pay
                  </label>
                  <div className="space-y-2">
                    {Object.entries(TIMING_OPTIONS).map(([key, info]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          formData.timing === key
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="timing"
                          value={key}
                          checked={formData.timing === key}
                          onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{info.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{info.description}</p>
                        </div>
                        {formData.timing === key && <Check className="w-5 h-5 text-emerald-400" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Days Before */}
                {formData.timing === 'days_before' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Days Before Due Date
                    </label>
                    <select
                      value={formData.days_before_due}
                      onChange={(e) => setFormData({ ...formData, days_before_due: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {[1, 2, 3, 5, 7, 10, 14].map((days) => (
                        <option key={days} value={days}>{days} day{days !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Requires Approval */}
                <label className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl cursor-pointer">
                  <StyledCheckbox
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  />
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Require approval before paying
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Payments will appear in "Pending Approvals" for your review
                    </p>
                  </div>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving || !formData.sender_name}
                  className="w-full py-3 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Create Rule
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedRule && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center sm:p-4 z-50">
            <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl border border-gray-700 w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                <h2 className="text-base sm:text-lg font-semibold">Edit Auto-Pay Rule</h2>
                <button
                  onClick={() => { setShowEditModal(false); setSelectedRule(null); resetForm(); }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Sender (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Sender (Company)
                  </label>
                  <div className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-gray-300 dark:text-gray-600">
                    {selectedRule.sender_name}
                  </div>
                </div>

                {/* Rule Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Pay Automatically
                  </label>
                  <div className="space-y-2">
                    {Object.entries(RULE_TYPES).map(([key, info]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          formData.rule_type === key
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rule_type"
                          value={key}
                          checked={formData.rule_type === key}
                          onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{info.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{info.description}</p>
                        </div>
                        {formData.rule_type === key && <Check className="w-5 h-5 text-emerald-400" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amount Threshold */}
                {formData.rule_type === 'under_amount' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Maximum Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="text" inputMode="decimal"
                        
                        
                        value={formData.amount_threshold}
                        onChange={(e) => setFormData({ ...formData, amount_threshold: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    When to Pay
                  </label>
                  <div className="space-y-2">
                    {Object.entries(TIMING_OPTIONS).map(([key, info]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          formData.timing === key
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="timing"
                          value={key}
                          checked={formData.timing === key}
                          onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{info.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{info.description}</p>
                        </div>
                        {formData.timing === key && <Check className="w-5 h-5 text-emerald-400" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Days Before */}
                {formData.timing === 'days_before' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Days Before Due Date
                    </label>
                    <select
                      value={formData.days_before_due}
                      onChange={(e) => setFormData({ ...formData, days_before_due: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {[1, 2, 3, 5, 7, 10, 14].map((days) => (
                        <option key={days} value={days}>{days} day{days !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Requires Approval */}
                <label className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl cursor-pointer">
                  <StyledCheckbox
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  />
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Require approval before paying
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Payments will appear in "Pending Approvals" for your review
                    </p>
                  </div>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoPayRules;
