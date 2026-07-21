"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import BlogPostForm from "@/components/admin/BlogPostForm";
import toast from "@/lib/toast";
import { LoadingBlock, PageHeader, SecondaryButton } from "@/components/admin/AdminUI";

export default function EditBlogPostPage() {
  const router = useRouter();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.get("/admin/blog/posts");
        const found = data.find((p) => p._id === id);
        if (!found) {
          toast.error("Post not found.");
          router.push("/admin/blog");
          return;
        }
        setPost(found);
      } catch {
        toast.error("Failed to load post.");
        router.push("/admin/blog");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  return (
    <div>
      <PageHeader
        eyebrow="Blog"
        title="Edit post"
        description="Update this article's content and visibility."
        action={<SecondaryButton href="/admin/blog"><ArrowLeft size={15} /> Back to posts</SecondaryButton>}
      />
      {loading ? <LoadingBlock /> : <BlogPostForm initialPost={post} onSaved={() => router.push("/admin/blog")} />}
    </div>
  );
}
