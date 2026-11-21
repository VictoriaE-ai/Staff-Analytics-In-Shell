import {
  ActionRecommendation,
  Employee,
  FilterState,
  FindingItem,
  KpiMetric,
  RiskFactor,
  RiskTier,
  ScoredEmployee,
} from '../types/employee';

export const HIGH_RISK_THRESHOLD = 50;
export const ELEVATED_RISK_THRESHOLD = 30;

export const FLIGHT_RISK_RULES = [
  {
    criterion: 'Non-Full-Time Engagement',
    rule: 'Part-Time (+25 pts) or Contract (+18 pts) — non-permanent roles show the highest historical attrition.',
    maxPoints: 25,
  },
  {
    criterion: 'Peer Compensation Gap',
    rule: 'Monthly income >12% below job-level median (+20 pts) or below level median (+10 pts).',
    maxPoints: 20,
  },
  {
    criterion: 'Tenure & Manager Stability',
    rule: 'Early tenure ≤3 years (+15 pts) or ≤2 years with current manager (+10 pts).',
    maxPoints: 15,
  },
  {
    criterion: 'Promotion Stagnation',
    rule: '≥5 years since last promotion (+15 pts) or 3–4 years since promotion (+8 pts).',
    maxPoints: 15,
  },
  {
    criterion: 'Travel & Commute Strain',
    rule: 'Frequent business travel (+15 pts) and/or commute distance ≥30 km (+10 pts).',
    maxPoints: 25,
  },
];

