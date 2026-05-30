---
name: testing-jarvis-core
description: Test the jarvis-core FastAPI app end-to-end. Use when verifying API endpoints, config/settings wiring, Docker builds, or pytest suite.
---

## Prerequisites

- Python 3.12+ installed
- Docker available (for Docker build tests)
- No Ollama required for basic API tests (`/` and `/command` endpoints don't call LLM)

## Setup

```bash
cd /home/ubuntu/repos/jarvis-core
pip install -r requirements.txt
pip install pytest httpx ruff
```

## Running the App

```bash
# Default (port 8000)
python main.py

# Custom port via env var
APP_PORT=9999 python main.py
```

The server prints `JARVIS CORE ONLINE` and `Uvicorn running on http://0.0.0.0:<port>` when ready.

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check — returns `{"name": "JARVIS CORE", "status": "online"}` |
| POST | `/command` | Process command — body `{"command": "hello"}` returns `{"success": true, "response": "..."}` |

## Running Tests

```bash
# pytest (discovers tests/ directory via pytest.ini)
pytest -v --tb=short

# Lint
ruff check .
```

Note: `test_agent.py` in the repo root is an interactive script (uses `input()`), NOT a pytest test. `pytest.ini` excludes it by directing discovery to `tests/`.

## Verifying Config/Settings Wiring

The settings layer (`app/core/settings.py`) reads from env vars via `python-dotenv`. To verify wiring works:

```bash
# 1. Override server port and confirm it binds to the new port
APP_PORT=9999 APP_RELOAD=false python main.py
# Then: curl localhost:9999/ should work, curl localhost:8000/ should fail

# 2. Override LLM settings and verify LocalLLM picks them up
OLLAMA_BASE_URL=http://custom:5555 OLLAMA_MODEL=test-model python -c "
from app.core.llm import LocalLLM
llm = LocalLLM()
print(llm.url, llm.model, llm.timeout)
"
# Expected: http://custom:5555/api/chat test-model 300

# 3. Test .env file loading
echo 'APP_PORT=7777' > .env
python -c "from app.core import settings; print(settings.APP_PORT)"
# Expected: 7777
rm .env  # clean up
```

## Config Variables

All variables are documented in `.env.example`:

| Variable | Default | Used in |
|----------|---------|--------|
| `APP_HOST` | `0.0.0.0` | `main.py` |
| `APP_PORT` | `8000` | `main.py` |
| `APP_RELOAD` | `true` | `main.py` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | `app/core/llm.py` |
| `OLLAMA_MODEL` | `llama3.1:8b` | `app/core/llm.py` |
| `OLLAMA_TIMEOUT` | `300` | `app/core/llm.py` |
| `GENERATED_SITES_DIR` | `generated_sites` | `app/tools/website_tool.py` |
| `LOG_LEVEL` | `INFO` | `app/core/settings.py` |

## Docker

```bash
# Build image
docker build -t jarvis-core-test .

# Full stack (app + Ollama)
docker compose up
```

`docker-compose.yml` overrides `OLLAMA_BASE_URL` to `http://ollama:11434` for inter-container networking.

## Devin Secrets Needed

None — the app runs locally with no external API keys for basic testing.

## Tips

- When testing env var overrides, set `APP_RELOAD=false` to avoid uvicorn's file watcher.
- The `/command` endpoint handles `"hello"` and `"status"` keywords locally in `app/core/brain.py` without calling Ollama — useful for testing without an LLM.
- Many agent/tool files are empty placeholders (e.g. `app/agents/website_agent.py`). This is expected — the project is in early development.
