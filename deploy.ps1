# deploy.ps1
# Deploy SpendSmartAI frontend to Cloud Run via Cloud Build + Terraform

$ErrorActionPreference = "Stop"

# --- 0. Config ----------------------------------------------------------------
$ProjectId = "aisave4u"
$Region    = "asia-southeast1"
$RepoName  = "ai-apps-repo"
$ImageName = "www-app"

# Your Azure tenant (for DNS / Terraform bits)
$TenantId  = "b58e9e4a-3bbd-4472-8e76-9b9e55445d04"

# Fully qualified container image in Artifact Registry
$ImageUrl  = "$Region-docker.pkg.dev/$ProjectId/$RepoName/$ImageName`:latest"

# --- 1. Ensure GEMINI_API_KEY is set -----------------------------------------
if (-not $env:GEMINI_API_KEY) {
    # expects: GEMINI_API_KEY=your-key-here
    $EnvFile = Get-Content "spendsmartai.env" -ErrorAction SilentlyContinue
    if ($EnvFile) {
        $env:GEMINI_API_KEY = ($EnvFile -split "=", 2)[1].Trim()
        Write-Host "Loaded GEMINI_API_KEY from spendsmartai.env" -ForegroundColor Green
    } else {
        Write-Error "GEMINI_API_KEY not set. Set `$env:GEMINI_API_KEY or create spendsmartai.env (GEMINI_API_KEY=...)."
    }
}

# --- 2. Login & basic config --------------------------------------------------
Write-Host ">>> Logging into Azure..." -ForegroundColor Cyan
Connect-AzAccount -Tenant $TenantId -WarningAction SilentlyContinue | Out-Null

Write-Host ">>> Configuring Google Cloud project..." -ForegroundColor Cyan
gcloud config set project $ProjectId | Out-Null

# --- 3. Generate cloudbuild.yaml ---------------------------------------------
Write-Host ">>> Generating cloudbuild.yaml..." -ForegroundColor Cyan

$YamlContent = @"
steps:
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker build --build-arg GEMINI_API_KEY=`$_GEMINI_API_KEY -t $ImageUrl .
images:
  - '$ImageUrl'
"@

Set-Content -Path "cloudbuild.yaml" -Value $YamlContent -Encoding UTF8

# --- 4. Build & push image via Cloud Build -----------------------------------
Write-Host ">>> Submitting Build to Google Cloud..." -ForegroundColor Cyan
gcloud builds submit . `
  --config cloudbuild.yaml `
  --substitutions "_GEMINI_API_KEY=$env:GEMINI_API_KEY"

# --- 5. Terraform infra (Cloud Run, DNS, etc.) -------------------------------
Write-Host ">>> Applying Terraform..." -ForegroundColor Cyan
terraform init
terraform apply -auto-approve

# --- 6. Force Cloud Run to use the new image ---------------------------------
Write-Host ">>> Forcing Service to pick up new Image..." -ForegroundColor Cyan

$ServiceName = "$ProjectId-www-service"   # matches Terraform service name

gcloud run services update $ServiceName --image "$ImageUrl" --region "$Region" --quiet

Write-Host ">>> Deployment Complete!" -ForegroundColor Green
