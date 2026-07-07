import io
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
from langdetect import detect, LangDetectException
from scripts import SCRIPTS, get_script
from scorer import validate_duration, score_pronunciation

load_dotenv()

app = FastAPI(title="Pronunciation Scorer")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/scripts")
def list_scripts():
    return [
        {"id": s["id"], "title": s["title"], "category": s["category"], "text": s["text"]}
        for s in SCRIPTS
    ]


@app.post("/analyze")
async def analyze(
    audio: UploadFile = File(...),
    script_id: str = Form(...),
):
    script = get_script(script_id)
    if not script:
        raise HTTPException(status_code=404, detail=f"Script '{script_id}' not found.")

    audio_bytes = await audio.read()

    # 1. Validate duration — in-memory, never stored
    try:
        validate_duration(audio_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 2. Transcribe with Groq Whisper
    try:
        transcription = groq_client.audio.transcriptions.create(
            file=(audio.filename or "audio.wav", io.BytesIO(audio_bytes)),
            model="whisper-large-v3-turbo",
            response_format="verbose_json",
            timestamp_granularities=["word"],
            language="en",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)}")

    transcript_text = transcription.text or ""
    transcript_words = [
        {
            "word": w["word"] if isinstance(w, dict) else w.word,
            "start": w.get("start", 0) if isinstance(w, dict) else getattr(w, "start", 0),
            "end": w.get("end", 0) if isinstance(w, dict) else getattr(w, "end", 0),
            "probability": w.get("probability", 0.8) if isinstance(w, dict) else getattr(w, "probability", 0.8),
        }
        for w in (transcription.words or [])
    ]

    # 3. Language detection
    if transcript_text.strip():
        try:
            lang = detect(transcript_text)
            if lang != "en":
                return {
                    "error": "non_english",
                    "message": f"Detected language: {lang}. Please speak in English.",
                    "score": None,
                }
        except LangDetectException:
            pass  # too short to detect — proceed

    # 4. Score pronunciation
    result = score_pronunciation(
        script_text=script["text"],
        transcript_words=transcript_words,
    )
    result["script_id"] = script_id
    result["transcript"] = transcript_text
    return result
