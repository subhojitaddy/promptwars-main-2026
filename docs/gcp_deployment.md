# GCP Cloud Run Deployment Guide

This guide walks you through deploying the **MindfulFlow** application to Google Cloud Platform (GCP) using **Cloud Build**, **Artifact Registry**, **Cloud Run**, and **Secret Manager**.

---

## 🏗️ Deployment Architecture

* **Frontend**: React served via Nginx in a Cloud Run service (`mindfulflow-frontend`).
* **Backend**: FastAPI web app running on Uvicorn in a Cloud Run service (`mindfulflow-backend`).
* **Secrets**: `GEMINI_API_KEY` is securely stored in GCP Secret Manager and mounted as an environment variable in the backend at runtime.
* **Database**:
  * *Option A (Default)*: Ephemeral SQLite. Great for testing, but data is lost on container cold-starts.
  * *Option B (Production)*: Google Cloud SQL PostgreSQL instance. Enable by setting `DATABASE_URL` env variable in the backend.

---

## 🚀 Setup Steps

### 1. Enable Required GCP APIs
Enable APIs for Cloud Run, Cloud Build, Artifact Registry, and Secret Manager in your GCP Project:
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Create the Gemini API Secret
Store your Gemini API key in Secret Manager:
```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your actual API key as the secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 3. Grant Secret Access to the Cloud Run Service Account
Find your default Compute Engine service account (which Cloud Run uses to execute) and grant it permission to read the secret:
```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Create the Artifact Registry Docker Repository
Create a repository named `mindfulflow` in your target region (e.g., `us-central1`):
```bash
gcloud artifacts repositories create mindfulflow \
  --repository-format=docker \
  --location=us-central1 \
  --description="MindfulFlow container registry"
```

### 5. Build and Deploy Using Cloud Build
Run the build from the project root directory. This uses `cloudbuild.yaml` to build the backend, push it, deploy it, capture its URL, inject it into the frontend build arguments, build/push the frontend, and deploy the frontend:
```bash
gcloud builds submit --config=cloudbuild.yaml
```

---

## 💾 Production Database Setup (Google Cloud SQL)

To prevent data loss from stateless container lifecycles in Cloud Run:

1. Create a Cloud SQL PostgreSQL instance in GCP.
2. Grant the Cloud Run service account access to Cloud SQL:
   ```bash
   gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/cloudsql.client"
   ```
3. Deploy the backend container connecting to the Cloud SQL instance:
   ```bash
   gcloud run deploy mindfulflow-backend \
     --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mindfulflow/backend:latest \
     --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:YOUR_DB_INSTANCE \
     --set-env-vars=DATABASE_URL="postgresql+pg8000://DB_USER:DB_PASS@/DB_NAME?unix_sock=/cloudsql/YOUR_PROJECT_ID:us-central1:YOUR_DB_INSTANCE/.s.PGSQL.5432"
   ```
