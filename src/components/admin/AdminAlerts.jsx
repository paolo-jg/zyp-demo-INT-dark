import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  Bell,
  Filter
} from 'lucide-react';

function AdminAlerts({ logAction, onRefresh }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAlerts(data || []);
    } catch (err) {
      secureError('Failed to fetch alerts:', err);
    }
    setLoading(false);
  }, [filter, categoryFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .single();

      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_by: adminUser?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      await logAction('acknowledge_alert', 'alert', alertId);
      fetchAlerts();
      onRefresh?.();
    } catch (err) {
      secureError('Failed to acknowledge alert:', err);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .single();

      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          status: 'resolved',
          resolved_by: adminUser?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      await logAction('resolve_alert', 'alert', alertId);
      fetchAlerts();
      onRefresh?.();
    } catch (err) {
      secureError('Failed to resolve alert:', err);
    }
  };

  const handleDismiss = async (alertId) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({ status: 'dismissed' })
        .eq('id', alertId);

      if (error) throw error;

      await logAction('dismiss_alert', 'alert', alertId);
      fetchAlerts();
      onRefresh?.();
    } catch (err) {
      secureError('Failed to dismiss alert:', err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <XCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'error': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      transfer: 'Transfer',
      kyc: 'KYC/Verification',
      system: 'System',
      security: 'Security',
      reconciliation: 'Reconciliation'
    };
    return labels[category] || category;
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const criticalCount = alerts.filter(a => a.alert_type === 'critical' && a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Bell className="w-4 h-4" />
            Active Alerts
          </div>
          <p className={`text-2xl font-bold ${activeCount > 0 ? 'text-yellow-400' : 'text-white'}`}>
            {activeCount}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <XCircle className="w-4 h-4" />
            Critical
          </div>
          <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-white'}`}>
            {criticalCount}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Eye className="w-4 h-4" />
            Acknowledged
          </div>
          <p className="text-2xl font-bold text-white">
            {alerts.filter(a => a.status === 'acknowledged').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <CheckCircle className="w-4 h-4" />
            Resolved Today
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {alerts.filter(a => {
              if (a.status !== 'resolved') return false;
              const resolved = new Date(a.resolved_at);
              const today = new Date();
              return resolved.toDateString() === today.toDateString();
            }).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-1">
          {['active', 'acknowledged', 'resolved', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Categories</option>
          <option value="transfer">Transfer</option>
          <option value="kyc">KYC/Verification</option>
          <option value="system">System</option>
          <option value="security">Security</option>
          <option value="reconciliation">Reconciliation</option>
        </select>

        <button
          onClick={fetchAlerts}
          className="p-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors ml-auto"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-2xl border border-gray-700">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-gray-400">No alerts to display</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border ${getAlertStyle(alert.alert_type)} ${
                alert.status !== 'active' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.alert_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <span className="px-2 py-0.5 bg-gray-700/50 text-xs rounded-full text-gray-300">
                      {getCategoryLabel(alert.category)}
                    </span>
                    {alert.status !== 'active' && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        alert.status === 'resolved' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {alert.status}
                      </span>
                    )}
                  </div>
                  {alert.message && (
                    <p className="text-sm opacity-80 mb-2">{alert.message}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs opacity-60">
                    <span>{formatTime(alert.created_at)}</span>
                    {alert.target_type && (
                      <span>{alert.target_type}: {alert.target_id?.slice(0, 8)}...</span>
                    )}
                  </div>
                </div>
                {alert.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Acknowledge"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors text-emerald-400"
                      title="Resolve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminAlerts;
