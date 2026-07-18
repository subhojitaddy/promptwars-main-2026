# API Reference Documentation

This document lists all available REST API endpoints for the **MindfulFlow** backend.

---

## Global API Requirements

### Base URL
All routes are prefixed with `/api`.
* Local: `http://localhost:8000/api`
* In-Docker: `http://backend:8000/api`

### Header Authentication / Isolation
MindfulFlow does not require email/password signups. Instead, it isolates user data using a custom HTTP header:
* **Header**: `X-User-Id`
* **Format**: String (UUIDv4 recommended)
* **Behavior**: If missing, queries default to `"default_user"`. For public deployments, the client must send a unique browser token in this header to ensure data privacy.

### Response Format
All responses return JSON payloads with standard HTTP status codes.

---

## 1. Diagnostics & Infrastructure

### Deep Health Check
Validates application status, SQLite database connectivity, and Gemini API initialization.

* **Method**: `GET`
* **Endpoint**: `/api/health`
* **Request Headers**: *None required*
* **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "database": "connected",
    "gemini_client": "initialized",
    "timestamp": "2026-07-18T07:12:27.708131+00:00"
  }
  ```
* **Response (503 Service Unavailable)**:
  Returned if the database connection fails or the Gemini client fails to initialize.

---

## 2. Habits Endpoints

### List Habits
Retrieves all habits configured for the active user session.

* **Method**: `GET`
* **Endpoint**: `/api/habits`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "user_id": "user_session_uuid",
      "name": "Reduce Screen Time",
      "category": "Productivity",
      "target_description": "Limit phone usage before bed",
      "streak": 3,
      "longest_streak": 5,
      "last_checked_date": "2026-07-17",
      "created_at": "2026-07-14T09:00:00Z"
    }
  ]
  ```

### Create Habit
Registers a new habit to track.

* **Method**: `POST`
* **Endpoint**: `/api/habits`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Request Body**:
  ```json
  {
    "name": "Limit Social Media",
    "category": "Mental Health",
    "target_description": "Under 30 minutes daily"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": 2,
    "user_id": "user_session_uuid",
    "name": "Limit Social Media",
    "category": "Mental Health",
    "target_description": "Under 30 minutes daily",
    "streak": 0,
    "longest_streak": 0,
    "last_checked_date": null,
    "created_at": "2026-07-18T12:00:00Z"
  }
  ```

### Get Habit Details
Retrieves details for a specific habit.

* **Method**: `GET`
* **Endpoint**: `/api/habits/{id}`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "name": "Reduce Screen Time",
    "category": "Productivity",
    "streak": 3,
    "longest_streak": 5
  }
  ```
* **Response (404 Not Found)**:
  If the habit does not exist or belongs to another user.

### Delete Habit
Deletes a habit and all associated craving logs.

* **Method**: `DELETE`
* **Endpoint**: `/api/habits/{id}`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  {
    "message": "Habit deleted successfully."
  }
  ```

### Habit Checkin
Records a successful day. Increments the habit streak.

* **Method**: `POST`
* **Endpoint**: `/api/habits/{id}/checkin`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "name": "Reduce Screen Time",
    "streak": 4,
    "longest_streak": 5,
    "last_checked_date": "2026-07-18"
  }
  ```
* **Response (400 Bad Request)**:
  Returned if the habit was already checked in today.

---

## 3. Craving Logs Endpoints

### List Craving Logs (Bulk)
Retrieves all logged cravings and slips for the user.

* **Method**: `GET`
* **Endpoint**: `/api/logs`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  [
    {
      "id": 12,
      "habit_id": 1,
      "user_id": "user_session_uuid",
      "severity": 4,
      "trigger_context": "Bored in afternoon",
      "mood": "Restless",
      "was_resisted": true,
      "created_at": "2026-07-18T05:00:00Z"
    }
  ]
  ```

### Log Craving
Logs a craving episode, updating the habit streak if the user slipped.

* **Method**: `POST`
* **Endpoint**: `/api/logs`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Request Body**:
  ```json
  {
    "habit_id": 1,
    "severity": 5,
    "trigger_context": "Stressful work email",
    "mood": "Anxious",
    "was_resisted": false
  }
  ```
* **Response (201 Created)**:
  Returns the saved log. If `was_resisted` is `false` (slip-up), the parent habit's streak is reset to `0`.
  ```json
  {
    "id": 13,
    "habit_id": 1,
    "severity": 5,
    "was_resisted": false
  }
  ```

---

## 4. AI Coach Endpoints

### Get Chat History
Fetches recent dialogue history between the user and the CBT Habit Coach.

* **Method**: `GET`
* **Endpoint**: `/api/chat`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  [
    {
      "id": 101,
      "user_id": "user_session_uuid",
      "sender": "user",
      "text": "Help me reduce screen time",
      "created_at": "2026-07-18T07:00:00Z"
    },
    {
      "id": 102,
      "user_id": "user_session_uuid",
      "sender": "coach",
      "text": "Reducing screen time is a great goal...",
      "created_at": "2026-07-18T07:00:05Z"
    }
  ]
  ```

### Post Message
Sends a message to the AI coach and retrieves an empathetic, CBT-focused response.

* **Method**: `POST`
* **Endpoint**: `/api/chat`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Request Body**:
  ```json
  {
    "sender": "user",
    "text": "I feel bored and want to open social media"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "id": 104,
    "user_id": "user_session_uuid",
    "sender": "coach",
    "text": "I hear you. Boredom is a very common trigger...",
    "created_at": "2026-07-18T07:05:10Z"
  }
  ```

---

## 5. GenAI Grounding & Nudges

### Generate Intelligent Nudge
Fetches a dynamically tailored motivation sentence for the user dashboard based on their current habit streaks and recent cravings.

* **Method**: `GET`
* **Endpoint**: `/api/grounding/nudge`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Response (200 OK)**:
  ```json
  {
    "nudge": "Fantastic work resisting that craving yesterday! Try moving your phone out of the bedroom tonight."
  }
  ```

### SOS Grounding Exercise
Generates an immediate, custom sensory grounding distraction (5-4-3-2-1 rule) tailored to their target habit and emotional trigger.

* **Method**: `POST`
* **Endpoint**: `/api/grounding`
* **Request Headers**:
  * `X-User-Id`: `user_session_uuid`
* **Request Body**:
  ```json
  {
    "habit_id": 1,
    "current_mood": "Anxious"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "response": "### 5-4-3-2-1 Grounding Exercise\n\n* **5 things you see**: Look around and name 5 colors...\n* **4 things you feel**: Touch your desk, feel your feet on the floor...\n..."
  }
  ```
