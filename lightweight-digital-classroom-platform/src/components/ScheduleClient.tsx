"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Edit2,
  List,
  Play,
  Plus,
  Square,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface ClassRow {
  id: number;
  title: string;
  titleBn: string | null;
  subject: string;
  description: string | null;
  instructorName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  meetLink: string | null;
  backupMeetLink: string | null;
  materialsCount: number;
}

export function ScheduleClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [titleBn, setTitleBn] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:00");
  const [meetLink, setMeetLink] = useState("");
  const [backupMeetLink, setBackupMeetLink] = useState("");
  const [saving, setSaving] = useState(false);

  const isStaff = user.role === "instructor" || user.role === "admin";

  const loadClasses = async () => {
    try {
      const res = await fetchWithRecovery("/api/classes", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setClasses(d.classes || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setTitle("");
    setTitleBn("");
    setSubject("Physics");
    setDescription("");
    setScheduledDate(new Date().toISOString().slice(0, 10));
    setStartTime("16:00");
    setEndTime("17:00");
    setMeetLink("");
    setBackupMeetLink("");
    setShowForm(true);
  };

  const openEditForm = (cls: ClassRow) => {
    setEditingId(cls.id);
    setTitle(cls.title);
    setTitleBn(cls.titleBn || "");
    setSubject(cls.subject);
    setDescription(cls.description || "");
    setScheduledDate(cls.scheduledDate);
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setMeetLink(cls.meetLink || "");
    setBackupMeetLink(cls.backupMeetLink || "");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        titleBn: titleBn || title,
        subject,
        description,
        scheduledDate,
        startTime,
        endTime,
        meetLink,
        backupMeetLink,
      };
      const res = editingId
        ? await fetchWithRecovery(`/api/classes/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetchWithRecovery("/api/classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setShowForm(false);
        loadClasses();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetchWithRecovery(`/api/classes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadClasses();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === "bn" ? "ক্লাসটি মুছে ফেলবেন?" : "Delete this class?")) return;
    await fetchWithRecovery(`/api/classes/${id}`, { method: "DELETE" });
    loadClasses();
  };

  const filtered = classes.filter(
    (c) => statusFilter === "all" || c.status === statusFilter
  );

  // Build simple current month calendar days
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const statusBadge = (st: string) => {
    if (st === "live") return "bg-red-100 text-red-700";
    if (st === "upcoming") return "bg-teal-50 text-teal-800";
    if (st === "completed") return "bg-slate-100 text-slate-700";
    return "bg-rose-100 text-rose-800";
  };

  const statusLabel = (st: string) => {
    if (st === "live") return t("statusLive");
    if (st === "upcoming") return t("statusUpcoming");
    if (st === "completed") return t("statusCompleted");
    return t("statusCancelled");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navSchedule")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "সকল নির্ধারিত, লাইভ ও সম্পন্ন ক্লাসের সময়সূচি"
              : "Upcoming, live, and completed class sessions"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md ${
                viewMode === "list" ? "bg-teal-700 text-white" : "text-slate-700"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>{lang === "bn" ? "তালিকা" : "List"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md ${
                viewMode === "calendar" ? "bg-teal-700 text-white" : "text-slate-700"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{lang === "bn" ? "ক্যালেন্ডার" : "Calendar"}</span>
            </button>
          </div>

          {isStaff && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>{t("createClassQuick")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Create / Edit Class Form */}
      {isStaff && showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-teal-200 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {editingId
                ? lang === "bn"
                  ? "ক্লাস সম্পাদনা"
                  : "Edit Class"
                : t("createClassQuick")}
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
              placeholder="Class Title (English)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              placeholder="ক্লাসের নাম (বাংলা)"
              value={titleBn}
              onChange={(e) => setTitleBn(e.target.value)}
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
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="url"
              placeholder="Google Meet Link (https://meet.google.com/...)"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="url"
              placeholder="Backup Meet Link (optional)"
              value={backupMeetLink}
              onChange={(e) => setBackupMeetLink(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              placeholder="Short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
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

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {["all", "live", "upcoming", "completed", "cancelled"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              statusFilter === st
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {st === "all" ? (lang === "bn" ? "সকল" : "All") : statusLabel(st)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : viewMode === "calendar" ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
          <div className="text-sm font-bold text-slate-900 mb-3">
            {now.toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="grid grid-cols-7 gap-1.5 min-w-[640px]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-bold text-slate-500 py-1"
              >
                {d}
              </div>
            ))}
            {calendarCells.map((day, idx) => {
              if (!day) return <div key={idx} className="h-24 bg-slate-50/50 rounded-lg" />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayClasses = filtered.filter((c) => c.scheduledDate === dateStr);
              return (
                <div
                  key={idx}
                  className="h-24 rounded-lg border border-slate-200 p-1.5 flex flex-col gap-1 overflow-y-auto bg-white"
                >
                  <span className="text-[11px] font-bold text-slate-700">{day}</span>
                  {dayClasses.map((dc) => (
                    <Link
                      key={dc.id}
                      href={`/classroom/${dc.id}`}
                      className={`block rounded px-1.5 py-0.5 text-[10px] font-semibold truncate ${statusBadge(
                        dc.status
                      )}`}
                    >
                      {dc.startTime} {dc.titleBn || dc.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              {t("noData")}
            </div>
          ) : (
            filtered.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(
                        cls.status
                      )}`}
                    >
                      {statusLabel(cls.status)}
                    </span>
                    <span className="text-xs font-semibold text-teal-800">{cls.subject}</span>
                    <span className="text-xs text-slate-500">
                      {cls.scheduledDate} • {cls.startTime} - {cls.endTime}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {cls.titleBn || cls.title}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {cls.instructorName}
                    {cls.description ? ` — ${cls.description}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Link
                    href={`/classroom/${cls.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>{t("enterClassroom")}</span>
                  </Link>

                  {isStaff && (
                    <>
                      {cls.status === "upcoming" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(cls.id, "live")}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>{t("startClass")}</span>
                        </button>
                      )}
                      {cls.status === "live" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(cls.id, "completed")}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                        >
                          <Square className="h-3.5 w-3.5" />
                          <span>{t("endClass")}</span>
                        </button>
                      )}
                      {cls.status === "upcoming" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(cls.id, "cancelled")}
                          className="p-2 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                          title="Cancel class"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditForm(cls)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {user.role === "admin" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(cls.id)}
                          className="p-2 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
