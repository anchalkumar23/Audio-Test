# SpeakGrade — English Pronunciation Scorer

Upload or record 30–45 seconds of English speech and get a mathematical pronunciation score with word-level feedback.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 + shadcn/ui + Tailwind v4 |
| Backend | FastAPI (Python 3.13) |
| STT | Groq Whisper API (`whisper-large-v3-turbo`) |
| Phoneme scoring | CMU Pronouncing Dictionary + Levenshtein |
| Language detection | `langdetect` |

---

## Deploy to Hostinger VPS

Everything runs via Docker Compose. Two containers: backend on port `8000`, frontend on port `3000`.

### 1. SSH into your server

```bash
ssh root@187.127.189.33
```

### 2. Install Docker and Docker Compose (if not already installed)

```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

### 3. Clone / upload the project

```bash
# Option A — clone from GitHub
git clone https://github.com/your-username/speakgrade.git
cd speakgrade

# Option B — copy from your machine
# Run this on YOUR machine (not the server):
scp -r "c:/Anchal/Fiverr/Audio test" root@187.127.189.33:~/speakgrade
ssh root@187.127.189.33
cd ~/speakgrade
```

### 4. Set your Groq API key

```bash
cp .env.example .env
nano .env   # paste your GROQ_API_KEY
```

### 5. Build and start

```bash
docker compose up -d --build
```

That's it. Your app is live:

| Service | URL |
|---------|-----|
| Frontend | http://187.127.189.33 |
| Backend API | http://187.127.189.33/api |

Everything goes through nginx on port 80 — no need to open port 3000 or 8000.

---

## Useful commands

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Rebuild after code changes
docker compose up -d --build
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # add GROQ_API_KEY
uvicorn main:app --reload
# http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/scripts` | 5 reading passages |
| POST | `/analyze` | Score pronunciation |

### POST /analyze

Form fields: `audio` (file) + `script_id` (string)

```json
{
  "score": 85.0,
  "word_accuracy": 88.5,
  "fluency": 92.0,
  "completeness": 98.0,
  "transcript": "Scientists have confirmed...",
  "words": [
    { "word": "scientists", "tag": "correct",       "score": 0.95 },
    { "word": "confirmed",  "tag": "unclear",       "score": 0.72 },
    { "word": "evolution",  "tag": "mispronounced", "score": 0.45 },
    { "word": "skipped",    "tag": "missing",       "score": 0.0  }
  ]
}
```

---

## DPDP Act 2023 Compliance

- Audio is processed in memory only — never written to disk or a database
- No user accounts, no PII collected
- Audio is discarded immediately after each API response
- Consent banner shown on first visit (`localStorage`, never sent to server)
