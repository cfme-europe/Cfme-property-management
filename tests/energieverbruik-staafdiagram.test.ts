import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const component = readFileSync(
  join(
    process.cwd(),
    "src/components/energie/EnergieVerbruikGrafieken.tsx"
  ),
  "utf-8"
);

test("energieverbruik gebruikt een zichtbaar staafdiagram met vaste plothoogte", () => {
  assert.match(component, /role="img"/);
  assert.match(component, /Staafdiagram met/);
  assert.match(
    component,
    /relative h-64 border-b border-l border-slate-300/
  );
  assert.match(
    component,
    /absolute inset-x-1 bottom-0 min-h-2 rounded-t-lg/
  );
  assert.match(component, /style=\{\{ height: `\$\{hoogte\}%` \}\}/);
});

test("staafdiagram toont schaal, waarden, perioden en de laatste periode nadrukkelijk", () => {
  assert.match(component, /const schaalWaarden = \[1, 0\.75, 0\.5, 0\.25, 0\]/);
  assert.match(component, /bottom: `calc\(\$\{hoogte\}% \+ 0\.5rem\)`/);
  assert.match(component, /\{item\.label\}/);
  assert.match(component, /isLaatste/);
  assert.match(component, /bg-emerald-700/);
  assert.match(component, /bg-emerald-500/);
});
