import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, FileText, Send, Clock, RefreshCw } from 'lucide-react';
import { secureError } from '../../utils/secureLogging';

function HomeView({ invoices = [], transactions = [], statusLogs = {}, onNavigate }) {
  const [usdAmount, setUsdAmount] = useState('5000');
  const [phpAmount, setPhpAmount] = useState('294350.00');
  // CRITICAL: No hardcoded exchange rate fallback
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateSource, setRateSource] = useState('default');
  const [isUsdPrimary, setIsUsdPrimary] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Use ref to track if user is actively editing
  const isEditingRef = useRef(false);

  const formatWithCommas = (value) => {
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };
  const removeCommas = (value) => value.replace(/,/g, '');

  // Memoized fetch function that updates rate without touching input fields
  const fetchExchangeRate = useCallback(async (updateAmounts = false) => {
    try {
      // Primary: Fetch from Coins.ph via Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let newRate = null;
      let newSource = 'default';
      
      if (supabaseUrl) {
        const response = await fetch(`${supabaseUrl}/functions/v1/get-exchange-rate`);
        const data = await response.json();
        if (data.rate) {
          newRate = data.rate;
          newSource = data.source;
        }
      }
      
      // Fallback: Direct Coins.ph API call
      if (!newRate) {
        const coinsResponse = await fetch('https://api.pro.coins.ph/openapi/quote/v1/ticker/price?symbol=USDCPHP');
        const coinsData = await coinsResponse.json();
        if (coinsData.price) {
          newRate = parseFloat(coinsData.price);
          newSource = 'coins.ph';
        }
      }
      
      if (newRate) {
        setExchangeRate(newRate);
        setRateSource(newSource);
        setLastUpdated(new Date());
        
        // Only update calculated amounts on initial load or manual refresh, not during polling
        if (updateAmounts && !isEditingRef.current) {
          setPhpAmount(formatWithCommas((parseFloat(removeCommas(usdAmount)) * newRate).toFixed(2)));
        }
      }
    } catch (error) {
      secureError('Failed to fetch exchange rate:', error);
    }
  }, [usdAmount]);

  // Initial fetch + 1-second polling
  useEffect(() => {
    fetchExchangeRate(true); // Initial fetch updates amounts
    
    const interval = setInterval(() => {
      fetchExchangeRate(false); // Polling only updates rate, not amounts
    }, 1000);
    
    return () => clearInterval(interval);
  }, [fetchExchangeRate]);

  const handleUsdChange = (value) => {
    const cleanValue = removeCommas(value);
    setUsdAmount(formatWithCommas(cleanValue));
    const usd = parseFloat(cleanValue) || 0;
    if (exchangeRate) {
      setPhpAmount(formatWithCommas((usd * exchangeRate).toFixed(2)));
    }
  };

  const handlePhpChange = (value) => {
    const cleanValue = removeCommas(value);
    setPhpAmount(formatWithCommas(cleanValue));
    const php = parseFloat(cleanValue) || 0;
    if (exchangeRate) {
      setUsdAmount(formatWithCommas((php / exchangeRate).toFixed(2)));
    }
  };

  const getStatusText = (invoice) => {
    const logs = statusLogs?.[invoice.invoiceNumber];
    const latestLog = logs?.[logs.length - 1];
    let status = latestLog?.status || (invoice.type === 'Receivable' ? 'Sent' : 'Received');
    
    // For Payable invoices (recipient's perspective), translate sender statuses
    if (invoice.type === 'Payable') {
      if (status === 'Sent') return 'Received';
      if (status === 'Partially Received') return 'Partially Paid';
      if (status === 'Fully Received') return 'Fully Paid';
    }
    
    return status;
  };

  const getStatusColor = (status) => {
    if (status.includes('Fully')) return 'bg-emerald-500/20 text-emerald-400';
    if (status.includes('Partially')) return 'bg-yellow-500/20 text-yellow-400';
    if (status === 'completed' || status === 'paid') return 'bg-emerald-500/20 text-emerald-400';
    if (status === 'pending') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  const receivablesTotal = invoices.filter(i => i.type === 'Receivable').reduce((sum, i) => sum + parseFloat(i.amount.replace(/[$,]/g, '')), 0);
  const payablesTotal = invoices.filter(i => i.type === 'Payable').reduce((sum, i) => sum + parseFloat(i.amount.replace(/[$,]/g, '')), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Total Sent (30d)</div>
            <div className="text-lg md:text-2xl font-bold">${transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}</div>
            <div className="text-emerald-400 text-xs md:text-sm mt-1 md:mt-2 flex items-center gap-1">
              {transactions.length > 0 ? <><TrendingUp className="w-3 h-3 md:w-4 md:h-4" /> {transactions.length} transfers</> : <span className="text-gray-500">No transfers yet</span>}
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Receivables</div>
            <div className="text-lg md:text-2xl font-bold">${receivablesTotal.toLocaleString()}</div>
            <div className="text-blue-400 text-xs md:text-sm mt-1 md:mt-2">{invoices.filter(i => i.type === 'Receivable').length} invoices</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Payables</div>
            <div className="text-lg md:text-2xl font-bold">${payablesTotal.toLocaleString()}</div>
            <div className="text-purple-400 text-xs md:text-sm mt-1 md:mt-2">{invoices.filter(i => i.type === 'Payable').length} invoices</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-2">
              Exchange Rate
              {rateSource === 'coins.ph' && (
                <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <div className="text-lg md:text-2xl font-bold tabular-nums">₱{exchangeRate?.toFixed(2) || '—'}</div>
            <div className="text-gray-500 text-xs md:text-sm mt-1 md:mt-2">
              {rateSource === 'coins.ph' ? 'Live mid-market rate' : 'per $1 USD'}
            </div>
          </div>
        </div>

        {/* Recent Invoices & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Recent Invoices</h2>
              <button onClick={() => onNavigate('invoices')} className="text-sm text-emerald-400 hover:text-emerald-300">View all →</button>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <FileText className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-sm md:text-base">No invoices yet</p>
                <p className="text-xs md:text-sm">Your invoices will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {invoices.slice(0, 4).map((invoice) => (
                  <div key={invoice.invoiceNumber} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs md:text-sm font-medium">{invoice.invoiceNumber}</span>
                        <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${getStatusColor(getStatusText(invoice))}`}>
                          {getStatusText(invoice)}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">{invoice.businessName}</p>
                    </div>
                    <span className="text-sm md:text-lg font-semibold ml-2">{invoice.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Recent Transfers</h2>
              <button onClick={() => onNavigate('history')} className="text-sm text-emerald-400 hover:text-emerald-300">View all →</button>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <Clock className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-sm md:text-base">No transfers yet</p>
                <p className="text-xs md:text-sm">Your transfer history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {transactions.slice(0, 4).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Send className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm md:text-base truncate">{txn.recipient}</div>
                        <div className="text-xs md:text-sm text-gray-400">{txn.date}</div>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <div className="font-semibold text-sm md:text-base">${txn.amount?.toLocaleString()}</div>
                      <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${getStatusColor(txn.status)}`}>{txn.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Currency Converter */}
        <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Quick Convert</h2>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
            <div className="flex-1">
              <label className="block text-xs md:text-sm text-gray-400 mb-2">Amount</label>
              <div className="relative">
                <input
                  type="text"
                  value={isUsdPrimary ? usdAmount : phpAmount}
                  onChange={(e) => isUsdPrimary ? handleUsdChange(e.target.value) : handlePhpChange(e.target.value)}
                  className="w-full px-4 py-3 text-xl md:text-2xl font-medium bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">{isUsdPrimary ? 'USD' : 'PHP'}</div>
              </div>
            </div>
            <button onClick={() => setIsUsdPrimary(!isUsdPrimary)} className="self-center p-3 rounded-full hover:bg-gray-700 transition-colors rotate-90 md:rotate-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <div className="flex-1">
              <label className="block text-xs md:text-sm text-gray-400 mb-2">Converted to</label>
              <div className="relative">
                <input
                  type="text"
                  value={isUsdPrimary ? phpAmount : usdAmount}
                  onChange={(e) => isUsdPrimary ? handlePhpChange(e.target.value) : handleUsdChange(e.target.value)}
                  className="w-full px-4 py-3 text-xl md:text-2xl font-medium bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">{isUsdPrimary ? 'PHP' : 'USD'}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400 flex-wrap">
              <span>$1.00 USD = </span>
              <span className="text-emerald-400 font-semibold tabular-nums">₱{exchangeRate?.toFixed(2) || '—'} PHP</span>
              {rateSource === 'coins.ph' && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live mid-market rate
                </span>
              )}
            </div>
            <button onClick={() => onNavigate('transfer')} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors">
              Start Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeView;
