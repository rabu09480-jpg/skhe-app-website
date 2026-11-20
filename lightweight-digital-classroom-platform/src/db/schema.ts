import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // 'student' | 'instructor' | 'admin'
  phone: text("phone").default(""),
  avatarUrl: text("avatar_url").default(""),
  bio: text("bio").default(""),
  className: text("class_name").default("SSC / Batch-A"),
  isActive: boolean("is_active").notNull().default(true),
  preferredLanguage: text("preferred_language").notNull().default("bn"), // 'bn' | 'en'
  dataSaverDefault: boolean("data_saver_default").notNull().default(false),
  resetToken: text("reset_token"),
  resetExpiresAt: timestamp("reset_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  email: text("email").default(""),
  role: text("role").notNull().default("student"),
  className: text("class_name").default("SSC / Batch-A"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  usedBy: integer("used_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleBn: text("title_bn").default(""),
  subject: text("subject").notNull(),
  description: text("description").default(""),
  instructorId: integer("instructor_id").references(() => users.id, { onDelete: "set null" }),
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  status: text("status").notNull().default("upcoming"), // 'upcoming' | 'live' | 'completed' | 'cancelled'
  meetLink: text("meet_link").default(""),
  backupMeetLink: text("backup_meet_link").default(""),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  chatEnabled: boolean("chat_enabled").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classParticipants = pgTable("class_participants", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("present"), // 'present' | 'late' | 'absent'
  joinTime: timestamp("join_time"),
  leaveTime: timestamp("leave_time"),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  markedBy: text("marked_by").default("auto"), // 'auto' | 'manual'
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studyMaterials = pgTable("study_materials", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").default(""),
  type: text("type").notNull().default("pdf"), // 'pdf' | 'image' | 'doc' | 'presentation' | 'link'
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").default(""),
  fileSizeBytes: integer("file_size_bytes").default(0),
  uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  currentInstructorPage: integer("current_instructor_page").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  recordingUrl: text("recording_url").notNull(),
  durationLabel: text("duration_label").default("45m"),
  recordedDate: text("recorded_date").notNull(),
  notes: text("notes").default(""),
  uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  instructions: text("instructions").default(""),
  subject: text("subject").notNull(),
  deadline: text("deadline").notNull(), // ISO or YYYY-MM-DD HH:mm
  attachmentUrl: text("attachment_url").default(""),
  attachmentName: text("attachment_name").default(""),
  submissionType: text("submission_type").notNull().default("both"), // 'file' | 'text' | 'both'
  maxMarks: integer("max_marks").notNull().default(20),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answerText: text("answer_text").default(""),
  fileUrl: text("file_url").default(""),
  fileName: text("file_name").default(""),
  status: text("status").notNull().default("submitted"), // 'submitted' | 'late' | 'graded' | 'returned'
  marks: integer("marks"),
  feedback: text("feedback").default(""),
  gradedBy: integer("graded_by").references(() => users.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  gradedAt: timestamp("graded_at"),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  subject: text("subject").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(15),
  totalMarks: integer("total_marks").notNull().default(10),
  startTime: text("start_time").default(""),
  endTime: text("end_time").default(""),
  showResultsImmediately: boolean("show_results_immediately").notNull().default(true),
  isQuickQuiz: boolean("is_quick_quiz").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull().default("mcq"), // 'mcq' | 'true_false' | 'short_answer'
  optionsJson: jsonb("options_json").$type<string[]>().default([]),
  correctAnswer: text("correct_answer").default(""),
  marks: integer("marks").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answersJson: jsonb("answers_json").$type<Record<string, string>>().default({}),
  objectiveScore: integer("objective_score").notNull().default(0),
  manualScore: integer("manual_score").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  status: text("status").notNull().default("submitted"), // 'submitted' | 'graded'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const classroomMessages = pgTable("classroom_messages", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isQuestion: boolean("is_question").notNull().default(false),
  isAnswered: boolean("is_answered").notNull().default(false),
  replyText: text("reply_text").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raisedHands = pgTable("raised_hands", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").default(""),
  status: text("status").notNull().default("raised"), // 'raised' | 'acknowledged' | 'lowered'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  optionsJson: jsonb("options_json").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface WhiteboardStroke {
  id: string;
  tool: "pen" | "highlighter" | "line" | "rect" | "circle" | "text" | "eraser";
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
}

export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" })
    .unique(),
  pagesJson: jsonb("pages_json").$type<WhiteboardStroke[][]>().notNull().default([[]]),
  currentPage: integer("current_page").notNull().default(0),
  isShared: boolean("is_shared").notNull().default(true),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"), // 'normal' | 'important' | 'urgent'
  targetRole: text("target_role").notNull().default("all"), // 'all' | 'student' | 'instructor'
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("info"), // 'class' | 'assignment' | 'quiz' | 'material' | 'announcement' | 'info'
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link").default("/dashboard"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  schoolName: text("school_name").notNull().default("Pathshala Digital Classroom"),
  schoolNameBn: text("school_name_bn").notNull().default("পাঠশালা ডিজিটাল শ্রেণিকক্ষ"),
  defaultLanguage: text("default_language").notNull().default("bn"),
  lowBandwidthDefault: boolean("low_bandwidth_default").notNull().default(true),
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
