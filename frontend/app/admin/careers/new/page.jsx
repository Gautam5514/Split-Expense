"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import JobPostingForm from "@/components/admin/JobPostingForm";
import { PageHeader, SecondaryButton } from "@/components/admin/AdminUI";

export default function NewJobPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        eyebrow="Careers"
        title="New job posting"
        description="Publish a new open role to the public careers page."
        action={<SecondaryButton href="/admin/careers"><ArrowLeft size={15} /> Back to careers</SecondaryButton>}
      />
      <JobPostingForm onSaved={() => router.push("/admin/careers")} />
    </div>
  );
}
