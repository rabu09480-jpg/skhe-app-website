"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Megaphone,
  MessageSquare,
  Play,
  Plus,
  Square,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface ClassItem {
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
}

interface DashboardData {
  summary: {
    totalStudents: number;
    activeStudents: number;
    totalInstructors: number;
    totalClasses: number;
    upcomingCount: number;
    liveCount: number;
    completedCount: number;
    totalSubmissions: number;
    ungradedSubmissions: number;
    overallAttendanceRate: number;
  };
  nextClass: ClassItem | null;
  todaysClasses: ClassItem[];
  upcomingClasses: ClassItem[];
  liveClasses: ClassItem[];
  recentMaterials: {
    id: number;
    title: string;
    subject: string;
    type: string;
    fileUrl: string;
  }[];
  recentAnnouncements: {
    id: number;
    title: string;
    content: string;
    priority: string;
    createdAt: string;
  }[];
  pendingAssignments: {
    id: number;
    title: string;
    subject: string;
    deadline: string;
    maxMarks: number;
  }[];
  myRecentSubmissions: {
    id: number;
    assignmentTitle: string;
    status: string;
    marks: number | null;
    maxMarks: number;
    feedback: string | null;
  }[];
  recentQuestions: {
    id: number;
    classId: number;
    classTitle: string;
    studentName: string;
    message: string;
    isAnswered: boolean;
  }[];
  myProgress: {
    attendanceRate: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    assignmentsSubmitted: number;
    totalAssignments: number;
    avgQuizScore: number;
  } | null;
  strugglingStudents: {
    studentId: number;
    name: string;
    attendanceRate: number;
    assignmentRate: number;
    avgQuizScore: number;
  }[];
  weeklyActivity: {
    dayBn: string;
    dayEn: string;
    score: number;
  }[];
}

