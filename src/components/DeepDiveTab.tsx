import { useMemo, useState } from 'react';
import { ChartConfiguration } from 'chart.js';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { ScoredEmployee } from '../types/employee';
import {
  computeDeepDiveKpis,
  formatGbp,
  formatTravelLabel,
  getAgeBand,
  getTenureBand,
  groupByCategory,
} from '../utils/analytics';
import { ChartCard, getChartThemeTokens } from './ChartCard';
import { KpiStrip } from './KpiStrip';

interface DeepDiveTabProps {
  filtered: ScoredEmployee[];
  isDark: boolean;
}

type SortKey =
  | 'employeeId'
  | 'fullName'
  | 'department'
  | 'location'
  | 'jobLevel'
  | 'employmentType'
  | 'yearsAtCompany'
  | 'yearsSinceLastPromotion'
  | 'monthlyIncomeGbp'
  | 'flightRiskScore'
  | 'attrition';

const PAGE_SIZE = 15;

export function DeepDiveTab({ filtered, isDark }: DeepDiveTabProps) {
  const kpis = useMemo(() => computeDeepDiveKpis(filtered), [filtered]);
  const tokens = useMemo(() => getChartThemeTokens(isDark), [isDark]);
  const isEmpty = filtered.length === 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('flightRiskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // 1. Age Bands + Attrition
  const ageBandConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const groups = groupByCategory(
      filtered,
      (e) => getAgeBand(e.age),
      ['<25', '25–34', '35–44', '45–54', '55+']
    );
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: groups.map((g) => Number(g.attritionRate.toFixed(1))),
            borderColor: tokens.shellBlack,
            backgroundColor: tokens.shellBlack,
            yAxisID: 'y1',
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 4,
            order: 0,
          },
          {
            type: 'bar',
            label: 'Active',
            data: groups.map((g) => g.active),
            backgroundColor: tokens.shellYellow,
            borderRadius: 3,
            stack: 'headcount',
            yAxisID: 'y',
            order: 1,
          },
          {
            type: 'bar',
            label: 'Attrited',
            data: groups.map((g) => g.attrited),
            backgroundColor: tokens.shellOrange,
            borderRadius: 3,
            stack: 'headcount',
            yAxisID: 'y',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 12, color: tokens.textMuted },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: tokens.textPrimary },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 2. Tenure Bands + Attrition
  const tenureBandConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const groups = groupByCategory(
      filtered,
      (e) => getTenureBand(e.yearsAtCompany),
      ['0–2 yrs', '3–5 yrs', '6–10 yrs', '11–20 yrs', '21+ yrs']
    );
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: groups.map((g) => Number(g.attritionRate.toFixed(1))),
            borderColor: tokens.shellBlack,
            backgroundColor: tokens.shellBlack,
            yAxisID: 'y1',
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 4,
            order: 0,
          },
          {
            type: 'bar',
            label: 'Active',
            data: groups.map((g) => g.active),
            backgroundColor: tokens.shellYellow,
            borderRadius: 3,
            stack: 'headcount',
            yAxisID: 'y',
            order: 1,
          },
          {
            type: 'bar',
            label: 'Attrited',
            data: groups.map((g) => g.attrited),
            backgroundColor: tokens.shellOrange,
            borderRadius: 3,
            stack: 'headcount',
            yAxisID: 'y',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 12, color: tokens.textMuted },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: tokens.textPrimary },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 3a. Average Monthly Income by Job Level
  const incomeByLevelConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const groups = groupByCategory(
      filtered,
      (e) => `Level ${e.jobLevel}`,
      ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
    );
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            label: 'Avg Monthly Income (GBP)',
            data: groups.map((g) => Math.round(g.avgIncome)),
            backgroundColor: tokens.shellYellow,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
            callbacks: {
              label: (ctx) => {
                const g = groups[ctx.dataIndex];
                return ` Avg: ${formatGbp(g.avgIncome)} / mo (${g.total} staff)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tokens.textPrimary },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 3b. Average Monthly Income by Department
  const incomeByDeptConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const groups = groupByCategory(filtered, (e) => e.department).sort(
      (a, b) => b.avgIncome - a.avgIncome
    );
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            label: 'Avg Monthly Income (GBP)',
            data: groups.map((g) => Math.round(g.avgIncome)),
            backgroundColor: tokens.shellOrange,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
            callbacks: {
              label: (ctx) => {
                const g = groups[ctx.dataIndex];
                return ` Avg: ${formatGbp(g.avgIncome)} / mo (${g.total} staff)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: tokens.textPrimary, font: { size: 11 } },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 4. Education Breakdown
  const educationConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const groups = groupByCategory(
      filtered,
      (e) => e.education,
      ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate']
    );
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: groups.map((g) => Number(g.attritionRate.toFixed(1))),
            borderColor: tokens.shellBlack,
            backgroundColor: tokens.shellBlack,
            yAxisID: 'y1',
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 4,
            order: 0,
          },
          {
            type: 'bar',
            label: 'Headcount',
            data: groups.map((g) => g.total),
            backgroundColor: tokens.shellYellow,
            borderRadius: 4,
            yAxisID: 'y',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 12, color: tokens.textMuted },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tokens.textPrimary, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 5. Business Travel Breakdown
  const travelConfig = useMemo<ChartConfiguration<'bar' | 'line'>>(() => {
    const groups = groupByCategory(
      filtered,
      (e) => formatTravelLabel(e.businessTravel),
      ['Non-Travel', 'Rare Travel', 'Frequent Travel']
    );
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: groups.map((g) => Number(g.attritionRate.toFixed(1))),
            borderColor: tokens.shellBlack,
            backgroundColor: tokens.shellBlack,
            yAxisID: 'y1',
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 4,
            order: 0,
          },
          {
            type: 'bar',
            label: 'Headcount',
            data: groups.map((g) => g.total),
            backgroundColor: tokens.shellOrange,
            borderRadius: 4,
            yAxisID: 'y',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 12, color: tokens.textMuted },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tokens.textPrimary },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 6. Income vs Tenure Scatter
  const scatterConfig = useMemo<ChartConfiguration<'scatter'>>(() => {
    const activePoints = filtered
      .filter((e) => e.attrition === 'No')
      .map((e) => ({ x: e.yearsAtCompany, y: e.monthlyIncomeGbp, emp: e }));
    const attritedPoints = filtered
      .filter((e) => e.attrition === 'Yes')
      .map((e) => ({ x: e.yearsAtCompany, y: e.monthlyIncomeGbp, emp: e }));

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Active',
            data: activePoints,
            backgroundColor: isDark
              ? 'rgba(255, 200, 0, 0.72)'
              : 'rgba(255, 200, 0, 0.85)',
            borderColor: isDark ? '#FFC800' : '#18181B',
            borderWidth: 1,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
          },
          {
            label: 'Attrited',
            data: attritedPoints,
            backgroundColor: 'rgba(245, 130, 32, 0.85)',
            borderColor: '#9A3412',
            borderWidth: 1,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 12, color: tokens.textMuted },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
            callbacks: {
              title: (items) => {
                const raw = items[0]?.raw as { emp?: ScoredEmployee } | undefined;
                return raw?.emp ? `${raw.emp.fullName} (${raw.emp.employeeId})` : '';
              },
              label: (ctx) => {
                const raw = ctx.raw as { emp?: ScoredEmployee };
                const emp = raw?.emp;
                if (!emp) return '';
                return [
                  `${emp.department} · Level ${emp.jobLevel}`,
                  `Tenure: ${emp.yearsAtCompany} yrs · Pay: ${formatGbp(emp.monthlyIncomeGbp)}/mo`,
                  `Status: ${emp.attrition === 'Yes' ? 'Attrited' : 'Active'} · Risk Score: ${emp.flightRiskScore}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Years at Company', color: tokens.textMuted },
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted },
          },
          y: {
            title: { display: true, text: 'Monthly Income (GBP)', color: tokens.textMuted },
            grid: { color: tokens.gridColor },
            ticks: {
              color: tokens.textMuted,
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
      },
    };
  }, [filtered, isDark, tokens]);

  // Searchable & Sortable Table Data
  const searchedAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? filtered.filter(
          (e) =>
            e.employeeId.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q)
        )
      : [...filtered];

    list.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [filtered, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(searchedAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = searchedAndSorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'fullName' || key === 'department' || key === 'location' || key === 'employeeId'
          ? 'asc'
          : 'desc'
      );
    }
    setPage(1);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#F58220] dark:text-[#FFC800]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#F58220] dark:text-[#FFC800]" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-6">
      <KpiStrip metrics={kpis} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Headcount split and attrition percentage across age brackets"
          config={ageBandConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
        />
        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Retention profile by years at Shell UK"
          config={tenureBandConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Average Monthly Income by Job Level"
          subtitle="Pay progression from Level 1 to Level 5 (GBP/month)"
          config={incomeByLevelConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
        />
        <ChartCard
          title="Average Monthly Income by Department"
          subtitle="Mean base monthly pay across UK functions (GBP/month)"
          config={incomeByDeptConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Education Level & Attrition"
          subtitle="Workforce headcount and attrition % by highest qualification"
          config={educationConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
        />
        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Travel intensity versus turnover rate"
          config={travelConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
        />
      </div>

      <ChartCard
        title="Monthly Income vs. Tenure"
        subtitle="Individual employee distribution (GBP/month vs. Years at Company) highlighting attrited staff"
        config={scatterConfig}
        isDark={isDark}
        isEmpty={isEmpty}
        heightClass="h-80"
      />

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#141418]">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-zinc-800">
          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Employee Directory & Risk Register
            </h3>
            <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {searchedAndSorted.length.toLocaleString('en-GB')} matching record
              {searchedAndSorted.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, name, role, dept, site…"
              aria-label="Search employees"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#FFC800]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('employeeId')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>ID</span>
                    {renderSortIcon('employeeId')}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('fullName')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Employee</span>
                    {renderSortIcon('fullName')}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('department')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Department</span>
                    {renderSortIcon('department')}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('location')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Location</span>
                    {renderSortIcon('location')}
                  </button>
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('jobLevel')}
                    className="inline-flex items-center justify-end gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Lvl</span>
                    {renderSortIcon('jobLevel')}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('employmentType')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Type</span>
                    {renderSortIcon('employmentType')}
                  </button>
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('yearsAtCompany')}
                    className="inline-flex items-center justify-end gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Tenure</span>
                    {renderSortIcon('yearsAtCompany')}
                  </button>
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('yearsSinceLastPromotion')}
                    className="inline-flex items-center justify-end gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Promo Gap</span>
                    {renderSortIcon('yearsSinceLastPromotion')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('monthlyIncomeGbp')}
                    className="inline-flex items-center justify-end gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Monthly Pay</span>
                    {renderSortIcon('monthlyIncomeGbp')}
                  </button>
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('flightRiskScore')}
                    className="inline-flex items-center justify-end gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Risk Score</span>
                    {renderSortIcon('flightRiskScore')}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('attrition')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white"
                  >
                    <span>Status</span>
                    {renderSortIcon('attrition')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    No employees match the current filters and search query.
                  </td>
                </tr>
              ) : (
                pageRows.map((emp) => (
                  <tr
                    key={emp.employeeId}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-2.5 font-mono text-zinc-500 tabular-nums dark:text-zinc-400">
                      {emp.employeeId}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-zinc-950 dark:text-zinc-100">
                        {emp.fullName}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {emp.jobTitle}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                      {emp.department}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                      {emp.location}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                      L{emp.jobLevel}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                      {emp.employmentType}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                      {emp.yearsAtCompany}y
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                      {emp.yearsSinceLastPromotion}y
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-950 dark:text-zinc-100">
                      {formatGbp(emp.monthlyIncomeGbp)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      <span
                        className={
                          emp.riskTier === 'High'
                            ? 'font-semibold text-[#D95B00] dark:text-[#F58220]'
                            : emp.riskTier === 'Elevated'
                              ? 'font-medium text-[#A16207] dark:text-[#FFC800]'
                              : 'text-zinc-500 dark:text-zinc-400'
                        }
                      >
                        {emp.flightRiskScore} · {emp.riskTier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          emp.attrition === 'Yes'
                            ? 'font-medium text-[#D95B00] dark:text-[#F58220]'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }
                      >
                        {emp.attrition === 'Yes' ? 'Attrited' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {searchedAndSorted.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 sm:px-5 dark:border-zinc-800 dark:text-zinc-400">
            <span className="tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[34px] rounded-lg border border-zinc-200 bg-white px-3 py-1 font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[34px] rounded-lg border border-zinc-200 bg-white px-3 py-1 font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
