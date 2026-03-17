import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, FileText, Check, X, AlertCircle, Trash2, Play, 
  Download, ChevronRight, DollarSign, Users, Clock,
  CheckCircle, XCircle, Loader, Edit2, Plus
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { executeTransfer } from '../../utils/cybrid';
import { secureLog, secureError } from '../../utils/secureLogging';
import { validateAmount } from '../../utils/validators';

// CSV Template columns
const CSV_COLUMNS = ['recipient_name', 'recipient_email', 'amount', 'description', 'reference'];

function BulkPayments({ user, recipients = [], onTransferComplete, onNavigate, embedded = false }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedPayments, setParsedPayments] = useState([]);
  const [parseError, setParseError] = useState('');
  const [batchName, setBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  
  const fileInputRef = useRef(null);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bulk_payment_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (err) {
      secureError('Error fetching bulk batches:', err);
      setError('Failed to load bulk payments');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Validate required columns
    const requiredColumns = ['recipient_name', 'amount'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const payments = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted values with commas
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const payment = { row_number: i + 1 };
      headers.forEach((header, idx) => {
        payment[header] = values[idx]?.replace(/"/g, '') || '';
      });

      // Validate amount
      const amount = parseFloat(payment.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount "${payment.amount}"`);
        continue;
      }
      payment.amount = amount;

      // Validate recipient name
      if (!payment.recipient_name) {
        errors.push(`Row ${i + 1}: Missing recipient name`);
        continue;
      }

      // Try to match with existing recipient
      const matchedRecipient = recipients.find(r => 
        r.name?.toLowerCase() === payment.recipient_name?.toLowerCase() ||
        r.email?.toLowerCase() === payment.recipient_email?.toLowerCase()
      );
      
      if (matchedRecipient) {
        payment.recipient_id = matchedRecipient.id;
        payment.matched = true;
      }

      payment.status = 'pending';
      payments.push(payment);
    }

    if (errors.length > 0 && payments.length === 0) {
      throw new Error(`All rows have errors:\n${errors.join('\n')}`);
    }

    return { payments, errors };
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    setParseError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { payments, errors } = parseCSV(event.target.result);
        setParsedPayments(payments);
        if (errors.length > 0) {
          setParseError(`Warning: ${errors.length} row(s) skipped due to errors`);
        }
      } catch (err) {
        setParseError(err.message);
        setParsedPayments([]);
      }
    };
    reader.readAsText(file);
  };

  // Create batch
  const handleCreateBatch = async () => {
    if (parsedPayments.length === 0) {
      setParseError('No valid payments to process');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const totalAmount = parsedPayments.reduce((sum, p) => sum + p.amount, 0);

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('bulk_payment_batches')
        .insert({
          user_id: user.id,
          name: batchName || `Bulk Payment ${new Date().toLocaleDateString()}`,
          source_file_name: uploadedFile?.name,
          total_payments: parsedPayments.length,
          total_amount: totalAmount,
          status: 'draft'
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create payment items
      const items = parsedPayments.map(p => ({
        batch_id: batch.id,
        recipient_id: p.recipient_id || null,
        recipient_name: p.recipient_name,
        recipient_email: p.recipient_email || null,
        amount: p.amount,
        description: p.description || null,
        reference: p.reference || null,
        row_number: p.row_number,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('bulk_payment_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Refresh batches
      await fetchBatches();
      
      // Reset modal
      setShowUploadModal(false);
      setUploadedFile(null);
      setParsedPayments([]);
      setBatchName('');
      setParseError('');
      
      setSuccess('Batch created successfully. Review and process when ready.');
      setTimeout(() => setSuccess(''), 5000);
      
      secureLog('Bulk batch created', { batch_id: batch.id, count: parsedPayments.length, total: totalAmount });
    } catch (err) {
      secureError('Error creating batch:', err);
      setError(err.message || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  // View batch details
  const viewBatch = async (batch) => {
    try {
      const { data: items, error } = await supabase
        .from('bulk_payment_items')
        .select('*')
        .eq('batch_id', batch.id)
        .order('row_number', { ascending: true });

      if (error) throw error;

      setSelectedBatch({ ...batch, items: items || [] });
      setShowBatchModal(true);
    } catch (err) {
      secureError('Error fetching batch items:', err);
      setError('Failed to load batch details');
    }
  };

  // Process batch
  const processBatch = async (batch) => {
    if (!confirm(`Are you sure you want to process ${batch.total_payments} payments totaling $${batch.total_amount.toLocaleString()}?`)) {
      return;
    }

    setProcessing(true);
    setProcessProgress({ current: 0, total: batch.total_payments });

    try {
      // Update batch status
      await supabase
        .from('bulk_payment_batches')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', batch.id);

      // Get items
      const { data: items } = await supabase
        .from('bulk_payment_items')
        .select('*')
        .eq('batch_id', batch.id)
        .eq('status', 'pending');

      let completed = 0;
      let failed = 0;

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setProcessProgress({ current: i + 1, total: items.length });

        try {
          // Find recipient data
          let recipientData;
          if (item.recipient_id) {
            recipientData = recipients.find(r => r.id === item.recipient_id);
          } else {
            // Try to match by name/email
            recipientData = recipients.find(r => 
              r.name?.toLowerCase() === item.recipient_name?.toLowerCase() ||
              r.email?.toLowerCase() === item.recipient_email?.toLowerCase()
            );
          }

          if (!recipientData) {
            throw new Error('Recipient not found in your recipients list');
          }

          // Execute transfer via Cybrid
          const result = await executeTransfer(supabase, item.amount, recipientData);

          if (!result.success) {
            throw new Error(result.error || 'Transfer failed');
          }

          // Update item status
          await supabase
            .from('bulk_payment_items')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString(),
              cybrid_transfer_guid: result.transfer_guid
            })
            .eq('id', item.id);

          // Create transaction record
          if (onTransferComplete) {
            await onTransferComplete({
              id: `TXN-${Date.now().toString().slice(-6)}`,
              cybrid_transfer_guid: result.transfer_guid,
              type: 'Sent',
              recipient: item.recipient_name,
              status: 'completed',
              amount: item.amount,
              date: new Date().toISOString().split('T')[0]
            }, recipientData);
          }

          completed++;
        } catch (err) {
          secureError(`Bulk payment item ${item.id} failed:`, err);
          
          await supabase
            .from('bulk_payment_items')
            .update({
              status: 'failed',
              error_message: err.message
            })
            .eq('id', item.id);

          failed++;
        }

        // Small delay between transfers to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update batch status
      const finalStatus = failed === items.length ? 'failed' : 'completed';
      await supabase
        .from('bulk_payment_batches')
        .update({
          status: finalStatus,
          completed_payments: completed,
          failed_payments: failed,
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      await fetchBatches();
      setShowBatchModal(false);
      
      if (failed > 0) {
        setError(`Batch completed with ${failed} failed payment(s). ${completed} succeeded.`);
      } else {
        setSuccess(`All ${completed} payments processed successfully!`);
      }
      setTimeout(() => { setError(''); setSuccess(''); }, 5000);

      secureLog('Bulk batch processed', { batch_id: batch.id, completed, failed });
    } catch (err) {
      secureError('Error processing batch:', err);
      setError('Failed to process batch');
    } finally {
      setProcessing(false);
      setProcessProgress({ current: 0, total: 0 });
    }
  };

  // Delete batch
  const deleteBatch = async (batchId) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
      await supabase.from('bulk_payment_items').delete().eq('batch_id', batchId);
      await supabase.from('bulk_payment_batches').delete().eq('id', batchId);
      
      setBatches(batches.filter(b => b.id !== batchId));
      setShowBatchModal(false);
      setSuccess('Batch deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      secureError('Error deleting batch:', err);
      setError('Failed to delete batch');
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = CSV_COLUMNS.join(',');
    const example = 'John Doe,john@example.com,1000.00,Monthly payment,INV-001';
    const csv = `${headers}\n${example}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_payment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      case 'draft': return 'bg-gray-500/20 text-gray-400 dark:text-gray-500';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400 dark:text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className={embedded ? '' : 'p-4 md:p-8'}>
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'p-4 md:p-8'}>
      <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Bulk Payments</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Send payments to multiple recipients at once
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Processing Progress */}
        {processing && (
          <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Loader className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-400 font-medium">Processing payments...</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {processProgress.current} of {processProgress.total} payments
            </p>
          </div>
        )}

        {/* Batches List */}
        {batches.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 md:p-12 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500 dark:text-gray-400 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No bulk payments yet</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Upload a CSV file to send payments to multiple recipients at once
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                onClick={() => viewBatch(batch)}
                className="bg-gray-800 rounded-2xl border border-gray-700 p-4 md:p-6 cursor-pointer hover:border-gray-600 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{batch.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(batch.status)}`}>
                          {batch.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {batch.total_payments} payments • ${batch.total_amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {batch.status === 'completed' && (
                      <div className="text-sm text-right">
                        <p className="text-emerald-400">{batch.completed_payments} completed</p>
                        {batch.failed_payments > 0 && (
                          <p className="text-red-400">{batch.failed_payments} failed</p>
                        )}
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center sm:p-4 z-50">
            <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl border border-gray-700 w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                <h2 className="text-base sm:text-lg font-semibold">Create Bulk Payment</h2>
                <button
                  onClick={() => { setShowUploadModal(false); setUploadedFile(null); setParsedPayments([]); setParseError(''); }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Batch Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    Batch Name (optional)
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder={`Bulk Payment ${new Date().toLocaleDateString()}`}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                    CSV File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      uploadedFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {uploadedFile ? (
                      <>
                        <FileText className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                        <p className="font-medium text-emerald-400">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          {parsedPayments.length} valid payment(s) found
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                        <p className="text-gray-400 dark:text-gray-500">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">CSV file only</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Parse Error */}
                {parseError && (
                  <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {parseError}
                  </div>
                )}

                {/* Preview */}
                {parsedPayments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
                      Preview ({parsedPayments.length} payments)
                    </h3>
                    <div className="bg-gray-700/50 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2 text-gray-400 dark:text-gray-500">Recipient</th>
                            <th className="text-right px-4 py-2 text-gray-400 dark:text-gray-500">Amount</th>
                            <th className="text-center px-4 py-2 text-gray-400 dark:text-gray-500">Matched</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {parsedPayments.slice(0, 10).map((p, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2">
                                <p className="font-medium">{p.recipient_name}</p>
                                {p.recipient_email && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.recipient_email}</p>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">${p.amount.toLocaleString()}</td>
                              <td className="px-4 py-2 text-center">
                                {p.matched ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-yellow-400 mx-auto" title="Recipient not found" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedPayments.length > 10 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
                          +{parsedPayments.length - 10} more payments
                        </p>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="mt-4 p-4 bg-gray-700/50 rounded-xl flex flex-wrap gap-4">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Total Amount</p>
                        <p className="font-semibold text-lg">
                          ${parsedPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Payments</p>
                        <p className="font-semibold text-lg">{parsedPayments.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Matched Recipients</p>
                        <p className="font-semibold text-lg">
                          {parsedPayments.filter(p => p.matched).length} / {parsedPayments.length}
                        </p>
                      </div>
                    </div>

                    {parsedPayments.some(p => !p.matched) && (
                      <p className="text-xs text-yellow-400 mt-2">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Some recipients are not in your recipients list. Add them before processing.
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowUploadModal(false); setUploadedFile(null); setParsedPayments([]); setParseError(''); }}
                    className="flex-1 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBatch}
                    disabled={creating || parsedPayments.length === 0}
                    className="flex-1 py-3 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Create Batch
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Detail Modal */}
        {showBatchModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center sm:p-4 z-50">
            <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl border border-gray-700 w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold truncate">{selectedBatch.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                    Created {new Date(selectedBatch.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-gray-700/50 rounded-xl p-3 sm:p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                    <p className="text-lg sm:text-xl font-bold">${selectedBatch.total_amount?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-3 sm:p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Payments</p>
                    <p className="text-lg sm:text-xl font-bold">{selectedBatch.total_payments}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-3 sm:p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Completed</p>
                    <p className="text-lg sm:text-xl font-bold text-emerald-400">{selectedBatch.completed_payments || 0}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-3 sm:p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Failed</p>
                    <p className="text-lg sm:text-xl font-bold text-red-400">{selectedBatch.failed_payments || 0}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-700/50 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-400 dark:text-gray-500">Recipient</th>
                        <th className="text-right px-4 py-3 text-gray-400 dark:text-gray-500">Amount</th>
                        <th className="text-center px-4 py-3 text-gray-400 dark:text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {selectedBatch.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.recipient_name}</p>
                            {item.reference && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.reference}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">${item.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            {item.error_message && (
                              <p className="text-xs text-red-400 mt-1">{item.error_message}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  {selectedBatch.status === 'draft' && (
                    <>
                      <button
                        onClick={() => deleteBatch(selectedBatch.id)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => processBatch(selectedBatch)}
                        disabled={processing}
                        className="flex-1 py-3 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-5 h-5" />
                        Process All Payments
                      </button>
                    </>
                  )}
                  {selectedBatch.status === 'completed' && (
                    <button
                      onClick={() => setShowBatchModal(false)}
                      className="flex-1 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkPayments;
