import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeftRight,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

function AdminOverview({ stats, logAction }) {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // Recent transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*, users!transactions_user_id_fkey(email, first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTransactions(txns || []);

      // Recent alerts
      const { data: alerts } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentAlerts(alerts || []);

      // Weekly metrics
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(7);

      setWeeklyMetrics(metrics?.reverse() || []);

    } catch (err) {
      secureError('Failed to fetch overview data:', err);
    }
    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-emerald-400 bg-emerald-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'failed': return 'text-red-400 bg-red-400/20';
      case 'processing': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case 'critical': return 'text-red-400 bg-red-400/20 border-red-400/30';
      case 'error': return 'text-orange-400 bg-orange-400/20 border-orange-400/30';
      case 'warning': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      default: return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
    }
  };

  // Calculate week-over-week change
  const calculateChange = () => {
    if (weeklyMetrics.length < 2) return 0;
    const current = weeklyMetrics[weeklyMetrics.length - 1]?.total_volume_usd || 0;
    const previous = weeklyMetrics[weeklyMetrics.length - 2]?.total_volume_usd || 0;
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const weekChange = calculateChange();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Chart */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Weekly Volume</h3>
            <p className="text-sm text-gray-400">Last 7 days transaction volume</p>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            weekChange >= 0 ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'
          }`}>
            {weekChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(weekChange)}%</span>
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="flex items-end gap-2 h-40">
          {weeklyMetrics.map((day, i) => {
            const maxVolume = Math.max(...weeklyMetrics.map(d => d.total_volume_usd || 0));
            const height = maxVolume > 0 ? ((day.total_volume_usd || 0) / maxVolume * 100) : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-700 rounded-t-lg relative" style={{ height: '120px' }}>
                  <div 
                    className="absolute bottom-0 w-full bg-emerald-500 rounded-t-lg transition-all"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(day.metric_date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Weekly totals */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
          <div>
            <p className="text-sm text-gray-400">Total Volume</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(weeklyMetrics.reduce((sum, d) => sum + (d.total_volume_usd || 0), 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Transfers</p>
            <p className="text-xl font-bold text-white">
              {weeklyMetrics.reduce((sum, d) => sum + (d.total_transfers || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Fees Earned</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(weeklyMetrics.reduce((sum, d) => sum + (d.total_fees_usd || 0), 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">New Users</p>
            <p className="text-xl font-bold text-white">
              {weeklyMetrics.reduce((sum, d) => sum + (d.new_users || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <ArrowLeftRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent transactions</p>
            ) : (
              recentTransactions.slice(0, 5).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      txn.status === 'completed' ? 'bg-emerald-400' :
                      txn.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {txn.recipient_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {txn.users?.email || txn.user_id?.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(txn.amount_sent)}
                    </p>
                    <p className="text-xs text-gray-400">{formatTime(txn.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <p className="text-gray-400">No active alerts</p>
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-xl border ${getAlertTypeColor(alert.alert_type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs opacity-70 mt-1">{alert.message}</p>
                    </div>
                    <span className="text-xs opacity-70">{formatTime(alert.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-400 rounded-full" />
              <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <h3 className="text-lg font-semibold text-white">Live Activity Feed</h3>
          </div>
          <button 
            onClick={fetchOverviewData}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentTransactions.map((txn) => (
            <div key={txn.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
              <div className={`p-1.5 rounded-lg ${getStatusColor(txn.status)}`}>
                {txn.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                 txn.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <span className="text-sm text-white">
                  Transfer of <span className="font-medium">{formatCurrency(txn.amount_sent)}</span>
                  {' '}to {txn.recipient_name || 'recipient'}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(txn.status)}`}>
                {txn.status}
              </span>
              <span className="text-xs text-gray-500">{formatTime(txn.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminOverview;
