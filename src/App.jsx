/**
 * App.jsx — Demo version
 *
 * Bypasses auth and renders a welcome page → Philippines portal with mock data.
 */

import React, { useState, Suspense, lazy } from 'react';
import { DashboardSkeleton } from './components/shared/LoadingSkeletons';
import { ToastProvider, OfflineIndicator, ErrorBoundary } from './components/shared/UIComponents';
import { ThemeProvider } from './contexts/ThemeContext';

import {
  MOCK_USER,
  MOCK_USER_DATA,
  MOCK_RECIPIENTS,
  MOCK_INVOICES,
  MOCK_STATUS_LOGS,
  MOCK_TRANSACTIONS,
  MOCK_CONTRACTS,
  createAddInvoice,
  createUpdateStatus,
  createUpdateProfile,
  createDeleteAccount,
  createAddContract,
  createUpdateContract,
  createDeleteContract,
} from './data/mockData';

const PhilippinesPortal = lazy(() => import('./components/philippines/PhilippinesPortal'));

const PageLoader = () => (
  <div className="flex-1 overflow-auto">
    <DashboardSkeleton />
  </div>
);

// ==================== WELCOME PAGE ====================
function DemoWelcomePage({ onStart }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center px-6 py-6 border-b border-gray-200 dark:border-gray-700">
        <img src="/zyp-logo.svg" alt="Zyp" className="h-10" />
      </header>

      {/* Center content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Zyp
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
              Experience the Zyp platform — a demo of our Philippines business portal for cross-border payments.
            </p>
          </div>

          <button
            onClick={onStart}
            className="px-8 py-4 bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-colors rounded-md"
          >
            Explore the Demo
          </button>

          <p className="mt-10 text-gray-400 dark:text-gray-500 text-sm">
            This is a demo with sample data. No real transactions will be made.
          </p>
        </div>
      </main>
    </div>
  );
}

// ==================== DEMO DASHBOARD ====================
function DemoDashboard() {
  const [recipients, setRecipients] = useState(() => JSON.parse(JSON.stringify(MOCK_RECIPIENTS)));
  const [invoices, setInvoices] = useState(() => JSON.parse(JSON.stringify(MOCK_INVOICES)));
  const [statusLogs, setStatusLogs] = useState(() => JSON.parse(JSON.stringify(MOCK_STATUS_LOGS)));
  const [transactions] = useState(() => JSON.parse(JSON.stringify(MOCK_TRANSACTIONS)));
  const [contracts, setContracts] = useState(() => JSON.parse(JSON.stringify(MOCK_CONTRACTS)));

  const addInvoice = createAddInvoice(setInvoices, setStatusLogs);
  const updateStatus = createUpdateStatus(setStatusLogs);
  const updateProfile = createUpdateProfile();
  const deleteAccount = createDeleteAccount();
  const addContract = createAddContract(setContracts);
  const updateContract = createUpdateContract(setContracts);
  const deleteContract = createDeleteContract(setContracts);

  return (
    <Suspense fallback={<PageLoader />}>
      <PhilippinesPortal
        user={MOCK_USER}
        userData={MOCK_USER_DATA}
        invoices={invoices}
        setInvoices={setInvoices}
        transactions={transactions}
        statusLogs={statusLogs}
        setStatusLogs={setStatusLogs}
        recipients={recipients}
        setRecipients={setRecipients}
        onAddInvoice={addInvoice}
        onUpdateStatus={updateStatus}
        onUpdateProfile={updateProfile}
        onDeleteAccount={deleteAccount}
        contracts={contracts}
        setContracts={setContracts}
        onAddContract={addContract}
        onUpdateContract={updateContract}
        onDeleteContract={deleteContract}
      />
    </Suspense>
  );
}

// ==================== MAIN APP ====================
function AppContent() {
  return <DemoDashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ThemeProvider>
          <OfflineIndicator />
          <AppContent />
        </ThemeProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
