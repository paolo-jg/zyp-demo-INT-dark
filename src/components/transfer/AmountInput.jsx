/**
 * AmountInput - Step 2 of Transfer Flow
 * Receipt-style breakdown of transfer amounts
 */

import React from 'react';
import { AlertTriangle, RefreshCw, FileText, Info, CheckCircle } from 'lucide-react';

// Helper to format numbers with commas
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return parseFloat(num).toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export function AmountInput({
  amount,
  setAmount,
  exchangeRate,
  rateError,
  rateLoading,
  onRefreshRate,
  fee,
  feePercentage,
  receiverFee,
  phpAmount,
  selectedRecipient,
  requiresEdd,
  minAmount = 500,
  maxAmount = 1000000,
  eddVerifiedUntil
}) {
  const formatWithCommas = (value) => {
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleAmountChange = (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1]?.length > 2) {
      value = parts[0] + '.' + parts[1].slice(0, 2);
    }
    setAmount(formatWithCommas(value));
  };

  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const hasUsdReceiverFee = selectedRecipient?.receivingCurrency === 'USD';
  const amountAfterFee = numericAmount - fee - (receiverFee || 0);
  const usdReceiveAmount = hasUsdReceiverFee ? amountAfterFee : (phpAmount ? amountAfterFee : 0);

  // Validation
  const isBelowMin = numericAmount > 0 && numericAmount < minAmount;
  const isAboveMax = numericAmount > maxAmount;
  const hasAmountError = isBelowMin || isAboveMax;

  // Check if this is a large transfer (even if EDD verified)
  const isLargeTransfer = phpAmount && parseFloat(phpAmount) > 500000;

  return (
    <div className="space-y-6">
      {/* Amount Input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Enter Amount (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            className={`w-full pl-10 pr-4 py-4 text-3xl font-bold bg-gray-800 border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              hasAmountError ? 'border-red-500' : 'border-gray-700'
            }`}
          />
        </div>
        {/* Transfer Limits Info */}
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <Info className="w-4 h-4" />
          <span>Min: ${formatNumber(minAmount, 0)} · Max: ${formatNumber(maxAmount, 0)}</span>
        </div>
      </div>

      {/* Amount Validation Errors */}
      {isBelowMin && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Below minimum amount</p>
            <p className="text-red-400/70 text-sm">
              Minimum transfer amount is ${formatNumber(minAmount, 0)}.
            </p>
          </div>
        </div>
      )}

      {isAboveMax && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Exceeds maximum amount</p>
            <p className="text-red-400/70 text-sm">
              Maximum transfer amount is ${formatNumber(maxAmount, 0)}.
            </p>
          </div>
        </div>
      )}

      {/* Receipt-Style Breakdown */}
      {numericAmount > 0 && !hasAmountError && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-gray-800 px-5 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-white">Transfer Summary</h3>
          </div>

          <div className="p-5 space-y-4">
            {/* You Send */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">You send</span>
              <span className="text-xl font-bold text-white">${formatNumber(numericAmount)}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-700" />

            {/* Exchange Rate */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Exchange rate</span>
                <button
                  onClick={onRefreshRate}
                  disabled={rateLoading}
                  className="text-emerald-400 hover:text-emerald-300"
                  title="Refresh rate"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rateLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {rateError ? (
                <span className="text-red-400 text-sm">Unavailable</span>
              ) : rateLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <span className="text-white font-medium">1 USD = ₱{formatNumber(exchangeRate)}</span>
              )}
            </div>

            {/* Transfer Fee */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Transfer fee ({feePercentage})</span>
              <span className="text-red-400">-${formatNumber(fee)}</span>
            </div>

            {/* USD Receiver Fee (if applicable) */}
            {hasUsdReceiverFee && receiverFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">USD receiver fee</span>
                <span className="text-red-400">-${formatNumber(receiverFee)}</span>
              </div>
            )}

            {/* Amount After Fees */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Amount after fees</span>
              <span className="text-white">${formatNumber(amountAfterFee)}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700" />

            {/* Recipient Gets - PHP */}
            {!hasUsdReceiverFee && (
              <div className="flex justify-between items-center py-2 bg-emerald-500/10 -mx-5 px-5 rounded">
                <span className="text-emerald-400 font-medium">Recipient receives (PHP)</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ₱{phpAmount ? formatNumber(parseFloat(phpAmount)) : '—'}
                </span>
              </div>
            )}

            {/* Recipient Gets - USD (for USD receivers) */}
            {hasUsdReceiverFee && (
              <div className="flex justify-between items-center py-2 bg-emerald-500/10 -mx-5 px-5 rounded">
                <span className="text-emerald-400 font-medium">Recipient receives (USD)</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ${formatNumber(usdReceiveAmount)}
                </span>
              </div>
            )}

            {/* PHP Equivalent for reference (if receiving PHP) */}
            {!hasUsdReceiverFee && phpAmount && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">USD equivalent</span>
                <span className="text-gray-400">${formatNumber(amountAfterFee)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDD Already Verified - Show for large transfers */}
      {isLargeTransfer && eddVerifiedUntil && !requiresEdd && !hasAmountError && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 font-medium">EDD Verified</p>
            <p className="text-emerald-400/70 text-sm mt-1">
              Your Enhanced Due Diligence is verified until {eddVerifiedUntil.toLocaleDateString()}. No additional documents required.
            </p>
          </div>
        </div>
      )}

      {/* EDD Warning - Needs verification */}
      {requiresEdd && !hasAmountError && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Enhanced Due Diligence Required</p>
            <p className="text-yellow-400/70 text-sm mt-1">
              Transfers exceeding ₱500,000 require bank statement verification. You'll be prompted to upload documents before confirming.
            </p>
          </div>
        </div>
      )}

      {/* Rate Unavailable Warning */}
      {rateError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Cannot proceed</p>
            <p className="text-red-400/70 text-sm">
              Exchange rate is unavailable. Please try refreshing or wait a moment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AmountInput;
