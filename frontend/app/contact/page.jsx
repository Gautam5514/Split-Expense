"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, ChevronDown, Clock, Loader2, Mail, MessageSquare,
  Phone, Send, ShieldCheck, Sparkles,
} from "lucide-react";
import toast from "@/lib/toast";
import { api } from "@/lib/api";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

/* Contact page: friendly hero, a proper multi-field form (name, email,
   phone, subject, message - matching the extra columns added to
   ContactMessage in the backend), "other ways to reach us" cards, and an
   FAQ accordion, all in the same dark landing theme as the rest of the
   marketing site. */

const SUBJECTS = [
  { value: "general", label: "General question" },
  { value: "support", label: "Account or group support" },
  { value: "billing", label: "Billing" },
  { value: "partnership", label: "Partnership" },
  { value: "feedback", label: "Feedback" },
  { value: "bug", label: "Bug report" },
];

const FAQS = [
  {
    q: "How fast will I hear back?",
    a: "Most messages get a reply within one business day. If your message is about a security issue, we treat it as priority and respond sooner.",
  },
  {
    q: "What should I include in my message?",
    a: "The account email you signed up with, the group name if it's group-related, and the invite link or expense title. A screenshot helps more than a paragraph of description.",
  },
  {
    q: "I found a security vulnerability - where do I report it?",
    a: "Pick \"Bug report\" as the subject and include steps to reproduce it. For full responsible-disclosure guidelines, see our Security Center.",
  },
  {
    q: "Can I request a copy of my data, or ask you to delete it?",
    a: "Yes - choose \"Account or group support\" and mention what you need. Details on what we hold and how deletion works are in the Privacy Policy.",
  },
  {
    q: "Do you take partnership or press inquiries?",
    a: "We do. Choose \"Partnership\" as the subject and tell us a bit about what you have in mind - we read every one of these ourselves.",
  },
  {
    q: "Is there phone or live chat support?",
    a: "Not yet - email is the fastest way to reach a real person on the team right now. If you leave a phone number, we'll call for anything that's easier to talk through.",
  },
];

function FaqItem({ faq, open, onToggle }) {
  return (
    <div className="border-b border-white/[0.08]">
      <button
        onClick={onToggle}
        className="clickable flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-white sm:text-base">{faq.q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/50">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY_FORM = { name: "", email: "", phone: "", subject: "general", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/contact", form);
      toast.success("Message sent. Our team will get back to you by email.");
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero */}
      <header className="relative px-6 pb-16 pt-36 text-center sm:pt-44">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[640px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />

        <Link
          href="/"
          className="relative z-10 mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <p className="relative z-10 mb-3 flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
          <span className="h-px w-6 bg-cyan-400/50" />
          Contact
        </p>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-2xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Stuck on something? We&apos;ll sort it out.
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-lg text-sm font-medium leading-relaxed text-white/50 sm:text-base">
          Whether it&apos;s a group that won&apos;t balance, a receipt scan that missed a line,
          or just a question - tell us what happened and we&apos;ll get you sorted.
        </p>
      </header>

      {/* Form + side info */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 sm:p-9"
          >
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
                <MessageSquare size={20} />
              </span>
              <div>
                <h2 className="font-serif-premium text-xl font-normal tracking-tight sm:text-2xl">
                  Send us a message
                </h2>
                <p className="text-xs text-white/40">We read every single one.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                  Name
                  <input
                    value={form.name}
                    onChange={update("name")}
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-normal text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-2 focus:ring-cyan-400/10"
                    placeholder="Your name"
                    required
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-normal text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-2 focus:ring-cyan-400/10"
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                  Phone <span className="normal-case text-white/25">(optional)</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-normal text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-2 focus:ring-cyan-400/10"
                    placeholder="+91 98765 43210"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                  Subject
                  <div className="relative mt-2">
                    <select
                      value={form.subject}
                      onChange={update("subject")}
                      className="w-full appearance-none rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-normal text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-2 focus:ring-cyan-400/10"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s.value} value={s.value} className="bg-[#0B0B0F] text-white">
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                  </div>
                </label>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                Message
                <textarea
                  value={form.message}
                  onChange={update("message")}
                  className="mt-2 min-h-40 w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-normal leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-2 focus:ring-cyan-400/10"
                  placeholder="Describe the issue, group name, and anything you already tried."
                  required
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="clickable mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 sm:w-fit"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send message
              </button>
            </form>
          </motion.div>

          {/* Side info */}
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6">
              <Mail className="mb-3 h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-white">Email support</h3>
              <a href="mailto:support@splitease.app" className="mt-2 block text-sm leading-6 text-white/50 hover:text-cyan-300">
                support@splitease.app
              </a>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6">
              <Clock className="mb-3 h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-white">Response time</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Within one business day, usually much sooner.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6">
              <Sparkles className="mb-3 h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-white">What to include</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Account email, group name, invite link or expense title, and a screenshot when useful.
              </p>
            </div>

            <Link
              href="/security"
              className="clickable group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 transition-colors hover:border-cyan-400/30"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-bold text-white">Report a vulnerability</span>
              </span>
              <ArrowUpRight size={15} className="text-white/30 transition-colors group-hover:text-cyan-300" />
            </Link>
          </motion.aside>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 pb-28">
        <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          FAQ
        </p>
        <h2 className="font-serif-premium mt-3 text-center text-3xl font-normal tracking-tight sm:text-4xl">
          Before you write in
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/50">
          Quick answers to what people usually ask us before reaching out.
        </p>
        <div className="mt-10">
          {FAQS.map((faq, i) => (
            <FaqItem
              key={faq.q}
              faq={faq}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
