import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  Settings,
  Power,
  UserPlus,
  Wrench,
  DollarSign,
  Shield,
  AlertTriangle,
  RefreshCw,
  Save,
  History,
  Clock,
  User
} from 'lucide-react';

function AdminControls({ logAction, adminRole }) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const fetchControls = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_controls')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setControls(data || []);
    } catch (err) {
      secureError('Failed to fetch system controls:', err);
    }
    setLoading(false);
  }, []);

  const fetchAuditLog = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*, admin_users(user_id)')
        .eq('target_type', 'system')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAuditLog(data || []);
    } catch (err) {
      secureError('Failed to fetch audit log:', err);
    }
  }, []);

  useEffect(() => {
    fetchControls();
    fetchAuditLog();
  }, [fetchControls, fetchAuditLog]);

  const updateControl = async (controlKey, newValue) => {
    if (!['super_admin', 'admin'].includes(adminRole)) {
      alert('You do not have permission to modify system controls');
      return;
    }

    setSaving(controlKey);
    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .single();

      const { error } = await supabase
        .from('system_controls')
        .update({ 
          control_value: JSON.stringify(newValue),
          updated_by: adminUser?.id,
          updated_at: new Date().toISOString()
        })
        .eq('control_key', controlKey);

      if (error) throw error;

      await logAction('update_system_control', 'system', controlKey, { 
        old_value: controls.find(c => c.control_key === controlKey)?.control_value,
        new_value: newValue 
      });

      // Create alert for critical changes
      if (['transfers_enabled', 'maintenance_mode'].includes(controlKey)) {
        await supabase.rpc('create_system_alert', {
          p_alert_type: 'warning',
          p_category: 'system',
          p_title: `System control updated: ${controlKey}`,
          p_message: `Changed to: ${newValue}`,
          p_target_type: 'system',
          p_target_id: controlKey
        });
      }

      fetchControls();
      fetchAuditLog();
    } catch (err) {
      secureError('Failed to update control:', err);
      alert('Failed to update control');
    }
    setSaving(null);
  };

  const getControlIcon = (key) => {
    switch (key) {
      case 'transfers_enabled': return Power;
      case 'signups_enabled': return UserPlus;
      case 'maintenance_mode': return Wrench;
      case 'max_transfer_amount': return DollarSign;
      default: return Settings;
    }
  };

  const getControlDescription = (key) => {
    const descriptions = {
      transfers_enabled: 'Master switch to enable/disable all transfers. Use in emergencies.',
      signups_enabled: 'Allow new user registrations.',
      maintenance_mode: 'Show maintenance page to all non-admin users.',
      max_transfer_amount: 'Maximum allowed single transfer amount (USD).'
    };
    return descriptions[key] || '';
  };

  const parseValue = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEdit = ['super_admin', 'admin'].includes(adminRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-red-400 font-medium">Caution: System Controls</h4>
          <p className="text-sm text-red-400/80 mt-1">
            Changes here affect all users immediately. Only modify these settings if you understand the impact.
          </p>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {controls.map((control) => {
          const Icon = getControlIcon(control.control_key);
          const value = parseValue(control.control_value);
          const isBoolean = typeof value === 'boolean' || value === 'true' || value === 'false';
          const boolValue = value === true || value === 'true';

          return (
            <div 
              key={control.id} 
              className={`bg-gray-800 rounded-xl p-6 border transition-colors ${
                control.control_key === 'transfers_enabled' && !boolValue
                  ? 'border-red-500/50'
                  : control.control_key === 'maintenance_mode' && boolValue
                  ? 'border-yellow-500/50'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    control.control_key === 'transfers_enabled' 
                      ? boolValue ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {control.control_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getControlDescription(control.control_key)}
                    </p>
                  </div>
                </div>
                {saving === control.control_key && (
                  <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                )}
              </div>

              {isBoolean ? (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${boolValue ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {boolValue ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => updateControl(control.control_key, !boolValue)}
                    disabled={!canEdit || saving === control.control_key}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      boolValue ? 'bg-emerald-500' : 'bg-gray-600'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      boolValue ? 'translate-x-8' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => {
                        const newControls = controls.map(c => 
                          c.control_key === control.control_key 
                            ? { ...c, control_value: e.target.value }
                            : c
                        );
                        setControls(newControls);
                      }}
                      disabled={!canEdit}
                      className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={() => updateControl(control.control_key, parseFloat(value))}
                    disabled={!canEdit || saving === control.control_key}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              )}

              {control.updated_at && (
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last updated: {formatTime(control.updated_at)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Audit Log Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-medium text-white">Change History</h3>
              <p className="text-xs text-gray-500">View recent system control changes</p>
            </div>
          </div>
          <span className="text-gray-400">{showAuditLog ? '▼' : '▶'}</span>
        </button>

        {showAuditLog && (
          <div className="border-t border-gray-700 p-4 max-h-80 overflow-y-auto">
            {auditLog.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No changes recorded</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        <span className="text-gray-400">{log.action}:</span>{' '}
                        {log.target_id}
                      </p>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="font-medium text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (confirm('This will disable ALL transfers. Are you sure?')) {
                updateControl('transfers_enabled', false);
              }
            }}
            disabled={!canEdit}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
          >
            Emergency: Disable All Transfers
          </button>
          <button
            onClick={() => {
              if (confirm('This will enable maintenance mode. Are you sure?')) {
                updateControl('maintenance_mode', true);
              }
            }}
            disabled={!canEdit}
            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 disabled:opacity-50 transition-colors"
          >
            Enable Maintenance Mode
          </button>
          <button
            onClick={() => {
              updateControl('transfers_enabled', true);
              updateControl('signups_enabled', true);
              updateControl('maintenance_mode', false);
            }}
            disabled={!canEdit}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
          >
            Restore Normal Operations
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminControls;
