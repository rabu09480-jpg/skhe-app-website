"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface SubmissionRow {
  id: number;
  studentId: number;
  studentName?: string;
  studentEmail?: string;
  answerText: string | null;
  fileUrl: string | null;
  fileName: string | null;
  status: string;
  marks: number | null;
  feedback: string | null;
  submittedAt: string;
}

interface AssignmentRow {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  subject: string;
  deadline: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  submissionType: string;
  maxMarks: number;
  classTitle: string;
  mySubmission: SubmissionRow | null;
  submissions: SubmissionRow[];
  submissionCount: number;
}

export function AssignmentsClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [classes, setClasses] = useState<{ id: number; title: string; titleBn: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Create assignment form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [deadline, setDeadline] = useState("");
  const [maxMarks, setMaxMarks] = useState(20);
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [classId, setClassId] = useState("");
  const [creating, setCreating] = useState(false);

  // Student draft answers keyed by assignment ID (persisted in localStorage)
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
  const [fileDrafts, setFileDrafts] = useState<Record<number, File | null>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Instructor grading state keyed by submission ID
  const [gradeMarks, setGradeMarks] = useState<Record<number, string>>({});
  const [gradeFeedback, setGradeFeedback] = useState<Record<number, string>>({});

  const isStaff = user.role === "instructor" || user.role === "admin";

  const loadAssignments = async () => {
    try {
      const res = await fetchWithRecovery("/api/assignments", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        const rows: AssignmentRow[] = d.assignments || [];
        setAssignments(rows);
        setClasses(d.classes || []);

        // Restore drafts from localStorage
        const restored: Record<number, string> = {};
        for (const a of rows) {
          try {
            const saved = localStorage.getItem(`pathshala_assign_draft_${user.id}_${a.id}`);
            if (saved) restored[a.id] = saved;
            else if (a.mySubmission?.answerText) restored[a.id] = a.mySubmission.answerText;
          } catch {
            // ignore
          }
        }
        setAnswerDrafts(restored);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraft = (assignmentId: number, value: string) => {
    setAnswerDrafts((prev) => ({ ...prev, [assignmentId]: value }));
    try {
      localStorage.setItem(`pathshala_assign_draft_${user.id}_${assignmentId}`, value);
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetchWithRecovery("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          deadline,
          maxMarks,
          description,
          instructions,
          classId: classId ? Number(classId) : null,
        }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setInstructions("");
        setShowCreate(false);
        loadAssignments();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleStudentSubmit = async (assignmentId: number) => {
    setSubmittingId(assignmentId);
    setStatusMessage("");
    try {
      let fileUrl = "";
      let fileName = "";
      const file = fileDrafts[assignmentId];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetchWithRecovery("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const d = await up.json();
          fileUrl = d.fileUrl;
          fileName = d.fileName;
        }
      }

      const res = await fetchWithRecovery(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerText: answerDrafts[assignmentId] || "",
          fileUrl,
          fileName,
        }),
      });
      if (res.ok) {
        try {
          localStorage.removeItem(`pathshala_assign_draft_${user.id}_${assignmentId}`);
        } catch {
          // ignore
        }
        setStatusMessage(
          lang === "bn" ? "অ্যাসাইনমেন্ট সফলভাবে জমা হয়েছে!" : "Assignment submitted!"
        );
        loadAssignments();
      }
    } finally {
      setSubmittingId(null);
    }
  };

  const handleGrade = async (
    assignmentId: number,
    submissionId: number,
    status: "graded" | "returned" | "late"
  ) => {
    await fetchWithRecovery(`/api/assignments/${assignmentId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        status,
        marks: gradeMarks[submissionId],
        feedback: gradeFeedback[submissionId] || "",
      }),
    });
    loadAssignments();
  };

  const handleDelete = async (id: number) => {
    await fetchWithRecovery(`/api/assignments?id=${id}`, { method: "DELETE" });
    loadAssignments();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navAssignments")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "বাড়ির কাজ দেখুন, উত্তর জমা দিন (অফলাইন খসড়া স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়)"
              : "View homework, submit answers (drafts auto-saved locally if internet drops)"}
          </p>
        </div>

        {isStaff && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === "bn" ? "নতুন অ্যাসাইনমেন্ট" : "Create Assignment"}</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
          {statusMessage}
        </div>
      )}

      {isStaff && showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-teal-200 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === "bn" ? "নতুন অ্যাসাইনমেন্ট তৈরি করুন" : "New Assignment"}
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs text-slate-500"
            >
              {t("cancel")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "শিরোনাম" : "Assignment Title"}
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
              type="text"
              required
              placeholder="Deadline (e.g. 2026-04-20 23:59)"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="number"
              required
              min={1}
              placeholder="Max Marks"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
            >
              <option value="">{lang === "bn" ? "ক্লাস (ঐচ্ছিক)" : "Related Class (optional)"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleBn || c.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={lang === "bn" ? "নির্দেশনা" : "Instructions"}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <textarea
            rows={2}
            placeholder={lang === "bn" ? "বিস্তারিত বিবরণ..." : "Assignment description..."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
            >
              {creating ? t("loading") : t("save")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[11px] font-semibold">
                      {a.subject}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {lang === "bn" ? "শেষ সময়:" : "Deadline:"} {a.deadline}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {a.maxMarks} {lang === "bn" ? "নম্বর" : "marks"}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1.5">{a.title}</h2>
                  {a.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">{a.description}</p>
                  )}
                  {a.instructions && (
                    <p className="text-xs text-slate-500 mt-1 italic">{a.instructions}</p>
                  )}
                </div>

                {isStaff && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      <ClipboardList className="h-3.5 w-3.5 inline mr-1" />
                      {a.submissionCount} {lang === "bn" ? "জমা" : "submissions"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* STUDENT SUBMISSION AREA */}
              {user.role === "student" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  {a.mySubmission && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>
                            {lang === "bn" ? "অবস্থা:" : "Status:"}{" "}
                            <span className="uppercase">{a.mySubmission.status}</span>
                          </span>
                        </div>
                        {a.mySubmission.feedback && (
                          <div className="text-slate-600">
                            {lang === "bn" ? "শিক্ষকের মন্তব্য:" : "Feedback:"}{" "}
                            {a.mySubmission.feedback}
                          </div>
                        )}
                      </div>
                      {a.mySubmission.marks !== null && (
                        <div className="text-sm font-bold text-teal-800">
                          {a.mySubmission.marks} / {a.maxMarks}
                        </div>
                      )}
                    </div>
                  )}

                  {(!a.mySubmission || a.mySubmission.status === "returned") && (
                    <div className="space-y-2.5">
                      <textarea
                        rows={3}
                        value={answerDrafts[a.id] || ""}
                        onChange={(e) => updateDraft(a.id, e.target.value)}
                        placeholder={
                          lang === "bn"
                            ? "এখানে উত্তর লিখুন (ইন্টারনেট চলে গেলেও লেখা সংরক্ষিত থাকবে)..."
                            : "Write your answer here (auto-saved locally)..."
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 cursor-pointer text-xs text-slate-700">
                          <Upload className="h-4 w-4 text-teal-700" />
                          <span>
                            {fileDrafts[a.id]?.name ||
                              (lang === "bn"
                                ? "ছবি বা পিডিএফ সংযুক্ত করুন (ঐচ্ছিক)"
                                : "Attach image/PDF (optional)")}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              setFileDrafts((prev) => ({
                                ...prev,
                                [a.id]: e.target.files?.[0] || null,
                              }))
                            }
                          />
                        </label>

                        <button
                          type="button"
                          disabled={submittingId === a.id}
                          onClick={() => handleStudentSubmit(a.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>
                            {submittingId === a.id ? t("loading") : t("submit")}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAFF GRADING AREA */}
              {isStaff && (
                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    {lang === "bn" ? "শিক্ষার্থীদের জমাদান" : "Student Submissions"}
                  </div>
                  {a.submissions.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      {lang === "bn" ? "এখনো কেউ জমা দেয়নি" : "No submissions yet."}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {a.submissions.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="text-xs font-bold text-slate-900">
                                {s.studentName}
                              </span>{" "}
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-200 uppercase font-semibold">
                                {s.status}
                              </span>
                            </div>
                            {s.fileUrl && (
                              <a
                                href={`${s.fileUrl}?download=1`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>{s.fileName || "Download File"}</span>
                              </a>
                            )}
                          </div>
                          {s.answerText && (
                            <p className="text-xs text-slate-700 bg-white rounded p-2 border border-slate-200 whitespace-pre-wrap">
                              {s.answerText}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <input
                              type="number"
                              min={0}
                              max={a.maxMarks}
                              placeholder={`Marks / ${a.maxMarks}`}
                              value={
                                gradeMarks[s.id] !== undefined
                                  ? gradeMarks[s.id]
                                  : s.marks !== null
                                  ? String(s.marks)
                                  : ""
                              }
                              onChange={(e) =>
                                setGradeMarks((prev) => ({
                                  ...prev,
                                  [s.id]: e.target.value,
                                }))
                              }
                              className="w-24 px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                            />
                            <input
                              type="text"
                              placeholder={lang === "bn" ? "মন্তব্য লিখুন..." : "Feedback comment..."}
                              value={
                                gradeFeedback[s.id] !== undefined
                                  ? gradeFeedback[s.id]
                                  : s.feedback || ""
                              }
                              onChange={(e) =>
                                setGradeFeedback((prev) => ({
                                  ...prev,
                                  [s.id]: e.target.value,
                                }))
                              }
                              className="flex-1 min-w-[160px] px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleGrade(a.id, s.id, "graded")}
                              className="px-2.5 py-1 rounded bg-teal-700 text-white text-xs font-semibold"
                            >
                              {lang === "bn" ? "নম্বর দিন" : "Grade"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGrade(a.id, s.id, "returned")}
                              className="px-2.5 py-1 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold"
                            >
                              {lang === "bn" ? "ফেরত পাঠান" : "Return"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGrade(a.id, s.id, "late")}
                              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 text-xs"
                            >
                              {lang === "bn" ? "বিলম্বিত" : "Mark Late"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
