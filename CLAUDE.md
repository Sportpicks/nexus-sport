# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **FastAPI** — web framework (async)
- **SQLModel** — ORM combining SQLAlchemy + Pydantic, backed by **aiosqlite** (async SQLite)
- **APScheduler** — background task scheduling
- **pydantic-settings + python-dotenv** — configuration via `.env` files
- **scikit-learn, xgboost, pandas, numpy, scipy** — ML/data science layer (likely sports prediction)
- **uvicorn** — ASGI server
- **httpx** — async HTTP client for external API calls
- **Sentry SDK** — error tracking
- **tenacity** — retry logic for unreliable operations

## Common Commands

```bash
# Run dev server (with auto-reload)
uvicorn app.main:app --reload

# Run on a specific port
uvicorn app.main:app --reload --port 8000

# Install a new dependency
pip install <package> && pip freeze > requirements.txt

# Run tests
pytest

# Run a single test file
pytest tests/test_foo.py

# Run a single test
pytest tests/test_foo.py::test_function_name -v
```

## Architecture Patterns

This project uses **SQLModel** for models — each model is both a Pydantic schema and a SQLAlchemy table definition. Keep `SQLModel` table models in a `models/` directory and use `SQLModel.metadata.create_all()` for schema creation.

FastAPI routers should be organized by domain under `routers/` and included in the main app via `app.include_router(...)`.

Settings are managed through a `pydantic-settings` class (typically `Settings` in `core/config.py`), loaded from a `.env` file. Never hard-code credentials.

APScheduler tasks are registered at startup (use FastAPI lifespan events, not `@app.on_event`).

ML models (scikit-learn/xgboost) should be serialized with `joblib` and loaded at startup, not re-trained per request.
