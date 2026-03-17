import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { validateEmail, validatePassword } from '../../utils/validators';
import { 
  getLoginAttempts, 
  recordFailedLogin, 
  clearLoginAttempts,
  formatLockoutTime
} from '../../utils/authSecurity';
import { logAuthEvent, AUDIT_EVENTS } from '../../utils/auditLog';

function AuthPage({ onBack, mode = 'login' }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(getLoginAttempts());
  const [signupsEnabled, setSignupsEnabled] = useState(true);

  // Check if signups are enabled
  useEffect(() => {
    const checkSignupsEnabled = async () => {
      try {
        const { data, error } = await supabase.rpc('are_signups_enabled');
        if (!error && data !== null) {
          setSignupsEnabled(data);
        }
      } catch (err) {
        // Function might not exist yet, default to enabled
        if (import.meta.env.DEV) console.log('Signups check unavailable, defaulting to enabled');
      }
    };
    checkSignupsEnabled();
  }, []);

  // Sync isLogin state with mode prop
  useEffect(() => {
    setIsLogin(mode === 'login');
  }, [mode]);

  // Toggle between login and signup, updating the URL
  const toggleMode = () => {
    const newMode = isLogin ? 'signup' : 'login';
    navigate(`/${newMode}`);
  };

  // Update lockout timer every second
  useEffect(() => {
    if (lockoutInfo.isLockedOut) {
      const interval = setInterval(() => {
        const info = getLoginAttempts();
        setLockoutInfo(info);
        if (!info.isLockedOut) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutInfo.isLockedOut]);

  // Real-time validation
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if locked out
    const currentLockout = getLoginAttempts();
    if (currentLockout.isLockedOut) {
      setError(`Too many failed attempts. Try again in ${formatLockoutTime(currentLockout.lockoutRemaining)}.`);
      setLockoutInfo(currentLockout);
      return;
    }
    
    setLoading(true);
    setError('');

    // Validate before submitting
    if (!emailValidation.isValid) {
      setError(emailValidation.errors[0]);
      setLoading(false);
      return;
    }

    if (!isLogin && !passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Clear login attempts on success
        clearLoginAttempts();
        // Audit log successful login
        await logAuthEvent(AUDIT_EVENTS.LOGIN_SUCCESS, { email });
      } else {
        // Check if signups are enabled
        if (!signupsEnabled) {
          setError('New account registration is temporarily disabled. Please try again later.');
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data?.user?.identities?.length === 0) {
          setError('An account with this email already exists. Try signing in instead.');
          setLoading(false);
          return;
        }
        // Check if email confirmation is required
        if (data?.user && !data?.session) {
          setError('Please check your email to confirm your account before signing in.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      // Record failed login attempt (only for login, not signup)
      if (isLogin) {
        const result = recordFailedLogin();
        setLockoutInfo(result);
        
        if (result.isLockedOut) {
          setError(`Too many failed attempts. Try again in ${formatLockoutTime(result.lockoutRemaining)}.`);
          setLoading(false);
          return;
        }
      }
      
      // Provide user-friendly error messages
      const errorMessage = err.message?.toLowerCase() || '';
      if (err.code === 'weak_password' || errorMessage.includes('weak') || errorMessage.includes('pwned')) {
        setError('This password is too common. Please choose a more unique password.');
      } else
      if (errorMessage.includes('invalid login credentials')) {
        const { attemptsRemaining } = getLoginAttempts();
        setError(`Invalid email or password. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`);
      } else if (errorMessage.includes('email not confirmed')) {
        setError('Please check your email and confirm your account before signing in.');
      } else if (errorMessage.includes('user already registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (errorMessage.includes('password')) {
        setError('Password must be at least 8 characters long.');
      } else if (errorMessage.includes('rate limit')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <img src="/zyp-logo.svg" alt="Zyp" className="h-8 md:h-10" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Auth Card */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-400 text-center mb-6 md:mb-8 text-sm md:text-base">
              {isLogin ? 'Sign in to your Zyp account' : 'Start sending payments globally'}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@example.com"
                    required
                    className={`w-full pl-12 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      emailTouched && !emailValidation.isValid && email ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                </div>
                {emailTouched && !emailValidation.isValid && email && (
                  <p className="mt-2 text-red-400 text-sm">{emailValidation.errors[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className={`w-full pl-12 pr-12 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      passwordTouched && !passwordValidation.isValid && password && !isLogin ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password Strength Indicator - only show on signup */}
                {!isLogin && password && (
                  <div className="mt-3">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            passwordValidation.strength >= level
                              ? level <= 2 ? 'bg-red-500' : level <= 3 ? 'bg-yellow-500' : 'bg-emerald-500'
                              : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-sm ${
                      passwordValidation.strength <= 2 ? 'text-red-400' : 
                      passwordValidation.strength <= 3 ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                      {passwordValidation.strengthLabel}
                    </p>
                    {passwordValidation.errors.length > 0 && passwordValidation.strength < 3 && (
                      <p className="text-gray-400 text-xs mt-1">{passwordValidation.errors[0]}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (!isLogin && passwordValidation.strength < 1)}
                className="w-full py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin
                  }
                });
                if (error) {
                  setError(error.message);
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 text-center">
              <button
                onClick={() => { toggleMode(); setError(''); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span className="text-emerald-400 font-medium">{isLogin ? 'Sign up' : 'Sign in'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        © 2025 Zyp. All rights reserved.
      </footer>
    </div>
  );
}

export default AuthPage;
