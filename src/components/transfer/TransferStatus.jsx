/**
 * TransferStatus - Steps 4, 5, 6 of Transfer Flow
 * Shows processing animation, success, or error states
 */

import React from 'react';
import { Check, X, Send, AlertTriangle } from 'lucide-react';

export function TransferProcessing() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Send className="w-12 h-12 text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Processing Transfer</h2>
      <p className="text-gray-400">This will only take a moment...</p>
      <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        Verifying recipient...
      </div>
    </div>
  );
}

export function TransferSuccess({ transaction, recipient, onNewTransfer, onViewHistory }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-emerald-400" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Transfer Complete!</h2>
      <p className="text-gray-400 mb-8">
        Your payment to {recipient?.name} is on its way
      </p>

      {/* Transaction Details */}
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Transaction ID</span>
            <span className="font-mono text-sm">{transaction?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Amount Sent</span>
            <span className="font-semibold">${transaction?.amount?.toLocaleString()}</span>
          </div>
          {transaction?.phpAmount && (
            <div className="flex justify-between">
              <span className="text-gray-400">Amount Received</span>
              <span className="font-semibold text-emerald-400">
                ₱{parseFloat(transaction.phpAmount).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Estimated Arrival</span>
            <span>1-2 hours</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={onViewHistory}
          className="flex-1 px-6 py-3 border border-gray-600 rounded-xl hover:bg-gray-800"
        >
          View History
        </button>
        <button
          onClick={onNewTransfer}
          className="flex-1 px-6 py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400"
        >
          New Transfer
        </button>
      </div>
    </div>
  );
}

export function TransferError({ error, onRetry, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
        <X className="w-10 h-10 text-red-400" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Transfer Failed</h2>
      <p className="text-gray-400 mb-4 text-center max-w-md">
        {error || 'Something went wrong with your transfer. Please try again.'}
      </p>

      {/* Error Details */}
      <div className="w-full max-w-md bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-400/80">
            <p>If this problem persists, please contact support at support@tryzyp.com</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-600 rounded-xl hover:bg-gray-800"
        >
          Go Back
        </button>
        <button
          onClick={onRetry}
          className="flex-1 px-6 py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default { TransferProcessing, TransferSuccess, TransferError };
