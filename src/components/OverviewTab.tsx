import { useMemo } from 'react';
import { ChartConfiguration } from 'chart.js';
import { ScoredEmployee } from '../types/employee';
import {
  computeOverviewKpis,
  formatGbp,
  getHiringTrend,
  groupByCategory,
} from '../utils/analytics';
import { ChartCard, getChartThemeTokens } from './ChartCard';
import { KpiStrip } from './KpiStrip';

interface OverviewTabProps {
  filtered: ScoredEmployee[];
  totalCount: number;
  isDark: boolean;
}

export function OverviewTab({ filtered, totalCount, isDark }: OverviewTabProps) {
  const kpis = useMemo(
    () => computeOverviewKpis(filtered, totalCount),
    [filtered, totalCount]
  );

  const tokens = useMemo(() => getChartThemeTokens(isDark), [isDark]);
  const isEmpty = filtered.length === 0;

  // 1. Department Horizontal Stacked Bar
  const deptConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const groups = groupByCategory(filtered, (e) => e.department);
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            label: 'Active',
            data: groups.map((g) => g.active),
            backgroundColor: tokens.shellYellow,
            borderRadius: 3,
          },
          {
            label: 'Attrited',
            data: groups.map((g) => g.attrited),
            backgroundColor: tokens.shellOrange,
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: 'y',
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
            borderColor: tokens.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined || !groups[idx]) return '';
                const g = groups[idx];
                return `Attrition: ${g.attritionRate.toFixed(1)}% · Avg Pay: ${formatGbp(g.avgIncome)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: tokens.textPrimary, font: { size: 11 } },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 2. Location Vertical Stacked Bar
  const locationConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const groups = groupByCategory(filtered, (e) => e.location);
    return {
      type: 'bar',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            label: 'Active',
            data: groups.map((g) => g.active),
            backgroundColor: tokens.shellBlack,
            borderRadius: 4,
          },
          {
            label: 'Attrited',
            data: groups.map((g) => g.attrited),
            backgroundColor: tokens.shellOrange,
            borderRadius: 4,
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
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined || !groups[idx]) return '';
                return `Attrition Rate: ${groups[idx].attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: tokens.textPrimary, font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
        },
      },
    };
  }, [filtered, tokens]);

  // 3. Gender Doughnut
  const genderConfig = useMemo<ChartConfiguration<'doughnut'>>(() => {
    const groups = groupByCategory(filtered, (e) => e.gender);
    const palette = [tokens.shellYellow, tokens.shellBlack, tokens.shellOrange];
    return {
      type: 'doughnut',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            data: groups.map((g) => g.total),
            backgroundColor: groups.map((_, idx) => palette[idx % palette.length]),
            borderColor: isDark ? '#141418' : '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, boxHeight: 12, padding: 16, color: tokens.textPrimary },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
            callbacks: {
              label: (ctx) => {
                const g = groups[ctx.dataIndex];
                const share = filtered.length > 0 ? ((g.total / filtered.length) * 100).toFixed(1) : '0.0';
                return ` ${g.label}: ${g.total} (${share}%) · Attrition ${g.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [filtered, isDark, tokens]);

  // 4. Employment Type Doughnut
  const empTypeConfig = useMemo<ChartConfiguration<'doughnut'>>(() => {
    const groups = groupByCategory(filtered, (e) => e.employmentType, [
      'Full-Time',
      'Part-Time',
      'Contract',
    ]);
    const colorMap: Record<string, string> = {
      'Full-Time': tokens.shellBlack,
      'Part-Time': tokens.shellYellow,
      Contract: tokens.shellOrange,
    };
    return {
      type: 'doughnut',
      data: {
        labels: groups.map((g) => g.label),
        datasets: [
          {
            data: groups.map((g) => g.total),
            backgroundColor: groups.map(
              (g) => colorMap[g.label] ?? tokens.shellCharcoal
            ),
            borderColor: isDark ? '#141418' : '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, boxHeight: 12, padding: 16, color: tokens.textPrimary },
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            titleColor: tokens.tooltipText,
            bodyColor: tokens.tooltipText,
            callbacks: {
              label: (ctx) => {
                const g = groups[ctx.dataIndex];
                const share = filtered.length > 0 ? ((g.total / filtered.length) * 100).toFixed(1) : '0.0';
                return ` ${g.label}: ${g.total} (${share}%) · Attrition ${g.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [filtered, isDark, tokens]);

  // 5. Hiring Trend Line Chart
  const hiringTrendConfig = useMemo<ChartConfiguration<'line'>>(() => {
    const trend = getHiringTrend(filtered);
    return {
      type: 'line',
      data: {
        labels: trend.map((t) => t.year),
        datasets: [
          {
            label: 'Total Hires',
            data: trend.map((t) => t.total),
            borderColor: tokens.shellOrange,
            backgroundColor: isDark
              ? 'rgba(245, 130, 32, 0.16)'
              : 'rgba(245, 130, 32, 0.12)',
            fill: true,
            tension: 0.28,
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: tokens.shellOrange,
            borderWidth: 2.2,
          },
          {
            label: 'Still Active',
            data: trend.map((t) => t.active),
            borderColor: tokens.shellYellow,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.28,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: tokens.shellYellow,
            borderWidth: 2,
            borderDash: [4, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
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
            ticks: { color: tokens.textMuted, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.gridColor },
            ticks: { color: tokens.textMuted, precision: 0 },
          },
        },
      },
    };
  }, [filtered, isDark, tokens]);

  return (
    <div className="space-y-6">
      <KpiStrip metrics={kpis} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active vs. attrited employees across Shell UK business functions"
          config={deptConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-80"
        />

        <ChartCard
          title="Workforce by UK Location"
          subtitle="Site distribution showing active headcount and historical leavers"
          config={locationConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-80"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
        <ChartCard
          title="Gender Mix"
          subtitle="Workforce composition by gender"
          config={genderConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          className="lg:col-span-3"
        />

        <ChartCard
          title="Employment Type"
          subtitle="Permanent vs. flexible contracts"
          config={empTypeConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          className="lg:col-span-3"
        />

        <ChartCard
          title="Hiring Trend by Year"
          subtitle="Annual intake volume and retained cohort from hire dates"
          config={hiringTrendConfig}
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          className="md:col-span-2 lg:col-span-6"
        />
      </div>
    </div>
  );
}
