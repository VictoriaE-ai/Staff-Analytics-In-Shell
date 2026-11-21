import { Employee } from '../types/employee';

export const GOOGLE_SHEET_ID = '17ks8OZ-CaU2885SiihmFhV2CG5HwcPDqw1aDamzVbcw';
export const GOOGLE_SHEET_GID = '992106110';
export const GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GOOGLE_SHEET_GID}`;

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'MonthlyIncome_GBP',
  'Attrition',
];

export function parseCsvRows(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\r' && nextChar === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function toNumber(value: string | number | undefined, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (!value) return fallback;
  const cleaned = String(value).replace(/[£$,\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseHireYear(hireDate: string): number | null {
  const match = hireDate.match(/^(\d{4})/);
  if (match) {
    const year = Number(match[1]);
    return year >= 1950 && year <= 2100 ? year : null;
  }
  const dateObj = new Date(hireDate);
  if (!Number.isNaN(dateObj.getTime())) {
    return dateObj.getFullYear();
  }
  return null;
}

export function parseEmployeeTable(rows: (string | number)[][]): Employee[] {
  if (rows.length < 2) {
    throw new Error('The sheet contains no employee data rows.');
  }

  const headers = rows[0].map((h) => String(h ?? '').trim());
  const headerIndex = new Map<string, number>();
  headers.forEach((header, idx) => {
    headerIndex.set(header.toLowerCase(), idx);
  });

  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headerIndex.has(col.toLowerCase())
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `Schema mismatch — missing expected column(s): ${missingColumns.join(', ')}. Verify you selected the Shell UK employee worksheet.`
    );
  }

  const getCell = (row: (string | number)[], colName: string): string => {
    const idx = headerIndex.get(colName.toLowerCase());
    if (idx === undefined || idx >= row.length) return '';
    return String(row[idx] ?? '').trim();
  };

  const employees: Employee[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const employeeId = getCell(row, 'EmployeeID');
    if (!employeeId) continue;

    const firstName = getCell(row, 'FirstName');
    const lastName = getCell(row, 'LastName');
    const hireDate = getCell(row, 'HireDate');
    const rawAttrition = getCell(row, 'Attrition').toLowerCase();

    employees.push({
      employeeId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || employeeId,
      gender: getCell(row, 'Gender') || 'Unspecified',
      age: toNumber(getCell(row, 'Age'), 0),
      maritalStatus: getCell(row, 'MaritalStatus') || 'Unspecified',
      department: getCell(row, 'Department') || 'Unassigned',
      jobTitle: getCell(row, 'JobTitle') || 'Unspecified',
      jobLevel: toNumber(getCell(row, 'JobLevel'), 1),
      employmentType: getCell(row, 'EmploymentType') || 'Full-Time',
      location: getCell(row, 'Location') || 'Unspecified',
      hireDate,
      hireYear: parseHireYear(hireDate),
      yearsAtCompany: toNumber(getCell(row, 'YearsAtCompany'), 0),
      yearsInCurrentRole: toNumber(getCell(row, 'YearsInCurrentRole'), 0),
      yearsSinceLastPromotion: toNumber(getCell(row, 'YearsSinceLastPromotion'), 0),
      yearsWithCurrManager: toNumber(getCell(row, 'YearsWithCurrManager'), 0),
      education: getCell(row, 'Education') || 'Unspecified',
      distanceFromHomeKm: toNumber(getCell(row, 'DistanceFromHome_km'), 0),
      businessTravel: getCell(row, 'BusinessTravel') || 'Non-Travel',
      monthlyIncomeGbp: toNumber(getCell(row, 'MonthlyIncome_GBP'), 0),
      attrition:
        rawAttrition === 'yes' || rawAttrition === 'true' || rawAttrition === '1'
          ? 'Yes'
          : 'No',
    });
  }

  if (employees.length === 0) {
    throw new Error('No valid employee rows could be parsed from the worksheet.');
  }

  return employees;
}

export function parseEmployeeCsv(csvText: string): Employee[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV response is empty.');
  }

  if (/^<!doctype html|<html/i.test(trimmed)) {
    throw new Error(
      'Google Sheets returned an HTML sign-in page instead of CSV data. Sign in with Google to access private sheets, or upload a CSV file.'
    );
  }

  const rows = parseCsvRows(trimmed);
  return parseEmployeeTable(rows);
}

export async function fetchGoogleSheetEmployees(
  spreadsheetId = GOOGLE_SHEET_ID,
  gid = GOOGLE_SHEET_GID,
  signal?: AbortSignal
): Promise<Employee[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  const onExternalAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${Date.now()}`;
    const response = await fetch(gvizUrl, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Access denied (HTTP ${response.status}) reading the public sheet endpoint. Sign in with Google to read private sheets or use Upload CSV.`
        );
      }
      if (response.status === 404) {
        throw new Error(
          `Google Sheet or tab gid=${gid} was not found (HTTP 404). Check the sheet URL or upload a CSV export.`
        );
      }
      throw new Error(
        `Google Sheets returned HTTP ${response.status} (${response.statusText || 'Request failed'}). Try Sync Sheet again, sign in with Google, or Upload CSV.`
      );
    }

    const csvText = await response.text();
    return parseEmployeeCsv(csvText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Timed out after 15 seconds while connecting to Google Sheets. Check your connection or use Upload CSV.'
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Unable to reach the public Google Sheets endpoint. Sign in with Google to use the authenticated Sheets API, or use Upload CSV.'
      );
    }
    throw err instanceof Error
      ? err
      : new Error('Unexpected error while loading the Google Sheet.');
  } finally {
    window.clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}
