"use client";

import React, { useState, useMemo } from "react";
import { 
  Project 
} from "@/core/domain/types";
import { 
  calculateProjectBOQ, 
  CostTier, 
  CurrencyCode 
} from "@/core/geometry/boq-calculator";
import { 
  X, 
  Download, 
  Calculator
} from "lucide-react";

interface BOQEstimatorModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function BOQEstimatorModal({
  project,
  isOpen,
  onClose,
}: BOQEstimatorModalProps) {
  const [costTier, setCostTier] = useState<CostTier>("standard");
  const [currency, setCurrency] = useState<CurrencyCode>("INR");

  const boq = useMemo(() => {
    return calculateProjectBOQ(project, costTier, currency);
  }, [project, costTier, currency]);

  if (!isOpen) return null;

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  const handleDownloadCsv = () => {
    const headers = ["Category", "Item Description", "Unit", "Quantity", "Rate", "Amount"];
    const rows = boq.items.map((it) => [
      `"${it.category}"`,
      `"${it.item}"`,
      `"${it.unit}"`,
      it.quantity,
      it.rate,
      it.amount,
    ]);
    rows.push(["Summary", "Subtotal", "", "", "", boq.subtotal]);
    rows.push(["Summary", "5% Contingency", "", "", "", boq.contingencyAmount]);
    rows.push(["Summary", "Grand Total", "", "", "", boq.grandTotal]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.name.toLowerCase().replace(/\s+/g, "_")}_boq_takeoff.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#080d16]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Bill of Quantities (BOQ) & Material Takeoff</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  ESTIMATOR v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {project.name} • Built-Up: {boq.builtUpAreaM2} m² • Carpet: {boq.carpetAreaM2} m²
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Configuration Bar: Cost Tiers & Currencies */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-3 bg-[#0a0f1a]">
          {/* Cost Tiers */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 uppercase">Specification Grade:</span>
            <div className="flex rounded border border-slate-800 bg-slate-900 p-0.5">
              {[
                { id: "economy" as CostTier, label: "Economy" },
                { id: "standard" as CostTier, label: "Standard (Exec)" },
                { id: "premium" as CostTier, label: "Premium Luxury" },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setCostTier(tier.id)}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    costTier === tier.id
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Currencies */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 uppercase">Currency:</span>
            <div className="flex rounded border border-slate-800 bg-slate-900 p-0.5">
              {(["INR", "USD", "EUR", "GBP"] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    currency === c
                      ? "bg-slate-800 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Material Takeoff KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-6 border-b border-slate-800 bg-[#080d16]">
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">RCC Concrete</span>
            <span className="text-base font-bold text-white mt-1 block">{boq.concreteVolumeM3} m³</span>
            <span className="text-[10px] text-slate-400">Slabs & Columns</span>
          </div>
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">TMT Steel</span>
            <span className="text-base font-bold text-cyan-300 mt-1 block">{boq.steelRebarKg.toLocaleString()} kg</span>
            <span className="text-[10px] text-slate-400">Fe500D Rebar</span>
          </div>
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Masonry Volume</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">{boq.masonryVolumeM3} m³</span>
            <span className="text-[10px] text-slate-400">~{boq.brickCountNos.toLocaleString()} Bricks</span>
          </div>
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Flooring Area</span>
            <span className="text-base font-bold text-amber-300 mt-1 block">{boq.flooringAreaM2} m²</span>
            <span className="text-[10px] text-slate-400">Room Slabs</span>
          </div>
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Openings</span>
            <span className="text-base font-bold text-indigo-300 mt-1 block">
              {boq.doorsCount}D • {boq.windowsCount}W
            </span>
            <span className="text-[10px] text-slate-400">Doors & Windows</span>
          </div>
        </div>

        {/* Itemized BOQ Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#080d16] text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Item Description</th>
                <th className="p-2.5 text-center">Unit</th>
                <th className="p-2.5 text-right">Quantity</th>
                <th className="p-2.5 text-right">Rate ({currencySymbol})</th>
                <th className="p-2.5 text-right">Total ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {boq.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-2.5 text-[10px] font-semibold text-cyan-400/90 uppercase">
                    {it.category}
                  </td>
                  <td className="p-2.5 text-slate-200">
                    {it.item}
                  </td>
                  <td className="p-2.5 text-center text-slate-400">
                    {it.unit}
                  </td>
                  <td className="p-2.5 text-right font-bold text-white">
                    {it.quantity.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right text-slate-400">
                    {currencySymbol}{it.rate.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right font-bold text-cyan-300">
                    {currencySymbol}{it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-[#080d16] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400">
            Includes 5% architectural design contingency • Rates reflect {costTier.toUpperCase()} market specification
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Subtotal</span>
              <span className="text-slate-300 font-bold">
                {currencySymbol}{boq.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Contingency (5%)</span>
              <span className="text-slate-400">
                {currencySymbol}{boq.contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right pl-4 border-l border-slate-800">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold">Estimated Grand Total</span>
              <span className="text-base font-black text-white">
                {currencySymbol}{boq.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
