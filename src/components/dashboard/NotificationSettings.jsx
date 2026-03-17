// Notification Settings Component (Email only)
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Shield, DollarSign, FileText, Send, AlertTriangle, Loader, Check } from 'lucide-react';
import { secureError } from '../../utils/secureLogging';

export function NotificationSettings({ supabase, userId }) {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Fetch preferences on mount
  useEffect(() => {
    if (userId) fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (createError) throw createError;
        setPreferences(newPrefs);
      }
    } catch (err) {
      secureError('Error fetching preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      secureError('Error updating preference:', err);
      setError('Failed to save preference');
      // Revert the change
      fetchPreferences();
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-emerald-1000' : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const PreferenceRow = ({ icon: Icon, label, description, preferenceKey }) => (
    <div className="flex items-start justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mt-0.5">
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
        </div>
      </div>
      <ToggleSwitch
        checked={preferences?.[preferenceKey] || false}
        onChange={(value) => updatePreference(preferenceKey, value)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-200 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchPreferences}
          className="mt-2 text-sm text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with save indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-1000/20 rounded-lg">
            <Bell className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold">Email Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose which emails you'd like to receive</p>
          </div>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      {/* Transfer Notifications */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-emerald-700" />
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">Transfers</h4>
        </div>
        
        <div className="space-y-0">
          <PreferenceRow
            icon={Check}
            label="Transfer Completed"
            description="When your transfer is successfully delivered"
            preferenceKey="email_transfer_completed"
          />
          <PreferenceRow
            icon={AlertTriangle}
            label="Transfer Failed"
            description="If a transfer fails or is rejected"
            preferenceKey="email_transfer_failed"
          />
        </div>
      </div>

      {/* Invoice & Payment Notifications */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-700" />
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">Invoices & Payments</h4>
        </div>
        
        <div className="space-y-0">
          <PreferenceRow
            icon={DollarSign}
            label="Invoice Paid"
            description="When one of your invoices is paid"
            preferenceKey="email_invoice_paid"
          />
          <PreferenceRow
            icon={DollarSign}
            label="Payment Received"
            description="When you receive a payment"
            preferenceKey="email_payment_received"
          />
        </div>
      </div>

      {/* Security Notifications */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-amber-700" />
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">Security & Alerts</h4>
        </div>
        
        <div className="space-y-0">
          <PreferenceRow
            icon={Shield}
            label="Security Alerts"
            description="Password changes, new device logins, etc."
            preferenceKey="email_security_alerts"
          />
          <PreferenceRow
            icon={AlertTriangle}
            label="Large Transfer Alerts"
            description={`Transfers over $${(preferences?.large_transfer_threshold || 10000).toLocaleString()}`}
            preferenceKey="email_large_transfer_alerts"
          />
        </div>

        {/* Large Transfer Threshold */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Alert threshold for large transfers
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {[1000, 5000, 10000, 25000, 50000].map(amount => (
              <button
                key={amount}
                onClick={() => updatePreference('large_transfer_threshold', amount)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  preferences?.large_transfer_threshold === amount
                    ? 'bg-emerald-1000 text-white font-medium'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
