"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { api } from "@/lib/api";
import toast from "@/lib/toast";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
};

function Eyebrow({ children }) {
  return (
    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
      {children}
    </p>
  );
}

function ApplyForm({ job, onDone }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", resumeLink: "", coverNote: "" });
  const [submitting, setSubmitting] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/careers/jobs/${job._id}/apply`, form);
      toast.success("Application sent. We'll be in touch.");
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20";
  const labelCls = "text-xs font-bold uppercase tracking-wide text-white/40";

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-2">
      <label className="sm:col-span-1">
        <span className={labelCls}>Name</span>
        <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </label>
      <label className="sm:col-span-1">
        <span className={labelCls}>Email</span>
        <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </label>
      <label className="sm:col-span-1">
        <span className={labelCls}>Phone (optional)</span>
        <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </label>
      <label className="sm:col-span-1">
        <span className={labelCls}>Resume / portfolio link</span>
        <input className={inputCls} value={form.resumeLink} onChange={(e) => set("resumeLink", e.target.value)} placeholder="Drive, LinkedIn, GitHub..." required />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>Why you? (optional)</span>
        <textarea className={`${inputCls} min-h-20 resize-y`} value={form.coverNote} onChange={(e) => set("coverNote", e.target.value)} />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="clickable inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03] disabled:opacity-60 sm:col-span-2"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        Submit application
      </button>
    </form>
  );
}

export default function CareersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openJobId, setOpenJobId] = useState(null);
  const [submittedIds, setSubmittedIds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/careers/jobs");
        setJobs(data);
      } catch {
        toast.error("Failed to load open roles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero with stones flanking both sides, same as every other page */}
      <header className="relative px-6 pb-24 pt-40 text-center sm:pt-52">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />
        <img
          src="/stone-left.webp"
          alt=""
          className="pointer-events-none absolute -left-10 top-36 hidden w-44 -rotate-12 opacity-70 lg:block xl:left-16"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />
        <img
          src="/stone-right.webp"
          alt=""
          className="pointer-events-none absolute -right-14 top-48 hidden w-64 rotate-12 opacity-70 lg:block xl:right-10"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />

        <Eyebrow>Careers</Eyebrow>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-3xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Come help friends stop fighting over money
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-xl text-sm font-medium text-white/50 sm:text-base">
          We&apos;re a small team building the easiest way to split expenses. If that sounds fun, see what&apos;s open below.
        </p>
      </header>

      {/* Open roles */}
      <section className="mx-auto max-w-4xl px-6 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-white/40" size={24} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-14 text-center text-white/50">
            No open roles right now - check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <motion.div
                key={job._id}
                {...fadeUp}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08, ease: "easeOut" }}
                className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif-premium text-xl font-normal">{job.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/45">
                      <span className="flex items-center gap-1"><Briefcase size={13} /> {job.department} · {job.type}</span>
                      <span className="flex items-center gap-1"><MapPin size={13} /> {job.location}</span>
                    </div>
                  </div>
                  {submittedIds.includes(job._id) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300">
                      <CheckCircle2 size={14} /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => setOpenJobId(openJobId === job._id ? null : job._id)}
                      className="clickable inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold hover:bg-white/[0.08]"
                    >
                      {openJobId === job._id ? "Close" : "Apply"}
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/55">{job.description}</p>

                {job.responsibilities?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/40">What you&apos;ll do</p>
                    <ul className="mt-2 space-y-1.5">
                      {job.responsibilities.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-white/55">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {job.requirements?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/40">What we&apos;re looking for</p>
                    <ul className="mt-2 space-y-1.5">
                      {job.requirements.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-white/55">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {openJobId === job._id && (
                  <ApplyForm
                    job={job}
                    onDone={() => {
                      setOpenJobId(null);
                      setSubmittedIds((prev) => [...prev, job._id]);
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
