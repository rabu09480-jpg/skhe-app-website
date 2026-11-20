"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Plus, Send, Trash2 } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface QuizQuestionRow {
  id: number;
  questionText: string;
  questionType: "mcq" | "true_false" | "short_answer";
  optionsJson: string[];
  correctAnswer: string;
  marks: number;
}

interface QuizAttemptRow {
  id: number;
  studentId: number;
  studentName?: string;
  answersJson: Record<string, string>;
  objectiveScore: number;
  manualScore: number;
  totalScore: number;
  status: string;
}

interface QuizRow {
  id: number;
  title: string;
  description: string | null;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  showResultsImmediately: boolean;
  questions: QuizQuestionRow[];
  myAttempt: QuizAttemptRow | null;
  attempts: QuizAttemptRow[];
  attemptCount: number;
}

interface DraftQuestion {
  questionText: string;
  questionType: "mcq" | "true_false" | "short_answer";
  optionsText: string;
  correctAnswer: string;
  marks: number;
}

export function QuizzesClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Quiz Form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    {
      questionText: "",
      questionType: "mcq",
      optionsText: "Option A\nOption B\nOption C\nOption D",
      correctAnswer: "Option A",
      marks: 2,
    },
  ]);

  // Student quiz answers persisted locally per quiz ID
  const [answersByQuiz, setAnswersByQuiz] = useState<
    Record<number, Record<string, string>>
  >({});
  const [submittingQuizId, setSubmittingQuizId] = useState<number | null>(null);
  const [manualScores, setManualScores] = useState<Record<number, string>>({});

  const isStaff = user.role === "instructor" || user.role === "admin";

  const loadQuizzes = async () => {
    try {
      const res = await fetchWithRecovery("/api/quizzes", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        const rows: QuizRow[] = d.quizzes || [];
        setQuizzes(rows);

        const restored: Record<number, Record<string, string>> = {};
        for (const q of rows) {
          try {
            const raw = localStorage.getItem(`pathshala_quiz_draft_${user.id}_${q.id}`);
            if (raw) restored[q.id] = JSON.parse(raw);
          } catch {
            // ignore
          }
        }
        setAnswersByQuiz(restored);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAnswer = (quizId: number, questionId: number, val: string) => {
    setAnswersByQuiz((prev) => {
      const nextForQuiz = { ...(prev[quizId] || {}), [String(questionId)]: val };
      try {
        localStorage.setItem(
          `pathshala_quiz_draft_${user.id}_${quizId}`,
          JSON.stringify(nextForQuiz)
        );
      } catch {
        // ignore
      }
      return { ...prev, [quizId]: nextForQuiz };
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = draftQuestions.map((dq) => ({
      questionText: dq.questionText,
      questionType: dq.questionType,
      options:
        dq.questionType === "mcq"
          ? dq.optionsText
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      correctAnswer: dq.correctAnswer,
      marks: dq.marks,
    }));

    const res = await fetchWithRecovery("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subject,
        durationMinutes,
        showResultsImmediately,
        questions: formatted,
      }),
    });
    if (res.ok) {
      setTitle("");
      setShowCreate(false);
      loadQuizzes();
    }
  };

  const handleSubmitQuiz = async (quizId: number) => {
    setSubmittingQuizId(quizId);
    try {
      const res = await fetchWithRecovery(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersByQuiz[quizId] || {} }),
      });
      if (res.ok) {
        try {
          localStorage.removeItem(`pathshala_quiz_draft_${user.id}_${quizId}`);
        } catch {
          // ignore
        }
        loadQuizzes();
      }
    } finally {
      setSubmittingQuizId(null);
    }
  };

  const handleManualGrade = async (quizId: number, attemptId: number) => {
    await fetchWithRecovery(`/api/quizzes/${quizId}/attempt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId,
        manualScore: Number(manualScores[attemptId] || 0),
      }),
    });
    loadQuizzes();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navQuizzes")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "বহুনির্বাচনি, সত্য/মিথ্যা ও সংক্ষিপ্ত উত্তর কুইজ (উত্তর স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়)"
              : "MCQ, True/False, and Short Answer quizzes (progress saved locally on connection loss)"}
          </p>
        </div>

        {isStaff && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === "bn" ? "নতুন কুইজ তৈরি করুন" : "Create Quiz"}</span>
          </button>
        )}
      </div>

      {isStaff && showCreate && (
        <form
          onSubmit={handleCreateQuiz}
          className="bg-white rounded-xl border border-teal-200 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === "bn" ? "নতুন কুইজ তৈরি" : "Create Quiz"}
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs text-slate-500"
            >
              {t("cancel")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={lang === "bn" ? "কুইজের নাম" : "Quiz Title"}
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
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={showResultsImmediately}
              onChange={(e) => setShowResultsImmediately(e.target.checked)}
            />
            <span>
              {lang === "bn"
                ? "জমা দেওয়ার সাথে সাথে শিক্ষার্থীদের ফলাফল দেখান"
                : "Show quiz results immediately after submission"}
            </span>
          </label>

          <div className="space-y-3">
            {draftQuestions.map((dq, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">Q{idx + 1}</span>
                  {draftQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Question text"
                    value={dq.questionText}
                    onChange={(e) =>
                      setDraftQuestions((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, questionText: e.target.value } : item
                        )
                      )
                    }
                    className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                  <select
                    value={dq.questionType}
                    onChange={(e) =>
                      setDraftQuestions((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                questionType: e.target.value as DraftQuestion["questionType"],
                                correctAnswer:
                                  e.target.value === "true_false"
                                    ? "সত্য (True)"
                                    : item.correctAnswer,
                              }
                            : item
                        )
                      )
                    }
                    className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={dq.marks}
                    onChange={(e) =>
                      setDraftQuestions((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, marks: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>
                {dq.questionType === "mcq" && (
                  <textarea
                    rows={2}
                    placeholder="Options (one per line)"
                    value={dq.optionsText}
                    onChange={(e) =>
                      setDraftQuestions((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, optionsText: e.target.value } : item
                        )
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                )}
                <input
                  type="text"
                  placeholder="Correct answer (exact match for auto-grading)"
                  value={dq.correctAnswer}
                  onChange={(e) =>
                    setDraftQuestions((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, correctAnswer: e.target.value } : item
                      )
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraftQuestions((prev) => [
                  ...prev,
                  {
                    questionText: "",
                    questionType: "mcq",
                    optionsText: "Option A\nOption B",
                    correctAnswer: "Option A",
                    marks: 2,
                  },
                ])
              }
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              + {lang === "bn" ? "আরও প্রশ্ন যোগ করুন" : "Add Question"}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
            >
              {t("save")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold">
                      {q.subject}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {q.durationMinutes} min
                    </span>
                    <span className="font-semibold text-slate-700">
                      {q.totalMarks} {lang === "bn" ? "নম্বর" : "marks"}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">{q.title}</h2>
                </div>

                {q.myAttempt && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {q.showResultsImmediately || q.myAttempt.status === "graded"
                        ? `${lang === "bn" ? "প্রাপ্ত নম্বর:" : "Score:"} ${q.myAttempt.totalScore}/${q.totalMarks}`
                        : lang === "bn"
                        ? "জমা হয়েছে"
                        : "Submitted"}
                    </span>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {q.questions.map((qq, idx) => {
                  const chosen =
                    q.myAttempt?.answersJson?.[String(qq.id)] ??
                    answersByQuiz[q.id]?.[String(qq.id)] ??
                    "";
                  const locked = user.role === "student" && q.myAttempt !== null;

                  return (
                    <div
                      key={qq.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {idx + 1}. {qq.questionText}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          {qq.marks}m
                        </span>
                      </div>

                      {qq.questionType === "short_answer" ? (
                        <input
                          type="text"
                          disabled={locked || isStaff}
                          value={chosen}
                          onChange={(e) => setAnswer(q.id, qq.id, e.target.value)}
                          placeholder={
                            lang === "bn" ? "সংক্ষিপ্ত উত্তর লিখুন..." : "Write short answer..."
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {qq.optionsJson.map((opt, oIdx) => (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer ${
                                chosen === opt
                                  ? "border-teal-600 bg-teal-50 font-semibold"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}-${qq.id}`}
                                disabled={locked || isStaff}
                                checked={chosen === opt}
                                onChange={() => setAnswer(q.id, qq.id, opt)}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {qq.correctAnswer && (locked || isStaff) && (
                        <div className="text-[11px] font-semibold text-emerald-700">
                          {lang === "bn" ? "সঠিক উত্তর:" : "Correct Answer:"} {qq.correctAnswer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {user.role === "student" && !q.myAttempt && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={submittingQuizId === q.id}
                    onClick={() => handleSubmitQuiz(q.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {submittingQuizId === q.id ? t("loading") : t("submit")}
                    </span>
                  </button>
                </div>
              )}

              {/* Staff Attempts Review & Manual Grading */}
              {isStaff && q.attempts.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    {lang === "bn" ? "শিক্ষার্থীদের উত্তরপত্র" : "Student Attempts"} ({q.attemptCount})
                  </div>
                  {q.attempts.map((att) => (
                    <div
                      key={att.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{att.studentName}</div>
                        <div className="text-slate-600">
                          Objective: {att.objectiveScore} • Written: {att.manualScore} • Total:{" "}
                          <strong>{att.totalScore}</strong>/{q.totalMarks} ({att.status})
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          placeholder="Written marks"
                          value={manualScores[att.id] ?? String(att.manualScore)}
                          onChange={(e) =>
                            setManualScores((prev) => ({ ...prev, [att.id]: e.target.value }))
                          }
                          className="w-24 px-2 py-1 rounded border border-slate-300 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleManualGrade(q.id, att.id)}
                          className="px-2.5 py-1 rounded bg-teal-700 text-white font-semibold"
                        >
                          {lang === "bn" ? "সংরক্ষণ" : "Update"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
