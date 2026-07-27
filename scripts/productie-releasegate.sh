#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "===== CFME PRODUCTIE-RELEASEGATE ====="
echo "commit=$(git rev-parse HEAD)"
echo "branch=$(git branch --show-current)"
echo "node=$(node --version)"
echo "npm=$(npm --version)"
echo "supabase=$(npx supabase --version)"

echo
echo "===== FUNCTIONELE TESTS ====="
npm test

echo
echo "===== 9.0 KETENTESTS ====="
for testbestand in scripts/test-9-0*.mjs; do
  echo "UITVOEREN: ${testbestand}"
  node "${testbestand}"
done

echo
echo "===== TYPESCRIPT ====="
npx tsc --noEmit

echo
echo "===== LINT ====="
npm run lint

echo
echo "===== PRODUCTIEBUILD ====="
npm run build

echo
echo "===== DATABASE LINT ====="
npx supabase db lint --linked

echo
echo "===== MIGRATIESTATUS ====="
npx supabase migration list

echo
echo "===== MIGRATIE DRY-RUN ====="
npx supabase db push --dry-run

echo
echo "===== GIT DIFF ====="
git diff --check

echo
echo "===== GETRACKTE GEHEIMBESTANDEN ====="
if git ls-files | grep -Ei '(^|/)(\.env|.*secret.*|.*credential.*|.*private.*key.*)'; then
  echo "FOUT: mogelijk geheim bestand wordt gevolgd." >&2
  exit 1
else
  echo "Geen verdachte geheimbestanden gevolgd."
fi

echo
echo "===== DEPENDENCY AUDIT ====="
set +e
npm audit --omit=dev
AUDIT_STATUS=$?
set -e
echo "NPM_AUDIT_EXITCODE=${AUDIT_STATUS}"

if [[ "${AUDIT_STATUS}" -ne 0 ]]; then
  echo "WAARSCHUWING: dependency-restrisico aanwezig; zie acceptatierapport."
fi

echo
echo "===== GIT STATUS ====="
STATUS="$(git status --short | grep -v '^?? supabase/\.temp/$' || true)"

if [[ -n "${STATUS}" ]]; then
  echo "${STATUS}"
  echo "FOUT: repository bevat onverwachte wijzigingen." >&2
  exit 1
fi

echo "Alleen supabase/.temp/ mag lokaal ongetrackt zijn."
echo
echo "RELEASEGATE GESLAAGD MET EVENTUEEL VASTGELEGD DEPENDENCY-RESTRISICO."
