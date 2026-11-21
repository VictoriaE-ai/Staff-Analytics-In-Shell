import { useMemo, useState } from 'react';
import { ExternalLink, FileSpreadsheet } from 'lucide-react';
import {
  WorkspaceAuthExpiredError,
  createWatchlistSpreadsheet,
} from '../services/googleSheetsApi';
import { ScoredEmployee } from '../types/employee';
import {
  FLIGHT_RISK_RULES,
  HIGH_RISK_THRESHOLD,
  formatGbp,
  generateFindings,
  generateRecommendations,
} from '../utils/analytics';
import { ConfirmSheetWriteModal } from './ConfirmSheetWriteModal';
import { GoogleSignInButton } from './GoogleSignInButton';

interface InsightsTabProps {
  filtered: ScoredEmployee[];
  allEmployees: ScoredEmployee[];
  accessToken: string | null;
  isLoggingIn: boolean;
  onGoogleSignIn: () => Promise<void>;
  onAuthExpired: () => void;
}

export function InsightsTab({
  filtered,
  allEmployees,
  accessToken,
  isLoggingIn,
  onGoogleSignIn,
  onAuthExpired,
}: InsightsTabProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);

  const findings = useMemo(
    () => generateFindings(filtered, allEmployees),
    [filtered, allEmployees]
  );

  const watchlist = useMemo(() => {
    return filtered
      .filter((e) => e.attrition === 'No')
      .sort((a, b) => {
        if (b.flightRiskScore !== a.flightRiskScore) {
          return b.flightRiskScore - a.flightRiskScore;
        }
        return b.monthlyIncomeGbp - a.monthlyIncomeGbp;
      })
      .slice(0, 10);
  }, [filtered]);

  const recommendations = useMemo(
    () => generateRecommendations(filtered),
    [filtered]
  );

  const exportTitle = `Shell UK Flight-Risk Watchlist (${new Date().toISOString().slice(0, 10)})`;
  const exportTabTitle = 'Top 10 Watchlist';

  const handleConfirmExport = async () => {
    if (!accessToken || watchlist.length === 0) return;
    setIsExporting(true);
    setExportError(null);
    setExportedSheetUrl(null);

    try {
      const header = [
        'Rank',
        'EmployeeID',
        'Name',
        'JobTitle',
        'Department',
        'Location',
        'JobLevel',
        'EmploymentType',
        'YearsAtCompany',
        'MonthlyIncome_GBP',
        'LevelMedian_GBP',
        'FlightRiskScore',
        'RiskTier',
        'RiskDrivers',
      ];
      const rows = watchlist.map((emp, idx) => [
        idx + 1,
        emp.employeeId,
        emp.fullName,
        emp.jobTitle,
        emp.department,
        emp.location,
        emp.jobLevel,
        emp.employmentType,
        emp.yearsAtCompany,
        emp.monthlyIncomeGbp,
        Math.round(emp.levelMedianIncome),
        emp.flightRiskScore,
        emp.riskTier,
        emp.riskFactors.map((f) => `${f.label} (+${f.points})`).join('; '),
      ]);

      const result = await createWatchlistSpreadsheet(
        exportTitle,
        exportTabTitle,
        [header, ...rows],
        accessToken
      );
      setExportedSheetUrl(result.spreadsheetUrl);
      setConfirmOpen(false);
    } catch (err) {
      if (err instanceof WorkspaceAuthExpiredError) {
        onAuthExpired();
      }
      setExportError(
        err instanceof Error
          ? err.message
          : 'Failed to export watchlist to Google Sheets.'
      );
      setConfirmOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-[#141418] dark:text-zinc-400">
        No employee records match the active filters. Reset or broaden your filters to generate findings and the retention watchlist.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Auto-Generated Findings */}
      <section aria-labelledby="findings-heading" className="space-y-3.5">
        <div>
          <h2
            id="findings-heading"
            className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-white"
          >
            Auto-Generated Workforce Findings
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dynamically computed across the {filtered.length.toLocaleString('en-GB')} filtered Shell UK employees.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((finding) => {
            const metricTone =
              finding.severity === 'critical'
                ? 'text-[#D95B00] dark:text-[#F58220]'
                : finding.severity === 'elevated'
                  ? 'text-[#A16207] dark:text-[#FFC800]'
                  : 'text-zinc-950 dark:text-white';

            const severityLabel =
              finding.severity === 'critical'
                ? 'High Attention'
                : finding.severity === 'elevated'
                  ? 'Watch'
                  : 'Nominal';

            return (
              <article
                key={finding.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#141418]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{finding.category}</span>
                    <span>{severityLabel}</span>
                  </div>
                  <div
                    className={`mt-2.5 font-mono text-2xl font-semibold tracking-tight tabular-nums ${metricTone}`}
                  >
                    {finding.metricValue}
                  </div>
                  <h3 className="mt-2 font-display text-sm font-semibold leading-snug text-zinc-950 dark:text-zinc-100">
                    {finding.headline}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {finding.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. Top-10 Flight-Risk Watchlist + Transparent Scoring Rule */}
      <section aria-labelledby="watchlist-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="watchlist-heading"
              className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-white"
            >
              Top-10 Active Flight-Risk Watchlist
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Highest-scoring active employees using our transparent 100-point retention model (High Risk threshold: ≥{HIGH_RISK_THRESHOLD} pts).
            </p>
          </div>

          {watchlist.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {accessToken ? (
                <button
                  type="button"
                  onClick={() => {
                    setExportError(null);
                    setConfirmOpen(true);
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100 whitespace-nowrap shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#F58220] dark:text-[#FFC800]" aria-hidden="true" />
                  <span>Export Watchlist to Google Sheets</span>
                </button>
              ) : (
                <GoogleSignInButton
                  onClick={onGoogleSignIn}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Signing in…' : 'Sign in to Export to Sheets'}
                />
              )}
            </div>
          )}
        </div>

        {exportError && (
          <div
            role="alert"
            className="rounded-lg border border-[#F58220]/50 bg-[#FFF7ED] px-4 py-3 text-xs text-zinc-900 dark:border-[#F58220]/40 dark:bg-[#23160B] dark:text-zinc-100"
          >
            {exportError}
          </div>
        )}

        {exportedSheetUrl && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs dark:border-zinc-800 dark:bg-[#141418]">
            <span className="text-zinc-700 dark:text-zinc-200">
              Watchlist exported to a new Google Spreadsheet in your Drive.
            </span>
            <a
              href={exportedSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-[#B45309] hover:underline dark:text-[#FFC800]"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Watchlist Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white xl:col-span-8 dark:border-zinc-800 dark:bg-[#141418]">
            {watchlist.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No active employees appear in the current filter (Attrition is filtered to Attrited). Switch Attrition Status to &ldquo;All Statuses&rdquo; or &ldquo;Active&rdquo; to view the live watchlist.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Employee</th>
                      <th className="px-4 py-3 font-medium">Department · Site</th>
                      <th className="px-3 py-3 text-right font-medium">Pay vs. Lvl Med</th>
                      <th className="px-3 py-3 text-right font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Scoring Drivers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {watchlist.map((emp, idx) => {
                      const deltaPct =
                        emp.levelMedianIncome > 0
                          ? ((emp.monthlyIncomeGbp - emp.levelMedianIncome) /
                              emp.levelMedianIncome) *
                            100
                          : 0;

                      return (
                        <tr
                          key={emp.employeeId}
                          className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                        >
                          <td className="px-4 py-3 font-mono text-zinc-500 tabular-nums dark:text-zinc-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-950 dark:text-zinc-100">
                              {emp.fullName}{' '}
                              <span className="font-mono text-[11px] font-normal text-zinc-400">
                                {emp.employeeId}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {emp.jobTitle} · L{emp.jobLevel} · {emp.employmentType}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                            <div>{emp.department}</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {emp.location} · {emp.yearsAtCompany}y tenure
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            <div className="text-zinc-950 dark:text-zinc-100">
                              {formatGbp(emp.monthlyIncomeGbp)}
                            </div>
                            <div
                              className={`text-[11px] ${
                                deltaPct < -12
                                  ? 'text-[#D95B00] dark:text-[#F58220]'
                                  : 'text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {deltaPct >= 0 ? '+' : ''}
                              {deltaPct.toFixed(0)}% vs L{emp.jobLevel}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            <span
                              className={
                                emp.riskTier === 'High'
                                  ? 'font-semibold text-[#D95B00] dark:text-[#F58220]'
                                  : emp.riskTier === 'Elevated'
                                    ? 'font-semibold text-[#A16207] dark:text-[#FFC800]'
                                    : 'text-zinc-600 dark:text-zinc-400'
                              }
                            >
                              {emp.flightRiskScore}/100
                            </span>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {emp.riskTier}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                            {emp.riskFactors.length === 0 ? (
                              <span className="text-zinc-400">No risk triggers</span>
                            ) : (
                              <span>
                                {emp.riskFactors
                                  .map((f) => `${f.label} (+${f.points})`)
                                  .join(' · ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transparent Scoring Rule Specification */}
          <aside className="rounded-xl border border-zinc-200 bg-white p-5 xl:col-span-4 dark:border-zinc-800 dark:bg-[#141418]">
            <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Transparent Scoring Rule
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Each active employee receives an additive score capped at 100 points. Scores ≥50 classify as High Risk; 30–49 classify as Elevated.
            </p>

            <dl className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {FLIGHT_RISK_RULES.map((item) => (
                <div key={item.criterion} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.criterion}
                    </dt>
                    <dd className="font-mono text-xs font-medium text-[#B45309] tabular-nums shrink-0 dark:text-[#FFC800]">
                      up to +{item.maxPoints} pts
                    </dd>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {item.rule}
                  </p>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* 3. Recommended HR Actions */}
      <section aria-labelledby="actions-heading" className="space-y-3.5">
        <div>
          <h2
            id="actions-heading"
            className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-white"
          >
            Recommended Retention Actions
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Targeted HR interventions calibrated to the risk profile of the selected workforce.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {recommendations.map((action) => {
            const priorityTone =
              action.priority === 'Immediate'
                ? 'text-[#D95B00] dark:text-[#F58220]'
                : action.priority === 'Near-Term'
                  ? 'text-[#A16207] dark:text-[#FFC800]'
                  : 'text-zinc-700 dark:text-zinc-300';

            return (
              <article
                key={action.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#141418]"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${priorityTone}`}>
                      {action.priority} Priority
                    </span>
                    <span className="font-mono text-zinc-500 tabular-nums dark:text-zinc-400">
                      {action.impactEstimate}
                    </span>
                  </div>

                  <h3 className="mt-2 font-display text-base font-semibold text-zinc-950 dark:text-zinc-100">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Target: {action.targetGroup}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {action.rationale}
                  </p>
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
                  <span className="font-semibold">Next step: </span>
                  <span>{action.actionStep}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ConfirmSheetWriteModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmExport}
        isSubmitting={isExporting}
        spreadsheetTitle={exportTitle}
        tabTitle={exportTabTitle}
        rowCount={watchlist.length}
      />
    </div>
  );
}
