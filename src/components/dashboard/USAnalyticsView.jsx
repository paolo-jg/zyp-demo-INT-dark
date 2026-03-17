import React from 'react';
import { 
  PiggyBank,
  DollarSign,
  Building2,
  Smartphone,
  TrendingDown,
  Info
} from 'lucide-react';
import { useUSAnalytics } from '../../hooks';

function USAnalyticsView({ transactions, recipients, invoices }) {
  const { costSavings } = useUSAnalytics(transactions, recipients, invoices);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyPrecise = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (rate) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cost Savings</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">See how much you're saving with Zyp</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Total Sent
          </div>
          <div className="text-2xl font-bold">{formatCurrency(costSavings.totalSent)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{costSavings.totalTransfers} transfers</div>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm mb-2">
            <TrendingDown className="w-4 h-4" />
            Your Zyp Rate
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatPercent(costSavings.zypEffectiveRate)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Effective fee rate</div>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm mb-2">
            <PiggyBank className="w-4 h-4" />
            Fees Paid
          </div>
          <div className="text-2xl font-bold">{formatCurrencyPrecise(costSavings.zypFees)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Zyp fees</div>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm mb-2">
            <PiggyBank className="w-4 h-4 text-emerald-700" />
            Est. Savings
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatCurrency(costSavings.comparisons.banks.savings)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs. traditional banks</div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* vs Other Fintechs */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">vs. Other Fintechs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Industry average {costSavings.comparisons.fintechs.rateDisplay}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">They would charge:</span>
              <span className="text-lg font-medium">{formatCurrencyPrecise(costSavings.comparisons.fintechs.estimatedFees)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">You paid with Zyp:</span>
              <span className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrencyPrecise(costSavings.zypFees)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Your savings:</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(costSavings.comparisons.fintechs.savings)}
                  </span>
                  <span className="text-sm text-gray-900/70 dark:text-white/70 ml-2">
                    ({costSavings.comparisons.fintechs.savingsPercent.toFixed(0)}% less)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* vs Traditional Banks */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-orange-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">vs. Traditional Banks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Industry average {costSavings.comparisons.banks.rateDisplay}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">They would charge:</span>
              <span className="text-lg font-medium">{formatCurrencyPrecise(costSavings.comparisons.banks.estimatedFees)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">You paid with Zyp:</span>
              <span className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrencyPrecise(costSavings.zypFees)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Your savings:</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(costSavings.comparisons.banks.savings)}
                  </span>
                  <span className="text-sm text-gray-900/70 dark:text-white/70 ml-2">
                    ({costSavings.comparisons.banks.savingsPercent.toFixed(0)}% less)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-white/30 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-700/50 rounded-none p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Savings estimates are based on industry average fees for international transfers. 
            Fintech average (~1.5%) includes transfer fees and exchange rate margins. 
            Bank average (~6%) includes wire fees, intermediary fees, and exchange rate markups. 
            Actual fees vary by provider.
          </p>
        </div>
      </div>
    </div>
  );
}

export default USAnalyticsView;
