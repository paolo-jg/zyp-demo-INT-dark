/**
 * CompletionStep - Final Step of Onboarding
 * Shows success message and next steps
 */

import React from 'react';
import { Check, Send, FileText, Users, ArrowRight } from 'lucide-react';

export function CompletionStep({ country, accountType, onGoToDashboard }) {
  const isUS = country === 'United States';
  
  const nextSteps = isUS ? [
    {
      icon: Send,
      title: 'Send Your First Payment',
      description: 'Transfer funds to Philippines recipients instantly'
    },
    {
      icon: Users,
      title: 'Add Recipients',
      description: 'Save your frequent payees for quick transfers'
    },
    {
      icon: FileText,
      title: 'Create Invoices',
      description: 'Bill your clients professionally'
    }
  ] : [
    {
      icon: FileText,
      title: 'Send Invoices',
      description: 'Bill your US clients for your services'
    },
    {
      icon: Users,
      title: 'Add Clients',
      description: 'Save your client information for quick invoicing'
    },
    {
      icon: Send,
      title: 'Receive Payments',
      description: 'Get paid directly to your bank account'
    }
  ];

  return (
    <div className="max-w-md mx-auto text-center">
      {/* Success Animation */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-12 h-12 text-emerald-400" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-2 border-emerald-500/30 animate-ping" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">You're All Set!</h1>
      <p className="text-gray-400 mb-8">
        Your Zyp account is ready to use. {isUS ? 'Start sending payments to the Philippines.' : 'Start receiving payments from the US.'}
      </p>

      {/* Next Steps */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8 text-left">
        <h2 className="font-semibold mb-4">What's Next?</h2>
        <div className="space-y-4">
          {nextSteps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <step.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onGoToDashboard}
        className="w-full py-4 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
      >
        Go to Dashboard
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Support Note */}
      <p className="text-gray-500 text-sm mt-6">
        Need help? Contact us at <a href="mailto:support@tryzyp.com" className="text-emerald-400 hover:underline">support@tryzyp.com</a>
      </p>
    </div>
  );
}

export default CompletionStep;
