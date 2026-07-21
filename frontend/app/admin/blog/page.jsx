"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, Eye, EyeOff, Newspaper } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, EmptyState, IconButton, LoadingBlock, PageHeader, PrimaryButton, StatusPill } from "@/components/admin/AdminUI";

export default function AdminBlogListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/blog/posts");
      setPosts(data);
    } catch {
      toast.error("Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublished = async (post) => {
    setBusyId(post._id);
    try {
      await adminApi.patch(`/admin/blog/posts/${post._id}`, { published: !post.published });
      setPosts((prev) => prev.map((p) => (p._id === post._id ? { ...p, published: !p.published } : p)));
    } catch {
      toast.error("Failed to update post.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this post permanently?")) return;
    setBusyId(id);
    try {
      await adminApi.delete(`/admin/blog/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${posts.length} total`}
        title="Blog posts"
        description="Posts created here appear on /blog alongside the built-in articles."
        action={
          <PrimaryButton href="/admin/blog/new">
            <Plus size={15} /> New post
          </PrimaryButton>
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Create your first post to publish it on the public blog."
          action={<PrimaryButton href="/admin/blog/new"><Plus size={15} /> New post</PrimaryButton>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Post</th>
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Category</th>
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Status</th>
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-white/35">Created</th>
                  <th className="px-5 py-3 text-right text-[10.5px] font-bold uppercase tracking-wide text-white/35">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post._id} className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="max-w-[280px] px-5 py-4">
                      <p className="truncate font-bold text-white">{post.title}</p>
                      <p className="truncate text-[11.5px] text-white/35">/blog/{post.slug}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-white/55">{post.category}</td>
                    <td className="px-5 py-4">
                      <StatusPill tone={post.published ? "emerald" : "neutral"}>
                        {post.published ? "Published" : "Draft"}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-white/40">{new Date(post.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton
                          icon={post.published ? EyeOff : Eye}
                          disabled={busyId === post._id}
                          onClick={() => togglePublished(post)}
                          title={post.published ? "Unpublish" : "Publish"}
                        />
                        <IconButton icon={Pencil} href={`/admin/blog/${post._id}`} title="Edit" />
                        <IconButton icon={Trash2} tone="danger" disabled={busyId === post._id} onClick={() => remove(post._id)} title="Delete" />
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
