"use client";

import React, { useState } from "react";
import { Save, Upload, User } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

export function ProfileClient({ user }: { user: SafeUser }) {
  const { lang, setLang, t } = useI18n();
  const { fetchWithRecovery, setDataSaver } = useNetwork();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [preferredLanguage, setPreferredLanguage] = useState<"bn" | "en">(
    user.preferredLanguage === "en" ? "en" : "bn"
  );
  const [dataSaverDefault, setDataSaverDefault] = useState(user.dataSaverDefault);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetchWithRecovery("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      setAvatarUrl(d.fileUrl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetchWithRecovery("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          bio,
          avatarUrl,
          preferredLanguage,
          dataSaverDefault,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Update failed");
        return;
      }
      setLang(preferredLanguage);
      setDataSaver(dataSaverDefault);
      setCurrentPassword("");
      setNewPassword("");
      setMessage(
        lang === "bn" ? "প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!" : "Profile updated successfully!"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t("navProfile")}</h1>
        <p className="text-xs text-slate-500">
          {user.email} • {user.className}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        {message && (
          <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg font-semibold">
            {message}
          </div>
        )}
        {error && (
          <div className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg font-semibold">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-teal-700" />
            )}
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <span>{lang === "bn" ? "প্রোফাইল ছবি পরিবর্তন" : "Upload Photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "bn" ? "নাম" : "Full Name"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "bn" ? "যোগাযোগ নম্বর" : "Contact Phone"}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {lang === "bn" ? "পরিচিতি" : "Bio / Notes"}
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "bn" ? "পছন্দের ভাষা" : "Preferred Language"}
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as "bn" | "en")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
            >
              <option value="bn">বাংলা (Bangla)</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={dataSaverDefault}
                onChange={(e) => setDataSaverDefault(e.target.checked)}
              />
              <span>
                {lang === "bn"
                  ? "সর্বদা ডাটা সেভার চালু রাখুন"
                  : "Enable Data Saver by default"}
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="text-xs font-bold text-slate-800">
            {lang === "bn" ? "পাসওয়ার্ড পরিবর্তন (ঐচ্ছিক)" : "Change Password (Optional)"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              placeholder={lang === "bn" ? "বর্তমান পাসওয়ার্ড" : "Current Password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
            <input
              type="password"
              minLength={6}
              placeholder={lang === "bn" ? "নতুন পাসওয়ার্ড" : "New Password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? t("loading") : t("save")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
