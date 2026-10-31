# FactoryPulse AI

An explainable factory downtime intelligence dashboard built for ExaThon India 2026 — Track 03: Factories, Fleets & Supply Chains.

## What it does

FactoryPulse AI brings factory machine, sensor, downtime and maintenance information into one dashboard. It uses Exasol for analytics, a FastAPI backend and a React frontend.

### Features

- Factory-wide machine health overview.
- Machine-level sensor readings and risk details.
- Explainable, rule-based machine risk scoring.
- Downtime analytics by plant and failure type.
- Maintenance task status, history and pending-task views.
- Interactive charts and machine filtering.

## Technology

- Database and analytics: Exasol Personal, Exasol SQL
- Backend: Python, FastAPI, PyExasol
- Frontend: React, Vite, Recharts
- Data: Synthetic factory demonstration datasets

## Project structure

```text
FactoryPulse-AI/
├── backend/                 # FastAPI application and Exasol connection
├── database/                # Analytics and risk-scoring SQL
├── data/
│   └── factorypulse_upload/ # Exasol-ready CSV datasets
├── frontend/                # React dashboard
├── scripts/                 # Dataset generation and preparation
├── .env.example             # Safe environment-variable template
├── requirements.txt
└── README.md
