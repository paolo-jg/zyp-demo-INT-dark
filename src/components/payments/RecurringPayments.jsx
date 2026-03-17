import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, Play, Pause, Trash2, Plus, X, Check, 
  AlertCircle, RefreshCw, ChevronRight, DollarSign, User,
  Edit2, MoreVertical
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { secureLog, secureError } from '../../utils/secureLogging';
import { StyledCheckbox } from '../shared/StyledInputs';

const FREQUENCIES = {
  weekly: { label: 'Weekly', description: 'Every week on the same day' },
  biweekly: { label: 'Bi-weekly', description: 'Every two weeks' },
  monthly: { label: 'Monthly', description: 'Same day each month' }
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

function RecurringPayments({ user, recipients = [], onNavigate, embedded = false }) {
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    recipient_id: '',
    amount: '',
    frequency: 'monthly',
    day_of_week: 1, // Monday
    day_of_month: 1,
    description: '',
    requires_approval: false
  });
  const [saving, setSaving] = useState(false);

  // Fetch recurring payments
  const fetchRecurringPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('recurring_payments')
        .select(`
          *,
          recipient:recipients(id, name, email, bank_name, account_number)
        `)
        .eq('user_id', user.id)
        .is('cancelled_at', null)
        .order('next_payment_date', { ascending: true });

      if (error) throw error;
      setRecurringPayments(data || []);
    } catch (err) {
      secureError('Error fetching recurring payments:', err);
      setError('Failed to load recurring payments');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchRecurringPayments();
  }, [fetchRecurringPayments]);

  // Calculate next payment date
  const calculateNextDate = (frequency, dayOfWeek, dayOfMonth) => {
    const today = new Date();
    let nextDate = new Date();

    if (frequency === 'weekly' || frequency === 'biweekly') {
      const daysUntilTarget = (dayOfWeek - today.getDay() + 7) % 7 || 7;
      nextDate.setDate(today.getDate() + daysUntilTarget);
      if (frequency === 'biweekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      }
    } else if (frequency === 'monthly') {
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dayOfMonth, 28));
      if (nextDate <= today) {
        nextDate = new Date(today.getFullYear(), today.getMonth() + 2, Math.min(dayOfMonth, 28));
      }
    }

    return nextDate.toISOString().split('T')[0];
  };

  // Create recurring payment
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.recipient_id) {
      setError('Please select a recipient');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);

    try {
      const nextDate = calculateNextDate(
        formData.frequency,
        formData.day_of_week,
        formData.day_of_month
      );

      const { data, error } = await supabase
        .from('recurring_payments')
        .insert({
          user_id: user.id,
          recipient_id: formData.recipient_id,
          amount: amount,
          frequency: formData.frequency,
          day_of_week: formData.frequency !== 'monthly' ? formData.day_of_week : null,
          day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : null,
          next_payment_date: nextDate,
          description: formData.description || null,
          requires_approval: formData.requires_approval,
          is_active: true
        })
        .select(`
          *,
          recipient:recipients(id, name, email, bank_name, account_number)
        `)
        .single();

      if (error) throw error;

      setRecurringPayments([...recurringPayments, data]);
      setShowCreateModal(false);
      setFormData({
        recipient_id: '',
        amount: '',
        frequency: 'monthly',
        day_of_week: 1,
        day_of_month: 1,
        description: '',
        requires_approval: false
      });
      setSuccess('Recurring payment created successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      secureLog('Recurring payment created', { id: data.id, amount, frequency: formData.frequency });
    } catch (err) {
      secureError('Error creating recurring payment:', err);
      setError(err.message || 'Failed to create recurring payment');
    } finally {
      setSaving(false);
    }
  };

  // Toggle pause/resume
  const handleTogglePause = async (payment) => {
    try {
      const newStatus = !payment.is_active;
      const updates = {
        is_active: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus) {
        // Resuming - recalculate next payment date
        updates.paused_at = null;
        updates.next_payment_date = calculateNextDate(
          payment.frequency,
          payment.day_of_week,
          payment.day_of_month
        );
      } else {
        updates.paused_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('recurring_payments')
        .update(updates)
        .eq('id', payment.id);

      if (error) throw error;

      setRecurringPayments(recurringPayments.map(p => 
        p.id === payment.id ? { ...p, ...updates } : p
      ));

      setSuccess(newStatus ? 'Payment resumed' : 'Payment paused');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error toggling payment:', err);
      setError('Failed to update payment status');
    }
  };

  // Delete recurring payment
  const handleDelete = async (paymentId) => {
    if (!confirm('Are you sure you want to cancel this recurring payment? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('recurring_payments')
        .update({ 
          cancelled_at: new Date().toISOString(),
          is_active: false 
        })
        .eq('id', paymentId);

      if (error) throw error;

      setRecurringPayments(recurringPayments.filter(p => p.id !== paymentId));
      setSuccess('Recurring payment cancelled');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error deleting payment:', err);
      setError('Failed to cancel payment');
    }
  };

  // Format next payment date
  const formatNextDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Get frequency label
  const getFrequencyLabel = (payment) => {
    if (payment.frequency === 'weekly') {
      return `Every ${DAYS_OF_WEEK.find(d => d.value === payment.day_of_week)?.label || 'week'}`;
    } else if (payment.frequency === 'biweekly') {
      return `Bi-weekly on ${DAYS_OF_WEEK.find(d => d.value === payment.day_of_week)?.label || 'day'}`;
    } else {
      return `Monthly on the ${payment.day_of_month}${getOrdinalSuffix(payment.day_of_month)}`;
    }
  };

  const getOrdinalSuffix = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  if (loading) {
    return (
      <div className={embedded ? '' : 'p-4 md:p-8'}>
        <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-32 bg-gray-800 rounded-2xl"></div>
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
            <h1 className="text-xl md:text-2xl font-bold">Recurring Payments</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Automate your regular payments
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Schedule</span>
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

        {/* Recurring Payments List */}
        {recurringPayments.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 md:p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-500 dark:text-gray-400 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No recurring payments</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Set up automatic payments to your recipients on a schedule
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringPayments.map((payment) => (
              <div
                key={payment.id}
                className={`bg-gray-800 rounded-2xl border transition-colors ${
                  payment.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
                }`}
              >
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Recipient & Amount */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        payment.is_active ? 'bg-emerald-500/20' : 'bg-gray-700'
                      }`}>
                        <DollarSign className={`w-6 h-6 ${payment.is_active ? 'text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg truncate">
                            ${payment.amount.toLocaleString()}
                          </p>
                          {!payment.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                              Paused
                            </span>
                          )}
                          {payment.requires_approval && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                              Requires Approval
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 truncate">
                          To: {payment.recipient?.name || 'Unknown recipient'}
                        </p>
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-6">
                      <div className="text-sm">
                        <p className="text-gray-500 dark:text-gray-400">Schedule</p>
                        <p className="font-medium">{getFrequencyLabel(payment)}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-500 dark:text-gray-400">Next Payment</p>
                        <p className={`font-medium ${payment.is_active ? 'text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {payment.is_active ? formatNextDate(payment.next_payment_date) : 'Paused'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePause(payment)}
                        className={`p-2 rounded-lg transition-colors ${
                          payment.is_active 
                            ? 'text-yellow-400 hover:bg-yellow-500/10' 
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={payment.is_active ? 'Pause' : 'Resume'}
                      >
                        {payment.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  {payment.total_payments_made > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Total Sent:</span>
                        <span className="ml-2 font-medium">${payment.total_amount_sent?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Payments Made:</span>
                        <span className="ml-2 font-medium">{payment.total_payments_made}</span>
                      </div>
                      {payment.last_payment_date && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Payment:</span>
                          <span className="ml-2 font-medium">
                            {new Date(payment.last_payment_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                <h2 className="text-lg font-semibold">Create Recurring Payment</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                {/* Recipient */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Recipient
                  </label>
                  {recipients.length === 0 ? (
                    <div className="p-4 bg-gray-700/50 rounded-xl text-center">
                      <p className="text-gray-400 dark:text-gray-500 text-sm mb-2">No recipients yet</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          onNavigate?.('recipients');
                        }}
                        className="text-emerald-400 text-sm hover:underline"
                      >
                        Add a recipient first →
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.recipient_id}
                      onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select recipient</option>
                      {recipients.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} - {r.bank_name || r.bankName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="text" inputMode="decimal"
                      step="0.01"
                      min="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Frequency
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(FREQUENCIES).map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, frequency: key })}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          formData.frequency === key
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <p className="font-medium text-sm">{info.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Selection */}
                {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Day of Week
                    </label>
                    <select
                      value={formData.day_of_week}
                      onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Day of Month
                    </label>
                    <select
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}{getOrdinalSuffix(day)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Limited to 28 to work across all months
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Monthly retainer payment"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Requires Approval */}
                <label className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl cursor-pointer">
                  <StyledCheckbox
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  />
                  <div>
                    <p className="font-medium">Require approval before sending</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You'll receive a notification to approve each payment
                    </p>
                  </div>
                </label>

                {/* Preview */}
                {formData.recipient_id && formData.amount && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-sm text-emerald-400">
                      First payment of <strong>${parseFloat(formData.amount).toLocaleString()}</strong> to{' '}
                      <strong>{recipients.find(r => r.id === formData.recipient_id)?.name}</strong> will be on{' '}
                      <strong>
                        {new Date(calculateNextDate(formData.frequency, formData.day_of_week, formData.day_of_month))
                          .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </strong>
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving || !formData.recipient_id || !formData.amount}
                  className="w-full py-3 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      Create Schedule
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

export default RecurringPayments;
