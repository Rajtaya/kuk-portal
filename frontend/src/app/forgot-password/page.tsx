'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Turnstile, isCaptchaEnabled } from '@/components/ui/turnstile';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const onCaptchaVerify = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCaptchaEnabled() && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email, captchaToken });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">UEMS</h1>
          <p className="text-xl text-primary-200 mb-2">Password Recovery</p>
          <div className="w-16 h-0.5 bg-primary-400 mx-auto mb-8" />
          <p className="text-primary-300/80 text-sm max-w-sm mx-auto leading-relaxed">
            Enter your registered email address and we will send you a link to reset your password.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F0E8] dark:bg-[#1C1917] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UEMS</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Password Recovery</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 border border-gray-900/10 dark:border-white/10 shadow-[12px_12px_0_0_#1c1917] dark:shadow-[12px_12px_0_0_#000]">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Check your email</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                  If an account exists for <strong className="text-gray-700 dark:text-gray-300">{email}</strong>, we have sent a password reset link. Please check your inbox and spam folder.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-mono uppercase tracking-widest text-sm"
                >
                  <span aria-hidden="true">&larr;</span> Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-mono uppercase tracking-[0.25em] text-primary-600 dark:text-primary-400 mb-3">Recovery</p>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white leading-none mb-3">Forgot password?</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your email and we&apos;ll send you a reset link.</p>

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
                    <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#F0EBE0] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-l-4 border-l-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:border-l-primary-600 transition-colors"
                      placeholder="e.g. admin@kuk.ac.in"
                    />
                  </div>

                  <Turnstile onVerify={onCaptchaVerify} />

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
                          Sending...
                        </>
                      ) : (
                        <>Send Reset Link <span aria-hidden="true">&rarr;</span></>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs font-mono tracking-wide text-gray-400 dark:text-gray-500 mt-6">
            Higher Education Department, Government of Haryana
          </p>
        </div>
      </div>
    </div>
  );
}
