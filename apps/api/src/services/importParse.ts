import * as XLSX from "xlsx";
import { IMPORT_TEMPLATE_HEADERS } from "@reit1/shared";

export interface ParsedRow {
  [key: string]: string | number | undefined;
}

export interface ValidationError {
  row: number;
  errors: string[];
}

export interface ParseResult {
  headerMismatch: boolean;
  receivedHeaders?: string[];
  rows: ParsedRow[];
  validRows: ParsedRow[];
  errors: ValidationError[];
}

function trimCell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

export function parseXlsxAndValidate(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as unknown[][];

  if (!data.length) {
    return { headerMismatch: false, rows: [], validRows: [], errors: [] };
  }

  const firstRow = data[0] as string[];
  const receivedHeaders = firstRow.map((h) => trimCell(h));
  const expected = [...IMPORT_TEMPLATE_HEADERS];
  const headerMismatch =
    receivedHeaders.length !== expected.length ||
    expected.some((h, i) => receivedHeaders[i] !== h);

  if (headerMismatch) {
    return { headerMismatch: true, receivedHeaders, rows: [], validRows: [], errors: [] };
  }

  const rows: ParsedRow[] = [];
  const validRows: ParsedRow[] = [];
  const errors: ValidationError[] = [];

  for (let i = 1; i < data.length; i++) {
    const raw = data[i] as unknown[];
    const row: ParsedRow = {};
    const rowErrors: string[] = [];
    expected.forEach((header, colIndex) => {
      const val = raw[colIndex];
      if (header === "STRUCTURE HEIGHT" || header === "LATITUDE" || header === "LONGITUDE") {
        row[header] = num(val);
      } else {
        row[header] = trimCell(val);
      }
    });

    if (!trimCell(row["SITE ID"])) rowErrors.push("SITE ID is required");
    if (!trimCell(row["SITE NAME"])) rowErrors.push("SITE NAME is required");
    if (!trimCell(row["PROVIDER"])) rowErrors.push("PROVIDER is required");
    if (!trimCell(row["ADDRESS"])) rowErrors.push("ADDRESS is required");
    if (!trimCell(row["CITY"])) rowErrors.push("CITY is required");
    if (!trimCell(row["STATE"])) rowErrors.push("STATE is required");
    if (!trimCell(row["ZIP CODE"])) rowErrors.push("ZIP CODE is required");
    if (!trimCell(row["STRUCTURE TYPE"])) rowErrors.push("STRUCTURE TYPE is required");

    const lat = num(row["LATITUDE"]);
    const lon = num(row["LONGITUDE"]);
    if (lat < -90 || lat > 90) rowErrors.push("LATITUDE must be between -90 and 90");
    if (lon < -180 || lon > 180) rowErrors.push("LONGITUDE must be between -180 and 180");

    const structureHeight = num(row["STRUCTURE HEIGHT"]);
    if (structureHeight < 0) rowErrors.push("STRUCTURE HEIGHT must be >= 0");

    rows.push(row);
    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    } else {
      validRows.push(row);
    }
  }

  return { headerMismatch: false, rows, validRows, errors };
}
