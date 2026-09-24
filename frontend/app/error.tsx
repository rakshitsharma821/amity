'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // In production, this can report to an error tracking service (e.g., Sentry)
    // Avoid leaking stack traces in user console or UI
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.10)] rounded-xl p-8 text-center backdrop-blur-md">
        <div className="w-14 h-14 rounded-xl bg-alert/10 border border-alert/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-alert" />
        </div>

        <h1 className="text-2xl font-bold text-obsidian-heading mb-2">Unexpected Application Error</h1>
        <p className="text-obsidian-muted text-sm mb-6 leading-relaxed">
          The requested operation encountered an unhandled exception. If this persists, please report the incident to our security and infrastructure team.
        </p>

        {error.digest && (
          <div className="bg-black/60 border border-[rgba(255,255,255,0.06)] rounded px-3 py-2 text-xs font-mono text-obsidian-muted mb-6 break-all">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 bg-acid text-black font-semibold px-4 py-2.5 rounded-lg hover:bg-acid/90 transition-all text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-transparent border border-white/20 text-obsidian-heading font-medium px-4 py-2.5 rounded-lg hover:bg-white/5 transition-all text-sm"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
