"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Users, Briefcase } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, EmptyState, IconButton, LoadingBlock, PageHeader, PrimaryButton, SecondaryButton, StatusPill } from "@/components/admin/AdminUI";

export default function AdminCareersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/careers/jobs");
      setJobs(data);
    } catch {
      toast.error("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (job) => {
    setBusyId(job._id);
    try {
      const status = job.status === "open" ? "closed" : "open";
      await adminApi.patch(`/admin/careers/jobs/${job._id}`, { ...job, status });
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status } : j)));
    } catch {
      toast.error("Failed to update job.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this job posting and all its applications?")) return;
    setBusyId(id);
    try {
      await adminApi.delete(`/admin/careers/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j._id !== id));
      toast.success("Job deleted.");
    } catch {
      toast.error("Failed to delete job.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${jobs.length} total`}
        title="Careers"
        description="Manage job postings and review applications."
        action={
          <div className="flex items-center gap-2">
            <SecondaryButton href="/admin/careers/applications"><Users size={15} /> All applications</SecondaryButton>
            <PrimaryButton href="/admin/careers/new"><Plus size={15} /> New job</PrimaryButton>
          </div>
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job postings yet"
          description="Post a role to start collecting applications on /careers."
          action={<PrimaryButton href="/admin/careers/new"><Plus size={15} /> New job</PrimaryButton>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Role</th>
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Department</th>
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Location</th>
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Status</th>
                  <th className="px-5 py-3 text-right text-[10.5px] font-bold uppercase tracking-wide text-white/35">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id} className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white">{job.title}</p>
                      <p className="text-[11.5px] text-white/35">{job.type}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-white/55">{job.department}</td>
                    <td className="px-5 py-4 text-[13px] text-white/55">{job.location}</td>
                    <td className="px-5 py-4">
                      <button disabled={busyId === job._id} onClick={() => toggleStatus(job)} className="disabled:opacity-50">
                        <StatusPill tone={job.status === "open" ? "emerald" : "neutral"}>{job.status}</StatusPill>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton icon={Users} href={`/admin/careers/applications?jobId=${job._id}`} title="View applications" />
                        <IconButton icon={Pencil} href={`/admin/careers/${job._id}`} title="Edit" />
                        <IconButton icon={Trash2} tone="danger" disabled={busyId === job._id} onClick={() => remove(job._id)} title="Delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
