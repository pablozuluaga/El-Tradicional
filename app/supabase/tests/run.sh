#!/usr/bin/env bash
# Runs schema.sql + the RLS/RPC assertions on a throwaway local Postgres 16 cluster.
# Usage: bash supabase/tests/run.sh   (must be able to run Postgres as a non-root user)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d /tmp/et-pg-XXXX)
PORT=${PG_PORT:-55432}
AS=${PG_USER:-claude}
chown "$AS" "$DIR"
run() { runuser -u "$AS" -- "$@"; }
run "$BIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
run "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap 'run "$BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null; rm -rf "$DIR"' EXIT
PSQL=(run "$BIN/psql" -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$HERE/supabase_stub.sql"
"${PSQL[@]}" -f "$HERE/../schema.sql"
"${PSQL[@]}" -f "$HERE/../schema.sql"   # re-runnable
"${PSQL[@]}" -o /dev/null -f "$HERE/rls.test.sql"
echo "SQL tests passed"
