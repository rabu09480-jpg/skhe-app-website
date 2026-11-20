"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Link2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";
import { PdfViewer, StudyMaterialItem } from "@/components/PdfViewer";

interface MaterialRow extends StudyMaterialItem {
  classId: number | null;
  classTitle: string;
  fileSizeBytes: number | null;
  createdAt: string;
}

interface ClassOption {
  id: number;
  title: string;
  titleBn: string | null;
}

export function MaterialsClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { dataSaver, fetchWithRecovery } = useNetwork();

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [previewMaterial, setPreviewMaterial] = useState<MaterialRow | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("pdf");
  const [classId, setClassId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const isStaff = user.role === "instructor" || user.role === "admin";

  const loadMaterials = async () => {
    try {
      const res = await fetchWithRecovery("/api/materials", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setMaterials(d.materials || []);
        setClasses(d.classes || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploading(true);
    try {
      let fileUrl = externalUrl.trim();
      let fileName = "";
      let fileSizeBytes = 0;

      if (type !== "link") {
        if (!file && !fileUrl) {
          setError(lang === "bn" ? "অনুগ্রহ করে একটি ফাইল নির্বাচন করুন" : "Please choose a file");
          setUploading(false);
          return;
        }
        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          const upRes = await fetchWithRecovery("/api/upload", {
            method: "POST",
            body: fd,
          });
          const upData = await upRes.json();
          if (!upRes.ok) {
            setError(upData.error || "Upload failed");
            setUploading(false);
            return;
          }
          fileUrl = upData.fileUrl;
          fileName = upData.fileName;
          fileSizeBytes = upData.fileSizeBytes;
        }
      }

      const res = await fetchWithRecovery("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          topic,
          type,
          classId: classId ? Number(classId) : null,
          fileUrl,
          fileName: fileName || title,
          fileSizeBytes,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Save failed");
        return;
      }

      setTitle("");
      setTopic("");
      setExternalUrl("");
      setFile(null);
      setShowUpload(false);
      loadMaterials();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetchWithRecovery(`/api/materials?id=${id}`, { method: "DELETE" });
    if (previewMaterial?.id === id) setPreviewMaterial(null);
    loadMaterials();
  };

  const subjects = Array.from(new Set(materials.map((m) => m.subject)));
  const filtered = materials.filter(
    (m) => subjectFilter === "all" || m.subject === subjectFilter
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navMaterials")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "পিডিএফ, ছবি, স্লাইড ও নোট — অফলাইনে পড়ার জন্য ডাউনলোড করুন"
              : "PDFs, notes, presentations, and study links — download for offline learning"}
          </p>
        </div>

        {isStaff && (
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{t("upload")}</span>
          </button>
        )}
      </div>

      {/* Upload Form */}
      {isStaff && showUpload && (
        <form
          onSubmit={handleUploadSubmit}
          className="bg-white rounded-xl border border-teal-200 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === "bn" ? "নতুন স্টাডি ম্যাটেরিয়াল যোগ করুন" : "Add Study Material"}
            </h2>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="text-xs text-slate-500"
            >
              {t("cancel")}
            </button>
          </div>
          {error && (
            <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "শিরোনাম" : "Material Title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "বিষয় (Physics / Math)" : "Subject"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              placeholder={lang === "bn" ? "অধ্যায় / টপিক" : "Topic / Chapter"}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
            >
              <option value="pdf">PDF Document</option>
              <option value="image">Image / Note Photo</option>
              <option value="doc">Word / Text Document</option>
              <option value="presentation">Presentation / Slides</option>
              <option value="link">External Link</option>
            </select>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
            >
              <option value="">{lang === "bn" ? "সাধারণ (সকল ক্লাস)" : "General (All Classes)"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleBn || c.title}
                </option>
              ))}
            </select>

            {type === "link" ? (
              <input
                type="url"
                required
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 cursor-pointer text-xs text-slate-700">
                <Upload className="h-4 w-4 text-teal-700 shrink-0" />
                <span className="truncate">{file ? file.name : "Choose file (max 15MB)"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
            >
              {uploading ? t("loading") : t("upload")}
            </button>
          </div>
        </form>
      )}

      {/* Subject Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setSubjectFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            subjectFilter === "all"
              ? "bg-teal-700 text-white border-teal-700"
              : "bg-white text-slate-700 border-slate-200"
          }`}
        >
          {lang === "bn" ? "সকল বিষয়" : "All Subjects"}
        </button>
        {subjects.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSubjectFilter(subj)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              subjectFilter === subj
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Inline PDF / Document Viewer if selected */}
      {previewMaterial && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">{previewMaterial.title}</h2>
            <button
              type="button"
              onClick={() => setPreviewMaterial(null)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {lang === "bn" ? "ভিউয়ার বন্ধ করুন" : "Close Viewer"}
            </button>
          </div>
          <PdfViewer materials={[previewMaterial]} canSyncPage={false} />
        </div>
      )}

      {/* Materials Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {t("noData")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const isImg =
              m.type === "image" || /\.(png|jpg|jpeg|webp|gif)$/i.test(m.fileUrl);
            const sizeKb = m.fileSizeBytes ? `${Math.max(1, Math.round(m.fileSizeBytes / 1024))} KB` : "";

            return (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[11px] font-semibold">
                      {m.type === "pdf" ? (
                        <FileText className="h-3 w-3" />
                      ) : isImg ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : m.type === "link" ? (
                        <Link2 className="h-3 w-3" />
                      ) : (
                        <BookOpen className="h-3 w-3" />
                      )}
                      {m.type.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-500">{sizeKb}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                  <div className="text-xs text-slate-500">
                    {m.subject}
                    {m.topic ? ` • ${m.topic}` : ""}
                  </div>
                  <div className="text-[11px] text-slate-400">{m.classTitle}</div>

                  {/* Lazy / Data-Saver Image Preview */}
                  {isImg && (
                    <div className="pt-1">
                      {dataSaver && !loadedImages[m.id] ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLoadedImages((prev) => ({ ...prev, [m.id]: true }))
                          }
                          className="w-full py-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 text-xs font-medium text-amber-900"
                        >
                          {lang === "bn"
                            ? "ডাটা সেভার চালু — ছবি দেখতে ক্লিক করুন"
                            : "Data Saver ON — Tap to load image"}
                        </button>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.fileUrl}
                          alt={m.title}
                          loading="lazy"
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {m.type === "link" ? (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{lang === "bn" ? "লিংক খুলুন" : "Open Link"}</span>
                      </a>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewMaterial(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{lang === "bn" ? "পড়ুন" : "View"}</span>
                        </button>
                        <a
                          href={`${m.fileUrl}${m.fileUrl.includes("?") ? "&" : "?"}download=1`}
                          download={m.fileName || undefined}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t("download")}</span>
                        </a>
                      </>
                    )}
                  </div>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
