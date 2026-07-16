#!/usr/bin/env bash
set -e

OUT="cfme-report.txt"

{
echo "=============================="
echo "CFME CONTROL REPORT"
echo "=============================="
echo

echo "=== DATUM ==="
date
echo

echo "=== GIT STATUS ==="
git status --short
echo

echo "=== GIT LOG ==="
git log --oneline -10
echo

echo "=== LINT ==="
npm run lint || true
echo

echo "=== BUILD ==="
npm run build || true
echo

echo "=== ROADMAP ==="
cat docs/ROADMAP.md
echo

echo "=== ARCHITECTUUR ==="
cat docs/ARCHITECTUUR.md
echo

echo "=== BEDRIJFSREGELS ==="
cat docs/BEDRIJFSREGELS.md
echo

echo "=== ONTWIKKELPROTOCOL ==="
cat docs/ONTWIKKELPROTOCOL.md
echo

echo "=== DASHBOARD ==="
sed -n '1,999p' src/app/page.tsx 2>/dev/null || true
echo

echo "=== SERVICES ==="
find src/services -name "*.ts" -print | while read f
do
echo
echo "----- $f -----"
cat "$f"
done

echo

echo "=== COMPONENTEN ==="
find src/components -name "*.tsx" -print | while read f
do
echo
echo "----- $f -----"
cat "$f"
done

echo
echo "=== TYPES ==="
find src/types -name "*.ts" -print | while read f
do
echo
echo "----- $f -----"
cat "$f"
done

} > "$OUT"

echo
echo "Klaar:"
ls -lh "$OUT"
