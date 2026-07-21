"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, UploadCloud, FileText, Image as ImageIcon, ListTree, HelpCircle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, FormSection, PrimaryButton, Switch, inputCls, labelCls } from "@/components/admin/AdminUI";

const splitLines = (text) =>
  text.split("\n").map((l) => l.trim()).filter(Boolean);

const joinLines = (arr) => (arr || []).join("\n");

const toFields = (post) => ({
  title: post?.title || "",
  category: post?.category || "",
  description: post?.description || "",
  readTime: post?.readTime || "5 min read",
  coverImage: post?.cover?.image || "",
  coverAlt: post?.cover?.alt || "",
  introText: joinLines(post?.intro),
  sections: post?.sections?.length
    ? post.sections.map((s) => ({ h2: s.h2, pText: joinLines(s.p), listText: joinLines(s.list) }))
    : [{ h2: "", pText: "", listText: "" }],
  faqs: post?.faqs?.length ? post.faqs.map((f) => ({ q: f.q, a: f.a })) : [{ q: "", a: "" }],
  published: post?.published !== false,
});

export default function BlogPostForm({ initialPost, onSaved }) {
  const [fields, setFields] = useState(() => toFields(initialPost));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = Boolean(initialPost);

  const set = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

  const updateSection = (i, key, value) =>
    setFields((prev) => ({
      ...prev,
      sections: prev.sections.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)),
    }));

  const updateFaq = (i, key, value) =>
    setFields((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)),
    }));

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      const { data } = await adminApi.post("/admin/upload", {
        file: base64,
        folder: "splitease_blog",
        resourceType: "image",
      });
      set("coverImage", data.url);
      toast.success("Cover image uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fields.title.trim() || !fields.category.trim() || !fields.description.trim()) {
      toast.error("Title, category and description are required.");
      return;
    }

    const payload = {
      title: fields.title.trim(),
      category: fields.category.trim(),
      description: fields.description.trim(),
      readTime: fields.readTime.trim() || "5 min read",
      cover: { image: fields.coverImage.trim(), alt: fields.coverAlt.trim() },
      intro: splitLines(fields.introText),
      sections: fields.sections
        .filter((s) => s.h2.trim())
        .map((s) => ({ h2: s.h2.trim(), p: splitLines(s.pText), list: splitLines(s.listText) })),
      faqs: fields.faqs.filter((f) => f.q.trim() && f.a.trim()),
      published: fields.published,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/blog/posts/${initialPost._id}`, payload);
        toast.success("Post updated.");
      } else {
        await adminApi.post("/admin/blog/posts", payload);
        toast.success("Post created.");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save post.");
    } finally {
      setSaving(false);
    }
  };

  const addBtnCls = "inline-flex items-center gap-1 text-[12px] font-bold text-cyan-300 hover:text-cyan-200";
  const rowCard = "rounded-xl border border-white/[0.07] bg-white/[0.015] p-4";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      <FormSection icon={FileText} title="Basics" description="Title, category and the summary shown on the blog index.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelCls}>Title</span>
            <input className={inputCls} value={fields.title} onChange={(e) => set("title", e.target.value)} required />
          </label>
          <label>
            <span className={labelCls}>Category</span>
            <input className={inputCls} value={fields.category} onChange={(e) => set("category", e.target.value)} required />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Description</span>
          <textarea className={`${inputCls} min-h-20 resize-y`} value={fields.description} onChange={(e) => set("description", e.target.value)} required />
        </label>
        <label className="block">
          <span className={labelCls}>Read time</span>
          <input className={`${inputCls} sm:w-48`} value={fields.readTime} onChange={(e) => set("readTime", e.target.value)} placeholder="6 min read" />
        </label>
      </FormSection>

      <FormSection icon={ImageIcon} title="Cover image" description="Shown on the blog index card and article header.">
        <div className="flex flex-wrap items-center gap-3">
          {fields.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fields.coverImage} alt="" className="h-16 w-28 rounded-lg border border-white/[0.08] object-cover" />
          ) : (
            <span className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-white/[0.1] text-white/20">
              <ImageIcon size={18} />
            </span>
          )}
          <input className={`${inputCls} mt-0 flex-1`} value={fields.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://... or upload" />
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/[0.06]">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Alt text</span>
          <input className={inputCls} value={fields.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} />
        </label>
      </FormSection>

      <FormSection icon={ListTree} title="Content" description="Intro paragraphs plus any number of body sections.">
        <label className="block">
          <span className={labelCls}>Intro paragraphs (one per line)</span>
          <textarea className={`${inputCls} min-h-24 resize-y`} value={fields.introText} onChange={(e) => set("introText", e.target.value)} />
        </label>

        <div className="flex items-center justify-between pt-1">
          <span className={labelCls}>Sections</span>
          <button type="button" onClick={() => set("sections", [...fields.sections, { h2: "", pText: "", listText: "" }])} className={addBtnCls}>
            <Plus size={13} /> Add section
          </button>
        </div>
        <div className="space-y-3">
          {fields.sections.map((s, i) => (
            <div key={i} className={rowCard}>
              <div className="flex items-center gap-2">
                <input
                  className={`${inputCls} mt-0 flex-1`}
                  placeholder="Section heading"
                  value={s.h2}
                  onChange={(e) => updateSection(i, "h2", e.target.value)}
                />
                {fields.sections.length > 1 && (
                  <button type="button" onClick={() => set("sections", fields.sections.filter((_, idx) => idx !== i))} className="text-white/25 hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <textarea
                className={`${inputCls} min-h-20 resize-y`}
                placeholder="Paragraphs (one per line)"
                value={s.pText}
                onChange={(e) => updateSection(i, "pText", e.target.value)}
              />
              <textarea
                className={`${inputCls} min-h-16 resize-y`}
                placeholder="Bullet list (optional, one item per line)"
                value={s.listText}
                onChange={(e) => updateSection(i, "listText", e.target.value)}
              />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection icon={HelpCircle} title="FAQs" description="Feeds the FAQPage structured data on the article.">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Questions</span>
          <button type="button" onClick={() => set("faqs", [...fields.faqs, { q: "", a: "" }])} className={addBtnCls}>
            <Plus size={13} /> Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {fields.faqs.map((f, i) => (
            <div key={i} className={rowCard}>
              <div className="flex items-center gap-2">
                <input
                  className={`${inputCls} mt-0 flex-1`}
                  placeholder="Question"
                  value={f.q}
                  onChange={(e) => updateFaq(i, "q", e.target.value)}
                />
                {fields.faqs.length > 1 && (
                  <button type="button" onClick={() => set("faqs", fields.faqs.filter((_, idx) => idx !== i))} className="text-white/25 hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <textarea
                className={`${inputCls} min-h-16 resize-y`}
                placeholder="Answer"
                value={f.a}
                onChange={(e) => updateFaq(i, "a", e.target.value)}
              />
            </div>
          ))}
        </div>
      </FormSection>

      <Card className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] sm:p-5">
        <div className="max-w-xs">
          <Switch checked={fields.published} onChange={(v) => set("published", v)} label="Published" description="Visible on the public blog" />
        </div>
        <PrimaryButton type="submit" disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? "Save changes" : "Create post"}
        </PrimaryButton>
      </Card>
    </form>
  );
}
