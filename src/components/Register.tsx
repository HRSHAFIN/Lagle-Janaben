import React, { useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Gift, Lock, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import Logo from './Logo';
import GoogleAuthButton from './GoogleAuthButton';

interface RegisterProps {
  onRegister: (data: { name: string; email: string; phone: string; password: string }) => Promise<string | null>;
  onGoogleLogin: (credential: string) => Promise<string | null>;
  onNavigateLogin: () => void;
  onBackToCatalog: () => void;
}

const BD_PHONE_REGEX = /^01[3-9][0-9]{8}$/;

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export default function Register({ onRegister, onGoogleLogin, onNavigateLogin, onBackToCatalog }: RegisterProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = getPasswordChecks(formData.password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'A valid email address is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!BD_PHONE_REGEX.test(formData.phone.trim())) {
      errors.phone = 'Enter a valid Bangladeshi number, e.g. 017XXXXXXXX';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!isPasswordValid) {
      errors.password = 'Password does not meet all requirements below';
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const err = await onRegister({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
    });
    setIsSubmitting(false);
    if (err) setServerError(err);
  };

  const handleGoogle = async (credential: string) => {
    setServerError('');
    const err = await onGoogleLogin(credential);
    if (err) setServerError(err);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl" id="register-view">
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
            <Gift className="h-3.5 w-3.5" />
            <span>Join the Community</span>
          </div>
          <h1 className="font-sans text-4xl font-bold leading-tight text-white">
            Create an account and start gifting smarter.
          </h1>
          <p className="max-w-sm font-sans text-sm leading-relaxed text-white/60">
            Save your details for faster checkout, follow your order history, and unlock member-only promos.
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
          className="mb-6 flex items-center space-x-1.5 self-start font-sans text-sm font-medium text-gray-500 hover:text-gray-900"
          id="register-back-to-shop-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Shop</span>
        </button>

        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Create your account</h2>
          <p className="mt-2 font-sans text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={onNavigateLogin} className="font-semibold text-[#B88E4C] hover:underline" id="go-to-login-btn">
              Sign in
            </button>
          </p>

          {serverError && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-3.5 font-sans text-sm text-red-700" id="register-error">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" id="register-form" noValidate>
            <div>
              <label htmlFor="name" className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3.5 text-sm focus:outline-none focus:ring-1 ${
                    formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#1E2D44] focus:ring-[#1E2D44]'
                  }`}
                  placeholder="Sarah Jenkins"
                />
              </div>
              {formErrors.name && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3.5 text-sm focus:outline-none focus:ring-1 ${
                    formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#1E2D44] focus:ring-[#1E2D44]'
                  }`}
                  placeholder="sarah.j@example.com"
                />
              </div>
              {formErrors.email && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3.5 text-sm focus:outline-none focus:ring-1 ${
                    formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#1E2D44] focus:ring-[#1E2D44]'
                  }`}
                  placeholder="01XXXXXXXXX (e.g. 017XXXXXXXX)"
                  inputMode="numeric"
                />
              </div>
              {formErrors.phone && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.phone}</p>}
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
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-11 text-sm focus:outline-none focus:ring-1 ${
                    formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#1E2D44] focus:ring-[#1E2D44]'
                  }`}
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
              {formErrors.password && <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.password}</p>}

              {/* Live password requirement checklist */}
              {formData.password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {[
                    { key: 'length', label: '8+ characters' },
                    { key: 'upper', label: '1 uppercase letter' },
                    { key: 'lower', label: '1 lowercase letter' },
                    { key: 'number', label: '1 number' },
                  ].map((rule) => {
                    const ok = passwordChecks[rule.key as keyof typeof passwordChecks];
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
              <label htmlFor="confirmPassword" className="mb-1.5 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-11 text-sm focus:outline-none focus:ring-1 ${
                    formErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#1E2D44] focus:ring-[#1E2D44]'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 font-sans text-[11px] font-medium text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#1E2D44] py-3.5 font-sans text-sm font-semibold text-white shadow-md transition-all hover:bg-[#16233a] active:scale-[0.99] disabled:opacity-60"
              id="register-submit-btn"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="font-sans text-xs font-medium text-gray-400">or continue with</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <GoogleAuthButton text="signup_with" onCredential={handleGoogle} />
        </div>
      </div>
    </div>
  );
}
