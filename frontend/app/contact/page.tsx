'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, Terminal } from 'lucide-react';
import AmbientBackground from '@/components/cyber/ambient-background';
import { siteConfig } from '@/site.config';
import { contactFormSchema } from '@/lib/validation';
import { fadeUpVariant } from '@/lib/motion';

function ContactForm() {
  const searchParams = useSearchParams();
  const isEnterprise = searchParams.get('type') === 'enterprise';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState(
    isEnterprise ? 'I would like to request enterprise on-prem waitlist information.' : ''
  );
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (isEnterprise && !message) {
      setMessage('I would like to request enterprise on-prem waitlist access for my organization.');
    }
  }, [isEnterprise, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Spam honeypot
    if (honeypot) return;

    const validation = contactFormSchema.safeParse({
      name,
      email,
      company,
      message,
      source: isEnterprise ? 'waitlist' : 'contact',
      honeypot,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please reach out via email directly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative pt-32 pb-24 max-w-4xl mx-auto px-6">
      <AmbientBackground />

      <motion.div
        variants={fadeUpVariant}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-acid/10 border border-acid/30 text-acid font-mono text-xs font-semibold mb-4">
          <Mail className="w-3.5 h-3.5" />
          <span>DIRECT CONTACT & INQUIRIES</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-muted-heading mb-4">
          {isEnterprise ? 'Request Enterprise Waitlist' : 'Get in touch with our team'}
        </h1>
        <p className="text-base sm:text-lg text-muted-body leading-relaxed">
          Have questions about automated BOLA audits, custom verification workflows, or security architecture? Send us a message or reach us directly at{' '}
          <a href={`mailto:${siteConfig.contact.email}`} className="text-acid underline">
            {siteConfig.contact.email}
          </a>.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUpVariant}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
        className="hud-frame glass-panel-elevated rounded-2xl p-7 sm:p-10 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
      >
        {success ? (
          <div className="text-center py-10 space-y-4 font-mono">
            <div className="w-14 h-14 rounded-full bg-acid/15 border border-acid text-acid flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-xs text-acid font-bold">[HTTP 200 OK: TELEMETRY DISPATCHED]</div>
            <h3 className="text-2xl font-bold text-muted-heading font-sans">Inquiry Received</h3>
            <p className="text-muted-body max-w-md mx-auto text-sm leading-relaxed font-sans">
              Thank you for reaching out. A security engineer from our team will review your inquiry and follow up shortly.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-4 px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/15 font-mono"
            >
              &gt; transmit_another_inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot */}
            <input
              type="text"
              name="sentinel_bot_check"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3.5 text-xs text-red-200 bg-alert-red/15 border border-alert-red/35 rounded-lg font-mono"
              >
                <AlertCircle className="w-4 h-4 text-alert-red flex-shrink-0" />
                <span>&gt; ERROR: {error}</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-1 text-xs font-mono text-muted-dim mb-2 font-bold">
                  <span className="text-acid">&gt;</span>
                  <span>operator_name:</span>
                  {focusedField === 'name' && <span className="terminal-cursor" />}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full px-4 py-3 rounded-lg bg-obsidian border border-white/15 focus:border-acid focus:shadow-[0_0_15px_rgba(163,230,53,0.2)] text-white text-sm outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-mono text-muted-dim mb-2 font-bold">
                  <span className="text-acid">&gt;</span>
                  <span>work_email:</span>
                  {focusedField === 'email' && <span className="terminal-cursor" />}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full px-4 py-3 rounded-lg bg-obsidian border border-white/15 focus:border-acid focus:shadow-[0_0_15px_rgba(163,230,53,0.2)] text-white text-sm outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-mono text-muted-dim mb-2 font-bold">
                <span className="text-acid">&gt;</span>
                <span>organization (optional):</span>
                {focusedField === 'company' && <span className="terminal-cursor" />}
              </label>
              <input
                type="text"
                value={company}
                onFocus={() => setFocusedField('company')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Financial Technologies"
                className="w-full px-4 py-3 rounded-lg bg-obsidian border border-white/15 focus:border-acid focus:shadow-[0_0_15px_rgba(163,230,53,0.2)] text-white text-sm outline-none transition-all font-mono"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-mono text-muted-dim mb-2 font-bold">
                <span className="text-acid">&gt;</span>
                <span>technical_scope / inquiry:</span>
                {focusedField === 'message' && <span className="terminal-cursor" />}
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your API infrastructure, target endpoints, or enterprise requirements..."
                className="w-full px-4 py-3 rounded-lg bg-obsidian border border-white/15 focus:border-acid focus:shadow-[0_0_15px_rgba(163,230,53,0.2)] text-white text-sm outline-none transition-all resize-none leading-relaxed font-mono"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-acid hover:bg-acid-hover text-obsidian font-bold text-sm shadow-[0_2px_15px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50 font-mono"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>TRANSMITTING TELEMETRY...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>&gt; TRANSMIT_INQUIRY</span>
                </>
              )}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acid animate-spin" />
        </div>
      }
    >
      <ContactForm />
    </Suspense>
  );
}
