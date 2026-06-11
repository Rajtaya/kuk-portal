'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">UEMS</h1>
          <p className="text-xl text-primary-200 mb-2">University Employees</p>
          <p className="text-xl text-primary-200 mb-8">Management System</p>
          <div className="w-16 h-0.5 bg-primary-400 mx-auto mb-8" />
          <p className="text-primary-300/80 text-sm max-w-sm mx-auto leading-relaxed">
            Centralized portal for managing teaching staff data across all state universities of Haryana
          </p>
          <div className="mt-12 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">12</p>
              <p className="text-xs text-primary-300 mt-1">Universities</p>
            </div>
            <div className="w-px h-10 bg-primary-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">1,300+</p>
              <p className="text-xs text-primary-300 mt-1">Employees</p>
            </div>
            <div className="w-px h-10 bg-primary-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">40+</p>
              <p className="text-xs text-primary-300 mt-1">Subjects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F0E8] dark:bg-[#1C1917] px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UEMS</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">University Employees Management</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 border border-gray-900/10 dark:border-white/10 shadow-[12px_12px_0_0_#1c1917] dark:shadow-[12px_12px_0_0_#000]">
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-primary-600 dark:text-primary-400 mb-3">Sign in</p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white leading-none mb-3">Welcome back</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in with your email and password.</p>

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
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#F0EBE0] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-l-4 border-l-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:border-l-primary-600 transition-colors"
                  placeholder="e.g. admin@kuk.ac.in"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 bg-[#F0EBE0] dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-l-4 border-l-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:border-l-primary-600 transition-colors"
                    placeholder="Enter your password"
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

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-mono uppercase tracking-widest text-sm px-8 py-3.5 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Signing in...
                    </>
                  ) : (
                    <>Sign In <span aria-hidden="true">→</span></>
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-xs font-mono tracking-wide text-gray-400 dark:text-gray-500 mt-6">
            Higher Education Department, Government of Haryana
          </p>
        </div>
      </div>
    </div>
  );
}
