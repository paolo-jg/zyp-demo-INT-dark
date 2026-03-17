import { useMemo } from 'react';

/**
 * Analytics hook for Philippine businesses
 * Computes aging reports, client scorecards, and cash flow forecasting
 */
export function useAnalytics(invoices, transactions, recipients, statusLogs = {}) {
  
  // Parse date from various formats (MM/DD/YYYY or ISO)
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Check if it's MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // MM/DD/YYYY
        return new Date(parts[2], parts[0] - 1, parts[1]);
      }
    }
    
    // Try ISO format or other standard formats
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Calculate days between two dates
  const daysBetween = (date1, date2) => {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!d1 || !d2) return 0;
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  // Get invoice status from statusLogs or invoice object
  const getInvoiceStatus = (invoice) => {
    if (!invoice) return 'Unknown';
    const logs = (statusLogs || {})[invoice.invoiceNumber];
    if (logs && logs.length > 0) {
      return logs[logs.length - 1].status;
    }
    // Fallback to invoice.status if exists, otherwise default based on type
    return invoice.status || (invoice.type === 'Receivable' ? 'Sent' : 'Received');
  };

  // Check if invoice is paid
  const isPaid = (invoice) => {
    const status = getInvoiceStatus(invoice);
    return ['Fully Paid', 'Paid', 'Fully Received'].includes(status);
  };

  // Get today's date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // ==================== AGING REPORT ====================
  const agingReport = useMemo(() => {
    // Filter to only receivable invoices that aren't fully paid
    const unpaidInvoices = (invoices || []).filter(inv => {
      if (inv.type !== 'Receivable') return false;
      return !isPaid(inv);
    });

    const buckets = {
      current: { label: 'Current (not due)', invoices: [], total: 0 },
      days1to30: { label: '1-30 days overdue', invoices: [], total: 0 },
      days31to60: { label: '31-60 days overdue', invoices: [], total: 0 },
      days61to90: { label: '61-90 days overdue', invoices: [], total: 0 },
      days90plus: { label: '90+ days overdue', invoices: [], total: 0 },
    };

    unpaidInvoices.forEach(inv => {
      const dueDate = parseDate(inv.dueDate);
      if (!dueDate) return;
      
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      // Parse amount - handle both number and string with $ or ,
      let amount = inv.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
      } else {
        amount = parseFloat(amount) || 0;
      }

      const invoiceWithStatus = { ...inv, currentStatus: getInvoiceStatus(inv) };

      if (daysOverdue <= 0) {
        buckets.current.invoices.push(invoiceWithStatus);
        buckets.current.total += amount;
      } else if (daysOverdue <= 30) {
        buckets.days1to30.invoices.push(invoiceWithStatus);
        buckets.days1to30.total += amount;
      } else if (daysOverdue <= 60) {
        buckets.days31to60.invoices.push(invoiceWithStatus);
        buckets.days31to60.total += amount;
      } else if (daysOverdue <= 90) {
        buckets.days61to90.invoices.push(invoiceWithStatus);
        buckets.days61to90.total += amount;
      } else {
        buckets.days90plus.invoices.push(invoiceWithStatus);
        buckets.days90plus.total += amount;
      }
    });

    const totalOutstanding = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

    return { buckets, totalOutstanding };
  }, [invoices, statusLogs, today]);

  // ==================== CLIENT SCORECARDS ====================
  const clientScorecards = useMemo(() => {
    // Group invoices by client
    const clientData = {};

    (invoices || []).forEach(inv => {
      if (inv.type !== 'Receivable') return;
      
      const clientName = inv.businessName || 'Unknown';
      if (!clientData[clientName]) {
        clientData[clientName] = {
          name: clientName,
          invoices: [],
          paidInvoices: [],
          totalInvoiced: 0,
          totalPaid: 0,
          paymentTimes: [],
        };
      }
      
      // Parse amount
      let amount = inv.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
      } else {
        amount = parseFloat(amount) || 0;
      }

      clientData[clientName].invoices.push(inv);
      clientData[clientName].totalInvoiced += amount;

      // Check if paid using statusLogs
      if (isPaid(inv)) {
        clientData[clientName].paidInvoices.push(inv);
        clientData[clientName].totalPaid += amount;

        // Find matching transaction to get actual payment date
        const matchingTxn = (transactions || []).find(t => 
          t.invoiceNumber === inv.invoiceNumber ||
          (t.recipient === clientName && Math.abs(parseFloat(t.amount) - amount) < 1)
        );

        if (matchingTxn) {
          const invoiceDate = parseDate(inv.date);
          const paymentDate = parseDate(matchingTxn.date);
          if (invoiceDate && paymentDate) {
            const paymentDays = Math.floor((paymentDate - invoiceDate) / (1000 * 60 * 60 * 24));
            if (paymentDays >= 0) {
              clientData[clientName].paymentTimes.push(paymentDays);
            }
          }
        } else {
          // Estimate: assume paid around due date if no transaction found
          const invoiceDate = parseDate(inv.date);
          const dueDate = parseDate(inv.dueDate);
          if (invoiceDate && dueDate) {
            const estimatedDays = Math.floor((dueDate - invoiceDate) / (1000 * 60 * 60 * 24));
            if (estimatedDays >= 0) {
              clientData[clientName].paymentTimes.push(estimatedDays);
            }
          }
        }
      }
    });

    // Calculate metrics for each client
    const scorecards = Object.values(clientData).map(client => {
      const avgPaymentDays = client.paymentTimes.length > 0
        ? Math.round(client.paymentTimes.reduce((a, b) => a + b, 0) / client.paymentTimes.length)
        : null;

      const paymentRate = client.invoices.length > 0
        ? Math.round((client.paidInvoices.length / client.invoices.length) * 100)
        : 0;

      // Risk score: lower is better (1-5)
      // Default to Low risk until payment history is established
      let riskScore = 1;
      
      // Only calculate risk if there's payment history
      if (client.paidInvoices.length > 0) {
        if (avgPaymentDays > 45) riskScore = 4;
        else if (avgPaymentDays > 30) riskScore = 3;
        else if (avgPaymentDays > 15) riskScore = 2;
        
        if (paymentRate < 50) riskScore = Math.min(5, riskScore + 2);
        else if (paymentRate < 75) riskScore = Math.min(5, riskScore + 1);
      }

      const riskLabel = ['', 'Low', 'Low-Medium', 'Medium', 'Medium-High', 'High'][riskScore];

      // Outstanding amount - invoices not fully paid
      const outstandingInvoices = client.invoices.filter(inv => !isPaid(inv));
      const outstandingAmount = outstandingInvoices.reduce((sum, inv) => {
        let amount = inv.amount;
        if (typeof amount === 'string') {
          amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
        }
        return sum + (parseFloat(amount) || 0);
      }, 0);

      return {
        name: client.name,
        totalInvoices: client.invoices.length,
        paidInvoices: client.paidInvoices.length,
        totalInvoiced: client.totalInvoiced,
        totalPaid: client.totalPaid,
        outstandingAmount,
        avgPaymentDays,
        paymentRate,
        riskScore,
        riskLabel,
        lastInvoiceDate: client.invoices.length > 0 
          ? client.invoices.sort((a, b) => {
              const dateA = parseDate(b.date);
              const dateB = parseDate(a.date);
              return (dateA || 0) - (dateB || 0);
            })[0].date
          : null,
      };
    });

    // Sort by total invoiced (highest first)
    return scorecards.sort((a, b) => b.totalInvoiced - a.totalInvoiced);
  }, [invoices, transactions, statusLogs]);

  // ==================== CASH FLOW FORECAST ====================
  const cashFlowForecast = useMemo(() => {
    const unpaidInvoices = (invoices || []).filter(inv => {
      if (inv.type !== 'Receivable') return false;
      return !isPaid(inv);
    });

    // Build client payment speed lookup
    const clientPaymentSpeed = {};
    clientScorecards.forEach(card => {
      clientPaymentSpeed[card.name] = card.avgPaymentDays || 30; // Default 30 days
    });

    // Project when each invoice will likely be paid
    const projections = unpaidInvoices.map(inv => {
      const clientName = inv.businessName || 'Unknown';
      const avgDays = clientPaymentSpeed[clientName] || 30;
      const invoiceDate = parseDate(inv.date);
      
      let expectedPaymentDate;
      if (invoiceDate) {
        expectedPaymentDate = new Date(invoiceDate);
        expectedPaymentDate.setDate(expectedPaymentDate.getDate() + avgDays);
      } else {
        expectedPaymentDate = new Date();
        expectedPaymentDate.setDate(expectedPaymentDate.getDate() + avgDays);
      }

      // Parse amount
      let amount = inv.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
      } else {
        amount = parseFloat(amount) || 0;
      }

      return {
        invoice: inv,
        clientName,
        amount,
        expectedDate: expectedPaymentDate,
        confidence: clientPaymentSpeed[clientName] ? 'high' : 'low',
      };
    });

    // Group by week
    const weeks = [];
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekProjections = projections.filter(p => 
        p.expectedDate >= weekStart && p.expectedDate <= weekEnd
      );

      const total = weekProjections.reduce((sum, p) => sum + p.amount, 0);
      const highConfidence = weekProjections
        .filter(p => p.confidence === 'high')
        .reduce((sum, p) => sum + p.amount, 0);

      weeks.push({
        weekNumber: i + 1,
        label: i === 0 ? 'This week' : i === 1 ? 'Next week' : `Week ${i + 1}`,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        projectedAmount: total,
        highConfidenceAmount: highConfidence,
        invoiceCount: weekProjections.length,
        invoices: weekProjections,
      });
    }

    // Summary stats
    const next30Days = projections
      .filter(p => {
        const daysOut = Math.floor((p.expectedDate - today) / (1000 * 60 * 60 * 24));
        return daysOut >= 0 && daysOut <= 30;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const next60Days = projections
      .filter(p => {
        const daysOut = Math.floor((p.expectedDate - today) / (1000 * 60 * 60 * 24));
        return daysOut >= 0 && daysOut <= 60;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      weeks,
      next30Days,
      next60Days,
      totalProjected: projections.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [invoices, clientScorecards, statusLogs, today]);

  // ==================== SUMMARY METRICS ====================
  const summaryMetrics = useMemo(() => {
    const receivables = (invoices || []).filter(inv => inv.type === 'Receivable');
    const paid = receivables.filter(inv => isPaid(inv));
    
    const totalReceivables = receivables.reduce((sum, inv) => {
      let amount = inv.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
      }
      return sum + (parseFloat(amount) || 0);
    }, 0);
    
    const totalCollected = paid.reduce((sum, inv) => {
      let amount = inv.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
      }
      return sum + (parseFloat(amount) || 0);
    }, 0);

    // Average collection period (all paid invoices)
    let totalDays = 0;
    let countWithDays = 0;
    
    clientScorecards.forEach(card => {
      if (card.avgPaymentDays !== null && card.paidInvoices > 0) {
        totalDays += card.avgPaymentDays * card.paidInvoices;
        countWithDays += card.paidInvoices;
      }
    });

    const avgCollectionPeriod = countWithDays > 0 ? Math.round(totalDays / countWithDays) : null;

    return {
      totalReceivables,
      totalCollected,
      totalOutstanding: agingReport.totalOutstanding,
      collectionRate: totalReceivables > 0 
        ? Math.round((totalCollected / totalReceivables) * 100) 
        : 0,
      avgCollectionPeriod,
      clientCount: clientScorecards.length,
      atRiskAmount: agingReport.buckets.days61to90.total + agingReport.buckets.days90plus.total,
    };
  }, [invoices, clientScorecards, agingReport, statusLogs]);

  return {
    agingReport,
    clientScorecards,
    cashFlowForecast,
    summaryMetrics,
  };
}

export default useAnalytics;
