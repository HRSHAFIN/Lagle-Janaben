import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from './Logo';
import GoogleAuthButton from './GoogleAuthButton';

interface LoginProps {
  onLogin: (identifier: string, password: string) => Promise<string | null>;
  onGoogleLogin: (credential: string) => Promise<string | null>;
  onNavigateRegister: () => void;
  onBackToCatalog: () => void;
}

export default function Login({ onLogin, onGoogleLogin, onNavigateRegister, onBackToCatalog }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your email/phone number and password');
      return;
    }

    setIsSubmitting(true);
    const err = await onLogin(identifier.trim(), password);
    setIsSubmitting(false);
    if (err) setError(err);
  };

  const handleGoogle = async (credential: string) => {
    setError('');
    const err = await onGoogleLogin(credential);
    if (err) setError(err);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl" id="login-view">
      {/* Left: Brand Panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#1E2D44] p-12 lg:flex">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#B88E4C]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#B88E4C]/10 blur-3xl" />

        <div className="relative flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
            <Logo className="h-7 w-7" />
          </div>
          <span className="font-sans text-lg font-extrabold tracking-tight text-white">
            Lagle <span className="text-[#B88E4C]">Janaben</span>
          </span>
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#B88E4C]/30 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#B88E4C]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curated Gifting, Personalized</span>
          </div>
          <h1 className="font-sans text-4xl font-bold leading-tight text-white">
            Welcome back to gifts that connect hearts.
          </h1>
          <p className="max-w-sm font-sans text-sm leading-relaxed text-white/60">
            Sign in to track your orders, save your favorites, and check out faster on every visit.
          </p>
        </div>

        <div className="relative flex items-center space-x-2 text-xs font-medium text-white/50">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Your data is encrypted and securely stored</span>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex w-full flex-col justify-center px-4 py-10 sm:px-8 lg:w-1/2 lg:px-16">
        <button
          onClick={onBackToCatalog}
          className="mb-8 flex items-center space-x-1.5 self-start font-sans text-sm font-medium text-gray-500 hover:text-gray-900"
          id="login-back-to-shop-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Shop</span>
        </button>

        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Sign in</h2>
          <p className="mt-2 font-sans text-sm text-gray-500">
            New to Lagle Janaben?{' '}
            <button onClick={onNavigateRegister} className="font-semibold text-[#B88E4C] hover:underline" id="go-to-register-btn">
              Create an account
            </button>
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-3.5 font-sans text-sm text-red-700" id="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" id="login-form">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email or Phone Number
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E2D44] focus:outline-none focus:ring-1 focus:ring-[#1E2D44]"
                  placeholder="you@example.com or 017XXXXXXXX"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-11 text-sm focus:border-[#1E2D44] focus:outline-none focus:ring-1 focus:ring-[#1E2D44]"
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#1E2D44] py-3.5 font-sans text-sm font-semibold text-white shadow-md transition-all hover:bg-[#16233a] active:scale-[0.99] disabled:opacity-60"
              id="login-submit-btn"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="font-sans text-xs font-medium text-gray-400">or continue with</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <GoogleAuthButton text="signin_with" onCredential={handleGoogle} />
        </div>
      </div>
    </div>
  );
}
