import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AlertTriangle, RefreshCw, Upload, X } from 'lucide-react';
import { DeepDiveTab } from './components/DeepDiveTab';
import { FilterBar } from './components/FilterBar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { Header } from './components/Header';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import {
  clearCachedAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  WorkspaceAuthExpiredError,
  fetchSpreadsheetTabEmployees,
} from './services/googleSheetsApi';
import {
  DashboardTab,
  DataSourceInfo,
  Employee,
  FilterState,
} from './types/employee';
import {
  computeLevelMedians,
  filterEmployees,
  getFilterOptions,
  scoreEmployees,
} from './utils/analytics';
import {
  GOOGLE_SHEET_GID,
  GOOGLE_SHEET_ID,
  fetchGoogleSheetEmployees,
  parseEmployeeCsv,
} from './utils/csvParser';

const INITIAL_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

const THEME_STORAGE_KEY = 'shell-people-analytics-theme';

interface ActiveSheetTarget {
  spreadsheetId: string;
  gid?: string;
  sheetTitle?: string;
  spreadsheetTitle?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workforce data">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[104px] animate-pulse rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#141418]"
          >
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-7 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2.5 h-3 w-32 rounded bg-zinc-100 dark:bg-zinc-800/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[388px] animate-pulse rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#141418]"
          >
            <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-64 rounded bg-zinc-100 dark:bg-zinc-800/60" />
            <div className="mt-6 h-72 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);

  const [activeSheet, setActiveSheet] = useState<ActiveSheetTarget>({
    spreadsheetId: GOOGLE_SHEET_ID,
    gid: GOOGLE_SHEET_GID,
  });

