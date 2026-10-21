import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  BookOpen,
  Share2,
  MapPin,
  ArrowUpDown,
  AlertTriangle
} from 'lucide-react';
import { AppSettings, Restaurant, SavedList, SortOption } from '../types';
import { POPULAR_US_CITIES } from '../data/usRestaurantsCatalog';
import { decodeListShareToken } from '../utils/csvExport';

interface SettingsViewProps {
  settings: AppSettings;
  lists: SavedList[];
  restaurantsMap: Record<string, Restaurant>;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onImportSharedLinkOrToken: (token: string) => { success: boolean; message: string };
  onImportFullBackupJson: (jsonString: string) => { success: boolean; message: string };
  onResetToDemoData: () => void;
  onClearAllUserData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  lists,
  restaurantsMap,
  onUpdateSettings,
  onImportSharedLinkOrToken,
  onImportFullBackupJson,
  onResetToDemoData,
  onClearAllUserData
}) => {
  const [shareTokenInput, setShareTokenInput] = useState('');
  const [shareImportStatus, setShareImportStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleImportSharedList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTokenInput.trim()) return;
    const result = onImportSharedLinkOrToken(shareTokenInput.trim());
    setShareImportStatus({
      type: result.success ? 'success' : 'error',
      text: result.message
    });
    if (result.success) {
      setShareTokenInput('');
    }
  };

  const handleExportJsonBackup = () => {
    const backupPayload = {
      app: 'YURFAT',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      lists,
      restaurantsMap
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `yurfat-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupMessage('Downloaded full YURFAT JSON backup file.');
    setTimeout(() => setBackupMessage(null), 3000);
  };

  const handleFileUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      // Check if it's a shared list payload or full backup
      const decodedShare = decodeListShareToken(content);
      if (decodedShare) {
        const res = onImportSharedLinkOrToken(content);
        setBackupMessage(res.message);
        return;
      }
      const res = onImportFullBackupJson(content);
      setBackupMessage(res.message);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Settings className="h-3.5 w-3.5 text-[#D32323]" />
          <span>Preferences, Account-Free Sharing & Build Guide</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">YURFAT Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Customize your default U.S. restaurant search city, default list sorting, import shared lists from friends, or review the step-by-step free build & deployment instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Search & List Defaults */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              1. Search & List Preferences
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Saved automatically in your browser with no account required.
            </p>
          </div>

          <div className="space-y-4">
            {/* Default US Location */}
            <div>
              <label
                htmlFor="default-us-city"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800"
              >
                <MapPin className="h-3.5 w-3.5 text-[#D32323]" />
                <span>Default U.S. Search Location</span>
              </label>
              <select
                id="default-us-city"
                value={settings.defaultLocation}
                onChange={(e) => onUpdateSettings({ defaultLocation: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-zinc-900 focus:border-[#D32323] focus:bg-white focus:outline-none"
              >
                {POPULAR_US_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Default List Sort Order */}
            <div>
              <label
                htmlFor="default-sort-order"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                <span>Default Sort Order Inside Lists</span>
              </label>
              <select
                id="default-sort-order"
                value={settings.defaultSortBy}
                onChange={(e) =>
                  onUpdateSettings({ defaultSortBy: e.target.value as SortOption })
                }
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-zinc-900 focus:border-[#D32323] focus:bg-white focus:outline-none"
              >
                <option value="dateAdded">Date Added (Newest First)</option>
                <option value="alphabetical">Alphabetical (A to Z)</option>
                <option value="yelpRating">Yelp Rating (Highest First)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 2. Account-Free List Import & Local Backup */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              2. Import a Shared List or Backup Data
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Import a friend&apos;s shared YURFAT link or back up all your lists locally.
            </p>
          </div>

          <form onSubmit={handleImportSharedList} className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
              <Share2 className="h-3.5 w-3.5 text-[#D32323]" />
              <span>Paste Shared List URL or Token</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareTokenInput}
                onChange={(e) => setShareTokenInput(e.target.value)}
                placeholder="Paste https://...?share=... link here"
                className="flex-1 rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3 py-2 text-xs text-zinc-900 focus:border-[#D32323] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
              >
                Import List
              </button>
            </div>
            {shareImportStatus && (
              <p
                className={`text-xs font-medium ${
                  shareImportStatus.type === 'success' ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {shareImportStatus.text}
              </p>
            )}
          </form>

          <div className="border-t border-zinc-200 pt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON Backup
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUploadBackup}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={onResetToDemoData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Demo Restaurants
              </button>
            </div>

            {backupMessage && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> {backupMessage}
              </p>
            )}

            {/* Danger Zone: Clear All Saved Data */}
            <div className="pt-2">
              {!confirmClearAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All Custom Lists & Saved Restaurants
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
                  <div className="flex items-center gap-2 text-rose-900">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Empty all lists and start fresh?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllUserData();
                        setConfirmClearAll(false);
                      }}
                      className="rounded-md bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 font-semibold text-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Step-by-Step Build, Free Integration & Deployment Instructions */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 shadow-2xs space-y-6">
        <div className="border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <BookOpen className="h-4 w-4 text-[#D32323]" />
            <span>Documentation & Roadmap</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-zinc-900">
            Step-by-Step Guide: Building & Deploying YURFAT for Free
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            How this Phase 1 MVP keeps your operational costs at $0.00/month and how to deploy or expand to Phase 2.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
            <h3 className="text-sm font-bold text-zinc-900">
              01. Free Yelp Search Grounding (Saves $229/mo)
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Yelp discontinued its free Fusion API tier and now charges $229+/month. Instead, YURFAT uses an Express backend route (<code>POST /api/search</code>) calling <strong>Gemini 3.8 Flash with Google Search Grounding</strong> (<code>googleSearch: &#123;&#125;</code>) to look up real U.S. Yelp restaurant pages, ratings, review counts, cuisine types, and direct <code>yelp.com/biz/...</code> links at zero extra cost inside Google AI Studio.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
            <h3 className="text-sm font-bold text-zinc-900">
              02. Zero-Account Browser Persistence & URL Sharing
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              To avoid paying for external database hosting or forcing users to sign up, YURFAT persists your normalized restaurant catalog, synced notes, 1–5 star ratings, and <code>Y/N</code> Will Go Back flags in <code>localStorage</code>. Clicking <strong>Copy Shareable Link</strong> encodes any list into a URL parameter (<code>?share=...</code>) that friends can open and import with one click.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
            <h3 className="text-sm font-bold text-zinc-900">
              03. Deploying YURFAT in Google AI Studio
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              1. Test searching U.S. cities, starring spots into <em>&ldquo;Want to Go&rdquo;</em> or <em>&ldquo;Been Here&rdquo;</em>, and downloading a 7-column CSV file.<br />
              2. Click the <strong>Share / Deploy</strong> button in the top-right corner of Google AI Studio to deploy the full-stack app to Google Cloud Run.<br />
              3. Share the generated <code>*.run.app</code> link with anyone—each visitor gets their own private browser workspace automatically.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-[#FAF9F6] p-4">
            <h3 className="text-sm font-bold text-zinc-900">
              04. Phase 2 Roadmap (Optional Future Enhancements)
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              When you are ready for Phase 2, prompt AI Studio to:<br />
              · Add <strong>1-Click Save CSV to Google Drive / Google Sheets</strong> using free client-side Google Workspace OAuth (<code>drive.file</code> scope).<br />
              · Add an interactive U.S. map view plotting your <em>&ldquo;Want to Go&rdquo;</em> and <em>&ldquo;Been Here&rdquo;</em> spots by neighborhood.<br />
              · Add optional Firebase Spark Plan (free tier) sync across mobile and desktop devices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
