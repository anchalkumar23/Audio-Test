import io
import pytest
from fastapi.testclient import TestClient
from pydub import AudioSegment
from main import app

client = TestClient(app)


def make_wav(duration_ms: int) -> bytes:
    audio = AudioSegment.silent(duration=duration_ms)
    buf = io.BytesIO()
    audio.export(buf, format="wav")
    return buf.getvalue()


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_scripts_returns_five():
    resp = client.get("/scripts")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5
    assert all("id" in s and "text" in s for s in data)


def test_analyze_too_short():
    audio = make_wav(10_000)
    resp = client.post(
        "/analyze",
        files={"audio": ("test.wav", audio, "audio/wav")},
        data={"script_id": "news"},
    )
    assert resp.status_code == 422
    assert "30" in resp.json()["detail"]


def test_analyze_too_long():
    audio = make_wav(50_000)
    resp = client.post(
        "/analyze",
        files={"audio": ("test.wav", audio, "audio/wav")},
        data={"script_id": "news"},
    )
    assert resp.status_code == 422
    assert "45" in resp.json()["detail"]


def test_analyze_invalid_script_id():
    audio = make_wav(35_000)
    resp = client.post(
        "/analyze",
        files={"audio": ("test.wav", audio, "audio/wav")},
        data={"script_id": "does_not_exist"},
    )
    assert resp.status_code == 404
