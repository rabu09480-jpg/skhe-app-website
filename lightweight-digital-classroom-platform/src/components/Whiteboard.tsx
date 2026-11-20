"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pencil,
  Highlighter,
  Minus,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
} from "lucide-react";
import type { WhiteboardStroke } from "@/db/schema";
import { useI18n } from "@/lib/i18n";

interface WhiteboardProps {
  initialPages: WhiteboardStroke[][];
  initialPage: number;
  initialShared: boolean;
  canEdit: boolean;
  onSave: (pages: WhiteboardStroke[][], currentPage: number, isShared: boolean) => Promise<void>;
}

const COLORS = ["#182026", "#0f766e", "#d97706", "#dc2626", "#2563eb"];

export function Whiteboard({
  initialPages,
  initialPage,
  initialShared,
  canEdit,
  onSave,
}: WhiteboardProps) {
  const { lang } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pages, setPages] = useState<WhiteboardStroke[][]>(
    initialPages && initialPages.length > 0 ? initialPages : [[]]
  );
  const [currentPage, setCurrentPage] = useState(initialPage || 0);
  const [isShared, setIsShared] = useState(initialShared ?? true);
  const [tool, setTool] = useState<WhiteboardStroke["tool"]>("pen");
  const [color, setColor] = useState("#182026");
  const [size, setSize] = useState(3);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeStroke, setActiveStroke] = useState<WhiteboardStroke | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Sync incoming updates for students when teacher saves
  useEffect(() => {
    if (!canEdit && initialPages && initialPages.length > 0) {
      setPages(initialPages);
      setCurrentPage(Math.min(initialPage || 0, initialPages.length - 1));
      setIsShared(initialShared);
    }
  }, [canEdit, initialPages, initialPage, initialShared]);

  const drawStroke = (ctx: CanvasRenderingContext2D, s: WhiteboardStroke) => {
    if (!s.points || s.points.length === 0) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (s.tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = s.size * 4;
    } else if (s.tool === "highlighter") {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size * 5;
    } else {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;
    }

    if (s.tool === "text" && s.text) {
      ctx.font = `600 ${Math.max(14, s.size * 4)}px sans-serif`;
      ctx.fillText(s.text, s.points[0].x, s.points[0].y);
      ctx.restore();
      return;
    }

    if (s.tool === "line" && s.points.length >= 2) {
      const start = s.points[0];
      const end = s.points[s.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === "rect" && s.points.length >= 2) {
      const start = s.points[0];
      const end = s.points[s.points.length - 1];
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.restore();
      return;
    }

    if (s.tool === "circle" && s.points.length >= 2) {
      const start = s.points[0];
      const end = s.points[s.points.length - 1];
      const radius = Math.hypot(end.x - start.x, end.y - start.y);
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Freehand pen / highlighter / eraser
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle notebook dot grid
    ctx.fillStyle = "#e2e8f0";
    for (let x = 24; x < canvas.width; x += 24) {
      for (let y = 24; y < canvas.height; y += 24) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    const strokes = pages[currentPage] || [];
    for (const s of strokes) {
      drawStroke(ctx, s);
    }
    if (activeStroke) {
      drawStroke(ctx, activeStroke);
    }
  }, [activeStroke, currentPage, pages]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    const pos = getPointerPos(e);

    if (tool === "text") {
      const txt = window.prompt(lang === "bn" ? "বোর্ডে লিখুন:" : "Enter text for board:");
      if (txt && txt.trim()) {
        const stroke: WhiteboardStroke = {
          id: String(Date.now()),
          tool: "text",
          color,
          size: Math.max(4, size),
          points: [pos],
          text: txt.trim(),
        };
        const nextPages = pages.map((p, i) => (i === currentPage ? [...p, stroke] : p));
        setPages(nextPages);
        setRedoStack([]);
      }
      return;
    }

    setIsDrawing(true);
    setActiveStroke({
      id: String(Date.now()),
      tool,
      color,
      size,
      points: [pos],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || !isDrawing || !activeStroke) return;
    const pos = getPointerPos(e);
    setActiveStroke((prev) => {
      if (!prev) return null;
      if (prev.tool === "line" || prev.tool === "rect" || prev.tool === "circle") {
        return { ...prev, points: [prev.points[0], pos] };
      }
      return { ...prev, points: [...prev.points, pos] };
    });
  };

  const handlePointerUp = () => {
    if (!canEdit || !isDrawing || !activeStroke) return;
    setIsDrawing(false);
    const nextPages = pages.map((p, i) =>
      i === currentPage ? [...p, activeStroke] : p
    );
    setPages(nextPages);
    setActiveStroke(null);
    setRedoStack([]);
  };

  const handleUndo = () => {
    const cur = pages[currentPage] || [];
    if (cur.length === 0) return;
    const last = cur[cur.length - 1];
    setRedoStack((r) => [...r, last]);
    setPages(pages.map((p, i) => (i === currentPage ? cur.slice(0, -1) : p)));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setPages(pages.map((p, i) => (i === currentPage ? [...p, restored] : p)));
  };

  const handleClearPage = () => {
    setPages(pages.map((p, i) => (i === currentPage ? [] : p)));
    setRedoStack([]);
  };

  const handleAddPage = () => {
    const next = [...pages, []];
    setPages(next);
    setCurrentPage(next.length - 1);
  };

  const triggerSave = async (shareFlag = isShared) => {
    setSaving(true);
    try {
      await onSave(pages, currentPage, shareFlag);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit && !isShared) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        {lang === "bn"
          ? "শিক্ষক এই মুহূর্তে হোয়াইটবোর্ড শেয়ার করেননি।"
          : "The instructor has not shared the whiteboard right now."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        {canEdit ? (
          <div className="flex items-center gap-1 flex-wrap">
            {(
              [
                { id: "pen", icon: Pencil, title: "Pen" },
                { id: "highlighter", icon: Highlighter, title: "Highlighter" },
                { id: "line", icon: Minus, title: "Line" },
                { id: "rect", icon: Square, title: "Rectangle" },
                { id: "circle", icon: Circle, title: "Circle" },
                { id: "text", icon: Type, title: "Text" },
                { id: "eraser", icon: Eraser, title: "Eraser" },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTool(item.id)}
                  title={item.title}
                  className={`p-1.5 rounded-md border text-xs ${
                    tool === item.id
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border-2 ${
                  color === c ? "border-slate-900 scale-110" : "border-white"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}

            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="ml-1 text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white"
            >
              <option value={2}>Thin</option>
              <option value={3}>Normal</option>
              <option value={6}>Thick</option>
            </select>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClearPage}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-red-50 text-red-600"
              title="Clear Page"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-teal-800">
            {lang === "bn"
              ? "শিক্ষকের শেয়ার করা হোয়াইটবোর্ড (স্বল্প ডাটা সিঙ্ক)"
              : "Instructor's Shared Whiteboard (Low-Data Sync)"}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-slate-700 px-1">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            type="button"
            disabled={currentPage >= pages.length - 1}
            onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
            className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleAddPage}
                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === "bn" ? "পৃষ্ঠা" : "Page"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextShare = !isShared;
                  setIsShared(nextShare);
                  triggerSave(nextShare);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${
                  isShared
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>{isShared ? (lang === "bn" ? "শেয়ার চালু" : "Shared") : (lang === "bn" ? "শেয়ার বন্ধ" : "Private")}</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSave(isShared)}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 text-white hover:bg-teal-800 text-xs font-semibold"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {saving
                    ? "..."
                    : savedNotice
                    ? lang === "bn"
                      ? "সংরক্ষিত"
                      : "Saved!"
                    : lang === "bn"
                    ? "সংরক্ষণ ও শেয়ার"
                    : "Save & Sync"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-slate-100 p-2">
        <canvas
          ref={canvasRef}
          width={860}
          height={440}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-auto bg-white rounded-lg border border-slate-200 touch-none ${
            canEdit ? "cursor-crosshair" : "cursor-default"
          }`}
        />
      </div>
    </div>
  );
}
