"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardList,
  CheckSquare,
  Video,
  UserCheck,
  BarChart3,
  Megaphone,
  Users,
  Settings,
  User,
  LogOut,
  Wifi,
  WifiOff,
  Zap,
  Bell,
  Menu,
  X,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useNetwork } from "@/components/NetworkContext";
import type { SafeUser } from "@/lib/auth";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export function AppShell({
  user,
  children,
}: {
  user: SafeUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const {
    dataSaver,
    toggleDataSaver,
    quality,
    lastLatencyMs,
    isReconnecting,
    retryConnection,
    fetchWithRecovery,
  } = useNetwork();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await fetchWithRecovery("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // handled by network recovery
    }
  };

  useEffect(() => {
    loadNotifications();
    const intervalMs = dataSaver ? 60000 : 25000;
    const timer = setInterval(loadNotifications, intervalMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSaver]);

  const markAllRead = async () => {
    try {
      await fetchWithRecovery("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/dashboard", label: t("navDashboard"), icon: LayoutDashboard, roles: ["student", "instructor", "admin"] },
    { href: "/schedule", label: t("navSchedule"), icon: Calendar, roles: ["student", "instructor", "admin"] },
    { href: "/materials", label: t("navMaterials"), icon: BookOpen, roles: ["student", "instructor", "admin"] },
    { href: "/assignments", label: t("navAssignments"), icon: ClipboardList, roles: ["student", "instructor", "admin"] },
    { href: "/quizzes", label: t("navQuizzes"), icon: CheckSquare, roles: ["student", "instructor", "admin"] },
    { href: "/recordings", label: t("navRecordings"), icon: Video, roles: ["student", "instructor", "admin"] },
    { href: "/attendance", label: t("navAttendance"), icon: UserCheck, roles: ["student", "instructor", "admin"] },
    { href: "/progress", label: t("navProgress"), icon: BarChart3, roles: ["student", "instructor", "admin"] },
    { href: "/announcements", label: t("navAnnouncements"), icon: Megaphone, roles: ["student", "instructor", "admin"] },
    { href: "/admin/users", label: t("navAdminUsers"), icon: Users, roles: ["admin"] },
    { href: "/admin/settings", label: t("navAdminSettings"), icon: Settings, roles: ["admin"] },
    { href: "/profile", label: t("navProfile"), icon: User, roles: ["student", "instructor", "admin"] },
  ].filter((item) => item.roles.includes(user.role));

  const connBadge = (() => {
    if (quality === "lost") {
      return {
        label: t("connLost"),
        cls: "bg-red-50 text-red-700 border-red-200",
        Icon: WifiOff,
      };
    }
    if (quality === "weak") {
      return {
        label: t("connWeak"),
        cls: "bg-amber-50 text-amber-800 border-amber-200",
        Icon: Wifi,
      };
    }
    if (quality === "moderate") {
      return {
        label: t("connModerate"),
        cls: "bg-yellow-50 text-yellow-800 border-yellow-200",
        Icon: Wifi,
      };
    }
    return {
      label: t("connGood"),
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: Wifi,
    };
  })();

  const roleLabel =
    user.role === "admin"
      ? t("roleAdmin")
      : user.role === "instructor"
      ? t("roleInstructor")
      : t("roleStudent");

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div>
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white font-bold text-lg">
            পা
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate text-sm">{t("appName")}</div>
            <div className="text-[11px] text-slate-500 truncate">{t("appSubtitle")}</div>
          </div>
        </div>

        <nav className="p-2.5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  active
                    ? "bg-teal-50 text-teal-800 border border-teal-200"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-teal-700" : "text-slate-500"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-100 space-y-2">
        <div className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-xs font-semibold text-slate-800 truncate">{user.name}</div>
          <div className="text-[11px] text-teal-700 font-medium">{roleLabel}</div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>{t("navLogout")}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#fafaf7]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-100 text-slate-700"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="lg:hidden font-bold text-slate-900 text-sm">{t("appName")}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Network Quality Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${connBadge.cls}`}
              title={lastLatencyMs ? `${lastLatencyMs} ms` : undefined}
            >
              <connBadge.Icon className="h-3.5 w-3.5" />
              <span>{connBadge.label}</span>
              {lastLatencyMs !== null && quality !== "lost" && (
                <span className="hidden sm:inline opacity-75">({lastLatencyMs}ms)</span>
              )}
            </div>

            {/* Data Saver Mode Toggle */}
            <button
              onClick={toggleDataSaver}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
                dataSaver
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title={dataSaver ? t("dataSaverOn") : t("dataSaverOff")}
            >
              <Zap className={`h-3.5 w-3.5 ${dataSaver ? "text-amber-700" : "text-slate-500"}`} />
              <span>{dataSaver ? t("dataSaverOn") : t("dataSaver")}</span>
            </button>

            {/* Bangla / English Switcher */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                onClick={() => setLang("bn")}
                className={`px-2 py-1 rounded-md ${
                  lang === "bn" ? "bg-teal-700 text-white" : "text-slate-700"
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-1 rounded-md ${
                  lang === "en" ? "bg-teal-700 text-white" : "text-slate-700"
                }`}
              >
                EN
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-bold text-slate-800">
                      {lang === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-medium text-teal-700 hover:underline"
                      >
                        {lang === "bn" ? "সব পঠিত চিহ্নিত করুন" : "Mark all read"}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        {t("noData")}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.link || "/dashboard"}
                          onClick={() => setNotifOpen(false)}
                          className={`block px-3.5 py-2.5 hover:bg-slate-50 ${
                            !n.isRead ? "bg-teal-50/40" : ""
                          }`}
                        >
                          <div className="text-xs font-semibold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                            {n.message}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Connection Recovery Banner */}
        {(quality === "lost" || isReconnecting) && (
          <div className="bg-red-600 text-white px-4 py-2 text-xs sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>{t("reconnecting")}</span>
            </div>
            <button
              onClick={() => retryConnection()}
              className="flex items-center gap-1 bg-white text-red-700 px-2.5 py-1 rounded-md font-semibold text-xs shrink-0"
            >
              <RefreshCw className={`h-3 w-3 ${isReconnecting ? "animate-spin" : ""}`} />
              <span>{t("retryNow")}</span>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