  // Google Workspace OAuth state (access token held in memory only)
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState<boolean>(false);

  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync <html> .dark class
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage restrictions
    }
  }, [isDark]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
      },
      (maybeUser) => {
        setUser(maybeUser);
        setAccessToken(null);
      }
    );
    return unsubscribe;
  }, []);

  const syncFromGoogleSheet = useCallback(
    async (
      target: ActiveSheetTarget = activeSheet,
      tokenOverride?: string | null,
      signal?: AbortSignal
    ) => {
      setIsSyncing(true);
      setErrorMessage(null);

      const token =
        tokenOverride !== undefined ? tokenOverride : getAccessToken();

      try {
        if (token) {
          const result = await fetchSpreadsheetTabEmployees(
            target.spreadsheetId,
            token,
            target.gid,
            target.sheetTitle
          );
          setEmployees(result.employees);
          setActiveSheet({
            spreadsheetId: target.spreadsheetId,
            gid: String(result.sheetId),
            sheetTitle: result.sheetTitle,
            spreadsheetTitle: result.spreadsheetTitle,
          });
          setDataSource({
            type: 'sheet',
            label: `Google Sheets API (${result.spreadsheetTitle} · ${result.sheetTitle})`,
            lastSynced: new Date(),
            recordCount: result.employees.length,
          });
        } else {
          const parsed = await fetchGoogleSheetEmployees(
            target.spreadsheetId,
            target.gid ?? GOOGLE_SHEET_GID,
            signal
          );
          setEmployees(parsed);
          setDataSource({
            type: 'sheet',
            label: 'Google Sheets (Public CSV)',
            lastSynced: new Date(),
            recordCount: parsed.length,
          });
        }
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof WorkspaceAuthExpiredError) {
          clearCachedAccessToken();
          setAccessToken(null);
        }
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to read the Google Sheet. Please retry, sign in with Google, or upload a CSV file.';
        setErrorMessage(msg);
      } finally {
        if (!signal?.aborted) {
          setIsSyncing(false);
        }
      }
    },
    [activeSheet]
  );

  useEffect(() => {
    const controller = new AbortController();
    syncFromGoogleSheet(
      { spreadsheetId: GOOGLE_SHEET_ID, gid: GOOGLE_SHEET_GID },
      null,
      controller.signal
    );
    return () => controller.abort();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setAccessToken(result.accessToken);
      await syncFromGoogleSheet(activeSheet, result.accessToken);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoggingIn(false);
    }
  }, [activeSheet, syncFromGoogleSheet]);

  const handleGoogleSignOut = useCallback(async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  }, []);

  const handleAuthExpired = useCallback(() => {
    clearCachedAccessToken();
    setAccessToken(null);
  }, []);

  const handleLoadSelectedTab = useCallback(
    async (
      spreadsheetId: string,
      spreadsheetTitle: string,
      sheetTitle: string,
      sheetId: number
    ) => {
      const nextTarget: ActiveSheetTarget = {
        spreadsheetId,
        spreadsheetTitle,
        sheetTitle,
        gid: String(sheetId),
      };
      setFilters(INITIAL_FILTERS);
      await syncFromGoogleSheet(nextTarget);
    },
    [syncFromGoogleSheet]
  );

  const handleUploadCsv = useCallback(async (file: File) => {
    setErrorMessage(null);
    try {
      const text = await file.text();
      const parsed = parseEmployeeCsv(text);
      setEmployees(parsed);
      setDataSource({
        type: 'csv',
        label: `CSV Upload (${file.name})`,
        lastSynced: new Date(),
        recordCount: parsed.length,
      });
      setFilters(INITIAL_FILTERS);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not parse the uploaded CSV file.';
      setErrorMessage(msg);
    }
  }, []);

  const handleFallbackFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadCsv(file);
    }
    event.target.value = '';
  };

  const scoredEmployees = useMemo(() => {
    const medians = computeLevelMedians(employees);
    return scoreEmployees(employees, medians);
  }, [employees]);

  const filterOptions = useMemo(() => getFilterOptions(employees), [employees]);

  const filteredEmployees = useMemo(
    () => filterEmployees(scoredEmployees, filters),
    [scoredEmployees, filters]
  );

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${activeSheet.spreadsheetId}/edit${
    activeSheet.gid ? `?gid=${activeSheet.gid}#gid=${activeSheet.gid}` : ''
  }`;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-[#0B0B0D] dark:text-zinc-100">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        isSyncing={isSyncing}
        onSyncSheet={() => syncFromGoogleSheet()}
        onUploadCsv={handleUploadCsv}
        onOpenSheetsModal={() => setSheetsModalOpen(true)}
        user={user}
        hasWorkspaceToken={Boolean(accessToken)}
        isLoggingIn={isLoggingIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
      />

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-[#F58220]/50 bg-[#FFF7ED] p-4 text-zinc-900 sm:flex-row sm:items-center sm:justify-between dark:border-[#F58220]/40 dark:bg-[#23160B] dark:text-zinc-100"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-[#D95B00] dark:text-[#F58220]"
                aria-hidden="true"
              />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-zinc-950 dark:text-white">
                  Data Sync Notice
                </p>
                <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={fallbackFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFallbackFileInput}
                className="hidden"
                aria-label="Fallback CSV upload"
              />
              {!accessToken && (
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Signing in…' : 'Sign in with Google'}
                />
              )}
              <button
                type="button"
                onClick={() => syncFromGoogleSheet()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#FFC800] px-3 py-1.5 text-xs font-semibold text-[#111114] transition-colors hover:bg-[#e8b600]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry Sync</span>
              </button>
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload CSV</span>
              </button>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="Dismiss error message"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Shared Filters above the 3 tabs */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(INITIAL_FILTERS)}
          options={filterOptions}
          filteredCount={filteredEmployees.length}
          totalCount={employees.length}
          dataSource={dataSource}
        />

        {/* Active Tab Viewport */}
        {isSyncing && employees.length === 0 ? (
          <LoadingSkeleton />
        ) : employees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-[#141418]">
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              No Workforce Data Loaded
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Sign in with Google to read private spreadsheets from your Drive, sync the Shell UK sheet, or upload a local CSV export.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {!accessToken && (
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Signing in…' : 'Sign in with Google'}
                />
              )}
              <button
                type="button"
                onClick={() => syncFromGoogleSheet()}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111114] transition-colors hover:bg-[#e8b600]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sync Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewTab
            filtered={filteredEmployees}
            totalCount={employees.length}
            isDark={isDark}
          />
        ) : activeTab === 'deep-dive' ? (
          <DeepDiveTab filtered={filteredEmployees} isDark={isDark} />
        ) : (
          <InsightsTab
            filtered={filteredEmployees}
            allEmployees={scoredEmployees}
            accessToken={accessToken}
            isLoggingIn={isLoggingIn}
            onGoogleSignIn={handleGoogleSignIn}
            onAuthExpired={handleAuthExpired}
          />
        )}
      </main>

      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        accessToken={accessToken}
        currentSpreadsheetId={activeSheet.spreadsheetId}
        onSignIn={handleGoogleSignIn}
        isLoggingIn={isLoggingIn}
        onLoadTab={handleLoadSelectedTab}
        onAuthExpired={handleAuthExpired}
      />

      <footer className="mt-8 border-t border-zinc-200 bg-white py-5 dark:border-zinc-800 dark:bg-[#111114]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 text-xs text-zinc-500 sm:px-6 lg:px-8 dark:text-zinc-400">
          <span>Shell People Analytics · UK Workforce & Retention</span>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:decoration-zinc-700 dark:hover:text-white"
          >
            Source Google Sheet
          </a>
        </div>
      </footer>
    </div>
  );
}
