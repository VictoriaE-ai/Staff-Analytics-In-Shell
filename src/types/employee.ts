export type DashboardTab = 'overview' | 'deep-dive' | 'insights';

export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  maritalStatus: string;
  department: string;
  jobTitle: string;
  jobLevel: number;
  employmentType: string;
  location: string;
  hireDate: string;
  hireYear: number | null;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsSinceLastPromotion: number;
  yearsWithCurrManager: number;
  education: string;
  distanceFromHomeKm: number;
  businessTravel: string;
  monthlyIncomeGbp: number;
  attrition: 'Yes' | 'No';
}

export interface RiskFactor {
  label: string;
  points: number;
}

export type RiskTier = 'High' | 'Elevated' | 'Low';

export interface ScoredEmployee extends Employee {
  flightRiskScore: number;
  riskTier: RiskTier;
  riskFactors: RiskFactor[];
  levelMedianIncome: number;
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: string;
}

export interface DataSourceInfo {
  type: 'sheet' | 'csv';
  label: string;
  lastSynced: Date;
  recordCount: number;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  subtext: string;
  tone?: 'default' | 'accent' | 'warning' | 'danger';
}

export interface FindingItem {
  id: string;
  category: string;
  headline: string;
  detail: string;
  metricValue: string;
  severity: 'critical' | 'elevated' | 'nominal';
}

export interface ActionRecommendation {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Structural';
  title: string;
  targetGroup: string;
  rationale: string;
  actionStep: string;
  impactEstimate: string;
}
