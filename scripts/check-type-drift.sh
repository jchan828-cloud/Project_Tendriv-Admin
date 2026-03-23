#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# TENDRIV ADMIN — Type Drift Detection
# Constitution Control #4: CI type drift detection (NIST SA-11)
#
# Adapted from Marketing's check-type-drift.sh for Admin repo
# conventions (DEC-MK-084): service_role permitted in
# lib/supabase/server.ts, direct auth pattern (no createApiRoute).
#
# Exit 0 = PASS | Exit 1 = FAIL (blocks CI)
# ─────────────────────────────────────────────────────────────

set -euo pipefail

FAIL=0

echo "=== TYPE DRIFT CHECK (Admin) ==="

# ── Check 1: No inline Zod schemas outside lib/types/ ──────────
echo ""
echo "CHECK 1: Inline Zod schemas outside lib/types/"
INLINE=$(grep -rn "z\.object\|z\.string\|z\.enum\|z\.number" \
  app/ components/ \
  --include="*.ts" --include="*.tsx" \
  2>/dev/null || true)

if [ -n "$INLINE" ]; then
  echo "  FAIL — inline Zod schemas found (should be in lib/types/):"
  echo "$INLINE"
  FAIL=1
else
  echo "  PASS"
fi

# ── Check 2: No 'as' type assertions ───────────────────────────
echo ""
echo "CHECK 2: 'as' type assertions in app/ components/ lib/"
ASSERTIONS=$(grep -rn " as [A-Z][a-zA-Z]*\b\| as any\b" \
  app/ components/ lib/ \
  --include="*.ts" --include="*.tsx" \
  2>/dev/null || true)

if [ -n "$ASSERTIONS" ]; then
  echo "  FAIL — 'as' type assertions found:"
  echo "$ASSERTIONS"
  FAIL=1
else
  echo "  PASS"
fi

# ── Check 3: No 'any' type ─────────────────────────────────────
echo ""
echo "CHECK 3: 'any' type usage"
ANY_TYPE=$(grep -rn ": any\b\|<any>\b" \
  app/ components/ lib/ \
  --include="*.ts" --include="*.tsx" \
  2>/dev/null || true)

if [ -n "$ANY_TYPE" ]; then
  echo "  FAIL — 'any' type found:"
  echo "$ANY_TYPE"
  FAIL=1
else
  echo "  PASS"
fi

# ── Check 4: No Edge Runtime ────────────────────────────────────
echo ""
echo "CHECK 4: Edge Runtime usage"
EDGE=$(grep -rn "runtime.*edge\|edge.*runtime" \
  app/ \
  --include="*.ts" --include="*.tsx" \
  2>/dev/null || true)

if [ -n "$EDGE" ]; then
  echo "  FAIL — Edge Runtime found:"
  echo "$EDGE"
  FAIL=1
else
  echo "  PASS"
fi

# ── Check 5: service_role only in lib/supabase/server.ts ────────
# Admin override (DEC-MK-084): service_role is permitted in server
# components via the factory in lib/supabase/server.ts.
echo ""
echo "CHECK 5: service_role key outside lib/supabase/server.ts"
SVCKEY=$(grep -rn "service_role\|SERVICE_ROLE" \
  app/ lib/ \
  --include="*.ts" --include="*.tsx" \
  2>/dev/null | grep -v "lib/supabase/server.ts" || true)

if [ -n "$SVCKEY" ]; then
  echo "  FAIL — service_role reference outside authorized location:"
  echo "$SVCKEY"
  FAIL=1
else
  echo "  PASS"
fi

# ── Check 6: middleware.ts line count ──────────────────────────
echo ""
echo "CHECK 6: middleware.ts <= 30 lines"
MW_LINES=$(wc -l < middleware.ts 2>/dev/null || echo "0")
if [ "$MW_LINES" -gt 30 ]; then
  echo "  FAIL — middleware.ts is $MW_LINES lines (max: 30)"
  FAIL=1
else
  echo "  PASS — $MW_LINES lines"
fi

# ── Check 7: All API routes use getUser() auth guard ────────────
# Admin override (DEC-MK-084): Admin uses direct getUser() pattern
# instead of createApiRoute(). Every PATCH/POST/DELETE must call
# getUser() for auth.
# Whitelist: cron routes use CRON_SECRET header auth, not getUser().
echo ""
echo "CHECK 7: API routes use getUser() auth guard"
ROUTES=$(find app/api -name "route.ts" 2>/dev/null || true)
MISSING_AUTH=""

# Cron routes authenticated via CRON_SECRET, not user sessions
CRON_WHITELIST="psib-match|geo-match|psib-campaign|geo-campaign"

for route in $ROUTES; do
  if echo "$route" | grep -qE "$CRON_WHITELIST"; then
    continue
  fi
  if grep -q "export async function PATCH\|export async function POST\|export async function DELETE" "$route" 2>/dev/null; then
    if ! grep -q "getUser()" "$route" 2>/dev/null; then
      MISSING_AUTH="$MISSING_AUTH\n  $route"
    fi
  fi
done

if [ -n "$MISSING_AUTH" ]; then
  echo "  FAIL — API routes missing getUser() auth guard:$MISSING_AUTH"
  FAIL=1
else
  echo "  PASS"
fi

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo "========================="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL CHECKS PASSED ✅"
  exit 0
else
  echo "TYPE DRIFT DETECTED ❌ — Fix violations before merging."
  exit 1
fi
