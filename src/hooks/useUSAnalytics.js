import { useMemo } from 'react';

/**
 * Analytics hook for US businesses
 * Computes cost savings, spend analytics, and tax compliance data
 */
export function useUSAnalytics(transactions, recipients, invoices) {
  
  // ==================== GENERAL FEE ESTIMATES ====================
  // Industry average estimates (not specific to any provider)
  const INDUSTRY_FEES = {
    fintechs: 0.015, // ~1.5% average for fintech transfer services
    banks: 0.06,     // ~6% average for traditional bank wires (fees + FX markup)
  };

  // Zyp fee structure (from your pricing model)
  const calculateZypFee = (amount) => {
    if (amount <= 5000) return amount * 0.005; // 0.5%
    if (amount <= 10000) return amount * 0.0045; // 0.45%
    if (amount <= 25000) return amount * 0.004; // 0.4%
    return amount * 0.0035; // 0.35%
  };

  // Check if transaction is completed (handle various status formats)
  const isCompleted = (txn) => {
    const status = (txn.status || '').toLowerCase();
    return status === 'completed' || status === 'complete' || status === 'success' || status === 'sent';
  };

  // ==================== COST SAVINGS ====================
  const costSavings = useMemo(() => {
    const allTransactions = transactions || [];
    const completedTransfers = allTransactions.filter(isCompleted);

    let totalSent = 0;
    let totalZypFees = 0;
    let totalFeePercentages = 0;
    let transfersWithFeeRate = 0;

    completedTransfers.forEach(txn => {
      const amount = parseFloat(txn.amount) || 0;
      totalSent += amount;

      // Calculate Zyp fee (use actual fee if available, otherwise calculate)
      const zypFee = txn.fee ? parseFloat(txn.fee) : calculateZypFee(amount);
      totalZypFees += zypFee;

      // Sum up fee percentages for simple average calculation
      // feePercentage is stored as a number like 0.5 (meaning 0.5%)
      if (txn.feePercentage !== undefined && txn.feePercentage !== null) {
        totalFeePercentages += parseFloat(txn.feePercentage);
        transfersWithFeeRate++;
      } else if (amount > 0) {
        // Fallback: calculate percentage from fee/amount
        const calculatedRate = (zypFee / amount) * 100;
        totalFeePercentages += calculatedRate;
        transfersWithFeeRate++;
      }
    });

    // Calculate what fees would have been with industry averages
    const fintechFees = totalSent * INDUSTRY_FEES.fintechs;
    const bankFees = totalSent * INDUSTRY_FEES.banks;

    // Zyp effective rate - simple average of all fee percentages
    // Convert to decimal (0.5% -> 0.005) for consistent formatting
    const avgFeePercentage = transfersWithFeeRate > 0 
      ? totalFeePercentages / transfersWithFeeRate 
      : 0;
    const zypEffectiveRate = avgFeePercentage / 100; // Convert to decimal for formatPercent

    return {
      totalSent,
      totalTransfers: completedTransfers.length,
      zypFees: totalZypFees,
      zypEffectiveRate,
      comparisons: {
        fintechs: {
          label: 'Other Fintechs',
          rate: INDUSTRY_FEES.fintechs,
          rateDisplay: '~1.5%',
          estimatedFees: fintechFees,
          savings: fintechFees - totalZypFees,
          savingsPercent: fintechFees > 0 ? ((fintechFees - totalZypFees) / fintechFees) * 100 : 0,
        },
        banks: {
          label: 'Traditional Banks',
          rate: INDUSTRY_FEES.banks,
          rateDisplay: '~6%',
          estimatedFees: bankFees,
          savings: bankFees - totalZypFees,
          savingsPercent: bankFees > 0 ? ((bankFees - totalZypFees) / bankFees) * 100 : 0,
        },
      },
    };
  }, [transactions]);

  // ==================== SPEND ANALYTICS ====================
  const spendAnalytics = useMemo(() => {
    const completedTransfers = transactions.filter(t => 
      t.status === 'Completed' || t.status === 'completed'
    );

    // Group by month
    const monthlySpend = {};
    const quarterlySpend = {};
    const recipientSpend = {};
    
    completedTransfers.forEach(txn => {
      const amount = parseFloat(txn.amount) || 0;
      const date = new Date(txn.date || txn.createdAt);
      
      // Monthly
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlySpend[monthKey]) {
        monthlySpend[monthKey] = { total: 0, count: 0, month: monthKey };
      }
      monthlySpend[monthKey].total += amount;
      monthlySpend[monthKey].count += 1;

      // Quarterly
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const quarterKey = `${date.getFullYear()}-Q${quarter}`;
      if (!quarterlySpend[quarterKey]) {
        quarterlySpend[quarterKey] = { total: 0, count: 0, quarter: quarterKey };
      }
      quarterlySpend[quarterKey].total += amount;
      quarterlySpend[quarterKey].count += 1;

      // By recipient
      const recipientName = txn.recipient || 'Unknown';
      if (!recipientSpend[recipientName]) {
        recipientSpend[recipientName] = { 
          name: recipientName, 
          total: 0, 
          count: 0,
          recipientId: txn.recipientId,
        };
      }
      recipientSpend[recipientName].total += amount;
      recipientSpend[recipientName].count += 1;
    });

    // Sort monthly data
    const monthlyData = Object.values(monthlySpend)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    // Sort quarterly data
    const quarterlyData = Object.values(quarterlySpend)
      .sort((a, b) => a.quarter.localeCompare(b.quarter))
      .slice(-8); // Last 8 quarters

    // Top recipients
    const topRecipients = Object.values(recipientSpend)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Calculate averages and trends
    const totalAmount = completedTransfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const avgTransferSize = completedTransfers.length > 0 ? totalAmount / completedTransfers.length : 0;

    // Month over month change
    let momChange = 0;
    if (monthlyData.length >= 2) {
      const currentMonth = monthlyData[monthlyData.length - 1].total;
      const previousMonth = monthlyData[monthlyData.length - 2].total;
      if (previousMonth > 0) {
        momChange = ((currentMonth - previousMonth) / previousMonth) * 100;
      }
    }

    return {
      monthlyData,
      quarterlyData,
      topRecipients,
      totalAmount,
      totalTransfers: completedTransfers.length,
      avgTransferSize,
      momChange,
      uniqueRecipients: Object.keys(recipientSpend).length,
    };
  }, [transactions]);

  // ==================== TAX & COMPLIANCE ====================
  const taxReports = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const completedTransfers = transactions.filter(t => 
      t.status === 'Completed' || t.status === 'completed'
    );

    // Group payments by recipient and year for 1099 prep
    const recipientPayments = {};
    const yearlyTotals = {};

    completedTransfers.forEach(txn => {
      const amount = parseFloat(txn.amount) || 0;
      const date = new Date(txn.date || txn.createdAt);
      const year = date.getFullYear();
      const recipientName = txn.recipient || 'Unknown';

      // Yearly totals
      if (!yearlyTotals[year]) {
        yearlyTotals[year] = { total: 0, count: 0, fees: 0 };
      }
      yearlyTotals[year].total += amount;
      yearlyTotals[year].count += 1;
      yearlyTotals[year].fees += parseFloat(txn.fee) || 0;

      // Recipient payments by year (for 1099s)
      const key = `${recipientName}-${year}`;
      if (!recipientPayments[key]) {
        recipientPayments[key] = {
          recipientName,
          recipientId: txn.recipientId,
          year,
          totalPaid: 0,
          transactionCount: 0,
          transactions: [],
        };
      }
      recipientPayments[key].totalPaid += amount;
      recipientPayments[key].transactionCount += 1;
      recipientPayments[key].transactions.push({
        date: txn.date || txn.createdAt,
        amount,
        reference: txn.reference,
        invoiceNumber: txn.invoiceNumber,
      });
    });

    // Find recipients receiving $600+ (1099-NEC threshold)
    const requires1099 = Object.values(recipientPayments)
      .filter(r => r.year === currentYear && r.totalPaid >= 600)
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // All recipient payments for current year
    const currentYearPayments = Object.values(recipientPayments)
      .filter(r => r.year === currentYear)
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Get recipient details for tax export
    const enrichedPayments = currentYearPayments.map(payment => {
      const recipient = recipients.find(r => 
        r.name === payment.recipientName || r.id === payment.recipientId
      );
      return {
        ...payment,
        recipientEmail: recipient?.email || '',
        recipientCountry: recipient?.country || 'Philippines',
        recipientType: recipient?.type || 'business',
      };
    });

    return {
      yearlyTotals: Object.entries(yearlyTotals)
        .map(([year, data]) => ({ year: parseInt(year), ...data }))
        .sort((a, b) => b.year - a.year),
      requires1099,
      currentYearPayments: enrichedPayments,
      currentYear,
      total1099Recipients: requires1099.length,
      total1099Amount: requires1099.reduce((sum, r) => sum + r.totalPaid, 0),
    };
  }, [transactions, recipients]);

  // ==================== EXPORT FUNCTIONS ====================
  const generateCSVExport = (year = new Date().getFullYear()) => {
    const payments = taxReports.currentYearPayments.filter(p => p.year === year);
    
    const headers = [
      'Recipient Name',
      'Recipient Type',
      'Email',
      'Country',
      'Total Paid (USD)',
      'Transaction Count',
      'Requires 1099-NEC',
    ];

    const rows = payments.map(p => [
      p.recipientName,
      p.recipientType,
      p.recipientEmail,
      p.recipientCountry,
      p.totalPaid.toFixed(2),
      p.transactionCount,
      p.totalPaid >= 600 ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  };

  const generateDetailedExport = (year = new Date().getFullYear()) => {
    const completedTransfers = transactions.filter(t => {
      const date = new Date(t.date || t.createdAt);
      return date.getFullYear() === year && 
        (t.status === 'Completed' || t.status === 'completed');
    });

    const headers = [
      'Date',
      'Recipient',
      'Amount (USD)',
      'Fee (USD)',
      'Reference',
      'Invoice Number',
      'Status',
    ];

    const rows = completedTransfers.map(t => [
      t.date || t.createdAt?.split('T')[0],
      t.recipient,
      (parseFloat(t.amount) || 0).toFixed(2),
      (parseFloat(t.fee) || 0).toFixed(2),
      t.reference || '',
      t.invoiceNumber || '',
      t.status,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  };

  return {
    costSavings,
    spendAnalytics,
    taxReports,
    generateCSVExport,
    generateDetailedExport,
  };
}

export default useUSAnalytics;
