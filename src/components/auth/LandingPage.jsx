import React from 'react';
import { Send, Clock, FileText } from 'lucide-react';

function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6">
        <img src="/zyp-logo.svg" alt="Zyp" className="h-8 md:h-10" />
        <button 
          onClick={onGetStarted}
          className="px-4 md:px-6 py-2 text-gray-300 hover:text-white transition-colors text-sm md:text-base"
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight">
          Cross-border payments,<br />
          <span className="text-emerald-400">simplified</span>
        </h1>
        <p className="text-base md:text-xl text-gray-400 mb-8 md:mb-10 max-w-2xl">
          Send payments to the Philippines faster and cheaper than traditional banks. 
          Built for businesses that move money across borders.
        </p>
        <button 
          onClick={onGetStarted}
          className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors text-base md:text-lg"
        >
          Get Started
        </button>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 mt-12 md:mt-20 max-w-4xl w-full">
          <div className="p-4 md:p-6 bg-gray-800/50 rounded-2xl border border-gray-700">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3 md:mb-4 mx-auto">
              <Send className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">Low Fees</h3>
            <p className="text-gray-400 text-xs md:text-sm">Starting at 0.35% for high-volume transfers. No hidden charges.</p>
          </div>
          <div className="p-4 md:p-6 bg-gray-800/50 rounded-2xl border border-gray-700">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3 md:mb-4 mx-auto">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">Fast Delivery</h3>
            <p className="text-gray-400 text-xs md:text-sm">Most transfers arrive within 1-2 hours, not days.</p>
          </div>
          <div className="p-4 md:p-6 bg-gray-800/50 rounded-2xl border border-gray-700">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3 md:mb-4 mx-auto">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">Invoice Management</h3>
            <p className="text-gray-400 text-xs md:text-sm">Track receivables, payables, and payment status in one place.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 md:py-6 text-center text-gray-500 text-xs md:text-sm">
        © 2025 Zyp. All rights reserved.
      </footer>
    </div>
  );
}

export default LandingPage;
