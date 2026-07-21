"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail, Phone, Users } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, EmptyState, LoadingBlock, PageHeader, SecondaryButton, StatusPill } from "@/components/admin/AdminUI";

const STATUSES = ["new", "reviewed", "shortlisted", "rejected", "hired"];
const STATUS_TONE = { new: "cyan", reviewed: "amber", shortlisted: "violet", rejected: "red", hired: "emerald" };

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/careers/applications", { params: jobId ? { jobId } : {} });
      setApplications(data);
    } catch {
      toast.error("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      await adminApi.patch(`/admin/careers/applications/${id}`, { status });
      setApplications((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Careers"
        title={jobId ? "Applications for this role" : "All applications"}
        description={`${applications.length} candidate${applications.length === 1 ? "" : "s"} so far.`}
        action={<SecondaryButton href="/admin/careers"><ArrowLeft size={15} /> Back to careers</SecondaryButton>}
      />

      {loading ? (
        <LoadingBlock />
      ) : applications.length === 0 ? (
        <EmptyState icon={Users} title="No applications yet" description="Candidates applying through /careers will show up here." />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <Card key={a._id} className="p-5 transition-colors hover:border-white/[0.14] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400/25 to-violet-600/10 text-[12px] font-extrabold text-violet-300 ring-1 ring-white/[0.06]">
                    {initials(a.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{a.name}</p>
                    <p className="truncate text-xs text-white/40">
                      Applied for <span className="font-semibold text-white/60">{a.job?.title || "a deleted role"}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusPill tone={STATUS_TONE[a.status]}>{a.status}</StatusPill>
                  <span className="text-[11px] font-medium text-white/30">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/40">
                <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 hover:text-cyan-300">
                  <Mail size={12} /> {a.email}
                </a>
                {a.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={12} /> {a.phone}
                  </span>
                )}
                <a href={a.resumeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-cyan-300">
                  <ExternalLink size={12} /> Resume / portfolio
                </a>
              </div>

              {a.coverNote && (
                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/[0.02] px-4 py-3 text-[13.5px] leading-relaxed text-white/70">
                  {a.coverNote}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-4">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={busyId === a._id}
                    onClick={() => updateStatus(a._id, s)}
                    className={`rounded-full px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide transition disabled:opacity-50 ${
                      a.status === s
                        ? "bg-white text-[#0A0A0D]"
                        : "border border-white/[0.08] text-white/40 hover:border-white/[0.18] hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ApplicationsContent />
    </Suspense>
  );
}
