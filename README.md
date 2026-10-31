# FactoryPulse AI

**An explainable factory downtime intelligence dashboard** built for **ExaThon India 2026 — Track 03: Factories, Fleets & Supply Chains**.

FactoryPulse AI brings machine information, sensor readings, downtime events, and maintenance records into one dashboard. It uses Exasol for analytics, a FastAPI backend, and a React frontend to help users identify machines that may need attention.

> **Project status:** Hackathon MVP. The included datasets are synthetic demonstration data. Risk scores are produced by transparent SQL rules; they are not predictions from a trained machine-learning model and must not be used for production or safety-critical decisions.

## Features

- **Factory overview:** machine count, risk summary, downtime, and maintenance indicators.
- **Machine details:** sensor history, temperature and vibration charts, downtime information, and risk explanations.
- **Explainable risk scoring:** SQL-based scores with contributing indicators and recommended review actions.
- **Downtime analysis:** downtime events grouped by plant and failure type, with filters.
- **Maintenance analysis:** completed and pending tasks, maintenance history, and plant-level summaries.

## Technology

| Layer | Technology |
|---|---|
| Database and analytics | Exasol Personal, Exasol SQL |
| Backend API | Python, FastAPI, PyExasol |
| Frontend | React, Vite, JavaScript |
| Charts | Recharts |
| Data preparation | Python CSV scripts |

## Architecture

```text
Synthetic CSV datasets
        |
        v
Exasol Personal database
(FACTORYPULSE schema)
        |
        v
FastAPI backend  <---- SQL analytics and risk-scoring queries
        |
        v
React + Recharts dashboard
```

The backend connects to Exasol and exposes read-only API endpoints consumed by the frontend. The frontend expects the API at `http://127.0.0.1:8000` by default.

## Repository structure

```text
FactoryPulse-AI/
├── backend/
│   ├── database.py             # Exasol connection and credential loading
│   └── main.py                 # FastAPI routes
├── database/
│   ├── analytics.sql           # Downtime/failure analytics query
│   └── risk_scoring.sql        # Explainable machine-risk scoring query
├── data/
│   └── factorypulse_upload/    # Exasol-ready CSV files
├── frontend/
│   ├── src/
│   │   ├── components/         # Machine, downtime, and maintenance views
│   │   └── services/api.js      # Backend API requests
│   └── package.json
├── scripts/
│   ├── generate_data.py        # Generates reproducible synthetic data
│   └── prepare_exasol_data.py  # Prepares uppercase-header CSV files
├── .env.example
└── README.md
```

## Demo data

The repository includes four synthetic datasets prepared for upload to Exasol:

| Dataset | Records |
|---|---:|
| Machines | 24 |
| Sensor readings | 1,344 |
| Downtime events | 16 |
| Maintenance logs | 48 |
| **Total** | **1,432** |

The data generator uses a fixed random seed so the demo data can be reproduced. A small number of sensor values are intentionally missing to make the dataset suitable for demonstrating basic data-quality handling. The data does not come from a live factory or an external industrial data provider.

## Risk-scoring logic

The SQL in `database/risk_scoring.sql` adds points when a machine meets the following demonstration conditions:

| Indicator | Condition | Points |
|---|---|---:|
| High temperature | At least 5 readings at or above 78°C | 25 |
| High vibration | At least 5 readings at or above 2.5 mm/s | 25 |
| Downtime | At least 12 accumulated downtime hours | 30 |
| Overdue maintenance | A pending maintenance item dated before the latest sensor-reading timestamp | 20 |

Risk levels are assigned as follows: **High** at 70 or more, **Medium** from 40 to 69, and **Low** below 40. The score is intended to make the contributing indicators visible and understandable. These thresholds are illustrative demo rules, not validated operating limits or failure forecasts.

---

# Run locally

The steps below describe a local development setup on Windows PowerShell. The same application can be adapted to other environments by changing the Exasol connection settings and shell commands.

## Prerequisites

Install or have access to:

- Git
- Python (the project was developed with Python 3.14)
- Node.js and npm
- Exasol Personal, running locally
- Exapump CLI and a configured connection profile for Exasol

For the commands below, the configured Exapump profile is named `starter-kit`. Replace it with your own profile name when necessary.

## 1. Clone the repository

```powershell
git clone https://github.com/joelonney/FactoryPulse-AI.git
cd FactoryPulse-AI
```

## 2. Start Exasol Personal

Start your Exasol Personal instance using the installation method you have configured. If you use the Exasol Local Starter Kit, check that it is running and inspect its connection details:

```powershell
exakit status
exakit info
```

Do not continue until the database is running and reachable. The example upload commands below use the Exapump profile `starter-kit`.

## 3. Create the schema and load the CSV files

Create the schema once. Skip the `CREATE SCHEMA` command if `FACTORYPULSE` already exists:

```powershell
exapump sql -p starter-kit "CREATE SCHEMA FACTORYPULSE;"
```

Upload the four datasets:

```powershell
exapump upload .\data\factorypulse_upload\machines.csv --table FACTORYPULSE.MACHINES -p starter-kit
exapump upload .\data\factorypulse_upload\sensor_readings.csv --table FACTORYPULSE.SENSOR_READINGS -p starter-kit
exapump upload .\data\factorypulse_upload\downtime_events.csv --table FACTORYPULSE.DOWNTIME_EVENTS -p starter-kit
exapump upload .\data\factorypulse_upload\maintenance_logs.csv --table FACTORYPULSE.MAINTENANCE_LOGS -p starter-kit
```

The CSV files have uppercase column headers for compatibility with the Exasol loading workflow used during development. Check that the four tables were loaded:

```powershell
exapump sql -p starter-kit "SELECT COUNT(*) FROM FACTORYPULSE.MACHINES;"
exapump sql -p starter-kit "SELECT COUNT(*) FROM FACTORYPULSE.SENSOR_READINGS;"
exapump sql -p starter-kit "SELECT COUNT(*) FROM FACTORYPULSE.DOWNTIME_EVENTS;"
exapump sql -p starter-kit "SELECT COUNT(*) FROM FACTORYPULSE.MAINTENANCE_LOGS;"
```

Expected row counts are `24`, `1344`, `16`, and `48`, respectively. If the tables already exist and contain data, do not blindly upload the files again; check your existing tables first to avoid duplicate or conflicting data.

## 4. Configure the backend

Create a virtual environment and install the backend packages:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install fastapi uvicorn pyexasol python-dotenv
```

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set the values for your own Exasol instance:

```dotenv
EXASOL_DSN=127.0.0.1/<CERTIFICATE_FINGERPRINT>:8563
EXASOL_USER=<EXASOL_USERNAME>
EXASOL_PASSWORD_FILE=C:/absolute/path/to/your/exasol_password_file
EXASOL_SCHEMA=FACTORYPULSE
```

Configuration notes:

- `EXASOL_DSN` must match your database host, TLS certificate fingerprint, and port. The example format is for a local Exasol Personal instance using port `8563`.
- `EXASOL_USER` must be a database user with permission to read the four `FACTORYPULSE` tables. A dedicated read-only user is recommended.
- `EXASOL_PASSWORD_FILE` must point to a local text file containing that user's password. The backend reads the password from this file; it does not expect the password directly in `.env`.
- `EXASOL_SCHEMA` should be `FACTORYPULSE`.

**Never commit `.env`, database passwords, or credential files.** The repository's `.gitignore` excludes `.env`.

## 5. Run the backend API

From the repository root, start FastAPI:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Keep this terminal open. Test the database connection in a second terminal or browser:

- Health check: <http://127.0.0.1:8000/api/health>
- API documentation: <http://127.0.0.1:8000/docs>

A successful health check returns a response similar to:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## 6. Run the frontend

Open a second terminal and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally <http://localhost:5173/>. Keep the frontend, backend, and Exasol database running while using the dashboard.

The frontend uses `http://127.0.0.1:8000` as its default API base URL. To change it, create `frontend/.env` with:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the Vite development server after changing frontend environment variables.

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /` | API welcome message |
| `GET /api/health` | API and Exasol connection health |
| `GET /api/machines` | Machine master data |
| `GET /api/risk-scores` | Machine risk scores and contributing indicators |
| `GET /api/machines/{machine_id}/sensors` | Sensor history for a machine, e.g. `M-013` |
| `GET /api/downtime` | Downtime KPIs, breakdowns, and event details |
| `GET /api/maintenance` | Maintenance summary, pending tasks, and history |

## Regenerate the synthetic datasets (optional)

The four Exasol-ready CSV files are already included in the repository, so this step is not required for a normal setup. To regenerate them, run both scripts from the repository root:

```powershell
.\.venv\Scripts\python.exe .\scripts\generate_data.py
.\.venv\Scripts\python.exe .\scripts\prepare_exasol_data.py
```

The first script creates source CSVs under `data/sample_synthetic_data/`. The second prepares the uppercase-header files under `data/factorypulse_upload/`, which are the files uploaded to Exasol.

## Troubleshooting

- **API health check reports a database error:** confirm Exasol is running, `.env` has the correct connection values, the password-file path exists, and the four tables are present in `FACTORYPULSE`.
- **Frontend cannot load data:** confirm the backend is running on port `8000` and that `VITE_API_BASE_URL` (if set) points to it.
- **A table or schema already exists:** do not recreate or reload it without checking its contents first.
- **PowerShell blocks virtual-environment activation:** activation is optional. Use the environment's executable directly as shown in the commands above.

## Limitations

- The included factory data is synthetic and intended only for demonstration.
- Risk scoring is deterministic, rule-based SQL logic; it is not machine learning, a predictive maintenance model, or a validated failure-probability estimate.
- The project is a local hackathon MVP. No public hosted deployment is provided by this repository.

## License

No license file is currently included. Contact the repository owner before reusing or redistributing this project beyond the permissions granted by the repository's applicable terms.