function CountdownBadge({
  scheduledDate,
  startTime,
  status,
  lang,
}: {
  scheduledDate: string;
  startTime: string;
  status: string;
  lang: "bn" | "en";
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const compute = () => {
      if (status === "live") {
        setLabel(lang === "bn" ? "এখন লাইভ চলছে" : "Live Right Now");
        return;
      }
      const target = new Date(`${scheduledDate}T${startTime}:00`);
      const diff = target.getTime() - Date.now();
      if (isNaN(diff) || diff <= 0) {
        setLabel(lang === "bn" ? "শুরু হওয়ার সময় হয়েছে" : "Starting soon");
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (hrs > 24) {
        const days = Math.floor(hrs / 24);
        setLabel(lang === "bn" ? `${days} দিন বাকি` : `In ${days} day(s)`);
      } else {
        setLabel(
          `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      }
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [scheduledDate, startTime, status, lang]);

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-teal-900 border border-teal-200">
      <Clock className="h-3.5 w-3.5 text-teal-700" />
      <span>{label}</span>
    </span>
  );
}

export function DashboardClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Quick Create Class state
  const [qTitle, setQTitle] = useState("");
  const [qSubject, setQSubject] = useState("Physics");
  const [qDate, setQDate] = useState(new Date().toISOString().slice(0, 10));
  const [qStart, setQStart] = useState("16:00");
  const [qEnd, setQEnd] = useState("17:00");
  const [qMeetLink, setQMeetLink] = useState("");
  const [creating, setCreating] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await fetchWithRecovery("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClassStatus = async (classId: number, status: "live" | "completed") => {
    await fetchWithRecovery(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadDashboard();
  };

  const handleQuickCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetchWithRecovery("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: qTitle,
          titleBn: qTitle,
          subject: qSubject,
          scheduledDate: qDate,
          startTime: qStart,
          endTime: qEnd,
          meetLink: qMeetLink,
        }),
      });
      if (res.ok) {
        setQTitle("");
        setQMeetLink("");
        setShowQuickCreate(false);
        loadDashboard();
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-xl bg-white border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      </div>
    );
  }

  const isStaff = user.role === "instructor" || user.role === "admin";

  return (
    <div className="space-y-6">
      {/* Greeting & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {t("welcomeBack")}, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {user.role === "student"
              ? lang === "bn"
                ? `${user.className || "SSC ব্যাচ"} • আপনার আজকের পড়াশোনার সারসংক্ষেপ`
                : `${user.className || "SSC Batch"} • Your learning overview for today`
              : user.role === "instructor"
              ? lang === "bn"
                ? "শিক্ষক ড্যাশবোর্ড • ক্লাস পরিচালনা ও শিক্ষার্থীদের অগ্রগতি"
                : "Instructor Dashboard • Manage classes and track student progress"
              : lang === "bn"
              ? "প্রশাসক ড্যাশবোর্ড • সম্পূর্ণ শ্রেণিকক্ষ ব্যবস্থাপনা"
              : "Admin Dashboard • Full classroom operations"}
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowQuickCreate((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>{t("createClassQuick")}</span>
            </button>
            <Link
              href="/materials"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium"
            >
              <BookOpen className="h-4 w-4 text-teal-700" />
              <span>{lang === "bn" ? "নোট আপলোড" : "Upload Material"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Create Class Inline Panel (Instructor / Admin) */}
      {isStaff && showQuickCreate && (
        <form
          onSubmit={handleQuickCreateClass}
          className="bg-white rounded-xl border border-teal-200 p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">{t("createClassQuick")}</h2>
            <button
              type="button"
              onClick={() => setShowQuickCreate(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              {t("cancel")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "ক্লাসের শিরোনাম" : "Class Title"}
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "বিষয় (যেমন: Physics)" : "Subject"}
              value={qSubject}
              onChange={(e) => setQSubject(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="date"
              required
              value={qDate}
              onChange={(e) => setQDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="time"
              required
              value={qStart}
              onChange={(e) => setQStart(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="time"
              required
              value={qEnd}
              onChange={(e) => setQEnd(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="url"
              placeholder="Google Meet link (https://meet.google.com/...)"
              value={qMeetLink}
              onChange={(e) => setQMeetLink(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800"
            >
              {creating ? t("loading") : t("save")}
            </button>
          </div>
        </form>
      )}

      {/* STUDENT HERO: Next Scheduled / Live Class */}
      {user.role === "student" && (
        <section className="rounded-2xl bg-teal-800 text-white p-5 sm:p-6 border border-teal-900">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-teal-200">
                  {t("nextScheduledClass")}
                </span>
                {data.nextClass && (
                  <CountdownBadge
                    scheduledDate={data.nextClass.scheduledDate}
                    startTime={data.nextClass.startTime}
                    status={data.nextClass.status}
                    lang={lang}
                  />
                )}
              </div>

              {data.nextClass ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {data.nextClass.titleBn || data.nextClass.title}
                  </h2>
                  <p className="text-sm text-teal-100">
                    {data.nextClass.subject} • {data.nextClass.instructorName} •{" "}
                    {data.nextClass.scheduledDate} ({data.nextClass.startTime} -{" "}
                    {data.nextClass.endTime})
                  </p>
                </>
              ) : (
                <p className="text-sm text-teal-100">
                  {lang === "bn"
                    ? "এই মুহূর্তে কোনো আসন্ন ক্লাস নির্ধারিত নেই।"
                    : "No upcoming classes scheduled right now."}
                </p>
              )}
            </div>

            {data.nextClass && (
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href={`/classroom/${data.nextClass.id}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm sm:text-base"
                >
                  <Video className="h-5 w-5" />
                  <span>
                    {data.nextClass.status === "live"
                      ? t("joinLiveClass")
                      : t("enterClassroom")}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STAFF SUMMARY METRICS */}
      {isStaff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>{t("totalStudents")}</span>
              <Users className="h-4 w-4 text-teal-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data.summary.totalStudents}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {t("activeStudents")}: {data.summary.activeStudents}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>{t("totalClasses")}</span>
              <Calendar className="h-4 w-4 text-teal-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data.summary.totalClasses}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lang === "bn"
                ? `লাইভ: ${data.summary.liveCount} • আসন্ন: ${data.summary.upcomingCount}`
                : `Live: ${data.summary.liveCount} • Upcoming: ${data.summary.upcomingCount}`}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>{t("attendanceSummary")}</span>
              <UserCheck className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data.summary.overallAttendanceRate}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lang === "bn" ? "গড় উপস্থিতির হার" : "Average attendance rate"}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>{t("navAssignments")}</span>
              <ClipboardList className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data.summary.totalSubmissions}
            </div>
            <div className="text-xs text-amber-700 font-medium mt-0.5">
              {lang === "bn"
                ? `মূল্যায়ন বাকি: ${data.summary.ungradedSubmissions}টি`
                : `Pending grading: ${data.summary.ungradedSubmissions}`}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT SUMMARY METRICS */}
      {user.role === "student" && data.myProgress && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">{t("attendanceSummary")}</div>
            <div className="text-2xl font-bold text-teal-800 mt-1">
              {data.myProgress.attendanceRate}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lang === "bn"
                ? `উপস্থিত ${data.myProgress.presentCount} • দেরি ${data.myProgress.lateCount}`
                : `Present ${data.myProgress.presentCount} • Late ${data.myProgress.lateCount}`}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">{t("pendingHomework")}</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {data.pendingAssignments.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lang === "bn"
                ? `জমা দেওয়া হয়েছে ${data.myProgress.assignmentsSubmitted}/${data.myProgress.totalAssignments}`
                : `Submitted ${data.myProgress.assignmentsSubmitted}/${data.myProgress.totalAssignments}`}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">
              {lang === "bn" ? "কুইজ গড় নম্বর" : "Quiz Average"}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data.myProgress.avgQuizScore}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lang === "bn" ? "স্বয়ংক্রিয় ও লিখিত মূল্যায়ন" : "Objective & written scores"}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">{t("todaysClasses")}</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data.todaysClasses.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lang === "bn"
                ? `আসন্ন মোট ${data.upcomingClasses.length}টি ক্লাস`
                : `${data.upcomingClasses.length} upcoming classes`}
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's & Upcoming Classes */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {t("todaysClasses")} & {t("upcomingClasses")}
              </h2>
              <Link
                href="/schedule"
                className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                <span>{lang === "bn" ? "সব রুটিন" : "Full Schedule"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {[...data.liveClasses, ...data.upcomingClasses].slice(0, 5).map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          cls.status === "live"
                            ? "bg-red-100 text-red-700"
                            : "bg-teal-50 text-teal-800"
                        }`}
                      >
                        {cls.status === "live" ? t("statusLive") : t("statusUpcoming")}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{cls.subject}</span>
                    </div>
                    <div className="font-semibold text-sm text-slate-900 mt-1">
                      {cls.titleBn || cls.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {cls.scheduledDate} • {cls.startTime} - {cls.endTime} • {cls.instructorName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isStaff && cls.status === "upcoming" && (
                      <button
                        type="button"
                        onClick={() => handleClassStatus(cls.id, "live")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>{t("startClass")}</span>
                      </button>
                    )}
                    {isStaff && cls.status === "live" && (
                      <button
                        type="button"
                        onClick={() => handleClassStatus(cls.id, "completed")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                      >
                        <Square className="h-3.5 w-3.5" />
                        <span>{t("endClass")}</span>
                      </button>
                    )}
                    <Link
                      href={`/classroom/${cls.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>{t("enterClassroom")}</span>
                    </Link>
                  </div>
                </div>
              ))}
              {data.liveClasses.length === 0 && data.upcomingClasses.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">{t("noData")}</div>
              )}
            </div>
          </div>

          {/* Student: Pending Homework & Recent Grades OR Staff: Struggling Students & Recent Questions */}
          {user.role === "student" ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">{t("pendingHomework")}</h2>
                <Link
                  href="/assignments"
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  {lang === "bn" ? "সব দেখুন" : "View All"}
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {data.pendingAssignments.length === 0 ? (
                  <div className="p-4 text-xs text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {lang === "bn"
                        ? "অভিনন্দন! আপনার কোনো অ্যাসাইনমেন্ট বাকি নেই।"
                        : "Great job! No pending assignments."}
                    </span>
                  </div>
                ) : (
                  data.pendingAssignments.map((a) => (
                    <Link
                      key={a.id}
                      href="/assignments"
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {a.subject} • {lang === "bn" ? "শেষ সময়:" : "Due:"} {a.deadline}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                        {a.maxMarks} {lang === "bn" ? "নম্বর" : "marks"}
                      </span>
                    </Link>
                  ))
                )}

                {data.myRecentSubmissions.length > 0 && (
                  <div className="p-3.5 bg-slate-50/70">
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      {lang === "bn" ? "সাম্প্রতিক নম্বর ও মন্তব্য" : "Recent Grades & Feedback"}
                    </div>
                    <div className="space-y-1.5">
                      {data.myRecentSubmissions.map((s) => (
                        <div
                          key={s.id}
                          className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {s.assignmentTitle}
                            </div>
                            {s.feedback && (
                              <div className="text-slate-500 truncate">{s.feedback}</div>
                            )}
                          </div>
                          <span className="font-bold text-teal-800 shrink-0">
                            {s.marks !== null ? `${s.marks}/${s.maxMarks}` : s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>{t("studentsNeedingSupport")}</span>
                </h2>
                <Link href="/progress" className="text-xs font-semibold text-teal-700 hover:underline">
                  {lang === "bn" ? "বিস্তারিত অগ্রগতি" : "Progress Report"}
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {data.strugglingStudents.length === 0 ? (
                  <div className="p-4 text-xs text-emerald-700">
                    {lang === "bn"
                      ? "সকল শিক্ষার্থী নিয়মিত ক্লাস ও অ্যাসাইনমেন্টে ভালো করছে।"
                      : "All students are maintaining steady attendance and submissions."}
                  </div>
                ) : (
                  data.strugglingStudents.map((s) => (
                    <div
                      key={s.studentId}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">
                          {lang === "bn"
                            ? `উপস্থিতি: ${s.attendanceRate}% • অ্যাসাইনমেন্ট: ${s.assignmentRate}%`
                            : `Attendance: ${s.attendanceRate}% • Assignments: ${s.assignmentRate}%`}
                        </div>
                      </div>
                      <Link
                        href="/attendance"
                        className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md"
                      >
                        {lang === "bn" ? "পর্যালোচনা" : "Review"}
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Weekly Learning Progress (lightweight CSS bar indicator) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">{t("weeklyProgress")}</h2>
              <Link href="/progress" className="text-xs font-semibold text-teal-700 hover:underline">
                {lang === "bn" ? "বিস্তারিত" : "Details"}
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-2 items-end h-28 pt-2">
              {data.weeklyActivity.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-semibold text-slate-600">{item.score}%</span>
                  <div className="w-full max-w-[32px] bg-slate-100 rounded-t-md h-20 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-teal-700 rounded-t-md"
                      style={{ height: `${Math.max(10, item.score)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600">
                    {lang === "bn" ? item.dayBn : item.dayEn}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Study Materials */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">{t("recentMaterials")}</h2>
              <Link href="/materials" className="text-xs font-semibold text-teal-700 hover:underline">
                {lang === "bn" ? "সব ফাইল" : "Library"}
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentMaterials.map((m) => (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-teal-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{m.title}</div>
                      <div className="text-[11px] text-slate-500">{m.subject}</div>
                    </div>
                  </div>
                  <Link
                    href="/materials"
                    className="text-xs font-medium text-teal-700 hover:underline shrink-0"
                  >
                    {lang === "bn" ? "খুলুন" : "Open"}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Megaphone className="h-4 w-4 text-amber-600" />
                <span>{t("recentAnnouncements")}</span>
              </h2>
              <Link href="/announcements" className="text-xs font-semibold text-teal-700 hover:underline">
                {lang === "bn" ? "সব ঘোষণা" : "All"}
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentAnnouncements.slice(0, 3).map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="text-xs font-bold text-slate-900">{a.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{a.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff: Recent Student Questions */}
          {isStaff && data.recentQuestions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-teal-700" />
                <h2 className="text-sm font-bold text-slate-900">{t("recentQuestions")}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentQuestions.slice(0, 4).map((q) => (
                  <Link
                    key={q.id}
                    href={`/classroom/${q.classId}`}
                    className="block px-4 py-2.5 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{q.studentName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          q.isAnswered
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {q.isAnswered
                          ? lang === "bn"
                            ? "উত্তর দেওয়া হয়েছে"
                            : "Answered"
                          : lang === "bn"
                          ? "অপেক্ষমান"
                          : "Open"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{q.message}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
