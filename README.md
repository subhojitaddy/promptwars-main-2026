# MindfulFlow - GenAI Habit Reclamation Assistant

MindfulFlow is a containerized, enterprise-grade web application designed to help users break bad habits and resist cravings. By combining cognitive behavioral therapy (CBT) principles with real-time generative AI, MindfulFlow provides personalized coaching, adaptive grounding techniques, and dashboard reflection nudges.

---

## 🌟 Core Features

1. **Personalized Habit Tracking**: Add, list, and delete habits with streaks, target metrics, and custom trigger classifications.
2. **GenAI Coach**: Conversation-based CBT mentor with contextual memory (remembers the last 15 messages) powered by Google Gemini.
3. **Adaptive Grounding (SOS Panic)**: Immediate sensory distraction (5-4-3-2-1 exercise) generated dynamically based on user habits and their current mood.
4. **Intelligent Dashboard Nudges**: Tailored motivational nudges loaded dynamically on the user dashboard.
5. **Anonymous Session Isolation**: Zero-friction data privacy. The UI automatically generates a client UUID stored in `localStorage` and appends it via the `X-User-Id` header, isolating data on shared public deployments.
6. **Robust Infrastructure & Diagnostics**: Custom proxy-aware rate-limiting (handles GKE/NGINX proxy headers) and deep health check probes checking database and API connectivity.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Nginx
* **Backend**: FastAPI, Uvicorn, SQLAlchemy ORM
* **Database**: SQLite (persisted on persistent volume mounts)
* **AI Layer**: Google GenAI SDK (`google-genai`), targeting `gemini-flash-latest`

---

## 🚀 Getting Started

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended for containerized run)
* Node.js (18+) and Python (3.11+) (if running manually)
* A Google Gemini API Key ([Get one here](https://aistudio.google.com/))

### Option 1: Quick Start with Docker (Recommended)

1. Clone this repository and create a `.env` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Build and start the application containers:
   ```bash
   docker compose up --build -d
   ```
3. Access the application:
   * **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
   * **Backend REST API**: [http://localhost:8000](http://localhost:8000)
   * **API Health Diagnostics**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option 2: Manual Local Installation

#### 1. Backend Setup
```bash
# Navigate to backend folder
cd backend

# Create & activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the environment configuration
# Copy variables from root .env or define GEMINI_API_KEY env variable

# Run server
uvicorn main:app --reload
```

#### 2. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install packages
npm install

# Run development server
npm run dev
```

---

## 🧪 Running Tests

A comprehensive integration and unit test suite covers general CRUD routes, rate-limiting edge cases, payload size enforcement, and multi-user data isolation.

### Running inside Docker
Ensure the containers are running, then execute:
```bash
docker exec mindfulflow-backend pytest
```

### Running locally
From the `/backend` folder, run:
```bash
pytest
```

---

## 🚢 Deployment (GCP Readiness)

This application is containerized and ready to be deployed on GCP (Google Cloud Platform) using Cloud Run or GKE (Google Kubernetes Engine). Please refer to the step-by-step **[GCP Cloud Run Deployment Guide](file:///c:/Users/subho/Documents/GitHub/promptwars-main-2026/docs/gcp_deployment.md)** to execute automated builds and setups:

1. **Health Check Probes**: The endpoint `/api/health` serves as a deep startup/liveness probe. GKE or Cloud Run can monitor this endpoint to ensure the database volume is connected and the Gemini client is active.
2. **Reverse Proxy Headers**: The backend rate-limiting middleware is configured to parse proxy headers `X-Forwarded-For` and `X-Real-IP`, ensuring client IP addresses are correctly resolved behind Cloud Load Balancers.
3. **Database Volume**: SQLite requires a persistent directory. Ensure a persistent disk is mounted at `/app/data/` in the backend container to prevent data loss on container restarts.
