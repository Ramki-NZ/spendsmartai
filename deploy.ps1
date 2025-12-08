# deploy.ps1 (Cloud Build Version - No Local Docker Required)
$ErrorActionPreference = "Stop"

# --- Configuration ---
$ProjectId = "aisave4u"
$Region = "asia-southeast1"
$RepoName = "ai-apps-repo"
$ImageName = "www-app"
$TenantId = "b58e9e4a-3bbd-4472-8e76-9b9e55445d04" 

# --- 1. Check for API Key ---
if (-not $env:GEMINI_API_KEY) {
    $EnvFile = Get-Content "spendsmartai.env" -ErrorAction SilentlyContinue
    if ($EnvFile) {
        $env:GEMINI_API_KEY = ($EnvFile -split "=")[1].Trim()
        Write-Host "Loaded API Key from file." -ForegroundColor Green
    } else {
        Write-Error "Please set `$env:GEMINI_API_KEY before running this script."
    }
}

# --- 2. Login & Configure ---
Write-Host ">>> Logging into Azure..." -ForegroundColor Cyan
Connect-AzAccount -Tenant $TenantId -ErrorAction SilentlyContinue | Out-Null

Write-Host ">>> Configuring Google Cloud..." -ForegroundColor Cyan
gcloud config set project $ProjectId

# --- 3. Build & Push (Using Cloud Build) ---
Write-Host ">>> submitting Build to Google Cloud..." -ForegroundColor Cyan
$ImageUrl = "$Region-docker.pkg.dev/$ProjectId/$RepoName/$ImageName`:latest"

# usage: gcloud builds submit --config <file> --substitutions <vars>
gcloud builds submit . `
  --config cloudbuild.yaml `
  --substitutions _GEMINI_API_KEY=$env:GEMINI_API_KEY,_IMAGE_URL=$ImageUrl

# --- 4. Deploy Infrastructure ---
Write-Host ">>> Applying Terraform..." -ForegroundColor Cyan
terraform init
terraform apply -auto-approve

Write-Host ">>> Deployment Complete!" -ForegroundColor Green