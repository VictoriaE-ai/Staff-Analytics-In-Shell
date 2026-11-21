import { useEffect, useState } from 'react';
import { FileSpreadsheet, Loader2, RefreshCw, X } from 'lucide-react';
import {
  DriveSpreadsheetFile,
  SpreadsheetMetadata,
  WorkspaceAuthExpiredError,
  extractSpreadsheetTarget,
  getSpreadsheetMetadata,
  listDriveSpreadsheets,
} from '../services/googleSheetsApi';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  currentSpreadsheetId: string;
  onSignIn: () => Promise<void>;
  isLoggingIn: boolean;
  onLoadTab: (
    spreadsheetId: string,
    spreadsheetTitle: string,
    sheetTitle: string,
    sheetId: number
  ) => Promise<void>;
  onAuthExpired: () => void;
}

export function GoogleSheetsModal({
  isOpen,
  onClose,
  accessToken,
  currentSpreadsheetId,
  onSignIn,
  isLoggingIn,
  onLoadTab,
  onAuthExpired,
}: GoogleSheetsModalProps) {
  const [urlInput, setUrlInput] = useState(currentSpreadsheetId);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [inspectingMeta, setInspectingMeta] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedTabTitle, setSelectedTabTitle] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrlInput(currentSpreadsheetId);
    setModalError(null);
  }, [isOpen, currentSpreadsheetId]);

  const loadDriveFiles = async (token: string) => {
    setLoadingDrive(true);
    setModalError(null);
    try {
      const files = await listDriveSpreadsheets(token);
      setDriveFiles(files);
    } catch (err) {
      if (err instanceof WorkspaceAuthExpiredError) {
        onAuthExpired();
      }
      setModalError(
        err instanceof Error ? err.message : 'Unable to list Google Drive spreadsheets.'
      );
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveFiles(accessToken);
    }
  }, [isOpen, accessToken]);

  const handleInspectSpreadsheet = async (rawTarget: string) => {
    if (!accessToken) return;
    const { spreadsheetId, gid } = extractSpreadsheetTarget(rawTarget);
    if (!spreadsheetId) {
      setModalError('Enter a valid Google Sheets URL or Spreadsheet ID.');
      return;
    }

    setInspectingMeta(true);
    setModalError(null);
    try {
      const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
      setMetadata(meta);
      if (meta.sheets.length > 0) {
        const matched = gid
          ? meta.sheets.find((s) => String(s.sheetId) === gid)
          : undefined;
        setSelectedTabTitle((matched ?? meta.sheets[0]).title);
      } else {
        setSelectedTabTitle('');
      }
    } catch (err) {
      if (err instanceof WorkspaceAuthExpiredError) {
        onAuthExpired();
      }
      setModalError(
        err instanceof Error ? err.message : 'Unable to inspect spreadsheet tabs.'
      );
      setMetadata(null);
    } finally {
      setInspectingMeta(false);
    }
  };

  const handleConfirmLoad = async () => {
    if (!metadata || !selectedTabTitle) return;
    const tab = metadata.sheets.find((s) => s.title === selectedTabTitle);
    if (!tab) return;

    setLoadingSheet(true);
    setModalError(null);
    try {
      await onLoadTab(metadata.spreadsheetId, metadata.title, tab.title, tab.sheetId);
      onClose();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Unable to load the selected worksheet.'
      );
    } finally {
      setLoadingSheet(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheets-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-[#141418]">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="sheets-modal-title"
              className="font-display text-base font-semibold text-zinc-950 dark:text-white"
            >
              Connect Google Sheets Source
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Browse spreadsheets in Google Drive or paste a spreadsheet URL to select a worksheet tab.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets connector"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!accessToken ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <FileSpreadsheet
                className="h-8 w-8 text-[#F58220] dark:text-[#FFC800]"
                aria-hidden="true"
              />
              <h3 className="mt-3 font-display text-sm font-semibold text-zinc-950 dark:text-white">
                Sign in to access your Google Sheets & Drive
              </h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Authenticate with Google to read private spreadsheets, browse your Drive files, switch worksheet tabs, and export watchlist reports.
              </p>
              <div className="mt-5">
                <GoogleSignInButton
                  onClick={onSignIn}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Signing in…' : 'Sign in with Google'}
                />
              </div>
            </div>
          ) : (
            <>
              {modalError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#F58220]/50 bg-[#FFF7ED] px-3.5 py-2.5 text-xs text-zinc-900 dark:border-[#F58220]/40 dark:bg-[#23160B] dark:text-zinc-100"
                >
                  {modalError}
                </div>
              )}

              {/* Paste Spreadsheet URL or ID */}
              <div className="space-y-2">
                <label
                  htmlFor="sheet-url-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Google Sheets URL or Spreadsheet ID
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="sheet-url-input"
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="h-10 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-xs text-zinc-900 focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
                  />
                  <button
                    type="button"
                    onClick={() => handleInspectSpreadsheet(urlInput)}
                    disabled={inspectingMeta || !urlInput.trim()}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFC800] px-4 text-xs font-semibold text-[#111114] transition-colors hover:bg-[#e8b600] disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {inspectingMeta && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                    <span>Inspect Tabs</span>
                  </button>
                </div>
              </div>

              {/* Selected Spreadsheet Tab Picker */}
              {metadata && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                        {metadata.title}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {metadata.sheets.length} worksheet tab
                        {metadata.sheets.length === 1 ? '' : 's'} found
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Select Worksheet Tab
                      </span>
                      <select
                        value={selectedTabTitle}
                        onChange={(e) => setSelectedTabTitle(e.target.value)}
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
                      >
                        {metadata.sheets.map((tab) => (
                          <option key={tab.sheetId} value={tab.title}>
                            {tab.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={handleConfirmLoad}
                      disabled={loadingSheet || !selectedTabTitle}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-[#FFC800] dark:text-[#111114] dark:hover:bg-[#e8b600]"
                    >
                      {loadingSheet && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      )}
                      <span>Load Worksheet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Google Drive Spreadsheets Browser */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Recent Spreadsheets in Your Google Drive
                  </span>
                  <button
                    type="button"
                    onClick={() => loadDriveFiles(accessToken)}
                    disabled={loadingDrive}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${loadingDrive ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>Refresh Drive</span>
                  </button>
                </div>

                {loadingDrive ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-11 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
                      />
                    ))}
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-5 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    No spreadsheets returned from Google Drive. You can still paste any shared Google Sheets URL above.
                  </div>
                ) : (
                  <div className="max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {driveFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setUrlInput(file.id);
                          handleInspectSpreadsheet(file.id);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {file.name}
                          </div>
                          <div className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            {file.id}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[#B45309] shrink-0 dark:text-[#FFC800]">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
