#!/bin/bash
set -e

# Configuration variables
REGION="asia-south2"
REPOSITORY="mindfulflow"

echo "=============================================="
echo " MindfulFlow GCP Deployment Helper Script     "
echo "=============================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: Google Cloud SDK (gcloud) is not installed. Please install it first: https://cloud.google.com/sdk"
    exit 1
fi

# Get/Confirm GCP Project ID
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    read -p "Enter your GCP Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
else
    read -p "Deploying to active project [$CURRENT_PROJECT]? (Y/N): " choice
    case "$choice" in 
      [nN]* ) 
        read -p "Enter GCP Project ID to use: " PROJECT_ID
        gcloud config set project "$PROJECT_ID"
        ;;
      * )
        PROJECT_ID=$CURRENT_PROJECT
        ;;
    esac
fi

echo -e "\nSetting Project ID to $PROJECT_ID..."

# Enable GCP Services
echo -e "\nEnabling Google APIs (Cloud Run, Cloud Build, Artifact Registry, Secret Manager)..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# Secret Manager Setup
echo -e "\nSetting up Gemini API Key in Secret Manager..."
if ! gcloud secrets list --filter="name:GEMINI_API_KEY" --format="value(name)" 2>/dev/null | grep -q "GEMINI_API_KEY"; then
    read -s -p "Enter your Google Gemini API Key: " API_KEY
    echo ""
    if [ -z "$API_KEY" ]; then
        echo "Error: Gemini API Key cannot be empty."
        exit 1
    fi
    # Create secret
    gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
    # Set value
    echo -n "$API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
    echo "Secret created successfully."
else
    echo "Secret [GEMINI_API_KEY] already exists. Skipping creation."
fi

# Grant permissions to service account
echo -e "\nGranting Secret Access permissions to Compute Engine Service Account..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

# Grant permissions to Cloud Build Service Account to allow querying and deploying Cloud Run
echo -e "\nGranting Cloud Run permissions to Cloud Build Service Account..."
BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILD_SERVICE_ACCOUNT" \
  --role="roles/run.developer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILD_SERVICE_ACCOUNT" \
  --role="roles/run.viewer"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --member="serviceAccount:$BUILD_SERVICE_ACCOUNT" \
  --role="roles/iam.serviceAccountUser"

# Artifact Registry Repository Creation
echo -e "\nChecking Artifact Registry repository [$REPOSITORY] in region [$REGION]..."
if ! gcloud artifacts repositories list --location="$REGION" --filter="name:projects/$PROJECT_ID/locations/$REGION/repositories/$REPOSITORY" --format="value(name)" 2>/dev/null | grep -q "$REPOSITORY"; then
    echo "Creating Docker Artifact Registry repository [$REPOSITORY]..."
    gcloud artifacts repositories create "$REPOSITORY" \
      --repository-format=docker \
      --location="$REGION" \
      --description="MindfulFlow container registry"
else
    echo "Repository [$REPOSITORY] already exists."
fi

# Execute Google Cloud Build
echo -e "\nTriggering Google Cloud Build to compile and deploy services..."
gcloud builds submit --config=cloudbuild.yaml --substitutions=_REGION=$REGION,_REPOSITORY=$REPOSITORY

echo -e "\n=============================================="
echo " Deployment Complete!"
echo "=============================================="
