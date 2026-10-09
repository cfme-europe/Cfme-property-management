import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("woning QR-code staat als laatste blok in het woningdossier", async () => {
  const woning = await readFile(
    "src/app/woningen/[id]/page.tsx",
    "utf8",
  );

  const qrPositie = woning.indexOf("<WoningQrCode");
  const verhuurhistoriePositie = woning.indexOf('id="verhuurhistorie"');

  assert.ok(verhuurhistoriePositie >= 0);
  assert.ok(qrPositie > verhuurhistoriePositie);
  assert.equal(woning.indexOf("<section", qrPositie), -1);
});
