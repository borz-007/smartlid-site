'use client';

import { useState } from 'react';
import { Section, Eyebrow, H2 } from '@/components/site/section';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return toast.error('Please complete all fields.');
    setLoading(true);
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Failed');
      toast.success('Message sent.');
      setForm({ name: '', email: '', message: '' });
    } catch { toast.error('Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Contact</Eyebrow>
        <H2 className="mt-6">Let's talk.</H2>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <form onSubmit={onSubmit} className="rounded-3xl border border-border/60 bg-card p-8 md:p-12 space-y-8">
            <Field label="Name">
              <input name="name" value={form.name} onChange={onChange} className="w-full bg-transparent border-b border-border/60 focus:border-foreground outline-none py-4 text-lg" placeholder="Your full name" autoComplete="name" />
            </Field>
            <Field label="Email">
              <input type="email" name="email" value={form.email} onChange={onChange} className="w-full bg-transparent border-b border-border/60 focus:border-foreground outline-none py-4 text-lg" placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Message">
              <textarea name="message" value={form.message} onChange={onChange} rows={5} className="w-full bg-transparent border-b border-border/60 focus:border-foreground outline-none py-4 text-lg resize-none" placeholder="How can we help?" />
            </Field>
            <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-[14px] font-medium hover:opacity-90 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card p-8">
              <Eyebrow>Direct</Eyebrow>
              <a href="mailto:ceo@slid-tech.com" className="mt-6 block text-2xl md:text-3xl font-medium tracking-tight">ceo@slid-tech.com</a>
              <p className="mt-3 text-sm text-muted-foreground">Response within one business day.</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-8">
              <Eyebrow>Domain</Eyebrow>
              <div className="mt-6 text-2xl md:text-3xl font-medium tracking-tight">slid-tech.com</div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

export default ContactPage;
