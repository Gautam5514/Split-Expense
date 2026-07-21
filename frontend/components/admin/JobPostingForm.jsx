"use client";

import { useState } from "react";
import { Loader2, Briefcase, ListChecks } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, FormSection, PrimaryButton, Switch, inputCls, labelCls } from "@/components/admin/AdminUI";

const splitLines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const joinLines = (arr) => (arr || []).join("\n");

const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];

export default function JobPostingForm({ initialJob, onSaved }) {
  const isEdit = Boolean(initialJob);
  const [fields, setFields] = useState({
    title: initialJob?.title || "",
    department: initialJob?.department || "",
    location: initialJob?.location || "",
    type: initialJob?.type || "Full-time",
    description: initialJob?.description || "",
    responsibilitiesText: joinLines(initialJob?.responsibilities),
    requirementsText: joinLines(initialJob?.requirements),
    status: initialJob?.status || "open",
  });
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fields.title.trim() || !fields.department.trim() || !fields.location.trim() || !fields.description.trim()) {
      toast.error("Title, department, location and description are required.");
      return;
    }

    const payload = {
      title: fields.title.trim(),
      department: fields.department.trim(),
      location: fields.location.trim(),
      type: fields.type,
      description: fields.description.trim(),
      responsibilities: splitLines(fields.responsibilitiesText),
      requirements: splitLines(fields.requirementsText),
      status: fields.status,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/careers/jobs/${initialJob._id}`, payload);
        toast.success("Job updated.");
      } else {
        await adminApi.post("/admin/careers/jobs", payload);
        toast.success("Job posted.");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      <FormSection icon={Briefcase} title="Role details" description="Shown at the top of the listing on /careers.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelCls}>Title</span>
            <input className={inputCls} value={fields.title} onChange={(e) => set("title", e.target.value)} required />
          </label>
          <label>
            <span className={labelCls}>Department</span>
            <input className={inputCls} value={fields.department} onChange={(e) => set("department", e.target.value)} required />
          </label>
          <label>
            <span className={labelCls}>Location</span>
            <input className={inputCls} value={fields.location} onChange={(e) => set("location", e.target.value)} placeholder="Remote / Bengaluru" required />
          </label>
          <label>
            <span className={labelCls}>Type</span>
            <select className={inputCls} value={fields.type} onChange={(e) => set("type", e.target.value)}>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Description</span>
          <textarea className={`${inputCls} min-h-24 resize-y`} value={fields.description} onChange={(e) => set("description", e.target.value)} required />
        </label>
      </FormSection>

      <FormSection icon={ListChecks} title="What the role involves" description="Rendered as bullet lists on the public listing.">
        <label className="block">
          <span className={labelCls}>Responsibilities (one per line)</span>
          <textarea className={`${inputCls} min-h-20 resize-y`} value={fields.responsibilitiesText} onChange={(e) => set("responsibilitiesText", e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls}>Requirements (one per line)</span>
          <textarea className={`${inputCls} min-h-20 resize-y`} value={fields.requirementsText} onChange={(e) => set("requirementsText", e.target.value)} />
        </label>
      </FormSection>

      <Card className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] sm:p-5">
        <div className="max-w-xs">
          <Switch
            checked={fields.status === "open"}
            onChange={(v) => set("status", v ? "open" : "closed")}
            label="Accepting applications"
            description="Off hides it from /careers"
          />
        </div>
        <PrimaryButton type="submit" disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? "Save changes" : "Post job"}
        </PrimaryButton>
      </Card>
    </form>
  );
}
