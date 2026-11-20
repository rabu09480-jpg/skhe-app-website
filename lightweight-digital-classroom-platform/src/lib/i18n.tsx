"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "bn" | "en";

const dictionary = {
  // Brand & App
  appName: { bn: "পাঠশালা ডিজিটাল", en: "Pathshala Digital" },
  appSubtitle: { bn: "সহজ ও স্বল্প-ডাটা অনলাইন শ্রেণিকক্ষ", en: "Lightweight Online Classroom" },

  // Navigation
  navDashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  navSchedule: { bn: "ক্লাস রুটিন", en: "Class Schedule" },
  navMaterials: { bn: "স্টাডি ম্যাটেরিয়াল", en: "Study Materials" },
  navAssignments: { bn: "অ্যাসাইনমেন্ট", en: "Assignments" },
  navQuizzes: { bn: "কুইজ ও পরীক্ষা", en: "Quizzes & Exams" },
  navRecordings: { bn: "ক্লাস রেকর্ডিং", en: "Recordings" },
  navAttendance: { bn: "উপস্থিতি", en: "Attendance" },
  navProgress: { bn: "অগ্রগতি", en: "Progress" },
  navAnnouncements: { bn: "ঘোষণা", en: "Announcements" },
  navAdminUsers: { bn: "শিক্ষার্থী ও শিক্ষক", en: "Users & Accounts" },
  navAdminSettings: { bn: "প্ল্যাটফর্ম সেটিংস", en: "Platform Settings" },
  navProfile: { bn: "প্রোফাইল", en: "Profile" },
  navLogout: { bn: "লগ আউট", en: "Sign Out" },

  // Network & Data Saver
  dataSaver: { bn: "ডাটা সেভার", en: "Data Saver" },
  dataSaverOn: { bn: "ডাটা সেভার চালু", en: "Data Saver ON" },
  dataSaverOff: { bn: "ডাটা সেভার বন্ধ", en: "Data Saver OFF" },
  connGood: { bn: "ভালো সংযোগ", en: "Good Connection" },
  connModerate: { bn: "মাঝারি সংযোগ", en: "Moderate Connection" },
  connWeak: { bn: "দুর্বল সংযোগ", en: "Weak Connection" },
  connLost: { bn: "সংযোগ বিচ্ছিন্ন", en: "Connection Lost" },
  reconnecting: { bn: "পুনরায় সংযোগের চেষ্টা চলছে... আপনার কাজ সংরক্ষিত আছে।", en: "Reconnecting... Your work is safely saved." },
  retryNow: { bn: "আবার চেষ্টা করুন", en: "Retry Now" },

  // Auth
  loginTitle: { bn: "শ্রেণিকক্ষে প্রবেশ করুন", en: "Sign in to Classroom" },
  loginSubtitle: { bn: "আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন", en: "Enter your email and password to continue" },
  emailLabel: { bn: "ইমেইল ঠিকানা", en: "Email Address" },
  passwordLabel: { bn: "পাসওয়ার্ড", en: "Password" },
  loginBtn: { bn: "লগইন করুন", en: "Sign In" },
  registerWithInvite: { bn: "আমন্ত্রণ কোড দিয়ে নিবন্ধন", en: "Register with Invite Code" },
  forgotPassword: { bn: "পাসওয়ার্ড ভুলে গেছেন?", en: "Forgot Password?" },
  quickDemoLogin: { bn: "দ্রুত ডেমো প্রবেশ (পরীক্ষার জন্য)", en: "Quick Demo Access" },

  // Roles
  roleStudent: { bn: "শিক্ষার্থী", en: "Student" },
  roleInstructor: { bn: "শিক্ষক", en: "Instructor" },
  roleAdmin: { bn: "প্রশাসক (অ্যাডমিন)", en: "Administrator" },

  // Class Statuses
  statusLive: { bn: "লাইভ চলছে", en: "Live Now" },
  statusUpcoming: { bn: "আসন্ন ক্লাস", en: "Upcoming" },
  statusCompleted: { bn: "সম্পন্ন", en: "Completed" },
  statusCancelled: { bn: "বাতিল", en: "Cancelled" },

  // Student Dashboard
  welcomeBack: { bn: "স্বাগতম", en: "Welcome back" },
  nextScheduledClass: { bn: "পরবর্তী নির্ধারিত ক্লাস", en: "Next Scheduled Class" },
  joinLiveClass: { bn: "লাইভ ক্লাসে যোগ দিন", en: "Join Live Class" },
  enterClassroom: { bn: "শ্রেণিকক্ষে প্রবেশ করুন", en: "Enter Classroom" },
  todaysClasses: { bn: "আজকের ক্লাস", en: "Today's Classes" },
  upcomingClasses: { bn: "আসন্ন ক্লাসসমূহ", en: "Upcoming Classes" },
  attendanceSummary: { bn: "উপস্থিতির সারসংক্ষেপ", en: "Attendance Summary" },
  recentAnnouncements: { bn: "সাম্প্রতিক ঘোষণা", en: "Recent Announcements" },
  pendingHomework: { bn: "বাকি থাকা অ্যাসাইনমেন্ট", en: "Pending Homework" },
  recentMaterials: { bn: "সাম্প্রতিক স্টাডি ম্যাটেরিয়াল", en: "Recent Study Materials" },
  weeklyProgress: { bn: "সাপ্তাহিক শেখার অগ্রগতি", en: "Weekly Learning Progress" },

  // Instructor & Admin Dashboard
  startClass: { bn: "ক্লাস শুরু করুন", en: "Start Class" },
  endClass: { bn: "ক্লাস শেষ করুন", en: "End Class" },
  createClassQuick: { bn: "নতুন ক্লাস তৈরি করুন", en: "Quick Create Class" },
  totalStudents: { bn: "মোট শিক্ষার্থী", en: "Total Students" },
  activeStudents: { bn: "সক্রিয় শিক্ষার্থী", en: "Active Students" },
  totalClasses: { bn: "মোট ক্লাস", en: "Total Classes" },
  recentQuestions: { bn: "সাম্প্রতিক প্রশ্নসমূহ", en: "Recent Questions" },
  studentsNeedingSupport: { bn: "সহায়তা প্রয়োজন এমন শিক্ষার্থী", en: "Students Needing Support" },

  // Live Classroom & Pre-class
  preClassTitle: { bn: "ক্লাসে যোগ দেওয়ার পূর্ব-প্রস্তুতি", en: "Pre-Class Readiness Check" },
  connectionCheck: { bn: "ইন্টারনেট সংযোগ পরীক্ষা", en: "Connection Check" },
  microphoneCheck: { bn: "মাইক্রোফোন পরীক্ষা", en: "Microphone Check" },
  headphoneTip: { bn: "পরিষ্কার শব্দের জন্য অনুগ্রহ করে হেডফোন বা ইয়ারফোন ব্যবহার করুন।", en: "Please use headphones or earphones for clear classroom audio." },
  openGoogleMeet: { bn: "Google Meet-এ যুক্ত হোন", en: "Open Google Meet" },
  backupMeetLink: { bn: "বিকল্প মিটিং লিংক (প্রধান লিংক কাজ না করলে)", en: "Backup Meeting Link" },
  whiteboard: { bn: "ডিজিটাল হোয়াইটবোর্ড", en: "Digital Whiteboard" },
  pdfViewer: { bn: "পিডিএফ ও নোট ভিউয়ার", en: "PDF & Note Viewer" },
  classroomChat: { bn: "ক্লাসরুম চ্যাট ও প্রশ্ন", en: "Classroom Chat & Q&A" },
  raiseHand: { bn: "হাত তুলুন", en: "Raise Hand" },
  quickPolls: { bn: "তাৎক্ষণিক পোল", en: "Quick Polls" },
  screenShareGuide: { bn: "স্ক্রিন শেয়ার গাইড", en: "Screen Share Guide" },

  // Common Actions
  save: { bn: "সংরক্ষণ করুন", en: "Save" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  submit: { bn: "জমা দিন", en: "Submit" },
  download: { bn: "ডাউনলোড", en: "Download" },
  upload: { bn: "আপলোড করুন", en: "Upload" },
  delete: { bn: "মুছে ফেলুন", en: "Delete" },
  edit: { bn: "সম্পাদনা", en: "Edit" },
  loading: { bn: "লোড হচ্ছে...", en: "Loading..." },
  noData: { bn: "কোনো তথ্য পাওয়া যায়নি", en: "No items found" },
} as const;

export type TranslationKey = keyof typeof dictionary;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "bn",
  setLang: () => {},
  t: (key) => dictionary[key].bn,
});

export function I18nProvider({
  children,
  initialLang = "bn",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pathshala_lang");
      if (stored === "bn" || stored === "en") {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("pathshala_lang", next);
      document.documentElement.lang = next === "bn" ? "bn" : "en";
    } catch {
      // ignore
    }
  };

  const t = (key: TranslationKey): string => {
    return dictionary[key]?.[lang] ?? dictionary[key]?.bn ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
