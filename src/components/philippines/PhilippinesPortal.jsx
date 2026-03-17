import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  FileSignature,
  Settings,
  LogOut,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Calendar,
  Users,
  Upload,
  Building2,
  Zap,
  ChevronLeft,
  Hammer,
  Home,
  TrendingDown,
  BarChart3,
  Plus,
  Menu,
  X as XIcon
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import PhilippinesDashboard from './PhilippinesDashboard';
import ProfileSettings from '../dashboard/ProfileSettings';
import ClientsView from '../recipients/ClientsView';
import ContractsView from './ContractsView';
import EarlyPayView from './EarlyPayView';

function PhilippinesPortal({ 
  user, 
  userData, 
  invoices, 
  setInvoices,
  transactions, 
  statusLogs,
  setStatusLogs,
  recipients,
  setRecipients,
  onAddInvoice,
  onUpdateStatus,
  onUpdateProfile,
  onDeleteAccount,
  contracts,
  setContracts,
  onAddContract,
  onUpdateContract,
  onDeleteContract
}) {
  const [activeModule, setActiveModule] = useState('overview');
  const [paymentSubView, setPaymentSubView] = useState('payments');
  const [contractSubView, setContractSubView] = useState('manage');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const fileInputRef = useRef(null);

  // Collapsed by default, expand on hover — but stay open in drill-down views or mobile drawer
  const isCollapsed = !mobileMenuOpen && activeModule !== 'payments' && activeModule !== 'contracts' && !sidebarHovered;

  // Suppress initial sidebar animation
  useEffect(() => {
    requestAnimationFrame(() => setHasMounted(true));
  }, []);

  // Close mobile menu on module navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeModule]);

  // Close mobile menu on resize above md breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear company logo on fresh load (reset demo state)
  useEffect(() => {
    localStorage.removeItem(`company_logo_${user?.id}`);
  }, [user?.id]);

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setCompanyLogo(base64);
      localStorage.setItem(`company_logo_${user?.id}`, base64);
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  };


  // Calculate stats from actual data
  // Payments received: sum of completed transactions
  const totalReceived = (transactions || [])
    .filter(t => t?.status === 'completed')
    .reduce((sum, t) => sum + (t?.amount || 0), 0);
  const completedPayments = (transactions || []).filter(t => t?.status === 'completed').length;

  // Accounts receivable: all unpaid invoices (anything not fully paid)
  const pendingInvoices = (invoices || []).filter(i => {
    if (i?.type !== 'Receivable') return false;
    const logs = (statusLogs || {})[i?.invoiceNumber] || [];
    const lastStatus = logs.length > 0 ? logs[logs.length - 1].status : (i?.status || 'Sent');
    return lastStatus !== 'Paid' && lastStatus !== 'Fully Received';
  });
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.amount?.replace(/[$,]/g, '') || 0), 0);

  // Active clients count: recipients that have at least one invoice or transaction
  const activeClientNames = new Set([
    ...(invoices || []).map(i => i.businessName),
    ...(transactions || []).map(t => t.recipient || t.senderName),
  ].filter(Boolean));
  const activeClients = (recipients || []).filter(r =>
    activeClientNames.has(r.name) || activeClientNames.has(r.company)
  );

  // Calculate EarlyPay eligible invoices
  const eligibleForEarlyPay = pendingInvoices.filter(inv => {
    const amount = parseFloat(inv.amount?.replace(/[$,]/g, '') || 0);
    return amount >= 500;
  });
  const earlyPayAvailable = eligibleForEarlyPay.reduce(
    (sum, inv) => sum + parseFloat(inv.amount?.replace(/[$,]/g, '') || 0),
    0
  );

  // Build upcoming events from invoice due dates + static demo events
  const upcomingEvents = useMemo(() => {
    const events = [];
    (pendingInvoices || []).forEach(inv => {
      if (inv.dueDate) {
        events.push({
          id: `inv-${inv.invoiceNumber}`,
          date: inv.dueDate,
          title: `Invoice ${inv.invoiceNumber} due`,
          subtitle: inv.businessName,
          amount: inv.amount,
          type: 'invoice',
        });
      }
    });
    events.push(
      { id: 'demo-1', date: 'Mar 15, 2026', title: 'Client payment expected', subtitle: 'Acme Corp — Wire transfer', type: 'payment' },
      { id: 'demo-2', date: 'Mar 25, 2026', title: 'Contract renewal', subtitle: 'Service Agreement — WebFlow Inc', type: 'contract' },
      { id: 'demo-3', date: 'Apr 5, 2026', title: 'Quarterly review', subtitle: 'Business performance review', type: 'review' },
    );
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    return events.slice(0, 5);
  }, [pendingInvoices]);

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Home' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'payments', icon: CreditCard, label: 'Payments' },
    { id: 'earlypay', icon: Zap, label: 'EarlyPay' },
    { id: 'contracts', icon: FileSignature, label: 'Contracts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Sub-navigation items for Payments drill-down
  const paymentSubItems = [
    { id: 'payments', icon: TrendingDown, label: 'Transfer History' },
    { id: 'invoices', icon: FileText, label: 'Invoices' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  ];

  // Sub-navigation items for Contracts drill-down
  const contractSubItems = [
    { id: 'manage', icon: FileSignature, label: 'All Contracts' },
    { id: 'create', icon: Plus, label: 'Upload Document' },
  ];

  const handleModuleClick = (id) => {
    setMobileMenuOpen(false);
    if (id === 'payments') {
      setActiveModule('payments');
      setPaymentSubView('payments');
    } else if (id === 'contracts') {
      setActiveModule('contracts');
      setContractSubView('manage');
    } else {
      setActiveModule(id);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Render the active module content
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'payments':
        return (
          <PhilippinesDashboard
            user={user}
            userData={userData}
            invoices={invoices}
            setInvoices={setInvoices}
            transactions={transactions}
            statusLogs={statusLogs}
            setStatusLogs={setStatusLogs}
            recipients={recipients}
            setRecipients={setRecipients}
            onAddInvoice={onAddInvoice}
            onUpdateStatus={onUpdateStatus}
            onUpdateProfile={onUpdateProfile}
            onDeleteAccount={onDeleteAccount}
            embedded={true}
            activeView={paymentSubView}
            setActiveView={setPaymentSubView}
          />
        );
      case 'clients':
        return (
          <ClientsView
            recipients={recipients}
            setRecipients={setRecipients}
            userData={userData}
          />
        );
      case 'contracts':
        return (
          <ContractsView
            contracts={contracts}
            setContracts={setContracts}
            recipients={recipients}
            userData={userData}
            onAddContract={onAddContract}
            onUpdateContract={onUpdateContract}
            onDeleteContract={onDeleteContract}
            activeView={contractSubView}
            setActiveView={setContractSubView}
          />
        );
      case 'earlypay':
        return (
          <EarlyPayView
            invoices={invoices}
            statusLogs={statusLogs}
          />
        );
      case 'tax':
      case 'payroll':
      case 'hr': {
        const moduleInfo = {
          tax: { label: 'Tax Documents', iconBg: 'bg-blue-900/40', iconColor: 'text-blue-400', badgeBg: 'bg-blue-900/40', badgeText: 'text-blue-400', dot: 'bg-blue-500' },
          payroll: { label: 'Payroll', iconBg: 'bg-violet-900/40', iconColor: 'text-violet-400', badgeBg: 'bg-violet-900/40', badgeText: 'text-violet-400', dot: 'bg-violet-500' },
          hr: { label: 'HR Management', iconBg: 'bg-rose-900/40', iconColor: 'text-rose-400', badgeBg: 'bg-rose-900/40', badgeText: 'text-rose-400', dot: 'bg-rose-500' },
        };
        const info = moduleInfo[activeModule] || moduleInfo.contracts;
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className={`w-16 h-16 ${info.iconBg} rounded-lg flex items-center justify-center mx-auto mb-6`}>
                <Hammer className={`w-8 h-8 ${info.iconColor}`} />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">{info.label}</h2>
              <div className={`inline-flex items-center gap-2 px-3 py-1 ${info.badgeBg} ${info.badgeText} text-sm font-medium rounded-lg mb-4`}>
                <span className={`w-2 h-2 ${info.dot} rounded-full`} />
                Under Construction
              </div>
              <p className="text-gray-400">
                This module is currently being built. Check back soon for updates.
              </p>
            </div>
          </div>
        );
      }
      case 'settings':
        return (
          <div className="p-4 md:p-8">
            <ProfileSettings
              user={user}
              userData={userData}
              onUpdateProfile={onUpdateProfile}
              onDeleteAccount={onDeleteAccount}
              companyLogo={companyLogo}
              onLogoChange={(logo) => setCompanyLogo(logo)}
            />
          </div>
        );
      default:
        return renderOverview();
    }
  };

  // Overview Dashboard Content
  const renderOverview = () => (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <p className="text-gray-400 text-sm mb-1">Welcome back</p>
          <h1 className="text-xl md:text-2xl font-semibold">{userData?.business_name || 'Dashboard'}</h1>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-xs">Powered by</span>
          <img src="/zyp-logo.svg" alt="Zyp" className="h-4 w-auto opacity-70" />
        </div>
      </div>

      {/* Clickable Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 md:mb-8">
        <div
          onClick={() => { setActiveModule('payments'); setPaymentSubView('payments'); }}
          className="bg-[#161616] border border-[#252525] rounded-lg p-5 border-l-4 border-l-emerald-500 cursor-pointer hover:bg-emerald-900/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Payments Received</span>
            <div className="w-8 h-8 bg-emerald-900/40 rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-white">{formatCurrency(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-1">{completedPayments} payment{completedPayments !== 1 ? 's' : ''}</p>
        </div>

        <div
          onClick={() => { setActiveModule('payments'); setPaymentSubView('invoices'); }}
          className="bg-[#161616] border border-[#252525] rounded-lg p-5 border-l-4 border-l-amber-500 cursor-pointer hover:bg-amber-900/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Accounts Receivable</span>
            <div className="w-8 h-8 bg-amber-900/40 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-white">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingInvoices.length} invoices</p>
        </div>

        <div
          onClick={() => setActiveModule('clients')}
          className="bg-[#161616] border border-[#252525] rounded-lg p-5 border-l-4 border-l-blue-500 cursor-pointer hover:bg-blue-900/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Clients</span>
            <div className="w-8 h-8 bg-blue-900/40 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-white">{activeClients.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active client{activeClients.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Payments + Invoices side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Recent Payments */}
        <div className="bg-[#161616] border border-[#252525] rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-[#252525]">
            <h2 className="font-medium text-sm">Recent Payments</h2>
            <button
              onClick={() => { setActiveModule('payments'); setPaymentSubView('payments'); }}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {transactions?.length === 0 ? (
            <div className="p-6 text-center">
              <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="font-medium text-white text-sm">No payments yet</p>
              <p className="text-xs text-gray-400 mt-1">Payments from your clients will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#252525]">
              {transactions?.slice(0, 3).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 hover:bg-[#1e1e1e] transition-colors">
                  <div>
                    <p className="text-sm font-medium">{txn.recipient}</p>
                    <p className="text-xs text-gray-400">{txn.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">+{formatCurrency(txn.amount)}</p>
                    <p className="text-xs text-gray-400">{txn.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invoices */}
        <div className="bg-[#161616] border border-[#252525] rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-[#252525]">
            <h2 className="font-medium text-sm">Pending Invoices</h2>
            <button
              onClick={() => { setActiveModule('payments'); setPaymentSubView('invoices'); }}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {pendingInvoices.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
              <p className="font-medium text-white text-sm">All caught up</p>
              <p className="text-xs text-gray-400 mt-1">No pending invoices right now</p>
            </div>
          ) : (
            <div className="divide-y divide-[#252525]">
              {pendingInvoices.slice(0, 3).map((inv) => (
                <div key={inv.invoiceNumber} className="flex items-center justify-between p-3 hover:bg-[#1e1e1e] transition-colors">
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{inv.businessName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{inv.amount}</p>
                    <p className="text-xs text-gray-400">Due {inv.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-[#161616] border border-[#252525] rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252525]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h2 className="font-medium text-sm">Upcoming Events</h2>
          </div>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p className="text-sm">No upcoming events</p>
          </div>
        ) : (
          <div className="divide-y divide-[#252525]">
            {upcomingEvents.map((event) => {
              const parsed = new Date(event.date);
              const day = parsed.getDate();
              const month = parsed.toLocaleDateString('en-US', { month: 'short' });
              const colorMap = { invoice: 'bg-amber-500', payment: 'bg-emerald-500', contract: 'bg-violet-500', review: 'bg-blue-500' };
              const dotColor = colorMap[event.type] || 'bg-gray-400';
              return (
                <div key={event.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1e1e1e] transition-colors">
                  <div className="flex flex-col items-center w-10 flex-shrink-0">
                    <span className="text-[10px] font-medium text-gray-500 uppercase leading-none">{month}</span>
                    <span className="text-lg font-semibold text-white leading-tight">{day}</span>
                  </div>
                  <div className={`w-1 h-8 ${dotColor} rounded-full flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    <p className="text-xs text-gray-400 truncate">{event.subtitle}</p>
                  </div>
                    {event.amount && (
                      <span className="text-xs font-medium text-white flex-shrink-0">{event.amount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-[#161616] border-b border-[#252525] flex items-center justify-between px-4 z-40 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-gray-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium truncate max-w-[200px]">
              {userData?.business_name || 'Dashboard'}
            </span>
          </div>
          <div className="w-9" />
        </div>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Collapsible Sidebar */}
        <aside
          className={`fixed left-0 top-0 bottom-0 bg-[#161616] border-r border-[#252525] flex flex-col z-50 ${hasMounted ? 'transition-all duration-300 ease-in-out' : ''}
            ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
            md:translate-x-0 ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'}`}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          {/* Mobile Close Button */}
          <div className="flex items-center justify-end p-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Company Header */}
          <div className={`border-b border-[#252525] ${isCollapsed ? 'p-3' : 'p-4'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div
                className={`rounded-lg bg-[#1c1c1c] border border-[#252525] flex items-center justify-center overflow-hidden flex-shrink-0 ${
                  isCollapsed ? 'w-11 h-11' : 'w-10 h-10'
                }`}
                title={userData?.business_name || 'Your Business'}
              >
                {companyLogo ? (
                  <img src={companyLogo} alt="Company" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-500" />
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm text-white">{userData?.business_name || 'Your Business'}</p>
                  <p className="text-xs text-gray-400">Business Portal</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-4'}`}>
            {activeModule === 'payments' ? (
              isCollapsed ? (
                /* Collapsed: show payment sub-page icons */
                <div className="space-y-0.5">
                  {paymentSubItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setPaymentSubView(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-center px-3 py-2.5 transition-colors ${
                        paymentSubView === item.id
                          ? 'text-white font-semibold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={item.label}
                    >
                      <item.icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              ) : (
                /* Expanded: drill-down sub-navigation */
                <div>
                  <button
                    onClick={() => setActiveModule('overview')}
                    className="flex items-center gap-2 px-2 py-2 text-gray-400 hover:text-white transition-colors mb-1 w-full text-left"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-semibold text-white">Payments</span>
                  </button>
                  <div className="mt-1 space-y-0.5">
                    {paymentSubItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setPaymentSubView(item.id); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          paymentSubView === item.id
                            ? 'text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : activeModule === 'contracts' ? (
              isCollapsed ? (
                /* Collapsed: show contract sub-page icons */
                <div className="space-y-0.5">
                  {contractSubItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setContractSubView(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-center px-3 py-2.5 transition-colors ${
                        contractSubView === item.id
                          ? 'text-white font-semibold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={item.label}
                    >
                      <item.icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              ) : (
                /* Expanded: contracts drill-down sub-navigation */
                <div>
                  <button
                    onClick={() => setActiveModule('overview')}
                    className="flex items-center gap-2 px-2 py-2 text-gray-400 hover:text-white transition-colors mb-1 w-full text-left"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-semibold text-white">Contracts</span>
                  </button>
                  <div className="mt-1 space-y-0.5">
                    {contractSubItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setContractSubView(item.id); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          contractSubView === item.id
                            ? 'text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* Main navigation */
              <div className="space-y-0.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleModuleClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      activeModule === item.id
                        ? 'text-white font-semibold'
                        : 'text-gray-500 hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </nav>

          {/* User */}
          <div className={`border-t border-[#252525] ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                <div className={`rounded-full bg-[#1c1c1c] flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}>
                  <span className="text-sm font-medium text-gray-400">{user?.email?.charAt(0).toUpperCase()}</span>
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-white">{user?.email?.split('@')[0]}</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  onClick={async () => await supabase.auth.signOut()}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-h-screen ${hasMounted ? 'transition-all duration-300 ease-in-out' : ''}
          mt-14 md:mt-0 ml-0 ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-64'}`}>
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}

export default PhilippinesPortal;
