#!/usr/bin/env bash
set -Eeuo pipefail
BACKUP_DIR="${1:-}"
if [[ -z "${BACKUP_DIR}" ]]; then
  echo "Gebruik: scripts/supabase-backup-controleren.sh <backupmap>" >&2
  exit 1
fi
for bestand in schema.sql data.sql roles.sql metadata.txt SHA256SUMS; do
  [[ -s "${BACKUP_DIR}/${bestand}" ]] || {
    echo "Ontbrekend of leeg bestand: ${BACKUP_DIR}/${bestand}" >&2
    exit 1
  }
done
(
  cd "${BACKUP_DIR}"
  sha256sum --check SHA256SUMS
)
grep -q '^project_ref=' "${BACKUP_DIR}/metadata.txt"
grep -q '^gemaakt_op_utc=' "${BACKUP_DIR}/metadata.txt"
grep -q '^git_commit=' "${BACKUP_DIR}/metadata.txt"
grep -q '^git_branch=' "${BACKUP_DIR}/metadata.txt"
echo "Back-up is compleet en de controlesommen zijn geldig."
