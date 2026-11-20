import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  classes,
  classroomMessages,
  polls,
  pollVotes,
  raisedHands,
  studyMaterials,
  users,
  whiteboards,
  WhiteboardStroke,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { and, asc, desc, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classId = Number(id);

  const [cls] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);

  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, { id: u.id, name: u.name, role: u.role }]));

  const messagesRaw = await db
    .select()
    .from(classroomMessages)
    .where(eq(classroomMessages.classId, classId))
    .orderBy(asc(classroomMessages.createdAt));

  const messages = messagesRaw.map((m) => ({
    ...m,
    userName: userMap.get(m.userId)?.name || "User",
    userRole: userMap.get(m.userId)?.role || "student",
  }));

  const handsRaw = await db
    .select()
    .from(raisedHands)
    .where(eq(raisedHands.classId, classId))
    .orderBy(asc(raisedHands.createdAt));

  const hands = handsRaw
    .filter((h) => h.status !== "lowered")
    .map((h) => ({
      ...h,
      userName: userMap.get(h.userId)?.name || "Student",
    }));

  const pollsRaw = await db
    .select()
    .from(polls)
    .where(eq(polls.classId, classId))
    .orderBy(desc(polls.createdAt));

  const allVotes = await db.select().from(pollVotes);

  const enrichedPolls = pollsRaw.map((p) => {
    const pVotes = allVotes.filter((v) => v.pollId === p.id);
    const counts = (p.optionsJson || []).map(
      (_, idx) => pVotes.filter((v) => v.optionIndex === idx).length
    );
    const myVote = pVotes.find((v) => v.userId === user.id)?.optionIndex ?? null;
    return {
      ...p,
      counts,
      totalVotes: pVotes.length,
      myVote,
    };
  });

  let [board] = await db
    .select()
    .from(whiteboards)
    .where(eq(whiteboards.classId, classId))
    .limit(1);

  if (!board) {
    [board] = await db
      .insert(whiteboards)
      .values({
        classId,
        pagesJson: [[]],
        currentPage: 0,
        isShared: true,
      })
      .returning();
  }

  const materials = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.classId, classId));

  return NextResponse.json({
    chatEnabled: cls.chatEnabled,
    messages,
    raisedHands: hands,
    polls: enrichedPolls,
    whiteboard: board,
    materials,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classId = Number(id);
  const body = await req.json();
  const action = String(body.action || "");

  try {
    if (action === "send_message") {
      const [cls] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);
      if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
      if (!cls.chatEnabled && user.role === "student") {
        return NextResponse.json(
          { error: "Chat is currently paused by the instructor" },
          { status: 403 }
        );
      }

      const text = String(body.message || "").trim();
      if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

      const [created] = await db
        .insert(classroomMessages)
        .values({
          classId,
          userId: user.id,
          message: text,
          isQuestion: Boolean(body.isQuestion),
        })
        .returning();
      return NextResponse.json({ message: created }, { status: 201 });
    }

    if (action === "reply_message") {
      if (user.role !== "instructor" && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const messageId = Number(body.messageId);
      const replyText = String(body.replyText || "").trim();
      await db
        .update(classroomMessages)
        .set({ isAnswered: true, replyText })
        .where(eq(classroomMessages.id, messageId));
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_message") {
      if (user.role !== "instructor" && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db
        .delete(classroomMessages)
        .where(eq(classroomMessages.id, Number(body.messageId)));
      return NextResponse.json({ ok: true });
    }

    if (action === "raise_hand") {
      const topic = String(body.topic || "").trim();
      const [existing] = await db
        .select()
        .from(raisedHands)
        .where(
          and(
            eq(raisedHands.classId, classId),
            eq(raisedHands.userId, user.id),
            eq(raisedHands.status, "raised")
          )
        )
        .limit(1);
      if (existing) {
        return NextResponse.json({ hand: existing });
      }
      const [created] = await db
        .insert(raisedHands)
        .values({
          classId,
          userId: user.id,
          topic,
          status: "raised",
        })
        .returning();
      return NextResponse.json({ hand: created }, { status: 201 });
    }

    if (action === "update_hand") {
      const handId = Number(body.handId);
      const status = body.status as "acknowledged" | "lowered";
      const [hand] = await db
        .select()
        .from(raisedHands)
        .where(eq(raisedHands.id, handId))
        .limit(1);
      if (!hand) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (user.role === "student" && hand.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.update(raisedHands).set({ status }).where(eq(raisedHands.id, handId));
      return NextResponse.json({ ok: true });
    }

    if (action === "create_poll") {
      if (user.role !== "instructor" && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const question = String(body.question || "").trim();
      const options = Array.isArray(body.options)
        ? body.options.map((o: unknown) => String(o).trim()).filter(Boolean)
        : [];
      if (!question || options.length < 2) {
        return NextResponse.json(
          { error: "Question and at least 2 options required" },
          { status: 400 }
        );
      }
      const [created] = await db
        .insert(polls)
        .values({
          classId,
          question,
          optionsJson: options,
          isActive: true,
          createdBy: user.id,
        })
        .returning();
      return NextResponse.json({ poll: created }, { status: 201 });
    }

    if (action === "vote_poll") {
      const pollId = Number(body.pollId);
      const optionIndex = Number(body.optionIndex);
      const [existing] = await db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, user.id)))
        .limit(1);

      if (existing) {
        await db
          .update(pollVotes)
          .set({ optionIndex })
          .where(eq(pollVotes.id, existing.id));
      } else {
        await db.insert(pollVotes).values({
          pollId,
          userId: user.id,
          optionIndex,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "close_poll") {
      if (user.role !== "instructor" && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db
        .update(polls)
        .set({ isActive: false })
        .where(eq(polls.id, Number(body.pollId)));
      return NextResponse.json({ ok: true });
    }

    if (action === "save_whiteboard") {
      if (user.role !== "instructor" && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const pagesJson = Array.isArray(body.pagesJson)
        ? (body.pagesJson as WhiteboardStroke[][])
        : [[]];
      const currentPage = Number(body.currentPage) || 0;
      const isShared = typeof body.isShared === "boolean" ? body.isShared : true;

      const [existing] = await db
        .select()
        .from(whiteboards)
        .where(eq(whiteboards.classId, classId))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(whiteboards)
          .set({
            pagesJson,
            currentPage,
            isShared,
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(whiteboards.classId, classId))
          .returning();
        return NextResponse.json({ whiteboard: updated });
      } else {
        const [created] = await db
          .insert(whiteboards)
          .values({
            classId,
            pagesJson,
            currentPage,
            isShared,
            updatedBy: user.id,
          })
          .returning();
        return NextResponse.json({ whiteboard: created });
      }
    }

    if (action === "sync_pdf_page") {
      if (user.role !== "instructor" && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const materialId = Number(body.materialId);
      const page = Math.max(1, Number(body.page) || 1);
      await db
        .update(studyMaterials)
        .set({ currentInstructorPage: page })
        .where(eq(studyMaterials.id, materialId));
      return NextResponse.json({ ok: true, page });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Live tools error:", err);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
