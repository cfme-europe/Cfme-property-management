#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_REF="${SUPABASE_PROJECT_REF:-lorimlzpadrsckgjvshy}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIJDSTEMPEL="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${1:-${ROOT_DIR}/backups/supabase/${TIJDSTEMPEL}}"
mkdir -p "${BACKUP_DIR}"
npx supabase link --project-ref "${PROJECT_REF}"
npx supabase db dump --linked --file "${BACKUP_DIR}/schema.sql"
npx supabase db dump --linked --data-only --use-copy --file "${BACKUP_DIR}/data.sql"
npx supabase db dump --linked --role-only --file "${BACKUP_DIR}/roles.sql"
printf '%s\n'   "project_ref=${PROJECT_REF}"   "gemaakt_op_utc=${TIJDSTEMPEL}"   "git_commit=$(git -C "${ROOT_DIR}" rev-parse HEAD)"   "git_branch=$(git -C "${ROOT_DIR}" branch --show-current)"   > "${BACKUP_DIR}/metadata.txt"
(
  cd "${BACKUP_DIR}"
  sha256sum schema.sql data.sql roles.sql metadata.txt > SHA256SUMS
)
echo "Back-up gereed: ${BACKUP_DIR}"
