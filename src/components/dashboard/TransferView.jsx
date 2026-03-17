/**
 * TransferView - Refactored
 * 
 * US users can only send to verified Philippines recipients.
 * No bulk payments, no manual recipient creation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { executeTransfer as cybridTransfer } from '../../utils/cybrid';
import { secureError } from '../../utils/secureLogging';
import { useExchangeRate } from '../../hooks';

// Sub-components
import { RecipientSelector } from '../transfer/RecipientSelector';
import { AmountInput } from '../transfer/AmountInput';
import { TransferReview } from '../transfer/TransferReview';
import { TransferProcessing, TransferSuccess, TransferError } from '../transfer/TransferStatus';

// Fixed fee percentage - always 0.5%
const FEE_PERCENTAGE = 0.5;

// EDD threshold in PHP (500,000)
const EDD_THRESHOLD_PHP = 500000;

// Transfer amount limits
const MIN_TRANSFER_USD = 500;
const MAX_TRANSFER_USD = 1000000;

function TransferView({ 
  supabase, 
  user, 
  recipients, 
  onTransferComplete, 
  onNavigate, 
  pendingInvoicePayment, 
  onClearPendingPayment, 
  onRequireReauth,
  systemControls 
}) {
  // Step state (1-6)
  const [step, setStep] = useState(1);
  
  // Transfer data
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // EDD state
  const [eddDocuments, setEddDocuments] = useState([]);
  const [showEddModal, setShowEddModal] = useState(false);
  const [eddVerifiedUntil, setEddVerifiedUntil] = useState(null);
  
  // Check if user has valid EDD verification (within 3 months)
  useEffect(() => {
    const checkEddStatus = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('users')
          .select('edd_verified_at')
          .eq('id', user.id)
          .single();
        
        if (data?.edd_verified_at) {
          const verifiedDate = new Date(data.edd_verified_at);
          const threeMonthsLater = new Date(verifiedDate);
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          
          if (new Date() < threeMonthsLater) {
            setEddVerifiedUntil(threeMonthsLater);
          }
        }
      } catch (err) {
        // EDD status check failed, assume not verified
      }
    };
    checkEddStatus();
  }, [user?.id, supabase]);
  
  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [completedTransaction, setCompletedTransaction] = useState(null);
  
  // Exchange rate from hook
  const { 
    rate: exchangeRate, 
    loading: rateLoading, 
    error: rateError, 
    refresh: refreshRate,
    canProceed: rateCanProceed 
  } = useExchangeRate();

  // Calculate fees - always 0.5%
  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const fee = numericAmount * (FEE_PERCENTAGE / 100);
  const hasUsdReceiverFee = selectedRecipient?.receivingCurrency === 'USD';
  const receiverFee = hasUsdReceiverFee ? 10 : 0;
  const totalFee = fee + receiverFee;
  const phpAmount = exchangeRate ? ((numericAmount - fee) * exchangeRate).toFixed(2) : null;
  
  // Check if EDD is required (> 500,000 PHP and not already verified)
  const requiresEdd = phpAmount && parseFloat(phpAmount) > EDD_THRESHOLD_PHP && !eddVerifiedUntil;

  // Handle pending invoice payment
  useEffect(() => {
    if (pendingInvoicePayment) {
      const invoiceAmount = parseFloat(pendingInvoicePayment.amount?.replace(/[$,]/g, '') || 0);
      setAmount(invoiceAmount.toString());
      
      const senderRecipient = recipients.find(r => 
        r.email === pendingInvoicePayment.senderEmail || 
        r.name === pendingInvoicePayment.senderName
      );
      
      if (senderRecipient) {
        setSelectedRecipient(senderRecipient);
        setStep(3);
      } else {
        setSelectedRecipient({
          id: 'invoice-sender',
          name: pendingInvoicePayment.senderName || 'Invoice Sender',
          email: pendingInvoicePayment.senderEmail || '',
          isTemporary: true
        });
        setStep(3);
      }
    }
  }, [pendingInvoicePayment, recipients]);

  // Execute the transfer
  const executeTransfer = async () => {
    setIsLoading(true);
    setStep(4); // Processing
    setTransferError(null);
    
    // Validate
    if (!exchangeRate || rateError) {
      setTransferError('Cannot proceed: Exchange rate unavailable.');
      setIsLoading(false);
      setStep(6);
      return;
    }

    // Check minimum amount
    if (numericAmount < MIN_TRANSFER_USD) {
      setTransferError(`Minimum transfer amount is $${MIN_TRANSFER_USD.toLocaleString()}.`);
      setIsLoading(false);
      setStep(6);
      return;
    }

    // Check maximum amount
    if (numericAmount > MAX_TRANSFER_USD) {
      setTransferError(`Maximum transfer amount is $${MAX_TRANSFER_USD.toLocaleString()}.`);
      setIsLoading(false);
      setStep(6);
      return;
    }
    
    if (systemControls?.transfersEnabled === false) {
      setTransferError('Transfers are temporarily disabled.');
      setIsLoading(false);
      setStep(6);
      return;
    }
    
    if (systemControls?.maxTransferAmount && numericAmount > systemControls.maxTransferAmount) {
      setTransferError(`Amount exceeds maximum ($${systemControls.maxTransferAmount.toLocaleString()}).`);
      setIsLoading(false);
      setStep(6);
      return;
    }

    // Check EDD requirement
    if (requiresEdd && eddDocuments.length < 3) {
      setTransferError('Enhanced Due Diligence requires 3 bank statements for transfers exceeding ₱500,000.');
      setIsLoading(false);
      setStep(6);
      return;
    }
    
    try {
      const cybridResult = await cybridTransfer(supabase, numericAmount, selectedRecipient);
      
      if (!cybridResult.success) {
        if (cybridResult.blocked && cybridResult.reason === 'sanctions') {
          setTransferError('Transfer blocked: Recipient did not pass compliance screening.');
        } else {
          setTransferError(cybridResult.error || 'Transfer failed. Please try again.');
        }
        setIsLoading(false);
        setStep(6);
        return;
      }
      
      // Success - create transaction record
      const newTxn = {
        id: `TXN-${Date.now().toString().slice(-6)}`,
        cybrid_transfer_guid: cybridResult.transfer_guid,
        type: 'Sent',
        recipient: selectedRecipient.name,
        status: 'completed',
        amount: numericAmount,
        fee,
        receiverFee,
        totalFee,
        feePercentage: FEE_PERCENTAGE,
        phpAmount: hasUsdReceiverFee ? null : parseFloat(phpAmount),
        receivingCurrency: selectedRecipient.receivingCurrency || 'PHP',
        exchangeRate,
        date: new Date().toISOString().split('T')[0]
      };
      
      await onTransferComplete(newTxn, selectedRecipient);
      setCompletedTransaction(newTxn);
      
      setTimeout(() => {
        setIsLoading(false);
        setStep(5); // Success
      }, 2000);
      
    } catch (error) {
      secureError('Transfer error:', error);
      setTransferError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
      setStep(6);
    }
  };

  // Handle send button
  const handleSendTransfer = () => {
    if (!exchangeRate || rateError) {
      setTransferError('Cannot proceed: Exchange rate unavailable.');
      return;
    }
    
    // Check EDD requirement
    if (requiresEdd && eddDocuments.length < 3) {
      setShowEddModal(true);
      return;
    }
    
    executeTransfer();
  };

  // Reset for new transfer
  const resetTransfer = () => {
    setStep(1);
    setSelectedRecipient(null);
    setAmount('');
    setTransferError(null);
    setCompletedTransaction(null);
    setEddDocuments([]);
    if (onClearPendingPayment) onClearPendingPayment();
  };

  // Navigation between steps
  const goToStep = (newStep) => {
    if (newStep === 2 && !selectedRecipient) return;
    if (newStep === 3 && (!selectedRecipient || !amount)) return;
    setStep(newStep);
  };

  // Filter to only show verified Philippines recipients
  const verifiedRecipients = recipients.filter(r => 
    r.country === 'Philippines' && 
    r.verificationStatus === 'verified'
  );

  // Progress bar percentage
  const progressPercent = step <= 3 ? ((step - 1) / 2) * 100 : 100;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Send Payment</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Fast, secure transfers to verified Philippines recipients</p>
        </div>

        {/* No verified recipients warning */}
        {verifiedRecipients.length === 0 && step === 1 && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-500/30 rounded-none flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-700 font-medium">No verified recipients</p>
              <p className="text-yellow-700/70 text-sm mt-1">
                You can only send payments to verified Philippines recipients. 
                Recipients must complete verification through the Zyp platform before you can transfer to them.
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {step <= 3 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className={step >= 1 ? 'text-emerald-700 font-medium' : 'text-gray-500 dark:text-gray-400'}>Recipient</span>
              <span className={step >= 2 ? 'text-emerald-700 font-medium' : 'text-gray-500 dark:text-gray-400'}>Amount</span>
              <span className={step >= 3 ? 'text-emerald-700 font-medium' : 'text-gray-500 dark:text-gray-400'}>Review</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-none border border-gray-200 dark:border-gray-700 p-6">
          {step === 1 && (
            <RecipientSelector
              recipients={verifiedRecipients}
              selectedRecipient={selectedRecipient}
              onSelect={(r) => {
                setSelectedRecipient(r);
                setStep(2);
              }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              allowAdd={false}
            />
          )}

          {step === 2 && (
            <>
              <button 
                onClick={() => setStep(1)} 
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to recipient
              </button>
              <AmountInput
                amount={amount}
                setAmount={setAmount}
                exchangeRate={exchangeRate}
                rateError={rateError}
                rateLoading={rateLoading}
                onRefreshRate={refreshRate}
                fee={fee}
                feePercentage={`${FEE_PERCENTAGE}%`}
                receiverFee={receiverFee}
                phpAmount={phpAmount}
                selectedRecipient={selectedRecipient}
                requiresEdd={requiresEdd}
                minAmount={MIN_TRANSFER_USD}
                maxAmount={MAX_TRANSFER_USD}
                eddVerifiedUntil={eddVerifiedUntil}
              />
              <button
                onClick={() => setStep(3)}
                disabled={!amount || numericAmount < MIN_TRANSFER_USD || numericAmount > MAX_TRANSFER_USD || !exchangeRate}
                className="w-full mt-6 py-3 bg-emerald-500 text-white font-semibold rounded-none hover:bg-emerald-400 disabled:opacity-50"
              >
                Continue to Review
              </button>
            </>
          )}

          {step === 3 && (
            <TransferReview
              selectedRecipient={selectedRecipient}
              amount={amount}
              fee={fee}
              feePercentage={`${FEE_PERCENTAGE}%`}
              receiverFee={receiverFee}
              phpAmount={phpAmount}
              exchangeRate={exchangeRate}
              isLoading={isLoading}
              error={transferError}
              onConfirm={handleSendTransfer}
              onBack={() => setStep(2)}
              requiresEdd={requiresEdd}
              eddDocuments={eddDocuments}
              onUploadEdd={() => setShowEddModal(true)}
              eddVerifiedUntil={eddVerifiedUntil}
            />
          )}

          {step === 4 && <TransferProcessing />}

          {step === 5 && (
            <TransferSuccess
              transaction={completedTransaction}
              recipient={selectedRecipient}
              onNewTransfer={resetTransfer}
              onViewHistory={() => onNavigate('history')}
            />
          )}

          {step === 6 && (
            <TransferError
              error={transferError}
              onRetry={() => setStep(3)}
              onBack={resetTransfer}
            />
          )}
        </div>

        {/* EDD Upload Modal */}
        {showEddModal && (
          <EddUploadModal
            isOpen={showEddModal}
            onClose={() => setShowEddModal(false)}
            onUpload={async (docs) => {
              setEddDocuments(docs);
              setShowEddModal(false);
              
              // Save EDD verification date
              if (user?.id) {
                const threeMonthsLater = new Date();
                threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                setEddVerifiedUntil(threeMonthsLater);
                
                try {
                  await supabase
                    .from('users')
                    .update({ edd_verified_at: new Date().toISOString() })
                    .eq('id', user.id);
                } catch (err) {
                  console.error('Failed to save EDD verification:', err);
                }
              }
            }}
            documents={eddDocuments}
            eddVerifiedUntil={eddVerifiedUntil}
          />
        )}

        {/* System Status Warning */}
        {systemControls?.transfersEnabled === false && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-500/30 rounded-none flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0" />
            <p className="text-yellow-700 text-sm">
              Transfers are temporarily disabled for maintenance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// EDD Upload Modal Component
function EddUploadModal({ isOpen, onClose, onUpload, documents, eddVerifiedUntil }) {
  const [files, setFiles] = useState(documents || []);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles].slice(0, 3)); // Max 3 files
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length < 3) return;
    setUploading(true);
    // In production, upload files to storage here
    setTimeout(() => {
      setUploading(false);
      onUpload(files);
    }, 1000);
  };

  if (!isOpen) return null;

  const progressPercent = (files.length / 3) * 100;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-none w-full max-w-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Enhanced Due Diligence Required</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Transfers exceeding ₱500,000 require additional documentation
          </p>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            Please upload your last 3 months of bank statements to verify the source of funds.
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-300">Documents uploaded</span>
              <span className={files.length === 3 ? 'text-emerald-700 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                {files.length}/3
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${files.length === 3 ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* File Upload Area */}
          {files.length < 3 && (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-none p-6 text-center mb-4">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="edd-upload"
              />
              <label htmlFor="edd-upload" className="cursor-pointer">
                <div className="text-emerald-700 mb-2">
                  <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">Click to upload bank statements</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">PDF, PNG, or JPG ({3 - files.length} more needed)</p>
              </label>
            </div>
          )}

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="space-y-2 mb-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-none p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-600 dark:text-gray-300 hover:text-red-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 3-Month Note */}
          <div className="bg-blue-100 border border-blue-500/30 rounded-none p-4 mb-4">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> Once verified, you won't need to upload bank statements again for 3 months, even for future large transfers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={files.length < 3 || uploading}
              className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-none hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : files.length < 3 ? `Upload ${3 - files.length} More` : 'Submit Documents'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransferView;
