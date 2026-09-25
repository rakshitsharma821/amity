'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { GithubIcon, GoogleIcon } from '@/components/icons/social-icons';
import { createClient } from '@/lib/supabase/client';
import { getAuthCallbackUrl } from '@/lib/supabase/auth-redirect';
import { loginSchema } from '@/lib/validation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => searchParams.get('error') === 'oauth_callback_failed'
    ? 'Google/GitHub sign-in could not be completed. Check the provider setup and try again.'
    : null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (authError) {
        // Generic error message to prevent account enumeration
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setError('Unable to authenticate at this time.');
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthCallbackUrl(redirectPath),
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
            <h1 className="text-xl font-bold text-muted-heading">Sign In</h1>
            <p className="text-xs text-muted-body">Access your verified API targets & findings</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 mb-5 text-xs text-red-200 bg-alert-red/15 border border-alert-red/35 rounded-lg">
            <AlertCircle className="w-4 h-4 text-alert-red flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted-dim mb-1.5 font-bold">
              Email Address
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-mono uppercase text-muted-dim font-bold">
                Password
              </label>
              <Link href="/contact" className="text-xs text-acid hover:underline">
                Forgot password?
              </Link>
            </div>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_2px_12px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
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
          Don&apos;t have an account yet?{' '}
          <Link href="/signup" className="text-acid hover:underline font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acid animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
