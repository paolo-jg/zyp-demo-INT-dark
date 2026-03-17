/**
 * App.jsx - Main Application Entry Point
 * 
 * Refactored to use hooks for state management.
 * Reduced from 1470 lines to ~500 lines.
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Send, FileText, Users, Clock, LogOut, Lock, Eye, EyeOff, AlertTriangle, BarChart3, Wrench, Shield } from 'lucide-react';
import { supabase } from './supabaseClient';
import { DashboardSkeleton } from './components/shared/LoadingSkeletons';
import { ToastProvider, OfflineIndicator, ErrorBoundary } from './components/shared/UIComponents';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage } from './components/auth';

// Hooks
import { useSession, useSessionTimeout, useReauthentication } from './hooks/useAuth';
import { useUserData } from './hooks/useUserData';
import { useRecipients } from './hooks/useRecipients';
import { useInvoices } from './hooks/useInvoices';
import { useTransactions } from './hooks/useTransactions';
import { useSystemControls, useUserSuspensionCheck } from './hooks/useSystemControls';
import { AUTH_CONFIG } from './utils/authSecurity';

// Lazy loaded components
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const HomeView = lazy(() => import('./components/dashboard/HomeView'));
const TransferHistoryView = lazy(() => import('./components/dashboard/TransferHistoryView'));
const TransferView = lazy(() => import('./components/dashboard/TransferView'));
const ProfileSettings = lazy(() => import('./components/dashboard/ProfileSettings'));
const USAnalyticsView = lazy(() => import('./components/dashboard/USAnalyticsView'));
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow'));
const KYBVerificationView = lazy(() => import('./components/kyb/KYBVerificationView'));
const BankAccountsView = lazy(() => import('./components/banks/BankAccountsView'));
const PhilippinesPortal = lazy(() => import('./components/philippines/PhilippinesPortal'));
const InvoicesView = lazy(() => import('./components/invoices/InvoicesView'));
const ContactsView = lazy(() => import('./components/recipients/ContactsView'));

const PageLoader = () => (
  <div className="flex-1 overflow-auto">
    <DashboardSkeleton />
  </div>
);

// ==================== MAIN APP CONTENT ====================
function AppContent() {
  const { session, loading } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <ThemeProvider>
        <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
          <div className="hidden md:flex w-20 bg-gray-950 border-r border-gray-800 flex-col items-center py-6">
            <div className="w-12 h-12 bg-gray-800 rounded-xl mb-8 skeleton-shimmer"></div>
            <div className="flex-1 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-12 h-12 bg-gray-800 rounded-xl skeleton-shimmer"></div>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <DashboardSkeleton />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Authenticated - show dashboard
  if (session) {
    if (location.pathname === '/login' || location.pathname === '/signup') {
      navigate('/', { replace: true });
      return null;
    }

    // Admin route
    if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
      return (
        <ThemeProvider>
          <Suspense fallback={<DashboardSkeleton />}>
            <AdminDashboard 
              user={session.user} 
              onLogout={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }} 
            />
          </Suspense>
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider>
        <ZypDashboard user={session.user} />
      </ThemeProvider>
    );
  }

  // Not authenticated
  const path = location.pathname;
  
  if (path === '/signup') {
    return (
      <ThemeProvider>
        <AuthPage onBack={() => window.location.href = 'https://tryzyp.com'} mode="signup" />
      </ThemeProvider>
    );
  }

  if (path !== '/login' && path !== '/') {
    window.location.href = 'https://tryzyp.com';
    return null;
  }

  return (
    <ThemeProvider>
      <AuthPage onBack={() => window.location.href = 'https://tryzyp.com'} mode="login" />
    </ThemeProvider>
  );
}

// ==================== DASHBOARD ====================
function ZypDashboard({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  // System controls
  const { controls: systemControls, loading: controlsLoading } = useSystemControls();
  const { isSuspended, loading: suspensionLoading } = useUserSuspensionCheck(user?.id);

  // User data
  const {
    userData,
    userCountry,
    needsOnboarding,
    setNeedsOnboarding,
    isLoading,
    linkedBanks,
    setLinkedBanks,
    syncUserAndFetchData,
    updateUserProfile,
    deleteUserAccount,
    removeBankAccount,
    setPrimaryBank,
  } = useUserData(user?.id, user?.email);

  // Session management
  const {
    showSessionWarning,
    sessionTimeRemaining,
    extendSession,
    handleSessionTimeout,
  } = useSessionTimeout();

  // Re-authentication
  const {
    showReauthModal,
    reauthPin,
    setReauthPin,
    reauthError,
    reauthLoading,
    showPin,
    setShowPin,
    handleReauth,
    cancelReauth,
    requireReauth,
  } = useReauthentication(userData);

  // Data hooks
  const {
    recipients,
    setRecipients,
    fetchRecipients,
    addRecipient,
    updateRecipient,
    deleteRecipient,
  } = useRecipients(user?.id);

  const {
    invoices,
    setInvoices,
    statusLogs,
    setStatusLogs,
    fetchInvoices,
    addInvoice,
    updateInvoiceStatus,
  } = useInvoices(user?.id, userData);

  const {
    transactions,
    setTransactions,
    fetchTransactions,
    addTransaction,
  } = useTransactions(user?.id, userData);

  // Fetch data when user data is ready
  useEffect(() => {
    if (userData && user?.id) {
      fetchRecipients();
      fetchInvoices();
      fetchTransactions();
    }
  }, [userData, user?.id]);

  // Navigation
  const getActiveView = () => {
    const path = location.pathname.slice(1) || 'home';
    const validViews = ['home', 'transfer', 'invoices', 'recipients', 'analytics', 'settings', 'history', 'verification'];
    return validViews.includes(path) ? path : 'home';
  };
  const activeView = getActiveView();
  const setActiveView = (view) => navigate(`/${view === 'home' ? '' : view}`);

  // Pending invoice payment state
  const [pendingInvoicePayment, setPendingInvoicePayment] = useState(null);

  // Handle transfer completion
  const handleTransferComplete = async (txn, recipient) => {
    await addTransaction(txn, recipient);
  };

  // Loading state
  if (isLoading || controlsLoading || suspensionLoading) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
        <div className="hidden md:flex w-20 bg-gray-950 border-r border-gray-800 flex-col items-center py-6">
          <div className="w-12 h-12 bg-gray-800 rounded-xl mb-8 skeleton-shimmer"></div>
          <div className="flex-1 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-12 h-12 bg-gray-800 rounded-xl skeleton-shimmer"></div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Suspended
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Account Suspended</h1>
          <p className="text-gray-400 mb-6">
            Your account has been suspended. Contact support at support@tryzyp.com
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Maintenance mode
  if (systemControls.maintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Under Maintenance</h1>
          <p className="text-gray-400 mb-6">
            We're currently performing scheduled maintenance. Please check back shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Onboarding
  if (needsOnboarding) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingFlow
          user={user}
          onComplete={() => {
            setNeedsOnboarding(false);
            syncUserAndFetchData();
          }}
        />
      </Suspense>
    );
  }

  // Philippines users see the portal
  if (userCountry === 'Philippines') {
    return (
      <Suspense fallback={<PageLoader />}>
        <PhilippinesPortal
          user={user}
          userData={userData}
          invoices={invoices}
          setInvoices={setInvoices}
          transactions={transactions}
          statusLogs={statusLogs}
          setStatusLogs={setStatusLogs}
          recipients={recipients}
          onAddInvoice={addInvoice}
          onUpdateStatus={updateInvoiceStatus}
          onUpdateProfile={updateUserProfile}
          onDeleteAccount={deleteUserAccount}
        />
      </Suspense>
    );
  }

  // US Dashboard
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'transfer', icon: Send, label: 'Transfer' },
    { id: 'invoices', icon: FileText, label: 'Invoices' },
    { id: 'recipients', icon: Users, label: 'Recipients' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 bg-gray-950 border-r border-gray-800 flex-col items-center py-6">
        <div className="mb-8">
          <img src="/zyp-logo.svg" alt="Zyp" className="w-12 h-auto" />
        </div>

        <div className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                activeView === item.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <button
            onClick={() => setActiveView('settings')}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeView === 'settings'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-gray-950 border-b border-gray-800 p-4 flex items-center justify-between">
          <img src="/zyp-logo.svg" alt="Zyp" className="w-10 h-auto" />
          <h1 className="text-lg font-semibold capitalize">{activeView}</h1>
          <div className="w-10"></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          <Suspense fallback={<PageLoader />}>
            {activeView === 'home' && (
              <HomeView
                userData={userData}
                transactions={transactions}
                invoices={invoices}
                statusLogs={statusLogs}
                recipients={recipients}
                onNavigate={setActiveView}
              />
            )}
            {activeView === 'transfer' && (
              <TransferView
                supabase={supabase}
                user={user}
                recipients={recipients}
                onTransferComplete={handleTransferComplete}
                onNavigate={setActiveView}
                pendingInvoicePayment={pendingInvoicePayment}
                onClearPendingPayment={() => setPendingInvoicePayment(null)}
                onRequireReauth={requireReauth}
                systemControls={systemControls}
              />
            )}
            {activeView === 'invoices' && (
              <InvoicesView
                invoices={invoices}
                setInvoices={setInvoices}
                statusLogs={statusLogs}
                setStatusLogs={setStatusLogs}
                onAddInvoice={addInvoice}
                onUpdateStatus={updateInvoiceStatus}
                recipients={recipients}
                userData={userData}
                onPayInvoice={(invoice) => {
                  setPendingInvoicePayment(invoice);
                  setActiveView('transfer');
                }}
                onNavigate={setActiveView}
              />
            )}
            {activeView === 'recipients' && (
              <ContactsView
                type="recipients"
                contacts={recipients}
              />
            )}
            {activeView === 'analytics' && (
              <USAnalyticsView
                transactions={transactions}
                recipients={recipients}
                invoices={invoices}
              />
            )}
            {activeView === 'settings' && (
              <ProfileSettings
                user={user}
                userData={userData}
                onUpdateProfile={updateUserProfile}
                linkedBanks={linkedBanks}
                onRemoveBank={removeBankAccount}
                onSetPrimaryBank={setPrimaryBank}
                onDeleteAccount={deleteUserAccount}
                supabase={supabase}
              />
            )}
            {activeView === 'verification' && (
              <KYBVerificationView
                userData={userData}
                onVerificationComplete={() => {
                  syncUserAndFetchData();
                  setActiveView('settings');
                }}
                onNavigate={setActiveView}
              />
            )}
          </Suspense>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex justify-around items-center py-2 px-2 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 ${
              activeView === item.id ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-500 hover:text-red-400 transition-all flex-1"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>

      {/* Session Timeout Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Session Expiring</h2>
                <p className="text-gray-400 text-sm">You will be logged out due to inactivity</p>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-center">
              <span className="text-3xl font-bold text-yellow-400">{sessionTimeRemaining}</span>
              <span className="text-yellow-400 ml-2">seconds remaining</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSessionTimeout}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700"
              >
                Log Out Now
              </button>
              <button
                onClick={extendSession}
                className="flex-1 px-4 py-2 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-authentication Modal */}
      {showReauthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Confirm Your Identity</h2>
                <p className="text-gray-400 text-sm">This transfer requires additional verification</p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
              <p className="text-blue-400 text-sm">
                For your security, transfers over ${AUTH_CONFIG.HIGH_VALUE_THRESHOLD.toLocaleString()} require your transaction PIN.
              </p>
            </div>

            {reauthError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {reauthError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Enter your 4-digit PIN</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={reauthPin}
                  onChange={(e) => setReauthPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full pl-12 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-2xl tracking-widest"
                  onKeyDown={(e) => e.key === 'Enter' && reauthPin.length === 4 && handleReauth()}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelReauth}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReauth}
                disabled={reauthPin.length !== 4 || reauthLoading}
                className="flex-1 px-4 py-2 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reauthLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== APP WRAPPER ====================
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineIndicator />
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}
