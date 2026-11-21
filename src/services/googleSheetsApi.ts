import { Employee } from '../types/employee';
import { parseEmployeeTable } from '../utils/csvParser';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: SheetTabInfo[];
}

export class WorkspaceAuthExpiredError extends Error {
  constructor(message = 'Your Google session expired. Please sign in again.') {
    super(message);
    this.name = 'WorkspaceAuthExpiredError';
  }
}

export function extractSpreadsheetTarget(input: string): {
  spreadsheetId: string;
  gid?: string;
} {
  const trimmed = input.trim();
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
  return {
    spreadsheetId: idMatch ? idMatch[1] : trimmed,
    gid: gidMatch ? gidMatch[1] : undefined,
  };
}

async function handleApiResponse(res: Response, context: string) {
  if (res.status === 401) {
    throw new WorkspaceAuthExpiredError(
      'Google Workspace access token expired or was revoked. Please sign in with Google again.'
    );
  }
  if (!res.ok) {
    let apiMessage = `${context} failed (HTTP ${res.status})`;
    try {
      const payload = await res.json();
      if (payload?.error?.message) {
        apiMessage = `${context}: ${payload.error.message}`;
      }
    } catch {
      // Ignore JSON parse fallback
    }
    throw new Error(apiMessage);
  }
  return res.json();
}

export async function listDriveSpreadsheets(
  accessToken: string
): Promise<DriveSpreadsheetFile[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '20',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await handleApiResponse(res, 'Listing Google Drive spreadsheets');
  return Array.isArray(data.files) ? data.files : [];
}

export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const params = new URLSearchParams({
    fields: 'properties.title,sheets(properties(sheetId,title))',
  });
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await handleApiResponse(res, 'Reading spreadsheet metadata');
  const sheets: SheetTabInfo[] = Array.isArray(data.sheets)
    ? data.sheets.map((s: { properties?: { sheetId?: number; title?: string } }) => ({
        sheetId: Number(s.properties?.sheetId ?? 0),
        title: String(s.properties?.title ?? 'Sheet1'),
      }))
    : [];

  return {
    spreadsheetId,
    title: String(data.properties?.title ?? spreadsheetId),
    sheets,
  };
}

export async function fetchSpreadsheetTabEmployees(
  spreadsheetId: string,
  accessToken: string,
  preferredGid?: string,
  preferredSheetTitle?: string
): Promise<{
  employees: Employee[];
  spreadsheetTitle: string;
  sheetTitle: string;
  sheetId: number;
  allTabs: SheetTabInfo[];
}> {
  const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
  if (meta.sheets.length === 0) {
    throw new Error('This Google Spreadsheet contains no worksheet tabs.');
  }

  let selectedTab = meta.sheets[0];
  if (preferredSheetTitle) {
    const byTitle = meta.sheets.find((s) => s.title === preferredSheetTitle);
    if (byTitle) selectedTab = byTitle;
  } else if (preferredGid) {
    const gidNum = Number(preferredGid);
    const byGid = meta.sheets.find((s) => s.sheetId === gidNum);
    if (byGid) selectedTab = byGid;
  }

  const encodedRange = encodeURIComponent(selectedTab.title);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await handleApiResponse(res, 'Reading Google Sheet values');
  const values: (string | number)[][] = Array.isArray(data.values)
    ? data.values
    : [];

  const employees = parseEmployeeTable(values);
  return {
    employees,
    spreadsheetTitle: meta.title,
    sheetTitle: selectedTab.title,
    sheetId: selectedTab.sheetId,
    allTabs: meta.sheets,
  };
}

export async function createWatchlistSpreadsheet(
  title: string,
  tabTitle: string,
  rows: (string | number)[][],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: tabTitle } }],
    }),
  });

  const created = await handleApiResponse(
    createRes,
    'Creating Google Spreadsheet'
  );
  const spreadsheetId = String(created.spreadsheetId);
  const spreadsheetUrl = String(
    created.spreadsheetUrl ??
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  );

  const range = encodeURIComponent(`${tabTitle}!A1`);
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  await handleApiResponse(updateRes, 'Writing watchlist rows to Google Sheet');
  return { spreadsheetId, spreadsheetUrl };
}
