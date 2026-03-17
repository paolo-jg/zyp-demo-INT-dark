import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart,
  ArrowRight,
  Download
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';

function AnalyticsView({ invoices, transactions, recipients, statusLogs }) {
  const { agingReport, clientScorecards, cashFlowForecast, summaryMetrics, revenueByClient, collectionTimeliness } = useAnalytics(
    invoices,
    transactions,
    recipients,
    statusLogs
  );

  const [expandedClient, setExpandedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, aging, clients, forecast, revenue, timeliness
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [revenuePeriod, setRevenuePeriod] = useState('12m');
  const [expandedRevenueClient, setExpandedRevenueClient] = useState(null);

  const exportToCSV = (data, columns, filename) => {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row => columns.map(c => `"${row[c.key] ?? ''}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (riskScore) => {
    const colors = {
      1: 'text-green-700 bg-green-50 border border-green-200',
      2: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
      3: 'text-yellow-700 bg-yellow-50 border border-yellow-200',
      4: 'text-orange-700 bg-orange-50 border border-orange-200',
      5: 'text-red-700 bg-red-50 border border-red-200',
    };
    return colors[riskScore] || colors[3];
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'aging', label: 'Aging Report', icon: Clock },
    { id: 'clients', label: 'Client Scorecards', icon: Users },
    { id: 'forecast', label: 'Cash Flow Forecast', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue by Client', icon: DollarSign },
    { id: 'timeliness', label: 'Collection Timeliness', icon: PieChart },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Analytics & Insights</h1>
          <p className="text-gray-500 mt-1">Payment intelligence and cash flow forecasting</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 border-l-4 border-l-blue-500">
              <div className="text-gray-500 text-sm mb-2">Outstanding</div>
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">{formatCurrency(summaryMetrics.totalOutstanding)}</div>
              <div className="text-xs text-gray-500 mt-1">Awaiting payment</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 border-l-4 border-l-amber-500">
              <div className="text-gray-500 text-sm mb-2">Avg Collection</div>
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                {summaryMetrics.avgCollectionPeriod !== null
                  ? `${summaryMetrics.avgCollectionPeriod} days`
                  : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Time to payment</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 border-l-4 border-l-emerald-500">
              <div className="text-gray-500 text-sm mb-2">Collection Rate</div>
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">{summaryMetrics.collectionRate}%</div>
              <div className="text-xs text-gray-500 mt-1">Paid invoices</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 border-l-4 border-l-red-500">
              <div className="text-gray-500 text-sm mb-2">At Risk</div>
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">{formatCurrency(summaryMetrics.atRiskAmount)}</div>
              <div className="text-xs text-gray-500 mt-1">60+ days overdue</div>
            </div>
          </div>

          {/* Quick Forecast */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Expected Cash Flow</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cashFlowForecast.weeks.slice(0, 4).map((week, i) => (
                <div key={i} className="text-center">
                  <div className="text-sm text-gray-500 mb-1">{week.label}</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(week.projectedAmount)}
                  </div>
                  <div className="text-xs text-gray-500">{week.invoiceCount} invoices</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clients Quick View */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Top Clients by Volume</h3>
            <div className="space-y-3">
              {clientScorecards.slice(0, 5).map((client, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-gray-500">
                      {client.avgPaymentDays !== null
                        ? `Pays in ~${client.avgPaymentDays} days`
                        : 'No payment history'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(client.totalInvoiced)}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-lg font-medium ${getRiskColor(client.riskScore)}`}>
                      {client.riskLabel} risk
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aging Report Tab */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          {/* Header with Export */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                const allInvoices = Object.values(agingReport.buckets).flatMap(bucket =>
                  bucket.invoices.map(inv => {
                    const dueDate = new Date(inv.dueDate);
                    const daysOverdue = Math.max(0, Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24)));
                    const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount.replace(/[$,]/g, '')) : inv.amount;
                    return {
                      invoice: inv.invoiceNumber,
                      client: inv.businessName,
                      dueDate: dueDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                      amount: formatCurrency(amount),
                      daysOverdue,
                      status: inv.currentStatus,
                    };
                  })
                );
                exportToCSV(allInvoices, [
                  { key: 'invoice', label: 'Invoice' },
                  { key: 'client', label: 'Client' },
                  { key: 'dueDate', label: 'Due Date' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'daysOverdue', label: 'Days Overdue' },
                  { key: 'status', label: 'Status' },
                ], 'aging_report_export.csv');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Aging Buckets */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(agingReport.buckets).map(([key, bucket]) => {
              const percentage = agingReport.totalOutstanding > 0
                ? Math.round((bucket.total / agingReport.totalOutstanding) * 100)
                : 0;
              
              const colorMap = {
                current: 'border-green-500',
                days1to30: 'border-yellow-500',
                days31to60: 'border-orange-500',
                days61to90: 'border-red-500',
                days90plus: 'border-red-700',
              };

              const selectedBgMap = {
                current: 'bg-green-50 ring-2 ring-green-500',
                days1to30: 'bg-yellow-50 ring-2 ring-yellow-500',
                days31to60: 'bg-orange-50 ring-2 ring-orange-500',
                days61to90: 'bg-red-50 ring-2 ring-red-500',
                days90plus: 'bg-red-50 ring-2 ring-red-700',
              };

              const isSelected = selectedBucket === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedBucket(isSelected ? null : key)}
                  className={`rounded-lg p-4 border-l-4 ${colorMap[key]} cursor-pointer transition-all ${
                    isSelected ? selectedBgMap[key] : 'bg-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">{bucket.label}</div>
                  <div className="text-xl sm:text-2xl font-semibold">{formatCurrency(bucket.total)}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{bucket.invoices.length} invoices</span>
                    <span className="text-xs text-gray-500">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtered Invoices for Selected Bucket */}
          {selectedBucket && agingReport.buckets[selectedBucket] && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {agingReport.buckets[selectedBucket].label}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({agingReport.buckets[selectedBucket].invoices.length} invoice{agingReport.buckets[selectedBucket].invoices.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <button
                  onClick={() => setSelectedBucket(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear filter
                </button>
              </div>
              {agingReport.buckets[selectedBucket].invoices.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No invoices in this category.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {agingReport.buckets[selectedBucket].invoices.map((inv, i) => {
                    const dueDate = new Date(inv.dueDate);
                    const daysOverdue = Math.max(0, Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={i} className="flex items-center justify-between py-3">
                        <div>
                          <div className="font-medium text-gray-900">{inv.invoiceNumber}</div>
                          <div className="text-sm text-gray-500">{inv.businessName}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          {daysOverdue > 0 && (
                            <div className="text-xs text-red-600">{daysOverdue} days overdue</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatCurrency(typeof inv.amount === 'string' ? parseFloat(inv.amount.replace(/[$,]/g, '')) : inv.amount)}</div>
                          <div className="text-xs text-gray-500">{inv.currentStatus}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aging Bar Chart */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Aging Distribution</h3>
            <div className="h-8 rounded-full overflow-hidden flex bg-gray-50 dark:bg-gray-800">
              {Object.entries(agingReport.buckets).map(([key, bucket]) => {
                const percentage = agingReport.totalOutstanding > 0
                  ? (bucket.total / agingReport.totalOutstanding) * 100
                  : 0;
                
                if (percentage === 0) return null;

                const colorMap = {
                  current: 'bg-green-500',
                  days1to30: 'bg-yellow-500',
                  days31to60: 'bg-orange-500',
                  days61to90: 'bg-red-500',
                  days90plus: 'bg-red-700',
                };

                return (
                  <div 
                    key={key}
                    className={`${colorMap[key]} h-full`}
                    style={{ width: `${percentage}%` }}
                    title={`${bucket.label}: ${formatCurrency(bucket.total)}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-500">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-500">1-30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-gray-500">31-60 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-500">61-90 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-700" />
                <span className="text-gray-500">90+ days</span>
              </div>
            </div>
          </div>

          {/* Overdue Invoices List */}
          {(agingReport.buckets.days31to60.invoices.length > 0 || 
            agingReport.buckets.days61to90.invoices.length > 0 ||
            agingReport.buckets.days90plus.invoices.length > 0) && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Attention Required</h3>
              <div className="space-y-3">
                {[...agingReport.buckets.days90plus.invoices,
                  ...agingReport.buckets.days61to90.invoices,
                  ...agingReport.buckets.days31to60.invoices].slice(0, 10).map((inv, i) => {
                  const daysOverdue = Math.floor(
                    (new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <div>
                        <div className="font-medium">{inv.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">{inv.businessName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(inv.amount)}</div>
                        <div className="text-sm text-red-700">{daysOverdue} days overdue</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client Scorecards Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {/* Export Button */}
          {clientScorecards.length > 0 && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  const exportData = clientScorecards.map(client => ({
                    client: client.name,
                    totalInvoiced: formatCurrency(client.totalInvoiced),
                    paid: formatCurrency(client.totalPaid),
                    outstanding: formatCurrency(client.outstandingAmount),
                    avgPaymentDays: client.avgPaymentDays !== null ? client.avgPaymentDays : '—',
                    risk: `${client.riskLabel} (${client.riskScore}/5)`,
                  }));
                  exportToCSV(exportData, [
                    { key: 'client', label: 'Client' },
                    { key: 'totalInvoiced', label: 'Total Invoiced' },
                    { key: 'paid', label: 'Paid' },
                    { key: 'outstanding', label: 'Outstanding' },
                    { key: 'avgPaymentDays', label: 'Avg Payment Days' },
                    { key: 'risk', label: 'Risk' },
                  ], 'client_scorecards_export.csv');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          )}
          {clientScorecards.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Client Data Yet</h3>
              <p className="text-gray-500">Client scorecards will appear once you have invoice history.</p>
            </div>
          ) : (
            clientScorecards.map((client, i) => (
              <div 
                key={i} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedClient(expandedClient === i ? null : i)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50/30 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-semibold text-lg">{client.name}</div>
                    <div className="text-sm text-gray-500">
                      {client.totalInvoices} invoices · {formatCurrency(client.totalInvoiced)} total
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-lg text-sm font-medium ${getRiskColor(client.riskScore)}`}>
                      {client.riskLabel} Risk
                    </div>
                    {expandedClient === i ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedClient === i && (
                  <div className="px-4 pb-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase mb-1">Avg Payment Time</div>
                        <div className="text-xl font-bold">
                          {client.avgPaymentDays !== null ? `${client.avgPaymentDays} days` : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase mb-1">Payment Rate</div>
                        <div className="text-xl font-bold">{client.paymentRate}%</div>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase mb-1">Outstanding</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(client.outstandingAmount)}
                        </div>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase mb-1">Total Collected</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(client.totalPaid)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-500">
                        {client.avgPaymentDays !== null && client.avgPaymentDays <= 15 && (
                          <span className="text-green-700">Excellent payer — consider offering preferred terms</span>
                        )}
                        {client.avgPaymentDays !== null && client.avgPaymentDays > 15 && client.avgPaymentDays <= 30 && (
                          <span className="text-emerald-700">✓ Good payment history — reliable client</span>
                        )}
                        {client.avgPaymentDays !== null && client.avgPaymentDays > 30 && client.avgPaymentDays <= 45 && (
                          <span className="text-yellow-700">⚠ Slow payer — consider stricter payment terms</span>
                        )}
                        {client.avgPaymentDays !== null && client.avgPaymentDays > 45 && (
                          <span className="text-red-700">⚠ High risk — require upfront payment or deposits</span>
                        )}
                        {client.avgPaymentDays === null && (
                          <span className="text-gray-500">No payment history yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Cash Flow Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Header with Export */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                const exportData = cashFlowForecast.weeks.map(week => ({
                  week: week.label,
                  projectedAmount: formatCurrency(week.projectedAmount),
                  invoiceCount: week.invoiceCount,
                }));
                exportToCSV(exportData, [
                  { key: 'week', label: 'Week' },
                  { key: 'projectedAmount', label: 'Projected Amount' },
                  { key: 'invoiceCount', label: 'Invoice Count' },
                ], 'cash_flow_forecast_export.csv');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200 border-l-4 border-l-emerald-500">
              <div className="text-sm text-emerald-700 font-medium mb-2">Next 30 Days</div>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(cashFlowForecast.next30Days)}</div>
              <div className="text-sm text-gray-500 mt-1">Expected collections</div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 border-l-4 border-l-blue-500">
              <div className="text-sm text-blue-700 font-medium mb-2">Next 60 Days</div>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(cashFlowForecast.next60Days)}</div>
              <div className="text-sm text-gray-500 mt-1">Expected collections</div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 border-l-4 border-l-violet-500">
              <div className="text-sm text-violet-700 font-medium mb-2">Total Pipeline</div>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(cashFlowForecast.totalProjected)}</div>
              <div className="text-sm text-gray-500 mt-1">All outstanding</div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-6">8-Week Forecast</h3>
            <div className="space-y-4">
              {cashFlowForecast.weeks.map((week, i) => {
                const maxAmount = Math.max(...cashFlowForecast.weeks.map(w => w.projectedAmount));
                const barWidth = maxAmount > 0 ? (week.projectedAmount / maxAmount) * 100 : 0;

                return (
                  <div key={i} className="flex items-center gap-2 sm:gap-4">
                    <div className="w-16 sm:w-24 text-xs sm:text-sm text-gray-500 flex-shrink-0">{week.label}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 sm:w-28 text-right flex-shrink-0">
                      <div className="font-semibold">{formatCurrency(week.projectedAmount)}</div>
                      <div className="text-xs text-gray-500">{week.invoiceCount} inv</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forecast Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-blue-800">How this forecast works</div>
                <p className="text-sm text-blue-600 mt-1">
                  Projections are based on each client's historical payment behavior. Clients with
                  consistent payment patterns have higher confidence scores. As you collect more
                  payment data, forecasts become more accurate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue by Client Tab */}
      {activeTab === 'revenue' && (() => {
        const { clients: filteredClients, grandTotal: filteredTotal } = revenueByClient.filterByPeriod(revenuePeriod);
        const maxClientRevenue = filteredClients.length > 0 ? Math.max(...filteredClients.map(c => c.total)) : 0;

        return (
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Revenue Breakdown</h3>
              <div className="flex gap-2">
                {[
                  { value: '3m', label: '3 Months' },
                  { value: '6m', label: '6 Months' },
                  { value: '12m', label: '12 Months' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRevenuePeriod(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      revenuePeriod === opt.value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-6">Revenue per Client</h3>
              {filteredClients.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No revenue data for this period.</p>
              ) : (
                <div className="space-y-4">
                  {filteredClients.map((client, i) => {
                    const barWidth = maxClientRevenue > 0 ? (client.total / maxClientRevenue) * 100 : 0;
                    const pct = filteredTotal > 0 ? Math.round((client.total / filteredTotal) * 100) : 0;
                    const isExpanded = expandedRevenueClient === i;

                    return (
                      <div key={i}>
                        <button
                          onClick={() => setExpandedRevenueClient(isExpanded ? null : i)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{client.name}</span>
                              <span className="text-xs text-gray-400">{pct}%</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <span className="font-semibold text-gray-900">{formatCurrency(client.total)}</span>
                          </div>
                          <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </button>

                        {/* Expanded invoice breakdown */}
                        {isExpanded && (
                          <div className="mt-3 ml-4 border-l-2 border-blue-200 pl-4 space-y-0">
                            <div className="divide-y divide-gray-100">
                              {client.invoices
                                .sort((a, b) => (b.parsedDate || 0) - (a.parsedDate || 0))
                                .map((inv, j) => (
                                  <div key={j} className="flex items-center justify-between py-2">
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">{inv.invoiceNumber}</div>
                                      <div className="text-xs text-gray-400">
                                        {inv.parsedDate
                                          ? inv.parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                          : inv.date}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-gray-700">{formatCurrency(inv.parsedAmount)}</div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals Row */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 uppercase font-medium">Total Revenue</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {revenuePeriod === '3m' ? 'Last 3 months' : revenuePeriod === '6m' ? 'Last 6 months' : 'Last 12 months'}
                    {' · '}{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
                    {' · '}{filteredClients.reduce((sum, c) => sum + c.invoices.length, 0)} invoice{filteredClients.reduce((sum, c) => sum + c.invoices.length, 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(filteredTotal)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Collection Timeliness Tab */}
      {activeTab === 'timeliness' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200 border-l-4 border-l-blue-500">
              <div className="text-sm text-blue-700 font-medium mb-2">Avg Collection Time</div>
              <div className="text-3xl font-bold text-gray-900">
                {collectionTimeliness.avgDaysToCollect !== null
                  ? `${collectionTimeliness.avgDaysToCollect} days`
                  : '--'}
              </div>
              <div className="text-sm text-gray-500 mt-1">From invoice to payment</div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 border-l-4 border-l-emerald-500">
              <div className="text-sm text-emerald-700 font-medium mb-2">Total Collections</div>
              <div className="text-3xl font-bold text-gray-900">{collectionTimeliness.totalCollections}</div>
              <div className="text-sm text-gray-500 mt-1">Paid invoices analyzed</div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 border-l-4 border-l-amber-500">
              <div className="text-sm text-amber-700 font-medium mb-2">Early + On-Time</div>
              <div className="text-3xl font-bold text-gray-900">
                {collectionTimeliness.totalCollections > 0
                  ? `${collectionTimeliness.earlyPct + collectionTimeliness.onTimePct}%`
                  : '--'}
              </div>
              <div className="text-sm text-gray-500 mt-1">Collected by due date</div>
            </div>
          </div>

          {/* Donut Chart + Breakdown */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-6">Collection Distribution</h3>
            {collectionTimeliness.totalCollections === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No collection data available yet.</p>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* CSS Donut Chart */}
                <div className="relative w-48 h-48 flex-shrink-0">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(
                        #10b981 0% ${collectionTimeliness.earlyPct}%,
                        #3b82f6 ${collectionTimeliness.earlyPct}% ${collectionTimeliness.earlyPct + collectionTimeliness.onTimePct}%,
                        #f59e0b ${collectionTimeliness.earlyPct + collectionTimeliness.onTimePct}% 100%
                      )`,
                    }}
                  />
                  <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {collectionTimeliness.avgDaysToCollect !== null ? collectionTimeliness.avgDaysToCollect : '--'}
                      </div>
                      <div className="text-xs text-gray-500">avg days</div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-500" />
                      <div>
                        <div className="font-medium text-gray-900">Early</div>
                        <div className="text-xs text-gray-500">Paid before due date</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{collectionTimeliness.earlyPct}%</div>
                      <div className="text-xs text-gray-500">{collectionTimeliness.earlyCount} invoice{collectionTimeliness.earlyCount !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <div>
                        <div className="font-medium text-gray-900">On Time</div>
                        <div className="text-xs text-gray-500">Paid on due date</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{collectionTimeliness.onTimePct}%</div>
                      <div className="text-xs text-gray-500">{collectionTimeliness.onTimeCount} invoice{collectionTimeliness.onTimeCount !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                      <div>
                        <div className="font-medium text-gray-900">Late</div>
                        <div className="text-xs text-gray-500">Paid after due date</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{collectionTimeliness.latePct}%</div>
                      <div className="text-xs text-gray-500">{collectionTimeliness.lateCount} invoice{collectionTimeliness.lateCount !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Collections Table */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Recent Collections</h3>
            {collectionTimeliness.collections.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No collections to display.</p>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-6 gap-4 pb-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <div>Invoice</div>
                  <div>Client</div>
                  <div className="text-right">Amount</div>
                  <div className="text-center">Due Date</div>
                  <div className="text-center">Paid Date</div>
                  <div className="text-center">Days to Collect</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {collectionTimeliness.collections.slice(0, 10).map((c, i) => {
                    const categoryColors = {
                      early: 'text-emerald-700 bg-emerald-50',
                      onTime: 'text-blue-700 bg-blue-50',
                      late: 'text-amber-700 bg-amber-50',
                    };
                    const categoryLabels = { early: 'Early', onTime: 'On Time', late: 'Late' };

                    return (
                      <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 py-3 items-center">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{c.invoiceNumber}</div>
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-lg font-medium mt-1 md:hidden ${categoryColors[c.category]}`}>
                            {categoryLabels[c.category]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 md:block hidden">{c.businessName}</div>
                        <div className="text-sm font-medium text-gray-900 text-right">{formatCurrency(c.amount)}</div>
                        <div className="text-sm text-gray-500 text-center hidden md:block">
                          {c.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-gray-500 text-center hidden md:block">
                          {c.paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-center hidden md:block">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-lg font-medium ${categoryColors[c.category]}`}>
                            {c.daysToCollect}d · {categoryLabels[c.category]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsView;
