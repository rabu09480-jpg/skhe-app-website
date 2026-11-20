import fs from "fs";
import path from "path";
import { db } from "@/db";
import {
  users,
  invitations,
  classes,
  classParticipants,
  attendance,
  studyMaterials,
  recordings,
  assignments,
  assignmentSubmissions,
  quizzes,
  quizQuestions,
  quizAttempts,
  classroomMessages,
  raisedHands,
  polls,
  whiteboards,
  announcements,
  notifications,
  platformSettings,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sql } from "drizzle-orm";

function buildSamplePdfBuffer(title: string, linesByPage: string[][]): Buffer {
  // Minimal valid multi-page PDF generator (standard Helvetica Type1 font, ASCII safe)
  const objects: string[] = [];
  const addObj = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  // 1: Catalog, 2: Pages placeholder
  addObj(""); // placeholder 1
  addObj(""); // placeholder 2
  const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const pageIds: number[] = [];
  for (let p = 0; p < linesByPage.length; p++) {
    const lines = linesByPage[p];
    const streamLines: string[] = [
      "BT",
      "/F1 18 Tf",
      "50 750 Td",
      `(${title.replace(/[()\\]/g, "")} - Page ${p + 1}/${linesByPage.length}) Tj`,
      "/F1 12 Tf",
      "0 -35 Td",
    ];
    for (const line of lines) {
      const safe = line.replace(/[()\\]/g, "");
      streamLines.push(`(${safe}) Tj`);
      streamLines.push("0 -22 Td");
    }
    streamLines.push("ET");
    const streamContent = streamLines.join("\n");
    const contentId = addObj(
      `<< /Length ${Buffer.byteLength(streamContent, "utf8")} >>\nstream\n${streamContent}\nendstream`
    );
    const pageId = addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function ensureSampleUploads() {
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const pdfPath = path.join(uploadDir, "sample-physics-laws.pdf");
  if (!fs.existsSync(pdfPath)) {
    const pdfBuf = buildSamplePdfBuffer("Newton Laws of Motion - Study Notes", [
      [
        "Chapter 3: Force and Motion (Physics)",
        "Instructor: Mahmudul Hasan",
        "------------------------------------------------------------",
        "1. First Law of Motion (Law of Inertia):",
        "An object remains at rest or in uniform straight-line motion",
        "unless acted upon by a net external force.",
        "",
        "Key Formula: If F_net = 0, then a = 0 (velocity is constant).",
        "Example: Passengers lean forward when a bus stops suddenly.",
      ],
      [
        "2. Second Law of Motion (F = ma):",
        "The rate of change of momentum is directly proportional",
        "to the applied force and occurs in the direction of force.",
        "",
        "Formula: F = m * a  (Unit: Newton, 1 N = 1 kg m/s^2)",
        "",
        "Sample Problem:",
        "A 4 kg block accelerates at 3 m/s^2. Find net force.",
        "Solution: F = 4 * 3 = 12 N.",
      ],
      [
        "3. Third Law of Motion (Action & Reaction):",
        "For every action force, there is an equal and opposite",
        "reaction force acting on two different bodies.",
        "",
        "Practice Homework:",
        "- Solve Questions 1 to 5 from Chapter 3.",
        "- Submit clear photo or written answer before Friday.",
      ],
    ]);
    fs.writeFileSync(pdfPath, pdfBuf);
  }

  const mathNotePath = path.join(uploadDir, "sample-algebra-notes.pdf");
  if (!fs.existsSync(mathNotePath)) {
    const mathBuf = buildSamplePdfBuffer("Quadratic Equations - Quick Revision", [
      [
        "Mathematics: Quadratic Equations (ax^2 + bx + c = 0)",
        "------------------------------------------------------------",
        "Standard Form: ax^2 + bx + c = 0, where a != 0",
        "Quadratic Formula: x = (-b +/- sqrt(b^2 - 4ac)) / (2a)",
        "Discriminant D = b^2 - 4ac",
        "- If D > 0: Two distinct real roots",
        "- If D = 0: Two equal real roots",
        "- If D < 0: No real roots",
      ],
      [
        "Worked Example:",
        "Solve x^2 - 5x + 6 = 0",
        "Factoring: (x - 2)(x - 3) = 0",
        "Therefore, x = 2 or x = 3.",
      ],
    ]);
    fs.writeFileSync(mathNotePath, mathBuf);
  }
}

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = runSeed().catch((err) => {
    seedPromise = null;
    console.error("Seed error:", err);
  });
  return seedPromise;
}

async function runSeed(): Promise<void> {
  ensureSampleUploads();

  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if ((existing[0]?.count ?? 0) > 0) {
    return;
  }

  const adminPass = await hashPassword("admin123");
  const teacherPass = await hashPassword("teacher123");
  const studentPass = await hashPassword("student123");

  const [admin] = await db
    .insert(users)
    .values({
      name: "আরিফুর রহমান (Admin)",
      email: "admin@pathshala.edu.bd",
      passwordHash: adminPass,
      role: "admin",
      phone: "+880 1711-000001",
      className: "Administration",
      bio: "Class Administrator managing schedules, attendance, and technical support.",
      preferredLanguage: "bn",
    })
    .returning();

  const [instructor] = await db
    .insert(users)
    .values({
      name: "মাহমুদুল হাসান (Instructor)",
      email: "instructor@pathshala.edu.bd",
      passwordHash: teacherPass,
      role: "instructor",
      phone: "+880 1711-000002",
      className: "Physics & Mathematics",
      bio: "Teaching SSC Physics and Higher Mathematics for 8 years. Currently teaching remotely.",
      preferredLanguage: "bn",
    })
    .returning();

  const studentData = [
    { name: "নুসরাত জাহান", email: "nusrat@pathshala.edu.bd", phone: "+880 1811-111101" },
    { name: "রফিকুল ইসলাম", email: "rafiq@pathshala.edu.bd", phone: "+880 1811-111102" },
    { name: "তানভীর আহমেদ", email: "tanvir@pathshala.edu.bd", phone: "+880 1811-111103" },
    { name: "সুমাইয়া আক্তার", email: "sumaiya@pathshala.edu.bd", phone: "+880 1811-111104" },
    { name: "মেহেদী হাসান", email: "mehedi@pathshala.edu.bd", phone: "+880 1811-111105" },
  ];

  const createdStudents = await db
    .insert(users)
    .values(
      studentData.map((s) => ({
        name: s.name,
        email: s.email,
        passwordHash: studentPass,
        role: "student",
        phone: s.phone,
        className: "SSC Batch - 2026",
        bio: "Regular student in Pathshala Digital Classroom.",
        preferredLanguage: "bn",
      }))
    )
    .returning();

  // Sample invite code
  await db.insert(invitations).values({
    code: "PATHSHALA2026",
    role: "student",
    className: "SSC Batch - 2026",
    createdBy: admin.id,
  });

  // Platform Settings
  await db.insert(platformSettings).values({
    schoolName: "Pathshala Digital Classroom",
    schoolNameBn: "পাঠশালা ডিজিটাল শ্রেণিকক্ষ",
    defaultLanguage: "bn",
    lowBandwidthDefault: true,
    emailNotificationsEnabled: false,
  });

  const today = new Date();
  const fmtDate = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  // Create Classes: 1 Live now, 2 Upcoming, 2 Completed
  const [liveClass, upcoming1, upcoming2, completed1, completed2] = await db
    .insert(classes)
    .values([
      {
        title: "Newton's Laws & Force Analysis",
        titleBn: "নিউটনের গতিসূত্র ও বল বিশ্লেষণ",
        subject: "Physics",
        description:
          "Interactive discussion on Newton's three laws of motion, friction, and real-life problem solving.",
        instructorId: instructor.id,
        scheduledDate: fmtDate(0),
        startTime: "16:00",
        endTime: "17:00",
        status: "live",
        meetLink: "https://meet.google.com/abc-defg-hij",
        backupMeetLink: "https://meet.google.com/xyz-uvwx-rst",
        startedAt: new Date(),
        chatEnabled: true,
        createdBy: admin.id,
      },
      {
        title: "Quadratic Equations & Word Problems",
        titleBn: "দ্বিঘাত সমীকরণ ও বাস্তব সমস্যা সমাধান",
        subject: "Mathematics",
        description: "Step-by-step practice on discriminant and factoring techniques.",
        instructorId: instructor.id,
        scheduledDate: fmtDate(1),
        startTime: "16:30",
        endTime: "17:30",
        status: "upcoming",
        meetLink: "https://meet.google.com/math-quad-2026",
        backupMeetLink: "https://meet.google.com/math-back-up1",
        chatEnabled: true,
        createdBy: instructor.id,
      },
      {
        title: "Work, Power & Energy Revision",
        titleBn: "কাজ, ক্ষমতা ও শক্তি পুনরালোচনা",
        subject: "Physics",
        description: "Solving board exam questions on conservation of mechanical energy.",
        instructorId: instructor.id,
        scheduledDate: fmtDate(3),
        startTime: "18:00",
        endTime: "19:00",
        status: "upcoming",
        meetLink: "https://meet.google.com/phy-work-2026",
        chatEnabled: true,
        createdBy: admin.id,
      },
      {
        title: "Motion Graphs & Velocity",
        titleBn: "গতি, বেগ ও লেখচিত্র",
        subject: "Physics",
        description: "Distance-time and velocity-time graphs with numerical exercises.",
        instructorId: instructor.id,
        scheduledDate: fmtDate(-2),
        startTime: "16:00",
        endTime: "17:00",
        status: "completed",
        meetLink: "https://meet.google.com/phy-mot-done",
        chatEnabled: true,
        createdBy: admin.id,
      },
      {
        title: "Algebraic Expressions & Identities",
        titleBn: "বীজগাণিতিক রাশি ও সূত্রাবলী",
        subject: "Mathematics",
        description: "Core identities and algebraic simplification practice.",
        instructorId: instructor.id,
        scheduledDate: fmtDate(-4),
        startTime: "16:30",
        endTime: "17:30",
        status: "completed",
        meetLink: "https://meet.google.com/math-alg-done",
        chatEnabled: true,
        createdBy: instructor.id,
      },
    ])
    .returning();

  // Enroll all 5 students in all classes
  const allClassIds = [liveClass.id, upcoming1.id, upcoming2.id, completed1.id, completed2.id];
  const participantRows: { classId: number; userId: number }[] = [];
  for (const cid of allClassIds) {
    for (const s of createdStudents) {
      participantRows.push({ classId: cid, userId: s.id });
    }
  }
  await db.insert(classParticipants).values(participantRows);

  // Attendance for completed classes & live class
  await db.insert(attendance).values([
    // completed1
    { classId: completed1.id, userId: createdStudents[0].id, status: "present", durationMinutes: 58, markedBy: "auto" },
    { classId: completed1.id, userId: createdStudents[1].id, status: "present", durationMinutes: 55, markedBy: "auto" },
    { classId: completed1.id, userId: createdStudents[2].id, status: "late", durationMinutes: 42, markedBy: "auto" },
    { classId: completed1.id, userId: createdStudents[3].id, status: "present", durationMinutes: 60, markedBy: "auto" },
    { classId: completed1.id, userId: createdStudents[4].id, status: "absent", durationMinutes: 0, markedBy: "manual", notes: "Power outage" },
    // completed2
    { classId: completed2.id, userId: createdStudents[0].id, status: "present", durationMinutes: 60, markedBy: "auto" },
    { classId: completed2.id, userId: createdStudents[1].id, status: "late", durationMinutes: 46, markedBy: "auto" },
    { classId: completed2.id, userId: createdStudents[2].id, status: "absent", durationMinutes: 0, markedBy: "manual" },
    { classId: completed2.id, userId: createdStudents[3].id, status: "present", durationMinutes: 57, markedBy: "auto" },
    { classId: completed2.id, userId: createdStudents[4].id, status: "absent", durationMinutes: 0, markedBy: "manual" },
    // liveClass
    { classId: liveClass.id, userId: createdStudents[0].id, status: "present", joinTime: new Date(), durationMinutes: 25, markedBy: "auto" },
    { classId: liveClass.id, userId: createdStudents[3].id, status: "present", joinTime: new Date(), durationMinutes: 24, markedBy: "auto" },
  ]);

  // Study Materials
  await db.insert(studyMaterials).values([
    {
      classId: liveClass.id,
      title: "নিউটনের গতিসূত্র - সম্পূর্ণ নোট (PDF)",
      subject: "Physics",
      topic: "Chapter 3: Force & Motion",
      type: "pdf",
      fileUrl: "/api/files/sample-physics-laws.pdf",
      fileName: "sample-physics-laws.pdf",
      fileSizeBytes: 2400,
      uploadedBy: instructor.id,
      currentInstructorPage: 1,
    },
    {
      classId: upcoming1.id,
      title: "দ্বিঘাত সমীকরণ শর্টকাট ও সূত্রাবলী (PDF)",
      subject: "Mathematics",
      topic: "Quadratic Equations",
      type: "pdf",
      fileUrl: "/api/files/sample-algebra-notes.pdf",
      fileName: "sample-algebra-notes.pdf",
      fileSizeBytes: 1850,
      uploadedBy: instructor.id,
      currentInstructorPage: 1,
    },
    {
      classId: completed1.id,
      title: "গতির লেখচিত্র অনুশীলন (PhET Simulation Link)",
      subject: "Physics",
      topic: "Motion Graphs",
      type: "link",
      fileUrl: "https://phet.colorado.edu/en/simulations/forces-and-motion-basics",
      fileName: "PhET Motion Lab",
      fileSizeBytes: 0,
      uploadedBy: instructor.id,
      currentInstructorPage: 1,
    },
  ]);

  // Recordings
  await db.insert(recordings).values([
    {
      classId: completed1.id,
      title: "গতি, বেগ ও লেখচিত্র — সম্পূর্ণ ক্লাস রেকর্ডিং",
      subject: "Physics",
      recordingUrl: "https://drive.google.com/file/d/sample-physics-recording/view",
      durationLabel: "52 min (Low-Data 360p)",
      recordedDate: fmtDate(-2),
      notes: "Includes solved board questions at minute 30.",
      uploadedBy: admin.id,
    },
    {
      classId: completed2.id,
      title: "বীজগাণিতিক রাশি ও সূত্রাবলী — ক্লাস রেকর্ডিং",
      subject: "Mathematics",
      recordingUrl: "https://drive.google.com/file/d/sample-math-recording/view",
      durationLabel: "48 min (Low-Data 360p)",
      recordedDate: fmtDate(-4),
      notes: "Cover pages 12-18 of the textbook.",
      uploadedBy: instructor.id,
    },
  ]);

  // Assignments
  const [assign1, assign2] = await db
    .insert(assignments)
    .values([
      {
        classId: liveClass.id,
        title: "নিউটনের ২য় সূত্র বিষয়ক ৫টি গাণিতিক সমস্যা",
        description: "F = ma সূত্র ব্যবহার করে নিচের ৫টি সমস্যার সমাধান খাতায় লিখে ছবি তুলে বা টাইপ করে জমা দাও।",
        instructions: "Write clearly with units (N, kg, m/s^2). You can submit text or upload an image/PDF.",
        subject: "Physics",
        deadline: fmtDate(2) + " 23:59",
        submissionType: "both",
        maxMarks: 20,
        createdBy: instructor.id,
      },
      {
        classId: completed2.id,
        title: "বীজগাণিতিক রাশির অনুশীলনী ৩.১",
        description: "অনুশীলনী ৩.১ এর ১ থেকে ৬ নম্বর অঙ্ক সমাধান করো।",
        instructions: "Show intermediate factoring steps.",
        subject: "Mathematics",
        deadline: fmtDate(-1) + " 23:59",
        submissionType: "both",
        maxMarks: 20,
        createdBy: instructor.id,
      },
    ])
    .returning();

  // Assignment Submissions
  await db.insert(assignmentSubmissions).values([
    {
      assignmentId: assign2.id,
      studentId: createdStudents[0].id,
      answerText: "১। (a+b)^2 = a^2 + 2ab + b^2... সব অঙ্ক সমাধান করা হয়েছে।",
      status: "graded",
      marks: 19,
      feedback: "খুব সুন্দর ও পরিষ্কারভাবে সমাধান করেছ!",
      gradedBy: instructor.id,
      gradedAt: new Date(),
    },
    {
      assignmentId: assign2.id,
      studentId: createdStudents[1].id,
      answerText: "অনুশীলনী ৩.১ এর ১-৫ নম্বর উত্তর জমা দিয়েছি।",
      status: "submitted",
    },
    {
      assignmentId: assign2.id,
      studentId: createdStudents[3].id,
      answerText: "সবগুলো অঙ্ক সমাধান করে জমা দিলাম।",
      status: "graded",
      marks: 18,
      feedback: "চমৎকার কাজ! ৬ নম্বর অঙ্কের চিহ্ন একটু খেয়াল রেখো।",
      gradedBy: instructor.id,
      gradedAt: new Date(),
    },
  ]);

  // Quizzes
  const [quiz1] = await db
    .insert(quizzes)
    .values({
      classId: liveClass.id,
      title: "গতি ও বল — সংক্ষিপ্ত কুইজ ১",
      description: "নিউটনের সূত্র এবং বলের একক সম্পর্কিত ১০ নম্বরের দ্রুত কুইজ।",
      subject: "Physics",
      durationMinutes: 10,
      totalMarks: 10,
      showResultsImmediately: true,
      isQuickQuiz: true,
      createdBy: instructor.id,
    })
    .returning();

  const qRows = await db
    .insert(quizQuestions)
    .values([
      {
        quizId: quiz1.id,
        questionText: "বলের এসআই (SI) একক কী?",
        questionType: "mcq",
        optionsJson: ["জুল (Joule)", "নিউটন (Newton)", "ওয়াট (Watt)", "প্যাসকেল (Pascal)"],
        correctAnswer: "নিউটন (Newton)",
        marks: 3,
        orderIndex: 1,
      },
      {
        quizId: quiz1.id,
        questionText: "নিউটনের প্রথম সূত্রকে জড়তার সূত্র বলা হয়।",
        questionType: "true_false",
        optionsJson: ["সত্য (True)", "মিথ্যা (False)"],
        correctAnswer: "সত্য (True)",
        marks: 3,
        orderIndex: 2,
      },
      {
        quizId: quiz1.id,
        questionText: "৫ কেজি ভরের কোনো বস্তুর ওপর ২০ নিউটন বল প্রয়োগ করলে ত্বরণ কত m/s² হবে? সংক্ষেপে ব্যাখ্যা করো।",
        questionType: "short_answer",
        optionsJson: [],
        correctAnswer: "4",
        marks: 4,
        orderIndex: 3,
      },
    ])
    .returning();

  await db.insert(quizAttempts).values({
    quizId: quiz1.id,
    studentId: createdStudents[0].id,
    answersJson: {
      [String(qRows[0].id)]: "নিউটন (Newton)",
      [String(qRows[1].id)]: "সত্য (True)",
      [String(qRows[2].id)]: "a = F/m = 20/5 = 4 m/s^2",
    },
    objectiveScore: 6,
    manualScore: 4,
    totalScore: 10,
    status: "graded",
  });

  // Live Classroom Chat, Raised Hands, Polls, Whiteboard
  await db.insert(classroomMessages).values([
    {
      classId: liveClass.id,
      userId: instructor.id,
      message: "আসসালামু আলাইকুম সবাইকে! আজ আমরা নিউটনের ২য় ও ৩য় সূত্র নিয়ে আলোচনা করব। কারও নেট সমস্যা হলে জানাবে।",
      isQuestion: false,
    },
    {
      classId: liveClass.id,
      userId: createdStudents[0].id,
      message: "স্যার, ক্রিয়া ও প্রতিক্রিয়া বল যদি সমান ও বিপরীত হয়, তবে বস্তু নড়ে কীভাবে?",
      isQuestion: true,
      isAnswered: true,
      replyText: "দারুণ প্রশ্ন! ক্রিয়া ও প্রতিক্রিয়া দুটি ভিন্ন বস্তুর ওপর কাজ করে, তাই একটির ওপর লব্ধি বল শূন্য হয় না।",
    },
    {
      classId: liveClass.id,
      userId: createdStudents[3].id,
      message: "স্যার, পিডিএফ নোটের ২ নম্বর পৃষ্ঠা পরিষ্কার দেখা যাচ্ছে।",
      isQuestion: false,
    },
  ]);

  await db.insert(raisedHands).values([
    {
      classId: liveClass.id,
      userId: createdStudents[1].id,
      topic: "F = ma সূত্রের উদাহরণ নিয়ে প্রশ্ন আছে",
      status: "raised",
    },
  ]);

  await db.insert(polls).values({
    classId: liveClass.id,
    question: "নিউটনের ২য় সূত্রের প্রমাণ কি সবাই বুঝতে পেরেছ?",
    optionsJson: ["হ্যাঁ, পুরোপুরি বুঝেছি", "আরেকবার বুঝালে ভালো হয়", "গাণিতিক উদাহরণ দরকার"],
    isActive: true,
    createdBy: instructor.id,
  });

  await db.insert(whiteboards).values({
    classId: liveClass.id,
    pagesJson: [
      [
        {
          id: "seed-line-1",
          tool: "text",
          color: "#0f766e",
          size: 20,
          points: [{ x: 40, y: 55 }],
          text: "Newton's 2nd Law: F = m x a",
        },
        {
          id: "seed-rect-1",
          tool: "rect",
          color: "#1e293b",
          size: 3,
          points: [
            { x: 60, y: 120 },
            { x: 180, y: 200 },
          ],
        },
        {
          id: "seed-arrow-1",
          tool: "line",
          color: "#d97706",
          size: 4,
          points: [
            { x: 185, y: 160 },
            { x: 290, y: 160 },
          ],
        },
        {
          id: "seed-text-2",
          tool: "text",
          color: "#d97706",
          size: 16,
          points: [{ x: 220, y: 145 }],
          text: "Force (F = 12 N)",
        },
      ],
    ],
    currentPage: 0,
    isShared: true,
    updatedBy: instructor.id,
  });

  // Announcements & Notifications
  await db.insert(announcements).values([
    {
      title: "আজ বিকাল ৪:০০ টায় পদার্থবিজ্ঞান লাইভ ক্লাস",
      content: "সবাই ক্লাস শুরুর ৫ মিনিট আগে ডাটা সেভার অন করে লগইন করবে এবং হেডফোন সাথে রাখবে।",
      priority: "important",
      targetRole: "all",
      createdBy: instructor.id,
    },
    {
      title: "সাপ্তাহিক মূল্যায়ন পরীক্ষা আগামী শুক্রবার",
      content: "পদার্থবিজ্ঞান ও গণিতের ওপর ২০ নম্বরের অনলাইন কুইজ হবে। স্টাডি ম্যাটেরিয়ালস সেকশন থেকে নোট ডাউনলোড করে নাও।",
      priority: "normal",
      targetRole: "student",
      createdBy: admin.id,
    },
  ]);

  const notifRows = createdStudents.flatMap((s) => [
    {
      userId: s.id,
      type: "class",
      title: "লাইভ ক্লাস চলছে: নিউটনের গতিসূত্র",
      message: "মাহমুদুল হাসান স্যারের পদার্থবিজ্ঞান ক্লাস এখন লাইভ। যোগ দিতে ক্লিক করুন।",
      link: `/classroom/${liveClass.id}`,
      isRead: false,
    },
    {
      userId: s.id,
      type: "assignment",
      title: "নতুন অ্যাসাইনমেন্ট: নিউটনের ২য় সূত্র",
      message: "জমা দেওয়ার শেষ সময় আগামী পরশু রাত ১১:৫৯।",
      link: "/assignments",
      isRead: false,
    },
  ]);
  await db.insert(notifications).values(notifRows);
}
