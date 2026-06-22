#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# B2B-INTEL-001 — Google Cloud setup for the intelligence pipeline
#
# Automates everything that gcloud CAN do. Run locally after:
#   gcloud auth login
#
# Two things this script CANNOT do (Google has no CLI/API for them):
#   1. Create a billing ACCOUNT (make one in the console w/ a card, then
#      put its id in BILLING_ACCOUNT_ID below).
#   2. Create the Programmable Search Engine (the `cx` id). Create it at
#      https://programmablesearchengine.google.com and add these sites:
#         linkedin.com/in/*
#         jobs.lever.co/*
#         boards.greenhouse.io/*
#      Then copy its "Search engine ID" into GOOGLE_CUSTOM_SEARCH_ENGINE_ID.
#
# Usage:
#   PROJECT_ID=tendriv-b2b-intel BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX \
#     bash scripts/setup-google-intel.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID (e.g. tendriv-b2b-intel)}"
BILLING_ACCOUNT_ID="${BILLING_ACCOUNT_ID:-}"   # optional; link skipped if empty
KEY_NAME="${KEY_NAME:-tendriv-b2b-intel-key}"

PLACES_API="places.googleapis.com"
SEARCH_API="customsearch.googleapis.com"
GEMINI_API="generativelanguage.googleapis.com"
# Uncomment if you use the Vertex (service-account) path instead of an API key:
# VERTEX_API="aiplatform.googleapis.com"

echo "==> 1. Create project (ignored if it already exists)"
gcloud projects create "$PROJECT_ID" 2>/dev/null || \
  echo "    project $PROJECT_ID already exists — continuing"
gcloud config set project "$PROJECT_ID"

if [[ -n "$BILLING_ACCOUNT_ID" ]]; then
  echo "==> 2. Link billing account"
  gcloud billing projects link "$PROJECT_ID" \
    --billing-account="$BILLING_ACCOUNT_ID"
else
  echo "==> 2. SKIPPED billing link (BILLING_ACCOUNT_ID not set)."
  echo "    APIs below require billing — link it before the pipeline will work:"
  echo "    gcloud billing projects link $PROJECT_ID --billing-account=XXXX"
fi

echo "==> 3. Enable APIs"
gcloud services enable \
  "$PLACES_API" "$SEARCH_API" "$GEMINI_API" \
  ${VERTEX_API:-}

echo "==> 4. Create a restricted API key"
gcloud services api-keys create \
  --display-name="$KEY_NAME" \
  --api-target=service="$PLACES_API" \
  --api-target=service="$SEARCH_API" \
  --api-target=service="$GEMINI_API"

echo ""
echo "==> Done. Retrieve the key string with:"
echo "    KEY_ID=\$(gcloud services api-keys list --filter=\"displayName=$KEY_NAME\" --format='value(uid)')"
echo "    gcloud services api-keys get-key-string \"\$KEY_ID\" --format='value(keyString)'"
echo ""
echo "==> Then set these env vars (the same key works for all three APIs):"
echo "    GOOGLE_PLACES_API_KEY=<key>"
echo "    GOOGLE_CUSTOM_SEARCH_API_KEY=<key>      # or omit to reuse GOOGLE_PLACES_API_KEY"
echo "    GEMINI_API_KEY=<key>"
echo "    GOOGLE_CUSTOM_SEARCH_ENGINE_ID=<cx from programmablesearchengine.google.com>"
echo ""
echo "==> Push them to Vercel (optional):"
echo "    for v in GOOGLE_PLACES_API_KEY GEMINI_API_KEY GOOGLE_CUSTOM_SEARCH_ENGINE_ID; do \\"
echo "      vercel env add \$v production; done"
