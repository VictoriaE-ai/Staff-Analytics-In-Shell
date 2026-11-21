import { KpiMetric } from '../types/employee';

interface KpiStripProps {
  metrics: KpiMetric[];
}

export function KpiStrip({ metrics }: KpiStripProps) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const valueColor =
          metric.tone === 'danger'
            ? 'text-[#D95B00] dark:text-[#F58220]'
            : metric.tone === 'warning'
              ? 'text-[#A16207] dark:text-[#FFC800]'
              : 'text-zinc-950 dark:text-white';

        return (
          <div
            key={metric.id}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-[#141418]"
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {metric.label}
            </span>
            <div
              className={`mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums ${valueColor}`}
            >
              {metric.value}
            </div>
            <span className="mt-1.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {metric.subtext}
            </span>
          </div>
        );
      })}
    </div>
  );
}
