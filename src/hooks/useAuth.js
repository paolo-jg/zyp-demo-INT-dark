/**
 * useAuth Hook
 * Handles session management, timeouts, and re-authentication
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  initSessionTimeout,
  resetSessionTimeout,
  clearSessionTimeout,
  getSessionTimeRemaining,
  recordReauth,
  clearReauth,
  verifyPin,
  AUTH_CONFIG,
} from '../utils/authSecurity';
import { logAuthEvent, AUDIT_EVENTS } from '../utils/auditLog';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    clearSessionTimeout();
    clearReauth();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  return { session, loading, signOut };
}

export function useSessionTimeout() {
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);

  const handleSessionTimeout = useCallback(async () => {
    await logAuthEvent(AUDIT_EVENTS.SESSION_TIMEOUT);
    clearSessionTimeout();
    clearReauth();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const handleSessionWarning = useCallback((secondsRemaining) => {
    setSessionTimeRemaining(secondsRemaining);
    setShowSessionWarning(true);
  }, []);

  const extendSession = useCallback(() => {
    setShowSessionWarning(false);
    resetSessionTimeout(handleSessionTimeout, handleSessionWarning);
  }, [handleSessionTimeout, handleSessionWarning]);

  // Initialize session timeout on mount
  useEffect(() => {
    initSessionTimeout(handleSessionTimeout, handleSessionWarning);

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      if (!showSessionWarning) {
        resetSessionTimeout(handleSessionTimeout, handleSessionWarning);
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearSessionTimeout();
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [handleSessionTimeout, handleSessionWarning, showSessionWarning]);

  // Update countdown when warning is shown
  useEffect(() => {
    if (showSessionWarning) {
      const interval = setInterval(() => {
        const remaining = getSessionTimeRemaining();
        setSessionTimeRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          handleSessionTimeout();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showSessionWarning, handleSessionTimeout]);

  return {
    showSessionWarning,
    sessionTimeRemaining,
    extendSession,
    handleSessionTimeout,
  };
}

export function useReauthentication(userData) {
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPin, setReauthPin] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [pendingCallback, setPendingCallback] = useState(null);
  const [showPin, setShowPin] = useState(false);

  const handleReauth = useCallback(async () => {
    setReauthLoading(true);
    setReauthError('');

    try {
      if (!userData?.transaction_pin) {
        setReauthError('Transaction PIN not set. Please contact support.');
        setReauthLoading(false);
        return;
      }

      const pinResult = await verifyPin(reauthPin, userData.transaction_pin, supabase);

      if (pinResult.locked) {
        setReauthError('Too many failed attempts. Please try again in 15 minutes.');
        setReauthLoading(false);
        return;
      }

      if (!pinResult.valid) {
        const attemptsMsg = pinResult.attemptsRemaining !== undefined
          ? ` (${pinResult.attemptsRemaining} attempts remaining)`
          : '';
        setReauthError(`Incorrect PIN. Please try again.${attemptsMsg}`);
        setReauthLoading(false);
        return;
      }

      recordReauth();
      setShowReauthModal(false);
      setReauthPin('');

      if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }
    } catch (err) {
      setReauthError('Verification failed. Please try again.');
    }
    setReauthLoading(false);
  }, [reauthPin, userData, pendingCallback]);

  const cancelReauth = useCallback(() => {
    setShowReauthModal(false);
    setReauthPin('');
    setReauthError('');
    setPendingCallback(null);
  }, []);

  const requireReauth = useCallback((callback) => {
    setPendingCallback(() => callback);
    setShowReauthModal(true);
  }, []);

  return {
    showReauthModal,
    reauthPin,
    setReauthPin,
    reauthError,
    reauthLoading,
    showPin,
    setShowPin,
    handleReauth,
    cancelReauth,
    requireReauth,
    AUTH_CONFIG,
  };
}
