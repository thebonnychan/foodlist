import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  FileSpreadsheet,
  ExternalLink,
  Cloud
} from 'lucide-react';
import { Restaurant, SavedList } from '../types';
import {
  generateRestaurantsCsv,
  downloadCsvFile,
  encodeListShareLink
} from '../utils/csvExport';

interface CsvExportModalProps {
  list: SavedList | null;
  restaurantsMap: Record<string, Restaurant>;
  onClose: () => void;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  list,
  restaurantsMap,
  onClose
}) => {
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!list) return null;

  const restaurants: Restaurant[] = list.items
    .map((item) => restaurantsMap[item.restaurantId])
    .filter((r): r is Restaurant => Boolean(r));

  const csvContent = generateRestaurantsCsv(restaurants);
  const shareUrl = encodeListShareLink(list, restaurantsMap);

  const handleDownloadLocal = () => {
    downloadCsvFile(csvContent, `yurfat-${list.name}`);
  };

  const handleCopyCsv = async () => {
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-export-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-[#FAF9F6] px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#D32323]" />
              <span>Export & Share List</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{restaurants.length} restaurants</span>
            </div>
            <h2 id="csv-export-title" className="mt-0.5 text-lg font-bold text-zinc-900">
              Export &ldquo;{list.name}&rdquo; to CSV or Share Link
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
            aria-label="Close export modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Primary Export Actions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Option 1: Local Device CSV Download */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">1. Save CSV to Local Device</h3>
                <p className="mt-1 text-xs text-zinc-600">
                  Downloads a standard UTF-8 <code>.csv</code> spreadsheet with all 7 required Yelp & personal columns.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadLocal}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#D32323] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#b81d1d] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" />
                Download .CSV File
              </button>
            </div>

            {/* Option 2: Google Sheets / Cloud Copy */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900">2. Google Cloud / Sheets</h3>
                  <Cloud className="h-4 w-4 text-zinc-400" />
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  Copy the formatted CSV data to paste directly into Google Sheets or upload to Google Drive with zero setup.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyCsv}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedCsv ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Copied CSV Data!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy CSV to Clipboard
                  </>
                )}
              </button>
            </div>

            {/* Option 3: Zero-Account Shareable Link */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">3. Share Without an Account</h3>
                <p className="mt-1 text-xs text-zinc-600">
                  Generates a self-contained share link so friends can open and import your list immediately—no sign-up needed.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Share Link Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Copy Shareable Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 7-Column CSV Live Table Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-800">
                CSV Spreadsheet Preview (All 7 Required Columns)
              </h3>
              <span className="text-xs text-zinc-500 font-mono tabular-nums">
                yurfat-{list.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-[#FAF9F6] text-zinc-600 font-semibold">
                    <th className="py-2.5 px-3 whitespace-nowrap">1. Restaurant Name</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">2. Type of Restaurant</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">3. Yelp Page Link</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">4. User Rating</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">5. Yelp Rating</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">6. Notes</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">7. Will Go Back</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {restaurants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-zinc-500">
                        This list has no saved restaurants yet.
                      </td>
                    </tr>
                  ) : (
                    restaurants.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50/80">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 whitespace-nowrap">
                          {r.name}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">{r.cuisineType}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#D32323]">
                          <a
                            href={r.yelpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            yelp.com/biz/... <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-800">
                          {r.userRating > 0 ? `${r.userRating}/5` : 'Unrated'}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-800">
                          {r.yelpRating.toFixed(1)}/5
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 max-w-xs truncate">
                          {r.notes || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold tabular-nums">
                          {r.willGoBack === 'Y' ? (
                            <span className="text-emerald-700">Y</span>
                          ) : r.willGoBack === 'N' ? (
                            <span className="text-rose-700">N</span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-[#FAF9F6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
