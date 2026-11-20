"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface StudyMaterialItem {
  id: number;
  title: string;
  subject: string;
  topic: string | null;
  type: string;
  fileUrl: string;
  fileName: string | null;
  currentInstructorPage: number;
}

export function PdfViewer({
  materials,
  canSyncPage,
  onSyncInstructorPage,
}: {
  materials: StudyMaterialItem[];
  canSyncPage: boolean;
  onSyncInstructorPage?: (materialId: number, page: number) => Promise<void>;
}) {
  const { lang } = useI18n();
  const pdfOrDocs = materials.filter((m) => m.type === "pdf" || m.type === "image" || m.type === "doc" || m.type === "presentation");
  const [selectedId, setSelectedId] = useState<number>(pdfOrDocs[0]?.id || 0);
  const selected = pdfOrDocs.find((m) => m.id === selectedId) || pdfOrDocs[0] || null;

  const [page, setPage] = useState<number>(selected?.currentInstructorPage || 1);
  const [zoom, setZoom] = useState<number>(100);
  const [syncing, setSyncing] = useState(false);

  if (!selected) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {lang === "bn"
          ? "এই ক্লাসের জন্য এখনো কোনো পিডিএফ বা ডকুমেন্ট আপলোড করা হয়নি।"
          : "No PDF or document materials attached to this class yet."}
      </div>
    );
  }

  const isPdf = selected.type === "pdf" || selected.fileUrl.toLowerCase().endsWith(".pdf");
  const isImage =
    selected.type === "image" ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(selected.fileUrl);

  const handlePageChange = async (nextPage: number) => {
    const safePage = Math.max(1, nextPage);
    setPage(safePage);
    if (canSyncPage && onSyncInstructorPage) {
      setSyncing(true);
      try {
        await onSyncInstructorPage(selected.id, safePage);
      } finally {
        setSyncing(false);
      }
    }
  };

  const syncToInstructor = () => {
    setPage(selected.currentInstructorPage || 1);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Controls Bar */}
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-teal-700 shrink-0" />
          <select
            value={selected.id}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedId(id);
              const found = pdfOrDocs.find((m) => m.id === id);
              setPage(found?.currentInstructorPage || 1);
            }}
            className="text-xs sm:text-sm font-medium border border-slate-200 rounded-md px-2 py-1 bg-white max-w-[240px]"
          >
            {pdfOrDocs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isPdf && (
            <>
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold px-1.5 text-slate-700">
                {lang === "bn" ? `পৃষ্ঠা ${page}` : `Page ${page}`}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                className="p-1 rounded border border-slate-200 bg-white"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {!canSyncPage && (
                <button
                  type="button"
                  onClick={syncToInstructor}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-teal-200 bg-teal-50 text-teal-800 text-xs font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {lang === "bn"
                      ? `শিক্ষকের পৃষ্ঠায় যান (${selected.currentInstructorPage})`
                      : `Instructor Page (${selected.currentInstructorPage})`}
                  </span>
                </button>
              )}
              {canSyncPage && syncing && (
                <span className="text-[11px] text-teal-700">Syncing...</span>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(60, z - 20))}
            className="p-1 rounded border border-slate-200 bg-white"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-600 w-10 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 20))}
            className="p-1 rounded border border-slate-200 bg-white"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <a
            href={`${selected.fileUrl}${selected.fileUrl.includes("?") ? "&" : "?"}download=1`}
            download={selected.fileName || undefined}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 text-white hover:bg-teal-800 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{lang === "bn" ? "ডাউনলোড" : "Download"}</span>
          </a>
        </div>
      </div>

      {/* Viewer Body */}
      <div className="bg-slate-100 p-3 overflow-auto max-h-[520px]">
        {isPdf ? (
          <div style={{ width: `${zoom}%`, minWidth: "100%" }}>
            <iframe
              key={`${selected.id}-${page}`}
              src={`${selected.fileUrl}#page=${page}`}
              className="w-full h-[460px] rounded-lg border border-slate-200 bg-white"
              title={selected.title}
            />
          </div>
        ) : isImage ? (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.fileUrl}
              alt={selected.title}
              style={{ width: `${zoom}%` }}
              className="max-w-full rounded-lg border border-slate-200"
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">{selected.title}</p>
            <a
              href={selected.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{lang === "bn" ? "ফাইল খুলুন" : "Open Material"}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