export function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatPct(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return '0.0%';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatTravelLabel(raw: string): string {
  if (raw === 'Travel_Frequently') return 'Frequent Travel';
  if (raw === 'Travel_Rarely') return 'Rare Travel';
  if (raw === 'Non-Travel') return 'Non-Travel';
  return raw.replace(/_/g, ' ');
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function computeLevelMedians(employees: Employee[]): Map<number, number> {
  const byLevel = new Map<number, number[]>();
  employees.forEach((emp) => {
    const list = byLevel.get(emp.jobLevel) ?? [];
    list.push(emp.monthlyIncomeGbp);
    byLevel.set(emp.jobLevel, list);
  });
  const medians = new Map<number, number>();
  byLevel.forEach((incomes, level) => {
    medians.set(level, median(incomes));
  });
  return medians;
}

export function scoreEmployees(
  employees: Employee[],
  levelMedians: Map<number, number>
): ScoredEmployee[] {
  return employees.map((emp) => {
    const factors: RiskFactor[] = [];
    const levelMed = levelMedians.get(emp.jobLevel) ?? emp.monthlyIncomeGbp;

    if (emp.employmentType === 'Part-Time') {
      factors.push({ label: 'Part-Time contract', points: 25 });
    } else if (emp.employmentType === 'Contract') {
      factors.push({ label: 'Fixed-term contract', points: 18 });
    }

    if (levelMed > 0) {
      if (emp.monthlyIncomeGbp < levelMed * 0.88) {
        factors.push({ label: `Pay >12% below L${emp.jobLevel} median`, points: 20 });
      } else if (emp.monthlyIncomeGbp < levelMed) {
        factors.push({ label: `Pay below L${emp.jobLevel} median`, points: 10 });
      }
    }

    if (emp.yearsAtCompany <= 3) {
      factors.push({ label: `Early tenure (${emp.yearsAtCompany}y)`, points: 15 });
    } else if (emp.yearsWithCurrManager <= 2) {
      factors.push({ label: `New manager (${emp.yearsWithCurrManager}y)`, points: 10 });
    }

    if (emp.yearsSinceLastPromotion >= 5) {
      factors.push({ label: `No promotion in ${emp.yearsSinceLastPromotion}y`, points: 15 });
    } else if (emp.yearsSinceLastPromotion >= 3) {
      factors.push({ label: `${emp.yearsSinceLastPromotion}y since promotion`, points: 8 });
    }

    if (emp.businessTravel === 'Travel_Frequently') {
      factors.push({ label: 'Frequent travel', points: 15 });
    }

    if (emp.distanceFromHomeKm >= 30) {
      factors.push({ label: `${emp.distanceFromHomeKm} km commute`, points: 10 });
    }

    const totalScore = Math.min(
      100,
      factors.reduce((sum, item) => sum + item.points, 0)
    );

    let riskTier: RiskTier = 'Low';
    if (totalScore >= HIGH_RISK_THRESHOLD) {
      riskTier = 'High';
    } else if (totalScore >= ELEVATED_RISK_THRESHOLD) {
      riskTier = 'Elevated';
    }

    return {
      ...emp,
      flightRiskScore: totalScore,
      riskTier,
      riskFactors: factors,
      levelMedianIncome: levelMed,
    };
  });
}

export function filterEmployees(
  employees: ScoredEmployee[],
  filters: FilterState
): ScoredEmployee[] {
  return employees.filter((emp) => {
    if (filters.department !== 'All' && emp.department !== filters.department) return false;
    if (filters.location !== 'All' && emp.location !== filters.location) return false;
    if (filters.employmentType !== 'All' && emp.employmentType !== filters.employmentType)
      return false;
    if (filters.gender !== 'All' && emp.gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && emp.attrition !== filters.attrition) return false;
    return true;
  });
}

export function getFilterOptions(employees: Employee[]) {
  const unique = (getter: (e: Employee) => string) =>
    Array.from(new Set(employees.map(getter).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

  return {
    departments: unique((e) => e.department),
    locations: unique((e) => e.location),
    employmentTypes: unique((e) => e.employmentType),
    genders: unique((e) => e.gender),
  };
}

export function computeOverviewKpis(
  filtered: ScoredEmployee[],
  totalCount: number
): KpiMetric[] {
  const headcount = filtered.length;
  const leavers = filtered.filter((e) => e.attrition === 'Yes');
  const active = filtered.filter((e) => e.attrition === 'No');

  const attritionRate = headcount > 0 ? leavers.length / headcount : 0;
  const avgIncome =
    headcount > 0
      ? filtered.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0) / headcount
      : 0;
  const medianIncome = median(filtered.map((e) => e.monthlyIncomeGbp));
  const totalPayroll = filtered.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);
  const activePayroll = active.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);

  return [
    {
      id: 'headcount',
      label: 'Headcount',
      value: headcount.toLocaleString('en-GB'),
      subtext:
        totalCount > 0
          ? `${formatPct(headcount / totalCount)} of ${totalCount} total staff`
          : 'No records loaded',
      tone: 'default',
    },
    {
      id: 'attrition-rate',
      label: 'Attrition Rate',
      value: formatPct(attritionRate),
      subtext: `${leavers.length} attrited employee${leavers.length === 1 ? '' : 's'}`,
      tone: attritionRate >= 0.22 ? 'danger' : attritionRate >= 0.15 ? 'warning' : 'default',
    },
    {
      id: 'active-employees',
      label: 'Active Employees',
      value: active.length.toLocaleString('en-GB'),
      subtext:
        headcount > 0
          ? `${formatPct(active.length / headcount)} retained workforce`
          : '0% retained',
      tone: 'accent',
    },
    {
      id: 'average-income',
      label: 'Average Income',
      value: formatGbp(avgIncome),
      subtext: `Median ${formatGbp(medianIncome)} / month`,
      tone: 'default',
    },
    {
      id: 'monthly-payroll',
      label: 'Monthly Payroll',
      value: formatGbp(totalPayroll),
      subtext:
        leavers.length > 0 && active.length > 0
          ? `Active payroll ${formatGbp(activePayroll)}`
          : `${formatGbp(totalPayroll * 12)} annualised`,
      tone: 'default',
    },
  ];
}

export function computeDeepDiveKpis(filtered: ScoredEmployee[]): KpiMetric[] {
  const headcount = filtered.length;
  const avgTenure =
    headcount > 0
      ? filtered.reduce((sum, e) => sum + e.yearsAtCompany, 0) / headcount
      : 0;
  const femaleCount = filtered.filter((e) => e.gender === 'Female').length;
  const nonFullTimeCount = filtered.filter(
    (e) => e.employmentType !== 'Full-Time'
  ).length;
  const avgYearsSincePromo =
    headcount > 0
      ? filtered.reduce((sum, e) => sum + e.yearsSinceLastPromotion, 0) / headcount
      : 0;

  const activePool = filtered.filter((e) => e.attrition === 'No');
  const highRiskActive = activePool.filter(
    (e) => e.flightRiskScore >= HIGH_RISK_THRESHOLD
  );
  const elevatedActive = activePool.filter(
    (e) =>
      e.flightRiskScore >= ELEVATED_RISK_THRESHOLD &&
      e.flightRiskScore < HIGH_RISK_THRESHOLD
  );

  return [
    {
      id: 'avg-tenure',
      label: 'Average Tenure',
      value: `${avgTenure.toFixed(1)} yrs`,
      subtext: `Mean across ${headcount} employee${headcount === 1 ? '' : 's'}`,
      tone: 'default',
    },
    {
      id: 'female-share',
      label: 'Female Share',
      value: headcount > 0 ? formatPct(femaleCount / headcount) : '0.0%',
      subtext: `${femaleCount} of ${headcount} employees`,
      tone: 'default',
    },
    {
      id: 'non-ft-share',
      label: 'Non-Full-Time Share',
      value: headcount > 0 ? formatPct(nonFullTimeCount / headcount) : '0.0%',
      subtext: `${nonFullTimeCount} Part-Time or Contract`,
      tone: nonFullTimeCount > 0 ? 'warning' : 'default',
    },
    {
      id: 'years-since-promo',
      label: 'Years Since Promotion',
      value: `${avgYearsSincePromo.toFixed(1)} yrs`,
      subtext: `${filtered.filter((e) => e.yearsSinceLastPromotion >= 5).length} waiting ≥5 yrs`,
      tone: avgYearsSincePromo >= 4.5 ? 'warning' : 'default',
    },
    {
      id: 'high-flight-risk',
      label: 'High Flight-Risk',
      value: highRiskActive.length.toLocaleString('en-GB'),
      subtext:
        activePool.length > 0
          ? `Score ≥${HIGH_RISK_THRESHOLD} (${elevatedActive.length} elevated)`
          : 'No active staff in filter',
      tone: highRiskActive.length > 0 ? 'danger' : 'default',
    },
  ];
}

export interface GroupBreakdown {
  label: string;
  total: number;
  active: number;
  attrited: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupByCategory(
  employees: ScoredEmployee[],
  getKey: (e: ScoredEmployee) => string,
  order?: string[]
): GroupBreakdown[] {
  const map = new Map<string, ScoredEmployee[]>();
  employees.forEach((emp) => {
    const key = getKey(emp);
    const arr = map.get(key) ?? [];
    arr.push(emp);
    map.set(key, arr);
  });

  const entries: GroupBreakdown[] = [];
  map.forEach((list, label) => {
    const active = list.filter((e) => e.attrition === 'No').length;
    const attrited = list.length - active;
    const avgIncome =
      list.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0) / list.length;
    entries.push({
      label,
      total: list.length,
      active,
      attrited,
      attritionRate: list.length > 0 ? (attrited / list.length) * 100 : 0,
      avgIncome,
    });
  });

  if (order) {
    const orderIdx = new Map(order.map((label, idx) => [label, idx]));
    entries.sort((a, b) => {
      const idxA = orderIdx.get(a.label) ?? 999;
      const idxB = orderIdx.get(b.label) ?? 999;
      return idxA - idxB;
    });
  } else {
    entries.sort((a, b) => b.total - a.total);
  }

  return entries;
}

export function getAgeBand(age: number): string {
  if (age < 25) return '<25';
  if (age <= 34) return '25–34';
  if (age <= 44) return '35–44';
  if (age <= 54) return '45–54';
  return '55+';
}

export function getTenureBand(years: number): string {
  if (years <= 2) return '0–2 yrs';
  if (years <= 5) return '3–5 yrs';
  if (years <= 10) return '6–10 yrs';
  if (years <= 20) return '11–20 yrs';
  return '21+ yrs';
}

export function getHiringTrend(employees: ScoredEmployee[]) {
  const byYear = new Map<number, { total: number; active: number; attrited: number }>();
  employees.forEach((emp) => {
    if (!emp.hireYear) return;
    const curr = byYear.get(emp.hireYear) ?? { total: 0, active: 0, attrited: 0 };
    curr.total += 1;
    if (emp.attrition === 'No') curr.active += 1;
    else curr.attrited += 1;
    byYear.set(emp.hireYear, curr);
  });

  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  return years.map((year) => ({
    year: String(year),
    ...byYear.get(year)!,
  }));
}

export function generateFindings(
  filtered: ScoredEmployee[],
  allEmployees: ScoredEmployee[]
): FindingItem[] {
  if (filtered.length === 0) return [];

  const findings: FindingItem[] = [];
  const totalRate =
    allEmployees.length > 0
      ? allEmployees.filter((e) => e.attrition === 'Yes').length / allEmployees.length
      : 0;
  const cohortAttrited = filtered.filter((e) => e.attrition === 'Yes');
  const cohortActive = filtered.filter((e) => e.attrition === 'No');
  const cohortRate = cohortAttrited.length / filtered.length;

  // 1. Cohort Attrition Benchmark Comparison
  const diffPp = (cohortRate - totalRate) * 100;
  findings.push({
    id: 'cohort-attrition',
    category: 'Attrition Pulse',
    headline:
      Math.abs(diffPp) < 1
        ? `Cohort attrition aligns with the Shell UK baseline`
        : diffPp > 0
          ? `Cohort attrition sits ${diffPp.toFixed(1)} pp above company baseline`
          : `Cohort attrition sits ${Math.abs(diffPp).toFixed(1)} pp below company baseline`,
    detail: `${cohortAttrited.length} of ${filtered.length} selected employees have attrited (${formatPct(cohortRate)}), compared with the overall ${formatPct(totalRate)} Shell UK average.`,
    metricValue: formatPct(cohortRate),
    severity: cohortRate >= 0.22 ? 'critical' : cohortRate >= 0.16 ? 'elevated' : 'nominal',
  });

  // 2. Department Hotspot
  const depts = groupByCategory(filtered, (e) => e.department).filter((d) => d.total >= 3);
  if (depts.length > 0) {
    const topDept = [...depts].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    findings.push({
      id: 'dept-hotspot',
      category: 'Department Risk',
      headline: `${topDept.label} leads attrition in this selection`,
      detail: `${topDept.attrited} leavers out of ${topDept.total} staff (${topDept.attritionRate.toFixed(1)}% rate), with average monthly pay of ${formatGbp(topDept.avgIncome)}.`,
      metricValue: `${topDept.attritionRate.toFixed(1)}%`,
      severity: topDept.attritionRate >= 25 ? 'critical' : topDept.attritionRate >= 18 ? 'elevated' : 'nominal',
    });
  }

  // 3. Employment Type Vulnerability
  const empTypes = groupByCategory(filtered, (e) => e.employmentType);
  const nonFt = filtered.filter((e) => e.employmentType !== 'Full-Time');
  const ft = filtered.filter((e) => e.employmentType === 'Full-Time');
  if (nonFt.length > 0 && ft.length > 0) {
    const nonFtRate = nonFt.filter((e) => e.attrition === 'Yes').length / nonFt.length;
    const ftRate = ft.filter((e) => e.attrition === 'Yes').length / ft.length;
    const topType = [...empTypes].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    findings.push({
      id: 'contract-disparity',
      category: 'Contract Structure',
      headline: `${topType.label} staff show ${topType.attritionRate.toFixed(1)}% turnover`,
      detail: `Non-full-time staff (${nonFt.length} headcount) record ${formatPct(nonFtRate)} attrition versus ${formatPct(ftRate)} for Full-Time employees.`,
      metricValue: formatPct(nonFtRate),
      severity: nonFtRate >= 0.3 ? 'critical' : nonFtRate >= 0.2 ? 'elevated' : 'nominal',
    });
  }

  // 4. Location Concentration
  const locs = groupByCategory(filtered, (e) => e.location).filter((l) => l.total >= 3);
  if (locs.length > 1) {
    const sortedLocs = [...locs].sort((a, b) => b.attritionRate - a.attritionRate);
    const highestLoc = sortedLocs[0];
    const lowestLoc = sortedLocs[sortedLocs.length - 1];
    findings.push({
      id: 'location-spread',
      category: 'UK Site Footprint',
      headline: `${highestLoc.label} records highest site turnover`,
      detail: `${highestLoc.label} sits at ${highestLoc.attritionRate.toFixed(1)}% attrition (${highestLoc.attrited}/${highestLoc.total}), while ${lowestLoc.label} retains best at ${lowestLoc.attritionRate.toFixed(1)}%.`,
      metricValue: `${highestLoc.attritionRate.toFixed(1)}%`,
      severity: highestLoc.attritionRate >= 23 ? 'elevated' : 'nominal',
    });
  }

  // 5. Pay & Tenure Gap Between Leavers and Active Staff
  if (cohortAttrited.length > 0 && cohortActive.length > 0) {
    const avgPayLeavers =
      cohortAttrited.reduce((s, e) => s + e.monthlyIncomeGbp, 0) / cohortAttrited.length;
    const avgPayActive =
      cohortActive.reduce((s, e) => s + e.monthlyIncomeGbp, 0) / cohortActive.length;
    const payGap = avgPayActive - avgPayLeavers;
    const avgTenureLeavers =
      cohortAttrited.reduce((s, e) => s + e.yearsAtCompany, 0) / cohortAttrited.length;
    const avgTenureActive =
      cohortActive.reduce((s, e) => s + e.yearsAtCompany, 0) / cohortActive.length;

    findings.push({
      id: 'pay-tenure-gap',
      category: 'Pay & Tenure Signal',
      headline:
        payGap > 0
          ? `Leavers earned ${formatGbp(payGap)}/mo less than active peers`
          : `Leavers earned ${formatGbp(Math.abs(payGap))}/mo above active peers`,
      detail: `Attrited staff averaged ${formatGbp(avgPayLeavers)}/mo and ${avgTenureLeavers.toFixed(1)} yrs tenure versus ${formatGbp(avgPayActive)}/mo and ${avgTenureActive.toFixed(1)} yrs for active staff.`,
      metricValue: payGap > 0 ? `-${formatGbp(payGap)}` : `+${formatGbp(Math.abs(payGap))}`,
      severity: payGap >= 250 ? 'elevated' : 'nominal',
    });
  }

  // 6. Active Flight-Risk Payroll Exposure
  const highRiskActive = cohortActive.filter(
    (e) => e.flightRiskScore >= HIGH_RISK_THRESHOLD
  );
  if (cohortActive.length > 0) {
    const payrollAtRisk = highRiskActive.reduce((s, e) => s + e.monthlyIncomeGbp, 0);
    findings.push({
      id: 'flight-risk-exposure',
      category: 'Retention Exposure',
      headline: `${highRiskActive.length} active employees flagged as high flight-risk`,
      detail: `Represents ${formatPct(highRiskActive.length / cohortActive.length)} of active staff and ${formatGbp(payrollAtRisk)}/mo (${formatGbp(payrollAtRisk * 12)}/yr) in exposed monthly payroll.`,
      metricValue: `${highRiskActive.length} staff`,
      severity:
        highRiskActive.length / cohortActive.length >= 0.12
          ? 'critical'
          : highRiskActive.length > 0
            ? 'elevated'
            : 'nominal',
    });
  }

  return findings;
}

export function generateRecommendations(
  filtered: ScoredEmployee[]
): ActionRecommendation[] {
  if (filtered.length === 0) return [];

  const active = filtered.filter((e) => e.attrition === 'No');
  const highRisk = active.filter((e) => e.flightRiskScore >= HIGH_RISK_THRESHOLD);
  const actions: ActionRecommendation[] = [];

  // Action 1: Address Pay Outliers among Active Staff
  const underpaidActive = active.filter(
    (e) => e.monthlyIncomeGbp < e.levelMedianIncome * 0.88
  );
  if (underpaidActive.length > 0) {
    const avgGap =
      underpaidActive.reduce(
        (sum, e) => sum + (e.levelMedianIncome - e.monthlyIncomeGbp),
        0
      ) / underpaidActive.length;
    const topDepts = groupByCategory(underpaidActive, (e) => e.department)
      .slice(0, 2)
      .map((d) => d.label)
      .join(' & ');

    actions.push({
      id: 'comp-equity',
      priority: 'Immediate',
      title: 'Targeted Peer-Band Compensation Adjustments',
      targetGroup: `${underpaidActive.length} active employees >12% below level median`,
      rationale: `Concentrated in ${topDepts || 'key operational teams'}, where staff sit an average of ${formatGbp(avgGap)}/mo below internal Shell UK job-level medians.`,
      actionStep:
        'Run an off-cycle market & internal equity review for the top-10 watchlist members earning below their job-level median.',
      impactEstimate: `Mitigates +20 risk pts for ${underpaidActive.length} staff`,
    });
  }

  // Action 2: Non-Full-Time Conversion & Retention Track
  const nonFt = filtered.filter((e) => e.employmentType !== 'Full-Time');
  const nonFtActive = active.filter((e) => e.employmentType !== 'Full-Time');
  if (nonFt.length > 0) {
    const nonFtAttrRate =
      nonFt.filter((e) => e.attrition === 'Yes').length / nonFt.length;
    actions.push({
      id: 'contract-conversion',
      priority: nonFtAttrRate >= 0.25 ? 'Immediate' : 'Near-Term',
      title: 'Part-Time & Contract Retention Pathways',
      targetGroup: `${nonFtActive.length} active Part-Time / Contract employees`,
      rationale: `Non-full-time roles exhibit ${formatPct(nonFtAttrRate)} historical attrition across this slice—significantly above full-time retention.`,
      actionStep:
        'Prioritise permanent conversion offers or 12-month retention milestones for high-performing contract and part-time specialists.',
      impactEstimate: `Addresses up to +25 risk pts per employee`,
    });
  }

  // Action 3: Promotion & Career Progression Calibration
  const stagnantActive = active.filter((e) => e.yearsSinceLastPromotion >= 5);
  if (stagnantActive.length > 0) {
    const topLocs = groupByCategory(stagnantActive, (e) => e.location)
      .slice(0, 2)
      .map((l) => l.label)
      .join(', ');
    actions.push({
      id: 'career-progression',
      priority: 'Near-Term',
      title: 'Career Progression & Promotion Calibration',
      targetGroup: `${stagnantActive.length} active staff with ≥5 yrs since last promotion`,
      rationale: `Extended grade stagnation creates latent flight risk, especially in ${topLocs || 'core UK hubs'} where lateral mobility is limited.`,
      actionStep:
        'Mandate structured career-path check-ins and technical specialist progression tracks during the next appraisal cycle.',
      impactEstimate: `Re-engages ${stagnantActive.length} experienced staff`,
    });
  }

  // Action 4: Travel Load & Hybrid Commute Relief
  const travelBurdened = active.filter(
    (e) => e.businessTravel === 'Travel_Frequently' && e.distanceFromHomeKm >= 25
  );
  const frequentTravelCount = active.filter(
    (e) => e.businessTravel === 'Travel_Frequently'
  ).length;
  if (frequentTravelCount > 0) {
    actions.push({
      id: 'travel-flexibility',
      priority: 'Structural',
      title: 'Travel Rotation & Hybrid Commute Flexibility',
      targetGroup: `${frequentTravelCount} frequent travellers (${travelBurdened.length} also ≥25 km commute)`,
      rationale: `Combining frequent site travel with long daily commutes accelerates burnout among mid-level engineers and HSE leads.`,
      actionStep:
        'Introduce quarterly travel caps, rotational site cover, and flexible remote recovery days post-offshore or multi-site assignments.',
      impactEstimate: `Reduces burnout load across ${frequentTravelCount} roles`,
    });
  }

  // Fallback general retention governance if slice is very small
  if (actions.length === 0 && highRisk.length >= 0) {
    actions.push({
      id: 'manager-checkins',
      priority: 'Near-Term',
      title: 'Structured Stay Interviews with Line Managers',
      targetGroup: `${active.length} active employees in current filter`,
      rationale:
        'Maintain regular manager check-ins and compensation benchmarking to keep attrition below the Shell UK threshold.',
      actionStep:
        'Schedule semi-annual stay interviews focusing on role growth, manager support, and reward clarity.',
      impactEstimate: 'Sustains cohort retention',
    });
  }

  return actions.slice(0, 4);
}
