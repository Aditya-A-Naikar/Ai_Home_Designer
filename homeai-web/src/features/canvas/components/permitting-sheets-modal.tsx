"use client";

import React, { useState, useMemo } from "react";
import { Project } from "@/core/domain/types";
import { 
  generatePermittingBlueprintPackage, 
  ArchitecturalSheet 
} from "@/core/export/multi-sheet-blueprint-generator";
import { 
  X, 
  Printer, 
  Download, 
  FileText
} from "lucide-react";

interface PermittingSheetsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function PermittingSheetsModal({
  project,
  isOpen,
  onClose,
}: PermittingSheetsModalProps) {
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  const sheets: ArchitecturalSheet[] = useMemo(() => {
    return generatePermittingBlueprintPackage(project);
  }, [project]);

  if (!isOpen) return null;

  const currentSheet = sheets[selectedSheetIndex] || sheets[0];

  const handleDownloadCurrentSvg = () => {
    const blob = new Blob([currentSheet.svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, "_")}_${currentSheet.sheetNumber}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintAllSheets = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the printable blueprint set.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${project.name} — Permitting Blueprint Package</title>
          <style>
            @page {
              size: 297mm 210mm landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: monospace;
            }
            .page {
              width: 297mm;
              height: 210mm;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              padding: 5mm;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          ${sheets.map((s) => `<div class="page">${s.svgContent}</div>`).join("")}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl overflow-hidden font-mono text-xs flex flex-col h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3.5 bg-[#080d16]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Architectural Permitting Blueprint Set</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  5-SHEET PACKAGE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {project.name} • Scale: {currentSheet.scale} • Standard A3 Landscape Drawing Series
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAllSheets}
              className="inline-flex items-center gap-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              title="Print all 5 sheets or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save All as PDF</span>
            </button>

            <button
              onClick={handleDownloadCurrentSvg}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              title="Download vector SVG of currently selected sheet"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Download Sheet ({currentSheet.sheetNumber})</span>
            </button>

            <button
              onClick={onClose}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sheet Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 px-6 py-2.5 bg-[#0a0f1a]">
          {sheets.map((sheet, idx) => (
            <button
              key={sheet.sheetNumber}
              onClick={() => setSelectedSheetIndex(idx)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                selectedSheetIndex === idx
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              }`}
            >
              <span className="font-bold text-white">{sheet.sheetNumber}</span>
              <span className="text-[11px] text-slate-400">{sheet.title}</span>
            </button>
          ))}
        </div>

        {/* Main Sheet Viewport Canvas */}
        <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-hidden relative">
          <div className="w-full h-full max-h-full rounded-lg bg-white shadow-xl overflow-hidden flex items-center justify-center p-2">
            <div 
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: currentSheet.svgContent }} 
            />
          </div>

          {/* Watermark Tag */}
          <div className="absolute bottom-6 right-8 bg-slate-900/90 text-slate-400 px-3 py-1 rounded text-[10px] border border-slate-800 pointer-events-none">
            SHEET {selectedSheetIndex + 1} OF {sheets.length} • VECTOR CAD PRECISION
          </div>
        </div>
      </div>
    </div>
  );
}
