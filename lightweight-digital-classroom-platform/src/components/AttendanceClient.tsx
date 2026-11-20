"use client";

import React, { useEffect, useState } from "react";
import { Check, Clock, UserCheck, X } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface AttendanceRecord {
  id: number;
  classId: number;
  userId: number;
  status: string;
  joinTime: string | null;
  leaveTime: string | null;
  durationMinutes: number;
  markedBy: string | null;
  notes: string | null;
  classTitle: string;
  subject: string;
  scheduledDate: string;
  studentName: string;
}

interface StudentReport {
  studentId: number;
  studentName: string;
  studentEmail: string;
  present: number;
  late: number;
  absent: number;
  totalRecords: number;
  attendanceRate: number;
}

export function AttendanceClient({ user }: { user: SafeUser }) {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [classes, setClasses] = useState<{ id: number; title: string; titleBn: string | null }[]>([]);
  const [students, setStudents] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Attendance Form (Admin/Instructor)
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [status, setStatus] = useState<"present" | "late" | "absent">("present");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isStaff = user.role === "admin" || user.role === "instructor";

  const loadAttendance = async () => {
    try {
      const res = await fetchWithRecovery("/api/attendance", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setRecords(d.records || []);
        setReports(d.studentReports || []);
        setClasses(d.classes || []);
        setStudents(d.students || []);
        if (!selectedClassId && d.classes?.length) setSelectedClassId(String(d.classes[0].id));
        if (!selectedStudentId && d.students?.length) setSelectedStudentId(String(d.students[0].id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithRecovery("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: Number(selectedClassId),
          userId: Number(selectedStudentId),
          status,
          durationMinutes,
          notes,
        }),
      });
      if (res.ok) {
        setNotes("");
        loadAttendance();
      }
    } finally {
      setSaving(false);
    }
  };

  const statusPill = (st: string) => {
    if (st === "present") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
          <Check className="h-3 w-3" /> {lang === "bn" ? "উপস্থিত" : "Present"}
        </span>
      );
    }
    if (st === "late") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold">
          <Clock className="h-3 w-3" /> {lang === "bn" ? "বিলম্বিত" : "Late"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold">
        <X className="h-3 w-3" /> {lang === "bn" ? "অনুপস্থিত" : "Absent"}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("navAttendance")}</h1>
        <p className="text-xs text-slate-500">
          {lang === "bn"
            ? "স্বয়ংক্রিয় (ক্লাসে যোগদান) ও ম্যানুয়াল উপস্থিতি রিপোর্ট"
            : "Automatic join tracking & manual attendance reports"}
        </p>
      </div>

      {/* Staff Manual Attendance Control */}
      {isStaff && (
        <form
          onSubmit={handleManualSave}
          className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-teal-700" />
            <span>
              {lang === "bn"
                ? "ম্যানুয়াল উপস্থিতি দিন / সংশোধন করুন"
                : "Mark or Update Manual Attendance"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleBn || c.title}
                </option>
              ))}
            </select>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "present" | "late" | "absent")}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="present">{lang === "bn" ? "উপস্থিত (Present)" : "Present"}</option>
              <option value="late">{lang === "bn" ? "বিলম্বিত (Late)" : "Late"}</option>
              <option value="absent">{lang === "bn" ? "অনুপস্থিত (Absent)" : "Absent"}</option>
            </select>
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              placeholder="Minutes"
              className="px-3 py-2 text-xs rounded-lg border border-slate-300"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            >
              {saving ? t("loading") : t("save")}
            </button>
          </div>
          <input
            type="text"
            placeholder={lang === "bn" ? "নোট (যেমন: বিদ্যুৎ বিভ্রাট)" : "Optional notes"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
          />
        </form>
      )}

      {/* Attendance Summary Report */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">
          {lang === "bn" ? "উপস্থিতি সারসংক্ষেপ রিপোর্ট" : "Attendance Summary Report"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-semibold">{t("roleStudent")}</th>
                <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "উপস্থিত" : "Present"}</th>
                <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "বিলম্বিত" : "Late"}</th>
                <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "অনুপস্থিত" : "Absent"}</th>
                <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "হার" : "Rate"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{r.studentName}</td>
                  <td className="px-4 py-2.5 text-emerald-700 font-semibold">{r.present}</td>
                  <td className="px-4 py-2.5 text-amber-700 font-semibold">{r.late}</td>
                  <td className="px-4 py-2.5 text-red-700 font-semibold">{r.absent}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{r.attendanceRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Attendance Log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">
          {lang === "bn" ? "বিস্তারিত উপস্থিতির তালিকা" : "Detailed Attendance Logs"}
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">{t("loading")}</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{t("noData")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "শিক্ষার্থী" : "Student"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "ক্লাস" : "Class"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "তারিখ" : "Date"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "সময়কাল" : "Duration"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "পদ্ধতি" : "Method"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{rec.studentName}</td>
                    <td className="px-4 py-2.5 text-slate-700">{rec.classTitle}</td>
                    <td className="px-4 py-2.5 text-slate-500">{rec.scheduledDate}</td>
                    <td className="px-4 py-2.5">{statusPill(rec.status)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{rec.durationMinutes} min</td>
                    <td className="px-4 py-2.5 text-slate-500 capitalize">
                      {rec.markedBy}
                      {rec.notes ? ` (${rec.notes})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
