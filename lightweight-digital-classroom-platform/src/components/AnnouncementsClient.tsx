"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface AnnouncementRow {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetRole: string;
  authorName: string;
  createdAt: string;
}

export function AnnouncementsClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [targetRole, setTargetRole] = useState("all");

  const isStaff = user.role === "admin" || user.role === "instructor";

  const load = async () => {
    try {
      const res = await fetchWithRecovery("/api/announcements", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.announcements || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithRecovery("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, priority, targetRole }),
    });
    if (res.ok) {
      setTitle("");
      setContent("");
      setShowForm(false);
      load();
    }
  };

  const handleDelete = async (id: number) => {
    await fetchWithRecovery(`/api/announcements?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navAnnouncements")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "শ্রেণিকক্ষের গুরুত্বপূর্ণ বিজ্ঞপ্তি ও সময়সূচি পরিবর্তন"
              : "Important classroom updates, reminders, and notices"}
          </p>
        </div>

        {isStaff && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === "bn" ? "নতুন ঘোষণা" : "New Announcement"}</span>
          </button>
        )}
      </div>

      {isStaff && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-teal-200 p-5 space-y-3"
        >
          <input
            type="text"
            required
            placeholder={lang === "bn" ? "ঘোষণার শিরোনাম" : "Announcement Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <textarea
            rows={3}
            required
            placeholder={lang === "bn" ? "বিস্তারিত..." : "Message content..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">{lang === "bn" ? "সকল" : "Everyone"}</option>
                <option value="student">{t("roleStudent")}</option>
                <option value="instructor">{t("roleInstructor")}</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
            >
              {lang === "bn" ? "প্রকাশ করুন" : "Publish"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border p-4 space-y-1.5 ${
                a.priority === "urgent"
                  ? "border-red-300 bg-red-50/30"
                  : a.priority === "important"
                  ? "border-amber-300 bg-amber-50/30"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Megaphone className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-900">{a.title}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase font-semibold">
                    {a.priority}
                  </span>
                </div>
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                {a.content}
              </p>
              <div className="text-[11px] text-slate-400">
                {a.authorName} • {new Date(a.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
