import { RotateCcw } from 'lucide-react';
import { DataSourceInfo, FilterState } from '../types/employee';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  filteredCount: number;
  totalCount: number;
  dataSource: DataSourceInfo | null;
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  options,
  filteredCount,
  totalCount,
  dataSource,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const updateField = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const formattedTime = dataSource
    ? dataSource.lastSynced.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section
      aria-label="Shared workforce filters"
      className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-[#141418]"
    >
      {/* Unboxed context metadata row */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
            Showing {filteredCount.toLocaleString('en-GB')} of{' '}
            {totalCount.toLocaleString('en-GB')} employees
          </span>
          {dataSource && (
            <>
              <span aria-hidden="true">·</span>
              <span>{dataSource.label}</span>
              {formattedTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">Synced {formattedTime}</span>
                </>
              )}
            </>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 font-medium text-[#B45309] hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 dark:text-[#FFC800] dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* 5 Shared Dropdown Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Department
          </span>
          <select
            value={filters.department}
            onChange={(e) => updateField('department', e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-colors focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
          >
            <option value="All">All Departments</option>
            {options.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Location
          </span>
          <select
            value={filters.location}
            onChange={(e) => updateField('location', e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-colors focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
          >
            <option value="All">All UK Locations</option>
            {options.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Employment Type
          </span>
          <select
            value={filters.employmentType}
            onChange={(e) => updateField('employmentType', e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-colors focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
          >
            <option value="All">All Types</option>
            {options.employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Gender
          </span>
          <select
            value={filters.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-colors focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
          >
            <option value="All">All Genders</option>
            {options.genders.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Attrition Status
          </span>
          <select
            value={filters.attrition}
            onChange={(e) => updateField('attrition', e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-colors focus:border-[#F58220] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFC800]"
          >
            <option value="All">All Statuses</option>
            <option value="No">Active (No Attrition)</option>
            <option value="Yes">Attrited (Left)</option>
          </select>
        </label>
      </div>
    </section>
  );
}
