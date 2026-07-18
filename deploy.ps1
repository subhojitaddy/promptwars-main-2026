# deploy.ps1 - GCP Cloud Run Deployment Automation Script

$Region = "us-central1"
$Repository = "mindfulflow"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " MindfulFlow GCP Deployment Helper Script     " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Google Cloud SDK (gcloud) is not installed or not in PATH. Please install it first: https://cloud.google.com/sdk"
    exit 1
}

# Get/Confirm GCP Project ID
$CurrentProject = gcloud config get-value project 2>$null
if ([string]::IsNullOrEmpty($CurrentProject)) {
    $ProjectId = Read-Host "Enter your GCP Project ID"
    gcloud config set project $ProjectId
} else {
    $Choice = Read-Host "Deploying to active project [$CurrentProject]? (Y/N)"
    if ($Choice.ToLower() -eq 'n') {
        $ProjectId = Read-Host "Enter GCP Project ID to use"
        gcloud config set project $ProjectId
    } else {
        $ProjectId = $CurrentProject
    }
}

Write-Host "`nSetting Project ID to $ProjectId..." -ForegroundColor Green

# Enable GCP Services
Write-Host "`nEnabling Google APIs (Cloud Run, Cloud Build, Artifact Registry, Secret Manager)..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com

# Secret Manager Setup
Write-Host "`nSetting up Gemini API Key in Secret Manager..." -ForegroundColor Yellow
$SecretExists = gcloud secrets list --filter="name:GEMINI_API_KEY" --format="value(name)" 2>$null | Select-String "GEMINI_API_KEY"
if (!$SecretExists) {
    $ApiKey = Read-Host "Enter your Google Gemini API Key"
    if ([string]::IsNullOrEmpty($ApiKey)) {
        Write-Error "Gemini API Key cannot be empty."
        exit 1
    }
    # Create secret
    gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
    # Set value using temporary file safely
    [System.IO.File]::WriteAllText("$env:TEMP\temp_key.txt", $ApiKey)
    gcloud secrets versions add GEMINI_API_KEY --data-file="$env:TEMP\temp_key.txt"
    Remove-Item "$env:TEMP\temp_key.txt"
    Write-Host "Secret created successfully." -ForegroundColor Green
} else {
    Write-Host "Secret [GEMINI_API_KEY] already exists. Skipping creation." -ForegroundColor Green
}

# Grant permissions to service account
Write-Host "`nGranting Secret Access permissions to Compute Engine Service Account..." -ForegroundColor Yellow
$ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$ServiceAccount = "${ProjectNumber}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY `
  --member="serviceAccount:$ServiceAccount" `
  --role="roles/secretmanager.secretAccessor"

# Artifact Registry Repository Creation
Write-Host "`nChecking Artifact Registry repository [$Repository] in region [$Region]..." -ForegroundColor Yellow
$RepoExists = gcloud artifacts repositories list --location=$Region --filter="name:projects/$ProjectId/locations/$Region/repositories/$Repository" --format="value(name)" 2>$null | Select-String "$Repository"
if (!$RepoExists) {
    Write-Host "Creating Docker Artifact Registry repository [$Repository]..." -ForegroundColor Yellow
    gcloud artifacts repositories create $Repository `
      --repository-format=docker `
      --location=$Region `
      --description="MindfulFlow container registry"
} else {
    Write-Host "Repository [$Repository] already exists." -ForegroundColor Green
}

# Execute Google Cloud Build
Write-Host "`nTriggering Google Cloud Build to compile and deploy services..." -ForegroundColor Yellow
gcloud builds submit --config=cloudbuild.yaml --substitutions=_REGION=$Region,_REPOSITORY=$Repository

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
