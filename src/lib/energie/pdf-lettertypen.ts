import fs from "node:fs";
import path from "node:path";
import type { jsPDF } from "jspdf";
let fonts: { normal: string; bold: string } | undefined;
export function registreerEnergieLettertypen(doc: jsPDF) {
  fonts ??= {
    normal: fs
      .readFileSync(path.join(process.cwd(), "public/fonts/CFME-Sans.ttf"))
      .toString("base64"),
    bold: fs
      .readFileSync(path.join(process.cwd(), "public/fonts/CFME-Sans-Bold.ttf"))
      .toString("base64"),
  };
  doc.addFileToVFS("CFME-Sans.ttf", fonts.normal);
  doc.addFont("CFME-Sans.ttf", "CFME", "normal");
  doc.addFileToVFS("CFME-Sans-Bold.ttf", fonts.bold);
  doc.addFont("CFME-Sans-Bold.ttf", "CFME", "bold");
}
