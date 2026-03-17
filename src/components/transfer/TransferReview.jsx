/**
 * TransferReview - Step 3 of Transfer Flow
 * Shows transfer summary before confirmation
 */

import React from 'react';
import { Building, User, AlertTriangle, ArrowRight, Clock, FileText, CheckCircle } from 'lucide-react';

// Helper to format numbers with commas
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return parseFloat(num).toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export function TransferReview({
  selectedRecipient,
  amount,
  fee,
  feePercentage,
  receiverFee,
  phpAmount,
  exchangeRate,
  isLoading,
  error,
  onConfirm,
  onBack,
  requiresEdd,
  eddDocuments,
  onUploadEdd,
  eddVerifiedUntil
}) {
  const numericAmount = parseFloat(amount?.replace(/,/g, '')) || 0;
  const totalFee = fee + (receiverFee || 0);
  const hasUsdReceiverFee = selectedRecipient?.receivingCurrency === 'USD';
  const amountAfterFee = numericAmount - fee - (receiverFee || 0);
  
  // Check if this is a large transfer
  const isLargeTransfer = phpAmount && parseFloat(phpAmount) > 500000;

  return (
    <div className="space-y-6">
      {/* Recipient Card */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <p className="text-sm text-gray-400 mb-3">Sending to</p>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            selectedRecipient?.type === 'business' ? 'bg-blue-500/20' : 'bg-purple-500/20'
          }`}>
            {selectedRecipient?.type === 'business' ? (
              <Building className="w-7 h-7 text-blue-400" />
            ) : (
              <User className="w-7 h-7 text-purple-400" />
            )}
          </div>
          <div>
            <p className="text-xl font-semibold">{selectedRecipient?.name}</p>
            <p className="text-gray-400">{selectedRecipient?.email || selectedRecipient?.bankName}</p>
          </div>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">You Send</p>
              <p className="text-3xl font-bold">${formatNumber(numericAmount)}</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-500" />
            <div className="text-right">
              <p className="text-sm text-gray-400">They Receive</p>
              <p className="text-3xl font-bold text-emerald-400">
                {hasUsdReceiverFee ? (
                  `$${formatNumber(amountAfterFee)}`
                ) : (
                  `₱${formatNumber(parseFloat(phpAmount || 0))}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Fee Details */}
        <div className="p-6 space-y-3 bg-gray-900/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Amount</span>
            <span>${formatNumber(numericAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Transfer Fee ({feePercentage})</span>
            <span className="text-red-400">-${formatNumber(fee)}</span>
          </div>
          {hasUsdReceiverFee && receiverFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">USD Receiver Fee</span>
              <span className="text-red-400">-${formatNumber(receiverFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Exchange Rate</span>
            <span>1 USD = ₱{formatNumber(exchangeRate)}</span>
          </div>
          <div className="flex justify-between text-sm pt-3 border-t border-gray-700">
            <span className="text-gray-400">Total Fees</span>
            <span className="font-medium">${formatNumber(totalFee)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Estimate */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-400 font-medium">Estimated Delivery</p>
          <p className="text-emerald-400/70 text-sm mt-1">1-3 hours</p>
        </div>
      </div>

      {/* EDD Already Verified Notice (for large transfers) */}
      {isLargeTransfer && eddVerifiedUntil && !requiresEdd && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 font-medium">EDD Verified</p>
            <p className="text-emerald-400/70 text-sm mt-1">
              Your verification is valid until {eddVerifiedUntil.toLocaleDateString()}. No additional documents required.
            </p>
          </div>
        </div>
      )}

      {/* EDD Required Notice */}
      {requiresEdd && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          eddDocuments?.length >= 3 
            ? 'bg-emerald-500/10 border border-emerald-500/30' 
            : 'bg-yellow-500/10 border border-yellow-500/30'
        }`}>
          {eddDocuments?.length >= 3 ? (
            <>
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-emerald-400 font-medium">Documents Uploaded</p>
                <p className="text-emerald-400/70 text-sm mt-1">
                  {eddDocuments.length} bank statements submitted. You won't need to upload documents again for 3 months.
                </p>
              </div>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">Enhanced Due Diligence Required</p>
                <p className="text-yellow-400/70 text-sm mt-1">
                  This transfer exceeds ₱500,000. Please upload your last 3 months of bank statements.
                </p>
                <button
                  onClick={onUploadEdd}
                  className="mt-3 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                >
                  Upload Documents
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Transfer Error</p>
            <p className="text-red-400/70 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 px-6 py-3 border border-gray-600 rounded-xl hover:bg-gray-800 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || !exchangeRate || (requiresEdd && (!eddDocuments || eddDocuments.length < 3))}
          className="flex-1 px-6 py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm Transfer'
          )}
        </button>
      </div>
    </div>
  );
}

export default TransferReview;
