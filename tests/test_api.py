from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "JARVIS CORE"
    assert data["status"] == "online"
    assert "agents" in data


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_system_status():
    response = client.get("/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "agents" in data
    assert "llm_model" in data


def test_reminders_empty():
    response = client.get("/reminders")
    assert response.status_code == 200
    data = response.json()
    assert "reminders" in data


def test_create_reminder():
    response = client.post("/reminders", json={
        "title": "Test Reminder",
        "due_at": "2025-12-31T10:00:00",
        "priority": "high",
    })
    assert response.status_code == 200
    assert response.json()["id"] >= 1


def test_calendar_empty():
    response = client.get("/calendar")
    assert response.status_code == 200
    assert "events" in response.json()


def test_create_calendar_event():
    response = client.post("/calendar", json={
        "title": "Test Event",
        "start_at": "2025-12-31T14:00:00",
    })
    assert response.status_code == 200
    assert response.json()["id"] >= 1


def test_health_log():
    response = client.post("/health/log", json={
        "category": "food",
        "value": "Oatmeal",
        "notes": "Breakfast",
    })
    assert response.status_code == 200
    assert response.json()["id"] >= 1


def test_health_summary():
    response = client.get("/health/summary")
    assert response.status_code == 200
    assert "summary" in response.json()


def test_health_logs():
    response = client.get("/health/logs")
    assert response.status_code == 200
    assert "logs" in response.json()


def test_conversations():
    response = client.get("/conversations")
    assert response.status_code == 200
    assert "conversations" in response.json()


def test_tasks():
    response = client.get("/tasks")
    assert response.status_code == 200
    assert "tasks" in response.json()


# ── Alarm endpoints ──────────────────────────────────────

def test_alarms_empty():
    response = client.get("/alarms")
    assert response.status_code == 200
    assert "alarms" in response.json()


def test_create_alarm():
    response = client.post("/alarms", json={
        "label": "Wake Up",
        "time": "07:30",
    })
    assert response.status_code == 200
    assert response.json()["id"] >= 1


def test_delete_alarm():
    res = client.post("/alarms", json={"label": "Del", "time": "08:00"})
    alarm_id = res.json()["id"]
    del_res = client.delete(f"/alarms/{alarm_id}")
    assert del_res.status_code == 200


# ── Music endpoints ──────────────────────────────────────

def test_music_now_playing():
    response = client.get("/music/now-playing")
    assert response.status_code == 200
    assert "track" in response.json()


def test_music_stop():
    response = client.post("/music/stop")
    assert response.status_code == 200
    assert response.json()["success"] is True


# ── Weather endpoint ─────────────────────────────────────

def test_weather():
    response = client.get("/weather")
    assert response.status_code == 200
    data = response.json()
    assert "city" in data


# ── Voice toggle ─────────────────────────────────────────

def test_voice_status():
    response = client.get("/voice/status")
    assert response.status_code == 200
    assert "muted" in response.json()


def test_voice_toggle_mute():
    response = client.post("/voice/toggle-mute")
    assert response.status_code == 200
    assert "muted" in response.json()
