import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { AdminUserSafe } from '../../types';
import { loginAdmin } from '../../api/client';

interface LoginViewProps {
  onLoginSuccess: (admin: AdminUserSafe) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid institutional email address.';
      }
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    const loginRequest = {
      url: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: {
        email: email.trim().toLowerCase(),
      },
    };
    console.log('[handleLogin] Request object sent to server (excluding password):', loginRequest);

    try {
      const response = await loginAdmin({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('[handleLogin] HTTP status code returned:', response.status);
      console.log('[handleLogin] Response authenticated:', response.authenticated, 'role:', response.admin?.role);

      if (response.authenticated && response.admin) {
        onLoginSuccess(response.admin);
      } else {
        setErrorMessage('Invalid email or password.');
      }
    } catch (err: unknown) {
      const statusCode = (err as { status?: number })?.status;
      console.log('[handleLogin] HTTP status code returned:', statusCode ?? 'Error / Network Failure');
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      console.error('[handleLogin] Login error:', msg);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = handleLogin;

  const handleFillDemoCredentials = () => {
    setEmail('admin@foundationpoly.edu.ng');
    setPassword('FoundationVPN@2026!');
    setFieldErrors({});
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Institutional Branding Crest */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/10 text-white">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            Foundation Polytechnic
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            VPN Management Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              Administrator Login
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized network and security personnel only
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              id="auth-error-alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Institutional Email / Username
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  disabled={isLoading}
                  placeholder="admin@foundationpoly.edu.ng"
                  className={`block w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none transition-colors ${
                    fieldErrors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={isLoading}
                  placeholder="Enter administrator password"
                  className={`block w-full pl-9 pr-10 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none transition-colors ${
                    fieldErrors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Primary Sign In Button */}
            <div className="pt-2">
              <button
                id="btn-admin-signin"
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Academic Demonstration Helper Notice */}
          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  Academic Demonstration Credentials
                </span>
                <button
                  type="button"
                  onClick={handleFillDemoCredentials}
                  className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                >
                  Auto-fill
                </button>
              </div>
              <div className="font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-slate-200 space-y-0.5">
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <span className="font-medium text-slate-800">admin@foundationpoly.edu.ng</span>
                </div>
                <div>
                  <span className="text-slate-400">Default:</span>{' '}
                  <span className="font-medium text-slate-800">FoundationVPN@2026! (or Foundation@2026!)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Passwords are saved as cryptographic bcrypt hashes in the institutional database. Public registration is permanently disabled.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-slate-400">
          Foundation Polytechnic VPN Management & Traffic Auditing Portal &bull; Academic Project
        </p>
      </div>
    </div>
  );
};
