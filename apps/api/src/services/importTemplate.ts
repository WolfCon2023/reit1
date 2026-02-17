import ExcelJS from "exceljs";
import { US_STATES, STRUCTURE_TYPES, PROVIDER_RESIDENT_OPTIONS, IMPORT_TEMPLATE_HEADERS } from "@reit1/shared";

export async function generateTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sites", { views: [{ state: "frozen", ySplit: 1 }] });

  const headers = [...IMPORT_TEMPLATE_HEADERS];
  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };

  const listsSheet = wb.addWorksheet("Lists", { state: "hidden" });
  let listRow = 1;
  listsSheet.addRow(["STRUCTURE TYPE"]);
  listRow++;
  const structureStart = listRow;
  STRUCTURE_TYPES.forEach((s) => {
    listsSheet.addRow([s]);
    listRow++;
  });
  const structureEnd = listRow;
  listsSheet.addRow([]);
  listRow++;
  listsSheet.addRow(["PROVIDER RESIDENT"]);
  listRow++;
  const residentStart = listRow;
  PROVIDER_RESIDENT_OPTIONS.forEach((s) => {
    listsSheet.addRow([s]);
    listRow++;
  });
  listsSheet.addRow([]);
  listRow++;
  listsSheet.addRow(["STATE"]);
  listRow++;
  const stateStart = listRow;
  US_STATES.forEach((s) => {
    listsSheet.addRow([s]);
    listRow++;
  });
  const stateEnd = listRow;

  const colCount = headers.length;
  const dv = (ws as { dataValidations?: { add: (range: string, opts: object) => void } }).dataValidations;
  if (dv) {
    for (let c = 1; c <= colCount; c++) {
      const colLetter = getColLetter(c);
      if (headers[c - 1] === "STRUCTURE TYPE") {
        dv.add(`${colLetter}2:${colLetter}1000`, {
          type: "list",
          allowBlank: true,
          formulae: [`Lists!$A$${structureStart}:$A$${structureEnd - 1}`],
        });
      } else if (headers[c - 1] === "PROVIDER RESIDENT") {
        dv.add(`${colLetter}2:${colLetter}1000`, {
          type: "list",
          allowBlank: true,
          formulae: [`Lists!$A$${residentStart}:$A$${residentStart + PROVIDER_RESIDENT_OPTIONS.length - 1}`],
        });
      } else if (headers[c - 1] === "STATE") {
        dv.add(`${colLetter}2:${colLetter}1000`, {
          type: "list",
          allowBlank: true,
          formulae: [`Lists!$A$${stateStart}:$A$${stateEnd - 1}`],
        });
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function getColLetter(n: number): string {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
