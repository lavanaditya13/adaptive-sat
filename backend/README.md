# Adaptive SAT Prep Platform Backend

This is the backend service for the Adaptive SAT Prep Platform, built using FastAPI, PostgreSQL, SQLAlchemy 2.0, and Alembic.

## Prerequisites

- Python 3.11+
- Poetry (optional, for package management)
- Docker and Docker Compose (recommended)
- PostgreSQL (if running database locally)

## Installation & Local Setup

### 1. Clone the repository and navigate to backend
```bash
cd backend
```

### 2. Set up environment variables
Copy the `.env.example` file to `.env` and update the values:
```bash
cp .env.example .env
```

### 3. Install dependencies using Poetry
If you have Poetry installed:
```bash
poetry install
```

Alternatively, you can create a virtual environment and install via pip if preferred (requires generating a `requirements.txt` or using poetry export).

### 4. Running the Database Locally
You can run PostgreSQL locally, or spin up the database container using Docker:
```bash
docker compose up -d db
```

### 5. Running Migrations
Run Alembic migrations to set up the database schema:
```bash
poetry run alembic upgrade head
```

### 6. Run the FastAPI Application
Start the FastAPI development server:
```bash
poetry run uvicorn app.main:app --reload
```
The API will be available at [http://localhost:8000](http://localhost:8000).
Swagger documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Running with Docker Compose

To spin up the entire stack (FastAPI web app + PostgreSQL database) using Docker Compose:

```bash
docker compose up --build
```

This starts:
- The FastAPI application on [http://localhost:8000](http://localhost:8000)
- PostgreSQL on `localhost:5432`

### One-command startup

Use the helper script to start the database, run migrations, optionally seed sample questions, and launch the API:

```bash
./scripts/start_backend.sh
```

To skip seeding on startup:

```bash
./scripts/start_backend.sh --no-seed
```

The script uses Docker for the runtime, so it does not require a local virtual environment.

---

## Running Tests

To run the test suite using pytest:

```bash
poetry run pytest
```
