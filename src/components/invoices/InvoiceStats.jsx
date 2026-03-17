/**
 * InvoiceStats - Summary cards for invoices
 */

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export function InvoiceStats({ 
  invoices, 
  typeFilter, 
  setTypeFilter, 
  statusFilter, 
  setStatusFilter,
  isOverdue 
}) {
  // Calculate totals
  const receivablesTotal = invoices
    .filter(i => i.type === 'Receivable')
    .reduce((sum, i) => sum + parseFloat(i.amount.replace(/[$,]/g, '')), 0);
  
  const payablesTotal = invoices
    .filter(i => i.type === 'Payable')
    .reduce((sum, i) => sum + parseFloat(i.amount.replace(/[$,]/g, '')), 0);
  
  const overdueInvoices = invoices.filter(i => isOverdue(i));
  const overdueCount = overdueInvoices.length;
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + parseFloat(i.amount.replace(/[$,]/g, '')), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
      {/* Receivables Card */}
      <div 
        className={`bg-white dark:bg-gray-900 rounded-lg p-4 md:p-6 border cursor-pointer transition-colors${
          typeFilter === 'receivable' ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
        }`}
        onClick={() => setTypeFilter(typeFilter === 'receivable' ? 'all' : 'receivable')}
      >
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
          <span className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Total Receivables</span>
        </div>
        <div className="text-xl md:text-2xl font-bold">${receivablesTotal.toLocaleString()}</div>
        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {invoices.filter(i => i.type === 'Receivable').length} invoices
        </div>
      </div>

      {/* Payables Card */}
      <div 
        className={`bg-white dark:bg-gray-900 rounded-lg p-4 md:p-6 border cursor-pointer transition-colors${
          typeFilter === 'payable' ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
        }`}
        onClick={() => setTypeFilter(typeFilter === 'payable' ? 'all' : 'payable')}
      >
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-purple-700" />
          <span className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Total Payables</span>
        </div>
        <div className="text-xl md:text-2xl font-bold">${payablesTotal.toLocaleString()}</div>
        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {invoices.filter(i => i.type === 'Payable').length} invoices
        </div>
      </div>

      {/* Overdue Card */}
      <div 
        className={`rounded-lg p-4 md:p-6 border cursor-pointer transition-colors${
          statusFilter === 'overdue' 
            ? 'bg-red-900/30 border-red-500' 
            : overdueCount > 0 
              ? 'bg-red-900/20 border-red-500/50 hover:border-red-500' 
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
        }`}
        onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
      >
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <AlertTriangle className={`w-4 h-4 md:w-5 md:h-5${overdueCount > 0 ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`} />
          <span className={`text-sm md:text-base${overdueCount > 0 ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`}>Overdue</span>
        </div>
        <div className={`text-xl md:text-2xl font-bold${overdueCount > 0 ? 'text-red-700' : ''}`}>
          ${overdueTotal.toLocaleString()}
        </div>
        <div className={`text-xs md:text-sm mt-1${overdueCount > 0 ? 'text-red-700/70' : 'text-gray-500 dark:text-gray-400'}`}>
          {overdueCount} invoices
        </div>
      </div>
    </div>
  );
}

export default InvoiceStats;
