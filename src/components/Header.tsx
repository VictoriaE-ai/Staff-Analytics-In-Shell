import { useRef } from 'react';
import { User } from 'firebase/auth';
import { FileSpreadsheet, LogOut, Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import { DashboardTab } from '../types/employee';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HeaderProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSyncing: boolean;
  onSyncSheet: () => void;
  onUploadCsv: (file: File) => void;
  onOpenSheetsModal: () => void;
  user: User | null;
  hasWorkspaceToken: boolean;
  isLoggingIn: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'deep-dive', label: 'Deep Dive' },
  { id: 'insights', label: 'Insights' },
];

export function Header({
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
  isSyncing,
  onSyncSheet,
  onUploadCsv,
  onOpenSheetsModal,
  user,
  hasWorkspaceToken,
  isLoggingIn,
  onGoogleSignIn,
  onGoogleSignOut,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadCsv(file);
    }
    event.target.value = '';
  };

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#111114]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <svg
            width="28"
            height="26"
            viewBox="0 0 28 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M14 2L25.5 11.5L21 22.5H7L2.5 11.5L14 2Z"
              fill="#FFC800"
              stroke="#F58220"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V22.5M14 22.5L8 10.5M14 22.5L20 10.5"
              stroke="#111114"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-base font-bold tracking-tight text-zinc-950 whitespace-nowrap dark:text-white">
            Shell People Analytics
          </span>
        </div>

        {/* Zone 2: Primary Navigation Tabs */}
        <nav
          aria-label="Dashboard sections"
          className="order-3 flex w-full items-center gap-6 border-t border-zinc-100 pt-2.5 xl:order-2 xl:w-auto xl:border-t-0 xl:pt-0 dark:border-zinc-800/80"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative pb-1.5 pt-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFC800] ${
                  isActive
                    ? 'text-zinc-950 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full bg-[#F58220] dark:bg-[#FFC800]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Workspace Auth, Sheet Controls & Theme Toggle */}
        <div className="order-2 flex flex-wrap items-center gap-2 shrink-0 xl:order-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload employee CSV file"
          />

          <button
            type="button"
            onClick={onOpenSheetsModal}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC800] whitespace-nowrap shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#F58220] dark:text-[#FFC800]" aria-hidden="true" />
            <span>Browse Sheets</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC800] whitespace-nowrap shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload CSV</span>
          </button>

          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#FFC800] px-3.5 py-1.5 text-xs font-semibold text-[#111114] transition-colors hover:bg-[#e8b600] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Syncing…' : 'Sync Sheet'}</span>
          </button>

          {hasWorkspaceToken && user ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden max-w-[140px] truncate text-xs text-zinc-600 sm:inline dark:text-zinc-300">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={onGoogleSignOut}
                title="Sign out of Google"
                aria-label="Sign out of Google"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 whitespace-nowrap shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={onGoogleSignIn}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Signing in…' : 'Sign in with Google'}
            />
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC800] shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-[#FFC800]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-800" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
