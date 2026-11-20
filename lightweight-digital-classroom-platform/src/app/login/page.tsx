"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus,
  Wifi,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

type AuthTab = "login" | "invite" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { dataSaver, toggleDataSaver } = useNetwork();

  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [demoResetHint, setDemoResetHint] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(
        lang === "bn"
          ? "সার্ভারের সাথে সংযোগ করা যাচ্ছে না।"
          : "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: inviteCode,
          name,
          email,
          phone,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resetStep === "request"
            ? { action: "request", email }
            : { action: "confirm", email, code: resetCode, newPassword: password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      if (resetStep === "request") {
        setDemoResetHint(data.demoResetCode || "");
        setResetStep("confirm");
        setSuccessMsg(
          lang === "bn"
            ? "রিসেট কোড তৈরি হয়েছে। নিচে নতুন পাসওয়ার্ড দিন।"
            : "Reset code generated. Enter code and new password below."
        );
      } else {
        setSuccessMsg(
          lang === "bn"
            ? "পাসওয়ার্ড পরিবর্তন হয়েছে! এখন লগইন করুন।"
            : "Password updated! You can now sign in."
        );
        setTab("login");
        setResetStep("request");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col">
      {/* Top minimal bar */}
      <header className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-lg">
            পা
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm sm:text-base">{t("appName")}</div>
            <div className="text-xs text-slate-500">{t("appSubtitle")}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDataSaver}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium ${
              dataSaver
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{dataSaver ? t("dataSaverOn") : t("dataSaver")}</span>
          </button>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={`px-2.5 py-1 rounded-md ${
                lang === "bn" ? "bg-teal-700 text-white" : "text-slate-700"
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-md ${
                lang === "en" ? "bg-teal-700 text-white" : "text-slate-700"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left Warm Classroom Overview */}
          <div className="md:col-span-5 bg-teal-800 text-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-700/80 text-teal-100 text-xs font-medium mb-4">
                <Wifi className="h-3.5 w-3.5" />
                <span>
                  {lang === "bn"
                    ? "বাংলাদেশের স্বল্পগতির ইন্টারনেটের জন্য নির্মিত"
                    : "Built for slow & unstable internet"}
                </span>
              </div>

              <h1 className="text-2xl font-bold leading-snug mb-3">
                {lang === "bn"
                  ? "আপনার নিজস্ব অনলাইন শ্রেণিকক্ষ"
                  : "Your Personal Digital Classroom"}
              </h1>
              <p className="text-sm text-teal-100 leading-relaxed mb-6">
                {lang === "bn"
                  ? "দূরে থেকেও শিক্ষকের সাথে সরাসরি ক্লাস, হোয়াইটবোর্ড, নোট ডাউনলোড, অ্যাসাইনমেন্ট এবং কুইজ — সব একসাথে, কোনো ঝামেলা ছাড়াই।"
                  : "Attend live classes, follow the instructor's whiteboard and PDF notes, submit homework, and track learning progress seamlessly."}
              </p>

              <ul className="space-y-2.5 text-sm text-teal-50">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    {lang === "bn"
                      ? "ডাটা সেভার মোড ও অফলাইন নোট ডাউনলোড"
                      : "Data Saver Mode & offline study downloads"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    {lang === "bn"
                      ? "এক ক্লিকে Google Meet ও স্বয়ংক্রিয় উপস্থিতি"
                      : "One-click Google Meet & automatic attendance"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    {lang === "bn"
                      ? "নেট বিচ্ছিন্ন হলেও অ্যাসাইনমেন্ট ও কুইজ সংরক্ষিত থাকে"
                      : "Auto-saves homework & quiz drafts if connection drops"}
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-teal-700/70 flex items-center gap-2 text-xs text-teal-200">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>
                {lang === "bn"
                  ? "অ্যাডমিন বা শিক্ষকের দেওয়া অ্যাকাউন্ট দিয়ে প্রবেশ করুন"
                  : "Sign in with your assigned student, instructor, or admin account"}
              </span>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Tabs */}
              <div className="flex gap-1.5 mb-6 border-b border-slate-200 pb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setError("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    tab === "login"
                      ? "bg-teal-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t("loginBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("invite");
                    setError("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    tab === "invite"
                      ? "bg-teal-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{t("registerWithInvite")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("reset");
                    setError("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    tab === "reset"
                      ? "bg-teal-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{t("forgotPassword")}</span>
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  {successMsg}
                </div>
              )}

              {tab === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{t("loginTitle")}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t("loginSubtitle")}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("emailLabel")}
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nusrat@pathshala.edu.bd"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("passwordLabel")}
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {loading ? t("loading") : t("loginBtn")}
                  </button>
                </form>
              )}

              {tab === "invite" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    {lang === "bn"
                      ? "উদাহরণ আমন্ত্রণ কোড: PATHSHALA2026"
                      : "Sample invite code: PATHSHALA2026"}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === "bn" ? "আমন্ত্রণ কোড" : "Invite Code"}
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="PATHSHALA2026"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === "bn" ? "পুরো নাম" : "Full Name"}
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={lang === "bn" ? "আপনার নাম" : "Your Name"}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t("emailLabel")}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === "bn" ? "মোবাইল নম্বর" : "Phone"}
                      </label>
                      <div className="relative">
                        <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+880 1..."
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("passwordLabel")} (min 6)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
                  >
                    {loading ? t("loading") : t("registerWithInvite")}
                  </button>
                </form>
              )}

              {tab === "reset" && (
                <form onSubmit={handleResetSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("emailLabel")}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nusrat@pathshala.edu.bd"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>

                  {resetStep === "confirm" && (
                    <>
                      {demoResetHint && (
                        <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900">
                          {lang === "bn" ? "রিসেট কোড:" : "Reset Code:"}{" "}
                          <span className="font-bold">{demoResetHint}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {lang === "bn" ? "৬-সংখ্যার কোড" : "6-Digit Reset Code"}
                        </label>
                        <input
                          type="text"
                          required
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {lang === "bn" ? "নতুন পাসওয়ার্ড" : "New Password"}
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
                  >
                    {resetStep === "request"
                      ? lang === "bn"
                        ? "রিসেট কোড পাঠান"
                        : "Send Reset Code"
                      : lang === "bn"
                      ? "পাসওয়ার্ড পরিবর্তন করুন"
                      : "Confirm New Password"}
                  </button>
                </form>
              )}
            </div>

            {/* Quick Demo Account Access */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t("quickDemoLogin")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => performLogin("nusrat@pathshala.edu.bd", "student123")}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 text-left"
                >
                  <div className="text-xs font-bold text-slate-800">{t("roleStudent")}</div>
                  <div className="text-[10px] text-slate-500 truncate">নুসরাত জাহান</div>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => performLogin("instructor@pathshala.edu.bd", "teacher123")}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 text-left"
                >
                  <div className="text-xs font-bold text-slate-800">{t("roleInstructor")}</div>
                  <div className="text-[10px] text-slate-500 truncate">মাহমুদুল হাসান</div>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => performLogin("admin@pathshala.edu.bd", "admin123")}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 text-left"
                >
                  <div className="text-xs font-bold text-slate-800">{t("roleAdmin")}</div>
                  <div className="text-[10px] text-slate-500 truncate">আরিফুর রহমান</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
