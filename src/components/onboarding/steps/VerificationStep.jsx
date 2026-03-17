/**
 * VerificationStep - Step 5 of Onboarding (US Users)
 * Identity verification via Persona and bank linking via Plaid
 */

import React, { useState } from 'react';
import { Shield, Building, Check, Loader, AlertTriangle } from 'lucide-react';

export function VerificationStep({ 
  onStartKYC, 
  onStartBankLink, 
  kycStatus, 
  bankLinkStatus,
  onComplete,
  onBack,
  error 
}) {
  const steps = [
    {
      id: 'kyc',
      title: 'Verify Identity',
      description: 'Quick ID verification to comply with regulations',
      icon: Shield,
      status: kycStatus, // 'pending' | 'in_progress' | 'completed' | 'failed'
      action: onStartKYC,
      actionText: 'Verify Now',
    },
    {
      id: 'bank',
      title: 'Link Bank Account',
      description: 'Connect your bank for ACH transfers',
      icon: Building,
      status: bankLinkStatus,
      action: onStartBankLink,
      actionText: 'Link Bank',
      disabled: kycStatus !== 'completed',
    }
  ];

  const allComplete = kycStatus === 'completed' && bankLinkStatus === 'completed';

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-emerald-400" />;
      case 'in_progress':
        return <Loader className="w-5 h-5 text-yellow-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-500 bg-emerald-500/10';
      case 'in_progress':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'failed':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-gray-700 bg-gray-800';
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Verification Required</h1>
        <p className="text-gray-400">Complete these steps to start sending payments</p>
      </div>

      {/* Verification Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 rounded-xl border transition-all ${getStatusColor(step.status)}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.status === 'completed' ? 'bg-emerald-500/20' : 'bg-gray-700'
              }`}>
                <step.icon className={`w-6 h-6 ${
                  step.status === 'completed' ? 'text-emerald-400' : 'text-gray-400'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  {getStatusIcon(step.status)}
                </div>
                <p className="text-sm text-gray-400 mb-3">{step.description}</p>
                
                {step.status !== 'completed' && (
                  <button
                    onClick={step.action}
                    disabled={step.disabled || step.status === 'in_progress'}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      step.disabled 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : step.status === 'in_progress'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-emerald-500 text-gray-900 hover:bg-emerald-400'
                    }`}
                  >
                    {step.status === 'in_progress' ? 'In Progress...' : step.actionText}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Info */}
      {!allComplete && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-blue-400 text-sm">
            <strong>Why verification?</strong> As a regulated financial service, we're required to verify 
            your identity before enabling transfers. This helps protect you and prevent fraud.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-600 rounded-xl hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!allComplete}
          className="flex-1 py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {allComplete ? 'Complete Setup' : 'Complete Steps Above'}
        </button>
      </div>
    </div>
  );
}

export default VerificationStep;
