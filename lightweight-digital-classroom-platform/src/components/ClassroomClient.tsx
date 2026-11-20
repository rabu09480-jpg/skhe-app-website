"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Hand,
  Headphones,
  HelpCircle,
  Link2,
  MessageSquare,
  Mic,
  MonitorUp,
  PauseCircle,
  PencilRuler,
  Play,
  RefreshCw,
  Send,
  Square,
  Trash2,
  Video,
  Vote,
  Wifi,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import type { WhiteboardStroke } from "@/db/schema";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";
import { Whiteboard } from "@/components/Whiteboard";
import { PdfViewer, StudyMaterialItem } from "@/components/PdfViewer";

interface ClassDetail {
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
  chatEnabled: boolean;
}

interface ChatMessage {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  message: string;
  isQuestion: boolean;
  isAnswered: boolean;
  replyText: string | null;
  createdAt: string;
}

interface RaisedHandItem {
  id: number;
  userId: number;
  userName: string;
  topic: string | null;
  status: string;
}

interface PollItem {
  id: number;
  question: string;
  optionsJson: string[];
  counts: number[];
  totalVotes: number;
  myVote: number | null;
  isActive: boolean;
}

export function ClassroomClient({
  user,
  classId,
}: {
  user: SafeUser;
  classId: number;
}) {
  const { lang, t } = useI18n();
  const { dataSaver, fetchWithRecovery, quality } = useNetwork();

  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pre-class readiness state
  const [inWorkspace, setInWorkspace] = useState(false);
  const [connCheckStatus, setConnCheckStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [connLatency, setConnLatency] = useState<number | null>(null);
  const [micCheckStatus, setMicCheckStatus] = useState<"idle" | "checking" | "ok" | "denied">("idle");
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  // Live tools state
  const [activeTab, setActiveTab] = useState<"whiteboard" | "pdf" | "polls" | "screenshare">("whiteboard");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHandItem[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [wbPages, setWbPages] = useState<WhiteboardStroke[][]>([[]]);
  const [wbPage, setWbPage] = useState(0);
  const [wbShared, setWbShared] = useState(true);

  // Inputs
  const [chatText, setChatText] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [handTopic, setHandTopic] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  // Poll creation
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionsText, setPollOptionsText] = useState(
    "হ্যাঁ, বুঝেছি\nআরেকবার বুঝান"
  );

  // Meet link editor for staff
  const [editingMeet, setEditingMeet] = useState(false);
  const [meetInput, setMeetInput] = useState("");
  const [backupMeetInput, setBackupMeetInput] = useState("");

  const isStaff = user.role === "instructor" || user.role === "admin";

  const loadClassDetails = useCallback(async () => {
    try {
      const res = await fetchWithRecovery(`/api/classes/${classId}`, { cache: "no-store" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Unable to load class");
        return;
      }
      const data = await res.json();
      setCls(data.class);
      setMaterials(data.materials || []);
      setMeetInput(data.class.meetLink || "");
      setBackupMeetInput(data.class.backupMeetLink || "");
      setChatEnabled(data.class.chatEnabled);
    } catch {
      setError("Connection error while loading class");
    } finally {
      setLoading(false);
    }
  }, [classId, fetchWithRecovery]);

  const loadLiveTools = useCallback(async () => {
    try {
      const res = await fetchWithRecovery(`/api/classes/${classId}/live-tools`, {
        cache: "no-store",
      });
      if (res.ok) {
        const d = await res.json();
        setChatEnabled(d.chatEnabled);
        setMessages(d.messages || []);
        setRaisedHands(d.raisedHands || []);
        setPolls(d.polls || []);
        if (d.materials) setMaterials(d.materials);
        if (d.whiteboard) {
          setWbPages(d.whiteboard.pagesJson || [[]]);
          setWbPage(d.whiteboard.currentPage || 0);
          setWbShared(d.whiteboard.isShared ?? true);
        }
      }
    } catch {
      // handled by network recovery
    }
  }, [classId, fetchWithRecovery]);

  useEffect(() => {
    loadClassDetails();
    loadLiveTools();
  }, [loadClassDetails, loadLiveTools]);

  useEffect(() => {
    if (!inWorkspace) return;
    const intervalMs = dataSaver ? 30000 : 7000;
    const timer = setInterval(loadLiveTools, intervalMs);
    return () => clearInterval(timer);
  }, [dataSaver, inWorkspace, loadLiveTools]);

  const runConnectionCheck = async () => {
    setConnCheckStatus("checking");
    const t0 = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        setConnLatency(Math.round(performance.now() - t0));
        setConnCheckStatus("ok");
      } else {
        setConnCheckStatus("fail");
      }
    } catch {
      setConnCheckStatus("fail");
    }
  };

  const runMicCheck = async () => {
    setMicCheckStatus("checking");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicCheckStatus("denied");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((tr) => tr.stop());
      setMicCheckStatus("ok");
    } catch {
      setMicCheckStatus("denied");
    }
  };

  const handleJoinClass = async (openMeetWindow: boolean, useBackup = false) => {
    try {
      const res = await fetchWithRecovery(`/api/classes/${classId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
      if (res.ok) {
        setAttendanceMarked(true);
        const data = await res.json();
        const url = useBackup ? data.backupMeetLink : data.meetLink;
        if (openMeetWindow && url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
      setInWorkspace(true);
      loadLiveTools();
    } catch {
      setInWorkspace(true);
    }
  };

  const handleLeaveClass = async () => {
    await fetchWithRecovery(`/api/classes/${classId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "leave" }),
    });
  };

  const updateClassField = async (payload: Record<string, unknown>) => {
    const res = await fetchWithRecovery(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      loadClassDetails();
      loadLiveTools();
    }
  };

  const postLiveAction = async (payload: Record<string, unknown>) => {
    const res = await fetchWithRecovery(`/api/classes/${classId}/live-tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await loadLiveTools();
    }
    return res;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const res = await postLiveAction({
      action: "send_message",
      message: chatText.trim(),
      isQuestion,
    });
    if (res.ok) {
      setChatText("");
      setIsQuestion(false);
    }
  };

  const handleRaiseHand = async () => {
    await postLiveAction({ action: "raise_hand", topic: handTopic });
    setHandTopic("");
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = pollOptionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || opts.length < 2) return;
    await postLiveAction({
      action: "create_poll",
      question: pollQuestion.trim(),
      options: opts,
    });
    setPollQuestion("");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-red-700">{error || "Class not found"}</p>
        <Link href="/dashboard" className="inline-block text-xs font-semibold text-teal-700 underline">
          {t("navDashboard")}
        </Link>
      </div>
    );
  }

  const myHand = raisedHands.find((h) => h.userId === user.id);

  // PRE-CLASS READINESS SCREEN
  if (!inWorkspace) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    cls.status === "live"
                      ? "bg-red-100 text-red-700"
                      : cls.status === "completed"
                      ? "bg-slate-100 text-slate-700"
                      : cls.status === "cancelled"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-teal-50 text-teal-800"
                  }`}
                >
                  {cls.status === "live"
                    ? t("statusLive")
                    : cls.status === "completed"
                    ? t("statusCompleted")
                    : cls.status === "cancelled"
                    ? t("statusCancelled")
                    : t("statusUpcoming")}
                </span>
                <span className="text-xs font-medium text-slate-500">{cls.subject}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                {cls.titleBn || cls.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {lang === "bn" ? "শিক্ষক:" : "Instructor:"} <strong>{cls.instructorName}</strong> •{" "}
                {cls.scheduledDate} ({cls.startTime} - {cls.endTime})
              </p>
              {cls.description && (
                <p className="text-xs sm:text-sm text-slate-500 mt-2">{cls.description}</p>
              )}
            </div>

            {isStaff && (
              <div className="flex items-center gap-2 shrink-0">
                {cls.status !== "live" ? (
                  <button
                    type="button"
                    onClick={() => updateClassField({ status: "live" })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <Play className="h-4 w-4" />
                    <span>{t("startClass")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateClassField({ status: "completed" })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold"
                  >
                    <Square className="h-4 w-4" />
                    <span>{t("endClass")}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3-Step Pre-Class Checklist */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">{t("preClassTitle")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Connection Check */}
              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Wifi className="h-4 w-4 text-teal-700" />
                  <span>{t("connectionCheck")}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {connCheckStatus === "ok"
                    ? lang === "bn"
                      ? `সংযোগ ঠিক আছে (${connLatency}ms)`
                      : `Connection ready (${connLatency}ms)`
                    : connCheckStatus === "fail"
                    ? lang === "bn"
                      ? "সংযোগ দুর্বল, ডাটা সেভার চালু করুন"
                      : "Weak connection, enable Data Saver"
                    : lang === "bn"
                    ? `বর্তমান অবস্থা: ${quality}`
                    : `Current status: ${quality}`}
                </p>
                <button
                  type="button"
                  onClick={runConnectionCheck}
                  className="w-full py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold hover:bg-slate-100"
                >
                  {connCheckStatus === "checking"
                    ? t("loading")
                    : lang === "bn"
                    ? "সংযোগ পরীক্ষা করুন"
                    : "Test Connection"}
                </button>
              </div>

              {/* Microphone Check */}
              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Mic className="h-4 w-4 text-teal-700" />
                  <span>{t("microphoneCheck")}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {micCheckStatus === "ok"
                    ? lang === "bn"
                      ? "মাইক্রোফোন সচল আছে"
                      : "Microphone is working"
                    : micCheckStatus === "denied"
                    ? lang === "bn"
                      ? "মাইক্রোফোন অনুমতি পাওয়া যায়নি (Google Meet-এ চালু করতে পারবেন)"
                      : "Mic permission blocked (you can allow it inside Google Meet)"
                    : lang === "bn"
                    ? "কথা বলার আগে মাইক্রোফোন যাচাই করুন"
                    : "Optional quick mic permission check"}
                </p>
                <button
                  type="button"
                  onClick={runMicCheck}
                  className="w-full py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold hover:bg-slate-100"
                >
                  {micCheckStatus === "checking"
                    ? t("loading")
                    : lang === "bn"
                    ? "মাইক পরীক্ষা করুন"
                    : "Test Microphone"}
                </button>
              </div>

              {/* Headphone Recommendation */}
              <div className="rounded-xl border border-amber-200 p-3.5 bg-amber-50/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Headphones className="h-4 w-4 text-amber-700" />
                  <span>{lang === "bn" ? "হেডফোন পরামর্শ" : "Headphone Tip"}</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  {t("headphoneTip")}
                </p>
              </div>
            </div>
          </div>

          {/* Class Materials Preview */}
          {materials.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-800">
                {lang === "bn" ? "এই ক্লাসের স্টাডি ম্যাটেরিয়াল" : "Class Study Materials"}
              </div>
              <div className="space-y-1.5">
                {materials.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-teal-700" />
                      {m.title}
                    </span>
                    <a
                      href={`${m.fileUrl}${m.fileUrl.includes("?") ? "&" : "?"}download=1`}
                      className="text-teal-700 font-semibold hover:underline"
                    >
                      {t("download")}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Join Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {cls.meetLink ? (
              <button
                type="button"
                onClick={() => handleJoinClass(true, false)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm sm:text-base"
              >
                <Video className="h-5 w-5" />
                <span>{t("joinLiveClass")} (Google Meet)</span>
                <ExternalLink className="h-4 w-4 opacity-80" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => handleJoinClass(false)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm"
            >
              <PencilRuler className="h-4 w-4 text-teal-700" />
              <span>
                {lang === "bn"
                  ? "হোয়াইটবোর্ড ও শ্রেণিকক্ষে প্রবেশ করুন"
                  : "Open Classroom Workspace"}
              </span>
            </button>
          </div>

          {cls.backupMeetLink && (
            <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>{t("backupMeetLink")}:</span>
              <button
                type="button"
                onClick={() => handleJoinClass(true, true)}
                className="text-teal-700 font-semibold underline"
              >
                {cls.backupMeetLink}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ACTIVE CLASSROOM WORKSPACE
  return (
    <div className="space-y-4">
      {/* Top Classroom Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                cls.status === "live"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {cls.status === "live" ? t("statusLive") : cls.status}
            </span>
            <span className="text-xs text-slate-500">{cls.subject}</span>
            {attendanceMarked && user.role === "student" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {lang === "bn" ? "উপস্থিতি নথিভুক্ত হয়েছে" : "Attendance Recorded"}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1">
            {cls.titleBn || cls.title}
          </h1>
          <p className="text-xs text-slate-500">
            {cls.instructorName} • {cls.scheduledDate} ({cls.startTime} - {cls.endTime})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cls.meetLink && (
            <a
              href={cls.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            >
              <Video className="h-4 w-4" />
              <span>{t("openGoogleMeet")}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {cls.backupMeetLink && (
            <a
              href={cls.backupMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>{lang === "bn" ? "বিকল্প লিংক" : "Backup Link"}</span>
            </a>
          )}

          {user.role === "student" && (
            <button
              type="button"
              onClick={handleLeaveClass}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {lang === "bn" ? "সময়কাল সংরক্ষণ" : "Record Leave Time"}
            </button>
          )}

          {isStaff && (
            <>
              <button
                type="button"
                onClick={() => setEditingMeet((v) => !v)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {lang === "bn" ? "Meet লিংক" : "Edit Meet Link"}
              </button>
              <button
                type="button"
                onClick={() =>
                  updateClassField({
                    status: cls.status === "live" ? "completed" : "live",
                  })
                }
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                  cls.status === "live"
                    ? "bg-slate-800 text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {cls.status === "live" ? t("endClass") : t("startClass")}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={loadLiveTools}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh classroom"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Honest Google Meet Info Notice */}
      <div className="rounded-lg bg-teal-50/70 border border-teal-200 px-3.5 py-2 text-xs text-teal-900 flex items-center justify-between gap-2 flex-wrap">
        <span>
          {lang === "bn"
            ? "ভিডিও ও অডিও কল Google Meet-এর আলাদা উইন্ডোতে চলবে। আর নিচের হোয়াইটবোর্ড, পিডিএফ, পোল এবং প্রশ্নোত্তর এখানে লাইভ থাকবে।"
            : "Live video/audio runs in your dedicated Google Meet tab, while Whiteboard, PDF sync, Polls, and Q&A stay live right here."}
        </span>
      </div>

      {/* Staff Meet Link Editor */}
      {isStaff && editingMeet && (
        <div className="bg-white rounded-xl border border-teal-200 p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Google Meet Link
            </label>
            <input
              type="url"
              value={meetInput}
              onChange={(e) => setMeetInput(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Backup Meeting Link
            </label>
            <input
              type="url"
              value={backupMeetInput}
              onChange={(e) => setBackupMeetInput(e.target.value)}
              placeholder="https://meet.google.com/yyy-yyyy-yyy"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              await updateClassField({
                meetLink: meetInput,
                backupMeetLink: backupMeetInput,
              });
              setEditingMeet(false);
            }}
            className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
          >
            {t("save")}
          </button>
        </div>
      )}

      {/* Main Classroom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Whiteboard / PDF / Polls / Screen Share (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap bg-white p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("whiteboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === "whiteboard"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <PencilRuler className="h-3.5 w-3.5" />
              <span>{t("whiteboard")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pdf")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === "pdf"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{t("pdfViewer")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("polls")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === "polls"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Vote className="h-3.5 w-3.5" />
              <span>
                {t("quickPolls")} ({polls.filter((p) => p.isActive).length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("screenshare")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === "screenshare"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <MonitorUp className="h-3.5 w-3.5" />
              <span>{t("screenShareGuide")}</span>
            </button>
          </div>

          {activeTab === "whiteboard" && (
            <Whiteboard
              initialPages={wbPages}
              initialPage={wbPage}
              initialShared={wbShared}
              canEdit={isStaff}
              onSave={async (pages, pageIdx, shared) => {
                await postLiveAction({
                  action: "save_whiteboard",
                  pagesJson: pages,
                  currentPage: pageIdx,
                  isShared: shared,
                });
              }}
            />
          )}

          {activeTab === "pdf" && (
            <PdfViewer
              materials={materials}
              canSyncPage={isStaff}
              onSyncInstructorPage={async (materialId, page) => {
                await postLiveAction({
                  action: "sync_pdf_page",
                  materialId,
                  page,
                });
              }}
            />
          )}

          {activeTab === "polls" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              {isStaff && (
                <form
                  onSubmit={handleCreatePoll}
                  className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5"
                >
                  <div className="text-xs font-bold text-slate-800">
                    {lang === "bn" ? "নতুন তাৎক্ষণিক পোল তৈরি করুন" : "Create Quick Poll"}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={
                      lang === "bn"
                        ? "যেমন: এই টপিকটি কি সবাই বুঝতে পেরেছ?"
                        : "e.g., Did you understand this topic?"
                    }
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                  <textarea
                    rows={2}
                    value={pollOptionsText}
                    onChange={(e) => setPollOptionsText(e.target.value)}
                    placeholder="One option per line"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold"
                  >
                    {lang === "bn" ? "পোল প্রকাশ করুন" : "Launch Poll"}
                  </button>
                </form>
              )}

              {polls.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6">{t("noData")}</div>
              ) : (
                <div className="space-y-3">
                  {polls.map((poll) => (
                    <div
                      key={poll.id}
                      className="rounded-xl border border-slate-200 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">{poll.question}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-500">
                            {poll.totalVotes} {lang === "bn" ? "ভোট" : "votes"}
                          </span>
                          {isStaff && poll.isActive && (
                            <button
                              type="button"
                              onClick={() => postLiveAction({ action: "close_poll", pollId: poll.id })}
                              className="text-[11px] text-red-600 font-semibold hover:underline"
                            >
                              {lang === "bn" ? "বন্ধ করুন" : "Close"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {poll.optionsJson.map((opt, idx) => {
                          const count = poll.counts[idx] || 0;
                          const pct =
                            poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                          const picked = poll.myVote === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!poll.isActive}
                              onClick={() =>
                                postLiveAction({
                                  action: "vote_poll",
                                  pollId: poll.id,
                                  optionIndex: idx,
                                })
                              }
                              className={`w-full text-left rounded-lg border px-3 py-2 text-xs relative overflow-hidden ${
                                picked
                                  ? "border-teal-600 bg-teal-50/50 font-semibold"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <div
                                className="absolute inset-y-0 left-0 bg-teal-100/60"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex items-center justify-between">
                                <span>{opt}</span>
                                <span className="font-semibold text-slate-700">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "screenshare" && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <MonitorUp className="h-5 w-5 text-teal-700" />
                <span>
                  {lang === "bn"
                    ? "Google Meet-এর মাধ্যমে স্ক্রিন শেয়ার করার নির্দেশনা"
                    : "How to Share Your Screen via Google Meet"}
                </span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-700">
                <li>
                  {lang === "bn"
                    ? "উপরে 'Google Meet-এ যুক্ত হোন' বাটনে ক্লিক করে মিটিং খুলুন।"
                    : "Click 'Open Google Meet' above to join the live audio/video call."}
                </li>
                <li>
                  {lang === "bn"
                    ? "Google Meet-এর নিচের মেনু থেকে 'Present now' (উপরে তীর চিহ্ন আইকন) ক্লিক করুন।"
                    : "Click the 'Present now' icon in the bottom toolbar of Google Meet."}
                </li>
                <li>
                  {lang === "bn"
                    ? "স্বল্প ডাটা খরচের জন্য 'A window' বা 'A tab' বেছে নিন এবং অ্যানিমেশন বন্ধ রাখুন।"
                    : "Select 'A window' or 'A tab' instead of entire screen to save student bandwidth."}
                </li>
                <li>
                  {lang === "bn"
                    ? "টিপস: পিডিএফ বা স্লাইড দেখানোর জন্য স্ক্রিন শেয়ার না করে পাশের 'পিডিএফ ভিউয়ার' ব্যবহার করলে শিক্ষার্থীদের ৮০% ডাটা সাশ্রয় হয়!"
                    : "Tip: Using the built-in PDF Viewer & Whiteboard saves ~80% student internet data compared to video screen sharing."}
                </li>
              </ol>
              {cls.meetLink && (
                <a
                  href={cls.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
                >
                  <Video className="h-4 w-4" />
                  <span>{t("openGoogleMeet")}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right: Raise Hand + Classroom Chat & Q&A (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Raise Hand Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Hand className="h-4 w-4 text-amber-600" />
                <span>{t("raiseHand")}</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {raisedHands.length}
              </span>
            </div>

            {user.role === "student" && (
              <div className="space-y-2">
                {!myHand ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={handTopic}
                      onChange={(e) => setHandTopic(e.target.value)}
                      placeholder={
                        lang === "bn" ? "সংক্ষিপ্ত বিষয় (ঐচ্ছিক)" : "Topic (optional)"
                      }
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleRaiseHand}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0"
                    >
                      {t("raiseHand")}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                    <span className="font-semibold text-amber-900">
                      {myHand.status === "acknowledged"
                        ? lang === "bn"
                          ? "শিক্ষক আপনার হাত দেখেছেন — কথা বলতে পারেন!"
                          : "Instructor acknowledged your hand!"
                        : lang === "bn"
                        ? "আপনার হাত তোলা আছে"
                        : "Your hand is raised"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        postLiveAction({
                          action: "update_hand",
                          handId: myHand.id,
                          status: "lowered",
                        })
                      }
                      className="text-amber-900 underline font-semibold"
                    >
                      {lang === "bn" ? "নামান" : "Lower"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {raisedHands.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {raisedHands.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{h.userName}</div>
                      {h.topic && <div className="text-[11px] text-slate-500 truncate">{h.topic}</div>}
                    </div>
                    {isStaff && (
                      <div className="flex items-center gap-1 shrink-0">
                        {h.status === "raised" && (
                          <button
                            type="button"
                            onClick={() =>
                              postLiveAction({
                                action: "update_hand",
                                handId: h.id,
                                status: "acknowledged",
                              })
                            }
                            className="px-2 py-0.5 rounded bg-teal-700 text-white text-[11px]"
                          >
                            {lang === "bn" ? "অনুমতি" : "Allow"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            postLiveAction({
                              action: "update_hand",
                              handId: h.id,
                              status: "lowered",
                            })
                          }
                          className="px-2 py-0.5 rounded border border-slate-300 text-slate-600 text-[11px]"
                        >
                          {lang === "bn" ? "সরিয়ে দিন" : "Clear"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Classroom Chat & Q&A */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[460px]">
            <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-teal-700" />
                <span>{t("classroomChat")}</span>
              </h2>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => updateClassField({ chatEnabled: !chatEnabled })}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${
                    chatEnabled
                      ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>
                    {chatEnabled
                      ? lang === "bn"
                        ? "চ্যাট বিরতি দিন"
                        : "Pause Chat"
                      : lang === "bn"
                      ? "চ্যাট চালু করুন"
                      : "Enable Chat"}
                  </span>
                </button>
              )}
            </div>

            {!chatEnabled && (
              <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>
                  {lang === "bn"
                    ? "মনোযোগী পাঠদানের জন্য চ্যাট সাময়িকভাবে বন্ধ আছে।"
                    : "Chat is temporarily paused for focused teaching."}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-2.5 text-xs border ${
                    m.isQuestion
                      ? "bg-amber-50/70 border-amber-200"
                      : m.userRole === "instructor" || m.userRole === "admin"
                      ? "bg-teal-50/60 border-teal-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">{m.userName}</span>
                    <div className="flex items-center gap-1.5">
                      {m.isQuestion && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-bold">
                          {lang === "bn" ? "প্রশ্ন" : "Question"}
                        </span>
                      )}
                      {isStaff && (
                        <button
                          type="button"
                          onClick={() =>
                            postLiveAction({ action: "delete_message", messageId: m.id })
                          }
                          className="text-slate-400 hover:text-red-600"
                          title="Moderate / Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-800 mt-1 whitespace-pre-wrap">{m.message}</p>

                  {m.replyText && (
                    <div className="mt-2 pl-2.5 border-l-2 border-teal-600 text-teal-900">
                      <span className="font-semibold">
                        {lang === "bn" ? "শিক্ষকের উত্তর: " : "Instructor Reply: "}
                      </span>
                      {m.replyText}
                    </div>
                  )}

                  {isStaff && m.isQuestion && !m.replyText && (
                    <div className="mt-2 flex gap-1">
                      <input
                        type="text"
                        value={replyDrafts[m.id] || ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        placeholder={lang === "bn" ? "উত্তর লিখুন..." : "Write reply..."}
                        className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const txt = (replyDrafts[m.id] || "").trim();
                          if (!txt) return;
                          await postLiveAction({
                            action: "reply_message",
                            messageId: m.id,
                            replyText: txt,
                          });
                        }}
                        className="px-2 py-1 rounded bg-teal-700 text-white text-[11px] font-semibold"
                      >
                        {lang === "bn" ? "উত্তর" : "Reply"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-2.5 border-t border-slate-200 space-y-2 bg-slate-50"
            >
              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isQuestion}
                  onChange={(e) => setIsQuestion(e.target.checked)}
                />
                <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  {lang === "bn" ? "প্রশ্ন হিসেবে পাঠান" : "Mark as a Question"}
                </span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  disabled={!chatEnabled && user.role === "student"}
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={
                    lang === "bn" ? "বার্তা বা প্রশ্ন লিখুন..." : "Type a message or question..."
                  }
                  className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatEnabled && user.role === "student"}
                  className="px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
