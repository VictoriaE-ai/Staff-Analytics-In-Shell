import { Loader2, X } from 'lucide-react';

interface ConfirmSheetWriteModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  spreadsheetTitle: string;
  tabTitle: string;
  rowCount: number;
}

export function ConfirmSheetWriteModal({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting,
  spreadsheetTitle,
  tabTitle,
  rowCount,
}: ConfirmSheetWriteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-write-title"
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-[#141418]">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="confirm-write-title"
            className="font-display text-base font-semibold text-zinc-950 dark:text-white"
          >
            Create Google Sheet with Watchlist?
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close confirmation dialog"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          This action will create a new spreadsheet in your Google Drive and write the current Top-{rowCount} Flight-Risk Watchlist into it.
        </p>

        <dl className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Spreadsheet Title</dt>
            <dd className="text-right font-medium text-zinc-950 dark:text-zinc-100">
              {spreadsheetTitle}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Worksheet Tab</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">{tabTitle}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Rows to Write</dt>
            <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {rowCount} employee rows + header
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-[38px] rounded-lg border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#FFC800] px-4 py-1.5 text-xs font-semibold text-[#111114] transition-colors hover:bg-[#e8b600] disabled:opacity-60"
          >
            {isSubmitting && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            <span>{isSubmitting ? 'Creating Sheet…' : 'Confirm & Create Sheet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
