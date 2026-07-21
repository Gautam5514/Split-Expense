"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import JobPostingForm from "@/components/admin/JobPostingForm";
import toast from "@/lib/toast";
import { LoadingBlock, PageHeader, SecondaryButton } from "@/components/admin/AdminUI";

export default function EditJobPage() {
  const router = useRouter();
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.get("/admin/careers/jobs");
        const found = data.find((j) => j._id === id);
        if (!found) {
          toast.error("Job not found.");
          router.push("/admin/careers");
          return;
        }
        setJob(found);
      } catch {
        toast.error("Failed to load job.");
        router.push("/admin/careers");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  return (
    <div>
      <PageHeader
        eyebrow="Careers"
        title="Edit job posting"
        description="Update this role's details or open/close it."
        action={<SecondaryButton href="/admin/careers"><ArrowLeft size={15} /> Back to careers</SecondaryButton>}
      />
      {loading ? <LoadingBlock /> : <JobPostingForm initialJob={job} onSaved={() => router.push("/admin/careers")} />}
    </div>
  );
}
