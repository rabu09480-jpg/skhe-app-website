"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface SubjectPerf {
  subject: string;
  assignmentAvg: number;
  quizAvg: number;
  overallAvg: number;
}

interface StudentProgressRow {
  studentId: number;
  name: string;
  email: string;
  attendanceRate: number;
  assignmentsSubmitted: number;
  totalAssignments: number;
  assignmentRate: number;
  quizzesTaken: number;
  avgQuizScore: number;
  needsSupport: boolean;
}

export function ProgressClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [myProgress, setMyProgress] = useState<StudentProgressRow | null>(null);
  const [allProgress, setAllProgress] = useState<StudentProgressRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectPerf[]>([]);
  const [weekly, setWeekly] = useState<{ dayBn: string; dayEn: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithRecovery("/api/dashboard", { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          setMyProgress(d.myProgress || null);
          setAllProgress(d.studentProgressList || []);
          setSubjects(d.subjectPerformance || []);
          setWeekly(d.weeklyActivity || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("navProgress")}</h1>
        <p className="text-xs text-slate-500">
          {lang === "bn"
            ? "উপস্থিতি, অ্যাসাইনমেন্ট, কুইজ ও বিষয়ভিত্তিক শেখার অগ্রগতি"
            : "Attendance, assignment completion, quiz scores, and subject-wise progress"}
        </p>
      </div>

      {/* Student's Own Summary */}
      {user.role === "student" && myProgress && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">{t("navAttendance")}</div>
            <div className="text-2xl font-bold text-teal-800 mt-1">
              {myProgress.attendanceRate}%
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">
              {lang === "bn" ? "অ্যাসাইনমেন্ট সম্পন্ন" : "Assignment Completion"}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {myProgress.assignmentRate}%
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-medium">
              {lang === "bn" ? "কুইজ গড় নম্বর" : "Quiz Average"}
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {myProgress.avgQuizScore}%
            </div>
          </div>
        </div>
      )}

      {/* Subject-wise Performance & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-teal-700" />
            <span>{lang === "bn" ? "বিষয়ভিত্তিক দক্ষতা" : "Subject-wise Performance"}</span>
          </h2>
          <div className="space-y-3">
            {subjects.map((s) => (
              <div key={s.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{s.subject}</span>
                  <span className="font-bold text-teal-800">{s.overallAvg}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded-full"
                    style={{ width: `${Math.min(100, s.overallAvg)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  {lang === "bn"
                    ? `অ্যাসাইনমেন্ট গড়: ${s.assignmentAvg}% • কুইজ গড়: ${s.quizAvg}%`
                    : `Assignment Avg: ${s.assignmentAvg}% • Quiz Avg: ${s.quizAvg}%`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">{t("weeklyProgress")}</h2>
          <div className="grid grid-cols-5 gap-3 items-end h-36 pt-3">
            {weekly.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-xs font-bold text-slate-700">{item.score}%</span>
                <div className="w-full max-w-[38px] bg-slate-100 rounded-t-md h-24 flex items-end overflow-hidden">
                  <div
                    className="w-full bg-amber-500 rounded-t-md"
                    style={{ height: `${Math.max(10, item.score)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {lang === "bn" ? item.dayBn : item.dayEn}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff: All Students Progress & Support Identification */}
      {user.role !== "student" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">
            {lang === "bn"
              ? "সকল শিক্ষার্থীর অগ্রগতি ও সহায়তা তালিকা"
              : "All Students Progress & Support Tracking"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{t("roleStudent")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("navAttendance")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("navAssignments")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("navQuizzes")}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allProgress.map((st) => (
                  <tr key={st.studentId}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{st.name}</td>
                    <td className="px-4 py-2.5 font-semibold">{st.attendanceRate}%</td>
                    <td className="px-4 py-2.5">
                      {st.assignmentsSubmitted}/{st.totalAssignments} ({st.assignmentRate}%)
                    </td>
                    <td className="px-4 py-2.5">
                      {st.quizzesTaken} ({st.avgQuizScore}%)
                    </td>
                    <td className="px-4 py-2.5">
                      {st.needsSupport ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          {lang === "bn" ? "সহায়তা প্রয়োজন" : "Needs Support"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          {lang === "bn" ? "সন্তোষজনক" : "On Track"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
