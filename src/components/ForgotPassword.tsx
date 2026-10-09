import React, { useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { getPasswordChecks, isValidEmail, PASSWORD_RULES } from '../lib/validation';

interface ForgotPasswordProps {
  initialEmail: string;
  onRequestCode: (email: string) => Promise<string | null>;
  onResetPassword: (email: string, code: string, newPassword: string) => Promise<string | null>;
  onBackToLogin: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E2D44] focus:outline-none focus:ring-1 focus:ring-[#1E2D44]';
const labelClass = 'mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500';
const primaryButtonClass =
  'w-full rounded-xl bg-[#1E2D44] py-3.5 font-sans text-sm font-semibold text-white shadow-md transition-all hover:bg-[#16233a] active:scale-[0.99] disabled:opacity-60';

export default function ForgotPassword({ initialEmail, onRequestCode, onResetPassword, onBackToLogin }: ForgotPasswordProps) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = getPasswordChecks(password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const sendCode = async () => {
    setError('');
    setNotice('');
    if (!isValidEmail(email.trim())) {
      setError('Enter the email address you signed up with');
      return false;
    }
    setIsSubmitting(true);
    const err = await onRequestCode(email.trim());
    setIsSubmitting(false);
    if (err) {
      setError(err);
      return false;
    }
    setNotice(`If an account exists for ${email.trim()}, we've emailed it a 6-digit code.`);
    return true;
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendCode()) setStep('reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code we emailed you');
      return;
    }
    if (!isPasswordValid) {
      setError('Your new password does not meet all the requirements below');
      return;
    }
    if (confirmPassword !== password) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    const err = await onResetPassword(email.trim(), code, password);
    setIsSubmitting(false);
    if (err) setError(err);
  };

  return (
    <>
      <button
        onClick={step === 'reset' ? () => setStep('email') : onBackToLogin}
        className="mb-6 flex items-center space-x-1.5 font-sans text-sm font-medium text-gray-500 hover:text-gray-900"
        id="forgot-back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{step === 'reset' ? 'Use a different email' : 'Back to sign in'}</span>
      </button>

      <h2 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {step === 'email' ? 'Reset your password' : 'Set a new password'}
      </h2>
      <p className="mt-2 font-sans text-sm text-gray-500">
        {step === 'email'
          ? "Enter your account's email and we'll send you a 6-digit code."
          : 'Enter the code from your email and choose a new password.'}
      </p>

      {error && (
        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-3.5 font-sans text-sm text-red-700" id="forgot-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 font-sans text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleRequest} className="mt-8 space-y-5" id="forgot-email-form" noValidate>
          <div>
            <label htmlFor="forgot-email" className={labelClass}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                id="forgot-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className={primaryButtonClass} id="forgot-send-code-btn">
            {isSubmitting ? 'Sending…' : 'Send Reset Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="mt-6 space-y-4" id="forgot-reset-form" noValidate>
          <div>
            <label htmlFor="reset-code" className={labelClass}>
              Reset Code
            </label>
            <input
              type="text"
              id="reset-code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-gray-200 py-3 text-center text-lg font-mono tracking-[0.5em] focus:border-[#1E2D44] focus:outline-none focus:ring-1 focus:ring-[#1E2D44]"
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="new-password" className={labelClass}>
              New Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = passwordChecks[rule.key];
                  return (
                    <div key={rule.key} className={`flex items-center space-x-1.5 font-sans text-[11px] ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <Check className={`h-3 w-3 flex-shrink-0 ${ok ? 'opacity-100' : 'opacity-30'}`} />
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm-new-password" className={labelClass}>
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className={primaryButtonClass} id="forgot-reset-btn">
            {isSubmitting ? 'Saving…' : 'Reset Password & Sign In'}
          </button>

          <button
            type="button"
            onClick={sendCode}
            disabled={isSubmitting}
            className="w-full text-center font-sans text-sm font-medium text-[#B88E4C] hover:underline disabled:opacity-60"
          >
            Resend code
          </button>
        </form>
      )}
    </>
  );
}
