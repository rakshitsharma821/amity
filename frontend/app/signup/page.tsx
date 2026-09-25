'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GithubIcon, GoogleIcon } from '@/components/icons/social-icons';
import { createClient } from '@/lib/supabase/client';
import { getAuthCallbackUrl } from '@/lib/supabase/auth-redirect';
import { signupSchema } from '@/lib/validation';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Strength score calculator
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-white/10' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-alert-red' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-warn' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-lime-400' };
    return { score: 4, label: 'Strong', color: 'bg-acid' };
  };

  const strength = calculateStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Spam honeypot
    if (honeypot) return;

    const validation = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
      acceptedTerms,
      honeypot,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: getAuthCallbackUrl('/dashboard'),
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    if (!acceptedTerms) {
      setError('Please accept the Terms and Privacy Policy before creating an account.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthCallbackUrl('/dashboard'),
        },
      });
      if (error) setError(error.message);
    } catch {
      setError('OAuth service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center pt-28 pb-16 px-6">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel-elevated border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-obsidian-card border border-acid flex items-center justify-center text-acid shadow-[0_0_12px_rgba(163,230,53,0.25)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-muted-heading">Create Account</h1>
            <p className="text-xs text-muted-body">Sign up for verified zero-trust API scanning</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-acid/15 border border-acid text-acid flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-muted-heading">Verify Your Email</h3>
            <p className="text-sm text-muted-body leading-relaxed">
              We sent a verification link to <strong className="text-white">{email}</strong>. Please check your inbox to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 text-xs font-semibold text-acid hover:underline"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3.5 mb-5 text-xs text-red-200 bg-alert-red/15 border border-alert-red/35 rounded-lg">
                <AlertCircle className="w-4 h-4 text-alert-red flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                name="sentinel_bot_check"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <div>
                <label className="block text-xs font-mono uppercase text-muted-dim mb-1.5 font-bold">
                  Work or Personal Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-body" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-obsidian border border-white/15 focus:border-acid rounded-lg text-sm text-white placeholder:text-muted-dim outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted-dim mb-1.5 font-bold">
                  Password (min 8 chars, 1 uppercase, 1 number, 1 symbol)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-body" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-obsidian border border-white/15 focus:border-acid rounded-lg text-sm text-white placeholder:text-muted-dim outline-none transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-body hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] font-mono text-muted-dim mb-1">
                      <span>Password Strength</span>
                      <span className="font-bold">{strength.label}</span>
                    </div>
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full ${
                            step <= strength.score ? strength.color : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted-dim mb-1.5 font-bold">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-body" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-obsidian border border-white/15 focus:border-acid rounded-lg text-sm text-white placeholder:text-muted-dim outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Strict Ethical Authorization Mandate */}
              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="page-terms-checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-obsidian text-acid focus:ring-acid accent-acid"
                />
                <label htmlFor="page-terms-checkbox" className="text-xs text-muted-body leading-relaxed">
                  I agree to the <Link href="/terms" className="text-white underline">Terms</Link> and{' '}
                  <Link href="/privacy" className="text-white underline">Privacy Policy</Link>, and{' '}
                  <strong className="text-white">
                    I will strictly only scan APIs I own or am explicitly authorized to test.
                  </strong>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_2px_12px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-mono text-muted-dim uppercase">Or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                <GithubIcon className="w-4 h-4" />
                <span>GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Google</span>
              </button>
            </div>

            <p className="mt-8 text-center text-xs text-muted-body">
              Already have an account?{' '}
              <Link href="/login" className="text-acid hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
