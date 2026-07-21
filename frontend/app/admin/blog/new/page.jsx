"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import BlogPostForm from "@/components/admin/BlogPostForm";
import { PageHeader, SecondaryButton } from "@/components/admin/AdminUI";

export default function NewBlogPostPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        eyebrow="Blog"
        title="New post"
        description="Write a new article to publish on the public blog."
        action={<SecondaryButton href="/admin/blog"><ArrowLeft size={15} /> Back to posts</SecondaryButton>}
      />
      <BlogPostForm onSaved={() => router.push("/admin/blog")} />
    </div>
  );
}
