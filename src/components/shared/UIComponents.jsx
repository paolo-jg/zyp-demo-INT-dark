// UI Components: Toast notifications, Pull-to-refresh, Offline indicator
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, WifiOff, RefreshCw } from 'lucide-react';
import { secureError } from '../../utils/secureLogging';

// ==================== TOAST NOTIFICATIONS ====================

const ToastContext = React.createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: 5000,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return {
    ...context,
    success: (message, options = {}) => context.addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => context.addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => context.addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => context.addToast({ type: 'info', message, ...options }),
  };
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };
  
  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <span className="flex-1 text-sm">{toast.message}</span>
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 hover:bg-white/10 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ==================== PULL TO REFRESH ====================

export function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;
  
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;
    
    // Only enable pull-to-refresh when scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);
  
  const handleTouchMove = useCallback((e) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Resistance effect - harder to pull further
      const resistance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(resistance);
    }
  }, [isPulling, disabled, isRefreshing]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
    currentY.current = 0;
  }, [isPulling, pullDistance, onRefresh, disabled]);
  
  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="pull-to-refresh"
        style={{
          height: pullDistance,
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
        }}
      >
        <div className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 ${isRefreshing ? 'animate-pulse' : ''}`}>
          <RefreshCw
            className={`w-5 h-5 transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
            }}
          />
          <span className="text-sm">
            {isRefreshing
              ? 'Refreshing...'
              : pullDistance >= PULL_THRESHOLD
              ? 'Release to refresh'
              : 'Pull to refresh'}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ==================== OFFLINE INDICATOR ====================

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial state
    if (!navigator.onLine) {
      setShowBanner(true);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!showBanner) return null;
  
  return (
    <div
      className={`offline-banner ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Changes will sync when you reconnect.</span>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== EXPORT MODAL ====================

export function ExportModal({ isOpen, onClose, onExport, title, count }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Export {count} records to your preferred format.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              onExport('csv');
              onClose();
            }}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center gap-3 transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-1000/20 rounded-lg flex items-center justify-center">
              <span className="text-emerald-700 text-xs font-bold">CSV</span>
            </div>
            <div>
              <div className="font-medium">CSV File</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Best for spreadsheets & analysis</div>
            </div>
          </button>
          
          <button
            onClick={() => {
              onExport('pdf');
              onClose();
            }}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center gap-3 transition-colors"
          >
            <div className="w-10 h-10 bg-red-1000/20 rounded-lg flex items-center justify-center">
              <span className="text-red-700 text-xs font-bold">PDF</span>
            </div>
            <div>
              <div className="font-medium">PDF Document</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Best for printing & sharing</div>
            </div>
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ==================== ERROR BOUNDARY ====================

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    secureError('Error caught by boundary:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-1000/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-700" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-emerald-1000 hover:bg-emerald-600 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default {
  ToastProvider,
  useToast,
  PullToRefresh,
  OfflineIndicator,
  ExportModal,
  ErrorBoundary,
};
