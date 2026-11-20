"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Play, Plus, Trash2, Upload, Video } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface RecordingRow {
  id: number;
  title: string;
  subject: string;
  recordingUrl: string;
  durationLabel: string | null;
  recordedDate: string;
  notes: string | null;
  classTitle: string;
}

export function RecordingsClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { dataSaver, fetchWithRecovery } = useNetwork();

  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [classes, setClasses] = useState<{ id: number; title: string; titleBn: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [durationLabel, setDurationLabel] = useState("45 min (Low-Data 360p)");
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [classId, setClassId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

  const isStaff = user.role === "instructor" || user.role === "admin";

  const loadRecordings = async () => {
    try {
      const res = await fetchWithRecovery("/api/recordings", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setRecordings(d.recordings || []);
        setClasses(d.classes || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalUrl = recordingUrl.trim();
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetchWithRecovery("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const d = await up.json();
          finalUrl = d.fileUrl;
        }
      }
      if (!finalUrl) return;
      const res = await fetchWithRecovery("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          recordingUrl: finalUrl,
          durationLabel,
          recordedDate,
          notes,
          classId: classId ? Number(classId) : null,
        }),
      });
      if (res.ok) {
        setTitle("");
        setRecordingUrl("");
        setNotes("");
        setFile(null);
        setShowForm(false);
        loadRecordings();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetchWithRecovery(`/api/recordings?id=${id}`, { method: "DELETE" });
    loadRecordings();
  };

  const subjects = Array.from(new Set(recordings.map((r) => r.subject)));
  const filtered = recordings.filter(
    (r) => subjectFilter === "all" || r.subject === subjectFilter
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navRecordings")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "রেকর্ডকৃত ক্লাসসমূহ — স্বল্প ডাটা প্লেব্যাক ও রিভিশনের জন্য"
              : "Recorded classes organized by subject — optimized for low-bandwidth playback"}
          </p>
        </div>

        {isStaff && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === "bn" ? "রেকর্ডিং যোগ করুন" : "Add Recording"}</span>
          </button>
        )}
      </div>

      {dataSaver && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs text-amber-900">
          {lang === "bn"
            ? "ডাটা সেভার মোড চালু আছে: কোনো ভিডিও স্বয়ংক্রিয়ভাবে চলবে না (Autoplay বন্ধ)।"
            : "Data Saver is ON: Video autoplay is disabled to save mobile data."}
        </div>
      )}

      {isStaff && showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-teal-200 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === "bn" ? "ক্লাস রেকর্ডিং যুক্ত করুন" : "Add Class Recording"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-500"
            >
              {t("cancel")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "রেকর্ডিং শিরোনাম" : "Recording Title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              required
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="date"
              required
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              placeholder="Duration (e.g. 45 min 360p)"
              value={durationLabel}
              onChange={(e) => setDurationLabel(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
            >
              <option value="">{lang === "bn" ? "ক্লাস নির্বাচন (ঐচ্ছিক)" : "Related Class (optional)"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleBn || c.title}
                </option>
              ))}
            </select>
            <input
              type="url"
              placeholder="Google Drive / Video Link"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 cursor-pointer text-xs text-slate-700">
              <Upload className="h-4 w-4 text-teal-700" />
              <span className="truncate">
                {file ? file.name : "Or upload MP4/WebM (max 15MB)"}
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <input
              type="text"
              placeholder="Notes / Timestamps"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="sm:col-span-2 px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
            >
              {saving ? t("loading") : t("save")}
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
        {subjects.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubjectFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              subjectFilter === s
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {t("noData")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const isLocalVideo = r.recordingUrl.startsWith("/api/files/");
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-teal-800 font-semibold">
                      <Video className="h-3.5 w-3.5" />
                      <span>{r.subject}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-normal">{r.recordedDate}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{r.title}</h3>
                    {r.durationLabel && (
                      <div className="text-xs text-slate-500 mt-0.5">{r.durationLabel}</div>
                    )}
                  </div>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {r.notes && <p className="text-xs text-slate-600">{r.notes}</p>}

                {isLocalVideo ? (
                  activeVideoId === r.id ? (
                    <video
                      src={r.recordingUrl}
                      controls
                      preload="none"
                      className="w-full rounded-lg border border-slate-200 bg-black"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveVideoId(r.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{lang === "bn" ? "প্লেয়ার লোড করুন" : "Load Video Player"}</span>
                    </button>
                  )
                ) : (
                  <a
                    href={r.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{lang === "bn" ? "রেকর্ডিং দেখুন" : "Watch Recording"}</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
