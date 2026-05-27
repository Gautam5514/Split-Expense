"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin, MessageSquare, Send } from "lucide-react";
import toast from "@/lib/toast";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (event) => {
    event.preventDefault();
    toast.success("Thanks. Your message is ready to send by email.");
    const subject = encodeURIComponent(`SplitEase support request from ${form.name || "user"}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:support@splitease.app?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <main className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400">
                <MessageSquare size={24} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
                Contact
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Contact Us
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Tell us what happened and include enough detail for support to understand the group, expense, or account issue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-foreground">
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-normal text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="Your name"
                    required
                  />
                </label>
                <label className="text-sm font-semibold text-foreground">
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-normal text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </div>

              <label className="text-sm font-semibold text-foreground">
                Message
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  className="mt-2 min-h-40 w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-sm font-normal leading-6 text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Describe the issue, group name, and anything you already tried."
                  required
                />
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-cyan-700 sm:w-fit"
              >
                <Send size={16} />
                Send message
              </button>
            </form>
          </main>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <Mail className="mb-3 h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="font-bold text-foreground">Email support</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                support@splitease.app
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <MapPin className="mb-3 h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="font-bold text-foreground">What to include</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Account email, group name, invite link or expense title, and screenshots when useful.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
