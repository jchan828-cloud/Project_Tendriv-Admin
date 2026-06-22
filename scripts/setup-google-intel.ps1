<#
.SYNOPSIS
  B2B-INTEL-001 — Google Cloud setup for the intelligence pipeline (PowerShell).

.DESCRIPTION
  Native PowerShell equivalent of setup-google-intel.sh, for Windows dev boxes
  where the bash/WSL shim isn't available. Run after: gcloud auth login

  Two things this script CANNOT do (Google has no CLI/API for them):
    1. Create a billing ACCOUNT (make one in the console w/ a card, then pass
       its id via -BillingAccountId).
    2. Create the Programmable Search Engine (the `cx` id). Create it at
       https://programmablesearchengine.google.com and add these sites:
         linkedin.com/in/*
         jobs.lever.co/*
         boards.greenhouse.io/*
       Then use its "Search engine ID" as GOOGLE_CUSTOM_SEARCH_ENGINE_ID.

.EXAMPLE
  ./scripts/setup-google-intel.ps1 -ProjectId tendriv-b2b-intel `
    -BillingAccountId 011473-221110-1F7087
#>
param(
  [Parameter(Mandatory = $true)] [string] $ProjectId,
  [string] $BillingAccountId = '',
  [string] $KeyName = 'tendriv-b2b-intel-key'
)

$ErrorActionPreference = 'Stop'

$PlacesApi = 'places.googleapis.com'
$SearchApi = 'customsearch.googleapis.com'
$GeminiApi = 'generativelanguage.googleapis.com'
# For the Vertex (service-account) path instead of an API key, also enable:
# $VertexApi = 'aiplatform.googleapis.com'

Write-Host '==> 1. Create project (ignored if it already exists)'
gcloud projects create $ProjectId 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "    project $ProjectId already exists - continuing" }
gcloud config set project $ProjectId

if ($BillingAccountId) {
  Write-Host '==> 2. Link billing account'
  gcloud billing projects link $ProjectId --billing-account=$BillingAccountId
} else {
  Write-Host '==> 2. SKIPPED billing link (-BillingAccountId not set).'
  Write-Host "    APIs below require billing - link it before the pipeline will work:"
  Write-Host "    gcloud billing projects link $ProjectId --billing-account=XXXX"
}

Write-Host '==> 3. Enable APIs'
gcloud services enable $PlacesApi $SearchApi $GeminiApi

Write-Host '==> 4. Create a restricted API key'
gcloud services api-keys create `
  --display-name="$KeyName" `
  --api-target=service=$PlacesApi `
  --api-target=service=$SearchApi `
  --api-target=service=$GeminiApi

Write-Host ''
Write-Host '==> 5. Retrieve the key string'
$KeyId = gcloud services api-keys list --filter="displayName=$KeyName" --format='value(uid)'
$KeyString = gcloud services api-keys get-key-string $KeyId --format='value(keyString)'

Write-Host ''
Write-Host '==> Done. The same key works for all three APIs:'
Write-Host "    GOOGLE_PLACES_API_KEY=$KeyString"
Write-Host "    GOOGLE_CUSTOM_SEARCH_API_KEY=$KeyString   # or omit to reuse GOOGLE_PLACES_API_KEY"
Write-Host "    GEMINI_API_KEY=$KeyString"
Write-Host '    GOOGLE_CUSTOM_SEARCH_ENGINE_ID=<cx from programmablesearchengine.google.com>'
Write-Host ''
Write-Host '==> Push them to Vercel (optional):'
Write-Host '    vercel env add GOOGLE_PLACES_API_KEY production'
Write-Host '    vercel env add GEMINI_API_KEY production'
Write-Host '    vercel env add GOOGLE_CUSTOM_SEARCH_ENGINE_ID production'
