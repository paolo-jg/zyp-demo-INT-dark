import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  AlertTriangle,
  Settings,
  FileCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserPlus,
  Activity,
  RefreshCw,
  Shield,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
  Play,
  Eye,
  Search,
  Filter,
  Download,
  MoreVertical
} from 'lucide-react';

// Sub-components
import AdminOverview from './AdminOverview';
import AdminTransactions from './AdminTransactions';
import AdminUsers from './AdminUsers';
import AdminAlerts from './AdminAlerts';
import AdminReconciliation from './AdminReconciliation';
import AdminControls from './AdminControls';

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayVolume: 0,
    todayTransfers: 0,
    pendingReview: 0,
    activeAlerts: 0,
    failedTransfers: 0,
    activeUsers: 0
  });

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('role, permissions')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        setAdminRole(data.role);
        setLoading(false);
      } catch (err) {
        secureError('Admin check failed:', err);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user.id]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's transactions
      const { data: todayTxns } = await supabase
        .from('transactions')
        .select('amount_sent, status')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      // Get pending reviews
      const { data: pending } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'pending_review');

      // Get active alerts
      const { data: alerts } = await supabase
        .from('admin_alerts')
        .select('id')
        .eq('status', 'active');

      // Get failed transfers today
      const { data: failed } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'failed')
        .gte('created_at', `${today}T00:00:00`);

      // Get active users (logged in last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id')
        .gte('last_login', yesterday);

      setStats({
        todayVolume: todayTxns?.reduce((sum, t) => sum + (parseFloat(t.amount_sent) || 0), 0) || 0,
        todayTransfers: todayTxns?.length || 0,
        pendingReview: pending?.length || 0,
        activeAlerts: alerts?.length || 0,
        failedTransfers: failed?.length || 0,
        activeUsers: activeUsers?.length || 0
      });
    } catch (err) {
      secureError('Failed to fetch admin stats:', err);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      const interval = setInterval(fetchStats, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchStats]);

  // Log admin action
  const logAction = async (action, targetType = null, targetId = null, details = null) => {
    try {
      await supabase.rpc('log_admin_action', {
        p_action: action,
        p_target_type: targetType,
        p_target_id: targetId,
        p_details: details
      });
    } catch (err) {
      secureError('Failed to log admin action:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have admin privileges to access this dashboard.</p>
          <button
            onClick={onLogout}
            className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: stats.activeAlerts },
    { id: 'reconciliation', label: 'Reconciliation', icon: FileCheck },
    { id: 'controls', label: 'System Controls', icon: Settings, adminOnly: true }
  ];

  const canAccess = (tab) => {
    if (tab.adminOnly && !['super_admin', 'admin'].includes(adminRole)) {
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Zyp Admin</h1>
              <p className="text-xs text-gray-400 capitalize">{adminRole?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            if (!canAccess(tab)) return null;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header Stats */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Dashboard Overview</h2>
            <button
              onClick={fetchStats}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <DollarSign className="w-3 h-3" />
                Today's Volume
              </div>
              <p className="text-lg font-bold text-white">
                ${stats.todayVolume.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <ArrowLeftRight className="w-3 h-3" />
                Transfers
              </div>
              <p className="text-lg font-bold text-white">{stats.todayTransfers}</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Clock className="w-3 h-3" />
                Pending Review
              </div>
              <p className={`text-lg font-bold ${stats.pendingReview > 0 ? 'text-yellow-400' : 'text-white'}`}>
                {stats.pendingReview}
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <AlertTriangle className="w-3 h-3" />
                Active Alerts
              </div>
              <p className={`text-lg font-bold ${stats.activeAlerts > 0 ? 'text-red-400' : 'text-white'}`}>
                {stats.activeAlerts}
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <XCircle className="w-3 h-3" />
                Failed Today
              </div>
              <p className={`text-lg font-bold ${stats.failedTransfers > 0 ? 'text-red-400' : 'text-white'}`}>
                {stats.failedTransfers}
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Activity className="w-3 h-3" />
                Active Users
              </div>
              <p className="text-lg font-bold text-emerald-400">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <AdminOverview stats={stats} logAction={logAction} />
          )}
          {activeTab === 'transactions' && (
            <AdminTransactions logAction={logAction} adminRole={adminRole} />
          )}
          {activeTab === 'users' && (
            <AdminUsers logAction={logAction} adminRole={adminRole} />
          )}
          {activeTab === 'alerts' && (
            <AdminAlerts logAction={logAction} onRefresh={fetchStats} />
          )}
          {activeTab === 'reconciliation' && (
            <AdminReconciliation logAction={logAction} adminRole={adminRole} />
          )}
          {activeTab === 'controls' && (
            <AdminControls logAction={logAction} adminRole={adminRole} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
