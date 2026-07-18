import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import unittest.mock as mock

from database import Base
from dependencies import get_db
from main import app
import models
import gemini

# --- API Mock Setup ---
# Force gemini.client to be a mock client during tests to prevent external API calls
mock_client = mock.MagicMock()
gemini.client = mock_client

# Setup in-memory SQLite database using StaticPool for shared connection across tests
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply the database dependency override
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    # Clean and recreate tables before each test
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Reset mock client configurations before each test
    mock_client.reset_mock()
    mock_client.models.generate_content.side_effect = None
    mock_client.models.generate_content.return_value = mock.MagicMock()
    
    yield
    # Clean up tables after test
    Base.metadata.drop_all(bind=engine)


# --- API TESTS ---

def test_health_check():
    """Verify backend is healthy and responding"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_get_habits():
    """Verify habit creation and retrieval contract"""
    response = client.post(
        "/api/habits",
        json={"name": "Reduce Screen Time", "category": "Digital", "target_description": "Limit phone in bed"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Reduce Screen Time"
    assert data["category"] == "Digital"
    assert data["streak"] == 0
    assert data["id"] is not None

    response_list = client.get("/api/habits")
    assert response_list.status_code == 200
    assert len(response_list.json()) == 1
    assert response_list.json()[0]["name"] == "Reduce Screen Time"


def test_habit_checkin_streak():
    """Verify daily check-in consecutive day streak calculations"""
    response = client.post(
        "/api/habits",
        json={"name": "No Sugar", "category": "Health", "target_description": "Eat whole foods"}
    )
    habit_id = response.json()["id"]

    # First checkin increments streak to 1
    response_checkin = client.post(f"/api/habits/{habit_id}/checkin")
    assert response_checkin.status_code == 200
    assert response_checkin.json()["streak"] == 1
    assert response_checkin.json()["longest_streak"] == 1

    # Consecutive checkin on the same day must not increment the streak further
    response_double = client.post(f"/api/habits/{habit_id}/checkin")
    assert response_double.status_code == 200
    assert response_double.json()["streak"] == 1


def test_craving_log_resisted():
    """Verify log creation for successfully resisted urge events"""
    response = client.post(
        "/api/habits",
        json={"name": "Gaming moderation", "category": "Productivity"}
    )
    habit_id = response.json()["id"]

    log_response = client.post(
        "/api/logs",
        json={
            "habit_id": habit_id,
            "severity": 4,
            "trigger_context": "Boredom",
            "mood": "Restless",
            "was_resisted": True,
            "notes": "Focused on box breathing"
        }
    )
    assert log_response.status_code == 201
    assert log_response.json()["was_resisted"] is True
    assert log_response.json()["severity"] == 4


def test_craving_log_slip_resets_streak():
    """Verify that logging a habit slip resets the active streak counter to 0"""
    response = client.post(
        "/api/habits",
        json={"name": "Reduce Coffee", "category": "Health"}
    )
    habit_id = response.json()["id"]

    # Checkin to establish a streak of 1
    client.post(f"/api/habits/{habit_id}/checkin")
    assert client.get(f"/api/habits/{habit_id}").json()["streak"] == 1

    # Log a habit slip (was_resisted = False)
    client.post(
        "/api/logs",
        json={
            "habit_id": habit_id,
            "severity": 5,
            "trigger_context": "Morning fatigue",
            "mood": "Exhausted",
            "was_resisted": False
        }
    )

    # Streak must be reset to 0
    response_detail = client.get(f"/api/habits/{habit_id}")
    assert response_detail.json()["streak"] == 0


def test_chat_coaching_happy_path():
    """Verify AI coaching chat contract with mocked Gemini API response"""
    # Configure mock response from Gemini
    mock_response = mock.MagicMock()
    mock_response.text = "Identify your triggers. Reframing the trigger is key."
    mock_client.models.generate_content.return_value = mock_response

    # Send user reflection
    response = client.post(
        "/api/chat",
        json={"sender": "user", "text": "I feel an urge to scroll on Instagram."}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["sender"] == "coach"
    assert data["text"] == "Identify your triggers. Reframing the trigger is key."

    # Validate chat sequence log in SQLite database
    history_res = client.get("/api/chat")
    assert len(history_res.json()) == 2
    assert history_res.json()[0]["text"] == "I feel an urge to scroll on Instagram."


def test_chat_coaching_api_error():
    """Verify error isolation: backend returns a CBT fallback if Gemini API fails"""
    # Simulate API quota exceeded or connection failure
    mock_client.models.generate_content.side_effect = Exception("Google GenAI: Quota exceeded")

    response = client.post(
        "/api/chat",
        json={"sender": "user", "text": "I want to eat junk food."}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["sender"] == "coach"
    # Fallback message must inform about the connection warning safely
    assert "connection error" in data["text"]


def test_intelligent_nudge_mocked():
    """Verify automated motivation engine generates custom nudges using API mocks"""
    # Configure habit context
    client.post(
        "/api/habits",
        json={"name": "Reduce Screen Time", "category": "Digital"}
    )

    mock_response = mock.MagicMock()
    mock_response.text = "Put your phone down. Watch the sunset instead."
    mock_client.models.generate_content.return_value = mock_response

    response = client.get("/api/nudge")
    assert response.status_code == 200
    assert response.json()["response"] == "Put your phone down. Watch the sunset instead."


def test_grounding_session_mocked():
    """Verify emergency SOS grounding exercises fetch customized instructions using API mocks"""
    # Configure habit context
    habit_res = client.post(
        "/api/habits",
        json={"name": "Stop Sugar Cravings", "category": "Health"}
    )
    habit_id = habit_res.json()["id"]

    mock_response = mock.MagicMock()
    mock_response.text = "Mindfulness exercise: Feel your feet flat on the floor."
    mock_client.models.generate_content.return_value = mock_response

    response = client.post(
        "/api/grounding",
        json={"habit_id": habit_id, "current_mood": "Anxious"}
    )
    assert response.status_code == 200
    assert response.json()["response"] == "Mindfulness exercise: Feel your feet flat on the floor."


def test_payload_size_limit():
    """Verify that request payloads larger than 1MB are rejected with 413 HTTP status code"""
    large_payload = " " * (1_048_576 + 100)
    response = client.post(
        "/api/chat", 
        content=large_payload, 
        headers={"Content-Length": str(len(large_payload))}
    )
    assert response.status_code == 413
    assert "payload too large" in response.text


def test_get_logs_bulk():
    """Verify retrieval of all craving logs bulk endpoint"""
    # 1. Create a habit
    habit_res = client.post(
        "/api/habits",
        json={"name": "Bulk Log Habit", "category": "Health"}
    )
    habit_id = habit_res.json()["id"]

    # 2. Add two craving logs
    client.post(
        "/api/logs",
        json={"habit_id": habit_id, "severity": 3, "trigger_context": "Boredom", "mood": "Restless", "was_resisted": True}
    )
    client.post(
        "/api/logs",
        json={"habit_id": habit_id, "severity": 5, "trigger_context": "Stress", "mood": "Tense", "was_resisted": False}
    )

    # 3. Retrieve logs via bulk endpoint
    res = client.get("/api/logs")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["severity"] == 3
    assert data[1]["severity"] == 5
    assert data[1]["was_resisted"] is False


def test_multi_user_isolation():
    """Verify that User A cannot see or modify User B's habits"""
    # 1. User A creates a habit
    res_a = client.post(
        "/api/habits",
        json={"name": "User A Habit", "category": "Health"},
        headers={"X-User-Id": "user_a"}
    )
    assert res_a.status_code == 201
    habit_a_id = res_a.json()["id"]

    # 2. User B creates a habit
    res_b = client.post(
        "/api/habits",
        json={"name": "User B Habit", "category": "Productivity"},
        headers={"X-User-Id": "user_b"}
    )
    assert res_b.status_code == 201
    
    # 3. User B queries habits - should only see User B's habit
    res_query_b = client.get("/api/habits", headers={"X-User-Id": "user_b"})
    assert res_query_b.status_code == 200
    habits_b = res_query_b.json()
    assert len(habits_b) == 1
    assert habits_b[0]["name"] == "User B Habit"

    # 4. User B tries to query User A's habit detail - should fail with 404
    res_detail_b = client.get(f"/api/habits/{habit_a_id}", headers={"X-User-Id": "user_b"})
    assert res_detail_b.status_code == 404



