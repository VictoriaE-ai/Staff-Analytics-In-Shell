import { useEffect, useRef } from 'react';
import {
  Chart,
  ChartConfiguration,
  ChartType,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

interface ChartCardProps<TType extends ChartType = ChartType> {
  title: string;
  subtitle?: string;
  config: ChartConfiguration<TType>;
  isDark: boolean;
  isEmpty?: boolean;
  heightClass?: string;
  className?: string;
}

export function getChartThemeTokens(isDark: boolean) {
  return {
    textPrimary: isDark ? '#F4F4F5' : '#111114',
    textMuted: isDark ? '#A1A1AA' : '#52525B',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(17, 17, 20, 0.07)',
    tooltipBg: isDark ? '#18181B' : '#111114',
    tooltipBorder: isDark ? '#3F3F46' : '#27272A',
    tooltipText: '#FFFFFF',
    // Shell palette
    shellYellow: '#FFC800',
    shellOrange: '#F58220',
    shellBlack: isDark ? '#E4E4E7' : '#18181B',
    shellCharcoal: isDark ? '#71717A' : '#52525B',
    shellMutedBar: isDark ? '#3F3F46' : '#D4D4D8',
  };
}

export function ChartCard<TType extends ChartType = ChartType>({
  title,
  subtitle,
  config,
  isDark,
  isEmpty = false,
  heightClass = 'h-72',
  className = '',
}: ChartCardProps<TType>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart<TType> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const tokens = getChartThemeTokens(isDark);
    Chart.defaults.font.family = '"DM Sans", ui-sans-serif, system-ui, sans-serif';
    Chart.defaults.color = tokens.textMuted;

    chartInstanceRef.current = new Chart(canvas, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config, isDark, isEmpty]);

  return (
    <section
      className={`flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-colors dark:border-zinc-800 dark:bg-[#141418] ${className}`}
    >
      <div className="mb-4 flex flex-col gap-0.5">
        <h3 className="font-display text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>

      {isEmpty ? (
        <div
          className={`flex ${heightClass} items-center justify-center rounded-lg border border-dashed border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400`}
        >
          No employee records match the current filters.
        </div>
      ) : (
        <div className={`relative w-full ${heightClass}`}>
          <canvas ref={canvasRef} aria-label={title} role="img" />
        </div>
      )}
    </section>
  );
}
