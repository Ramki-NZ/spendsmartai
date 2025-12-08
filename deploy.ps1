# deploy.ps1 (Fixed: Node 20 & Correct Deploy Command)
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

# --- 3. Generate Cloud Build Config ---
$ImageUrl = "$Region-docker.pkg.dev/$ProjectId/$RepoName/$ImageName`:latest"
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
Set-Content -Path "cloudbuild.yaml" -Value $YamlContent

# --- 4. Submit Build ---
Write-Host ">>> Submitting Build to Google Cloud..." -ForegroundColor Cyan
gcloud builds submit . --config cloudbuild.yaml --substitutions "_GEMINI_API_KEY=$env:GEMINI_API_KEY"

# --- 5. Infrastructure ---
Write-Host ">>> Applying Terraform..." -ForegroundColor Cyan
terraform init
terraform apply -auto-approve

# --- 6. Force Service Update ---
Write-Host ">>> Forcing Service to pick up new Image..." -ForegroundColor Cyan
$ServiceName = "$ProjectId-www-service"

# We explicitly tell Cloud Run to redeploy the 'latest' tag image
gcloud run services update $ServiceName `
  --image $ImageUrl `
  --region $Region `
  --quiet

Write-Host ">>> Deployment Complete!" -ForegroundColor Green