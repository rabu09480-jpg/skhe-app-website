"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import type { SafeUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";

interface InvitationRow {
  id: number;
  code: string;
  email: string | null;
  role: string;
  className: string | null;
  usedBy: number | null;
}

export function AdminUsersClient() {
  const { lang, t } = useI18n();
  const { fetchWithRecovery } = useNetwork();

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("student123");
  const [role, setRole] = useState<"student" | "instructor" | "admin">("student");
  const [phone, setPhone] = useState("");
  const [className, setClassName] = useState("SSC Batch - 2026");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const res = await fetchWithRecovery("/api/admin/users", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users || []);
        setInvitations(d.invitations || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetchWithRecovery("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_user",
        name,
        email,
        password,
        role,
        phone,
        className,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Failed to create account");
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    loadUsers();
  };

  const handleCreateInvite = async () => {
    await fetchWithRecovery("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_invite", role: "student" }),
    });
    loadUsers();
  };

  const toggleActive = async (u: SafeUser) => {
    await fetchWithRecovery("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, isActive: !u.isActive }),
    });
    loadUsers();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === "bn" ? "অ্যাকাউন্ট মুছে ফেলবেন?" : "Delete user account?")) return;
    await fetchWithRecovery(`/api/admin/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("navAdminUsers")}</h1>
          <p className="text-xs text-slate-500">
            {lang === "bn"
              ? "শিক্ষার্থী ও শিক্ষক অ্যাকাউন্ট তৈরি, আমন্ত্রণ কোড ও নিয়ন্ত্রণ"
              : "Create and manage student & instructor accounts and invite codes"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateInvite}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100"
        >
          <KeyRound className="h-4 w-4" />
          <span>{lang === "bn" ? "নতুন আমন্ত্রণ কোড তৈরি করুন" : "Generate Invite Code"}</span>
        </button>
      </div>

      {/* Admin-created Account Form */}
      <form
        onSubmit={handleCreateUser}
        className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
      >
        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-teal-700" />
          <span>{lang === "bn" ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "Create New User Account"}</span>
        </div>
        {error && (
          <div className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder={lang === "bn" ? "নাম" : "Full Name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <input
            type="text"
            required
            minLength={6}
            placeholder="Initial Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "student" | "instructor" | "admin")}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
          >
            <option value="student">{t("roleStudent")}</option>
            <option value="instructor">{t("roleInstructor")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
          <input
            type="text"
            placeholder="Batch / Class"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            {lang === "bn" ? "অ্যাকাউন্ট যোগ করুন" : "Create Account"}
          </button>
        </div>
      </form>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="text-xs font-bold text-slate-900">
            {lang === "bn" ? "সক্রিয় আমন্ত্রণ কোডসমূহ" : "Invitation Codes"}
          </div>
          <div className="flex flex-wrap gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
              >
                <span className="font-mono font-bold text-teal-800">{inv.code}</span>{" "}
                <span className="text-slate-500">({inv.role})</span>
                {inv.usedBy && inv.code !== "PATHSHALA2026" && (
                  <span className="ml-1 text-[10px] text-slate-400">[Used]</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">{t("loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "নাম" : "Name"}</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "ভূমিকা" : "Role"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "ব্যাচ" : "Batch"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                  <th className="px-4 py-2.5 font-semibold">{lang === "bn" ? "কার্যক্রম" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                    <td className="px-4 py-2.5 uppercase font-semibold text-teal-800">{u.role}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.className}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        {u.isActive ? (
                          <UserX className="h-3.5 w-3.5 text-amber-700" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded border border-slate-200 hover:bg-red-50 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
