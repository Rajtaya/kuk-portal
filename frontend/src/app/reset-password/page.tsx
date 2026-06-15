'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Recaptcha, isCaptchaEnabled } from '@/components/ui/recaptcha';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const onCaptchaVerify = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  if (!token) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Invalid Link</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This password reset link is invalid or has expired.</p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-mono uppercase tracking-widest text-sm"
        >
          Request a new link <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (isCaptchaEnabled() && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password, captchaToken });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Password Reset!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Your password has been changed successfully. Redirecting to login...</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-mono uppercase tracking-widest text-sm"
        >
          Go to Sign In <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs font-mono uppercase tracking-[0.25em] text-primary-600 dark:text-primary-400 mb-3">Security</p>
      <h2 className="text-4xl font-bold text-gray-900 dark:text-white leading-none mb-3">New password</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your new password below.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 pr-12 bg-[#F0EBE0] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-l-4 border-l-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:border-l-primary-600 transition-colors"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-[#F0EBE0] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-l-4 border-l-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:border-l-primary-600 transition-colors"
            placeholder="Re-enter your password"
          />
        </div>

        <Recaptcha onVerify={onCaptchaVerify} />

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-mono uppercase tracking-widest"
          >
            <span aria-hidden="true">&larr;</span> Back
          </Link>
          <button
            type="submit"
            disabled={loading || (isCaptchaEnabled() && !captchaToken)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-mono uppercase tracking-widest text-sm px-8 py-3.5 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Resetting...
              </>
            ) : (
              <>Reset Password <span aria-hidden="true">&rarr;</span></>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 login-brand-panel flex-col items-center justify-center px-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/20">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">UEMS</h1>
          <p className="text-xl text-primary-200 mb-2">Set New Password</p>
          <div className="w-16 h-0.5 bg-primary-400 mx-auto mb-8" />
          <p className="text-primary-300/80 text-sm max-w-sm mx-auto leading-relaxed">
            Choose a strong password with at least 8 characters to secure your account.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F0E8] dark:bg-[#1C1917] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UEMS</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Set New Password</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 border border-gray-900/10 dark:border-white/10 shadow-[12px_12px_0_0_#1c1917] dark:shadow-[12px_12px_0_0_#000]">
            <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>

          <p className="text-center text-xs font-mono tracking-wide text-gray-400 dark:text-gray-500 mt-6">
            Higher Education Department, Government of Haryana
          </p>
        </div>
      </div>
    </div>
  );
}
