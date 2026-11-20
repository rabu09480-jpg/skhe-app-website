"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

export function AdminSettingsClient() {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [schoolName, setSchoolName] = useState("Pathshala Digital Classroom");
  const [schoolNameBn, setSchoolNameBn] = useState("পাঠশালা ডিজিটাল শ্রেণিকক্ষ");
  const [defaultLanguage, setDefaultLanguage] = useState<"bn" | "en">("bn");
  const [lowBandwidthDefault, setLowBandwidthDefault] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithRecovery("/api/admin/settings", { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          if (d.settings) {
            setSchoolName(d.settings.schoolName);
            setSchoolNameBn(d.settings.schoolNameBn);
            setDefaultLanguage(d.settings.defaultLanguage === "en" ? "en" : "bn");
            setLowBandwidthDefault(d.settings.lowBandwidthDefault);
            setEmailNotificationsEnabled(d.settings.emailNotificationsEnabled);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithRecovery("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName,
        schoolNameBn,
        defaultLanguage,
        lowBandwidthDefault,
        emailNotificationsEnabled,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("navAdminSettings")}</h1>
        <p className="text-xs text-slate-500">
          {lang === "bn"
            ? "প্রতিষ্ঠানের নাম, ডিফল্ট ভাষা ও স্বল্প-ডাটা মোড সেটিংস"
            : "Classroom branding, default language, and low-bandwidth preferences"}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        {saved && (
          <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg font-semibold">
            {lang === "bn" ? "সেটিংস সংরক্ষিত হয়েছে!" : "Settings saved!"}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Platform Name (English)
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            প্রতিষ্ঠানের নাম (বাংলা)
          </label>
          <input
            type="text"
            value={schoolNameBn}
            onChange={(e) => setSchoolNameBn(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {lang === "bn" ? "ডিফল্ট ভাষা" : "Default Language"}
          </label>
          <select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value as "bn" | "en")}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
          >
            <option value="bn">বাংলা (Bangla)</option>
            <option value="en">English</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={lowBandwidthDefault}
            onChange={(e) => setLowBandwidthDefault(e.target.checked)}
          />
          <span>
            {lang === "bn"
              ? "নতুন শিক্ষার্থীদের জন্য স্বল্প-ডাটা অপ্টিমাইজেশন"
              : "Enable low-bandwidth optimizations by default"}
          </span>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotificationsEnabled}
            onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
          />
          <span>
            {lang === "bn"
              ? "ইমেইল বিজ্ঞপ্তি (যদি SMTP কনফিগার করা থাকে)"
              : "Enable email notifications (when SMTP is configured)"}
          </span>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
          >
            <Save className="h-4 w-4" />
            <span>{t("save")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
