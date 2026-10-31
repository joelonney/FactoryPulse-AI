
"""
FactoryPulse AI - FastAPI application.

Provides read-only access to Exasol factory analytics.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection
import re
from decimal import Decimal

PROJECT_ROOT = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="FactoryPulse AI API",
    description="Explainable factory downtime intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "application": "FactoryPulse AI",
        "message": "Factory downtime intelligence API is running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.execute("SELECT 1")
        cursor.fetchone()

        return {
            "status": "ok",
            "database": "connected",
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Exasol database is unavailable.",
        ) from exc

    finally:
        if connection is not None:
            connection.close()


@app.get("/api/machines")
def get_machines():
    connection = None

    try:
        connection = get_connection()

        cursor = connection.execute(
            """
            SELECT
                MACHINE_ID,
                PLANT,
                MACHINE_TYPE,
                CRITICALITY
            FROM FACTORYPULSE.MACHINES
            ORDER BY MACHINE_ID
            """
        )

        columns = [
            "machine_id",
            "plant",
            "machine_type",
            "criticality",
        ]

        rows = cursor.fetchall()

        machines = [
            dict(zip(columns, row))
            for row in rows
        ]

        return {
            "count": len(machines),
            "machines": machines,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve machine records from Exasol.",
        ) from exc

    finally:
        if connection is not None:
            connection.close()


@app.get("/api/risk-scores")
def get_risk_scores():
    """Execute the saved Exasol risk-scoring SQL."""

    connection = None

    try:
        sql_path = PROJECT_ROOT / "database" / "risk_scoring.sql"

        if not sql_path.is_file():
            raise FileNotFoundError("Risk-scoring SQL file not found.")

        sql = sql_path.read_text(encoding="utf-8-sig").strip()

        # Remove the final SQL terminator for driver execution.
        sql = sql.removesuffix(";").strip()

        connection = get_connection()
        cursor = connection.execute(sql)

        columns = [
            "machine_id",
            "plant",
            "machine_type",
            "criticality",
            "high_temp_readings",
            "high_vibration_readings",
            "failure_count",
            "downtime_hours",
            "overdue_maintenance",
            "risk_score",
            "risk_level",
            "recommended_action",
        ]

        rows = cursor.fetchall()

        risk_scores = [
            dict(zip(columns, row))
            for row in rows
        ]

        return {
            "count": len(risk_scores),
            "risk_scores": risk_scores,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not calculate machine risk scores.",
        ) from exc

    finally:
        if connection is not None:
            connection.close()



@app.get("/api/machines/{machine_id}/sensors")
def get_machine_sensor_history(machine_id: str):
    """Retrieve historical sensor readings for one machine."""

    machine_id = machine_id.strip().upper()

    if not re.fullmatch(r"M-\d{3}", machine_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid machine ID format.",
        )

    connection = None

    try:
        connection = get_connection()

        cursor = connection.execute(
            """
            SELECT
                READING_TIME,
                TEMPERATURE_C,
                VIBRATION_MM_S,
                PRESSURE_BAR
            FROM FACTORYPULSE.SENSOR_READINGS
            WHERE MACHINE_ID = {machine_id}
            ORDER BY READING_TIME
            """,
            {"machine_id": machine_id},
        )

        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Machine not found or no sensor readings available.",
            )

        readings = [
            {
                "reading_time": row[0],
                "temperature_c": row[1],
                "vibration_mm_s": row[2],
                "pressure_bar": row[3],
            }
            for row in rows
        ]

        return {
            "machine_id": machine_id,
            "count": len(readings),
            "readings": readings,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve sensor readings.",
        ) from exc

    finally:
        if connection is not None:
            connection.close()


@app.get("/api/downtime")
def get_downtime_analytics():
    """Return downtime KPIs, plant breakdowns and event records."""

    connection = None

    try:
        connection = get_connection()

        # 1. Overall downtime summary.
        summary_cursor = connection.execute(
            """
            SELECT
                COUNT(*) AS TOTAL_EVENTS,
                ROUND(
                    COALESCE(
                        SUM(SECONDS_BETWEEN(END_TIME, START_TIME)) / 3600.0,
                        0
                    ),
                    2
                ) AS TOTAL_DOWNTIME_HOURS,
                COUNT(DISTINCT MACHINE_ID) AS AFFECTED_MACHINES,
                SUM(
                    CASE WHEN SEVERITY = 'High' THEN 1 ELSE 0 END
                ) AS HIGH_SEVERITY_EVENTS
            FROM FACTORYPULSE.DOWNTIME_EVENTS
            """
        )

        summary = summary_cursor.fetchone()

        # 2. Downtime grouped by plant.
        plant_cursor = connection.execute(
            """
            SELECT
                M.PLANT,
                COUNT(D.EVENT_ID) AS EVENT_COUNT,
                ROUND(
                    SUM(SECONDS_BETWEEN(D.END_TIME, D.START_TIME)) / 3600.0,
                    2
                ) AS DOWNTIME_HOURS
            FROM FACTORYPULSE.DOWNTIME_EVENTS D
            JOIN FACTORYPULSE.MACHINES M
                ON D.MACHINE_ID = M.MACHINE_ID
            GROUP BY M.PLANT
            ORDER BY DOWNTIME_HOURS DESC
            """
        )

        plant_rows = plant_cursor.fetchall()

        # 3. Downtime grouped by failure type.
        failure_cursor = connection.execute(
            """
            SELECT
                FAILURE_TYPE,
                COUNT(*) AS EVENT_COUNT,
                ROUND(
                    SUM(SECONDS_BETWEEN(END_TIME, START_TIME)) / 3600.0,
                    2
                ) AS DOWNTIME_HOURS
            FROM FACTORYPULSE.DOWNTIME_EVENTS
            GROUP BY FAILURE_TYPE
            ORDER BY DOWNTIME_HOURS DESC
            """
        )

        failure_rows = failure_cursor.fetchall()

        # 4. Individual downtime events.
        event_cursor = connection.execute(
            """
            SELECT
                D.EVENT_ID,
                D.MACHINE_ID,
                M.PLANT,
                M.MACHINE_TYPE,
                D.FAILURE_TYPE,
                D.SEVERITY,
                D.START_TIME,
                D.END_TIME,
                ROUND(
                    SECONDS_BETWEEN(D.END_TIME, D.START_TIME) / 3600.0,
                    2
                ) AS DURATION_HOURS
            FROM FACTORYPULSE.DOWNTIME_EVENTS D
            JOIN FACTORYPULSE.MACHINES M
                ON D.MACHINE_ID = M.MACHINE_ID
            ORDER BY D.START_TIME DESC
            """
        )

        event_rows = event_cursor.fetchall()

        # Convert results into JSON-friendly dictionaries.
        return {
            "summary": {
                "total_events": int(summary[0]),
                "total_downtime_hours": float(summary[1] or 0),
                "affected_machines": int(summary[2]),
                "high_severity_events": int(summary[3] or 0),
            },

            "by_plant": [
                {
                    "plant": row[0],
                    "event_count": int(row[1]),
                    "downtime_hours": float(row[2] or 0),
                }
                for row in plant_rows
            ],

            "by_failure_type": [
                {
                    "failure_type": row[0],
                    "event_count": int(row[1]),
                    "downtime_hours": float(row[2] or 0),
                }
                for row in failure_rows
            ],

            "events": [
                {
                    "event_id": row[0],
                    "machine_id": row[1],
                    "plant": row[2],
                    "machine_type": row[3],
                    "failure_type": row[4],
                    "severity": row[5],
                    "start_time": str(row[6]),
                    "end_time": str(row[7]),
                    "duration_hours": float(row[8] or 0),
                }
                for row in event_rows
            ],
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve downtime analytics from Exasol.",
        ) from exc

    finally:
        if connection is not None:
            connection.close()

@app.get("/api/maintenance")
def get_maintenance_analytics():
    """Retrieve maintenance records and maintenance status summaries."""

    connection = None

    try:
        connection = get_connection()

        cursor = connection.execute(
            """
            SELECT
                ML.MAINTENANCE_ID,
                ML.MACHINE_ID,
                M.PLANT,
                M.MACHINE_TYPE,
                M.CRITICALITY,
                ML.MAINTENANCE_DATE,
                ML."ACTION" AS MAINTENANCE_ACTION,
                ML.STATUS
            FROM FACTORYPULSE.MAINTENANCE_LOGS ML
            JOIN FACTORYPULSE.MACHINES M
                ON ML.MACHINE_ID = M.MACHINE_ID
            ORDER BY
                CASE
                    WHEN ML.STATUS = 'Pending' THEN 0
                    ELSE 1
                END,
                ML.MAINTENANCE_DATE DESC
            """
        )

        rows = cursor.fetchall()

        tasks = [
            {
                "maintenance_id": row[0],
                "machine_id": row[1],
                "plant": row[2],
                "machine_type": row[3],
                "criticality": row[4],
                "maintenance_date": str(row[5]),
                "action": row[6],
                "status": row[7],
            }
            for row in rows
        ]

        total_tasks = len(tasks)

        completed_tasks = sum(
            1 for task in tasks
            if task["status"] == "Completed"
        )

        pending_tasks = sum(
            1 for task in tasks
            if task["status"] == "Pending"
        )

        pending_by_plant = {}

        for task in tasks:
            if task["status"] == "Pending":
                plant = task["plant"]
                pending_by_plant[plant] = (
                    pending_by_plant.get(plant, 0) + 1
                )

        plant_summary = [
            {
                "plant": plant,
                "pending_tasks": count,
            }
            for plant, count in sorted(pending_by_plant.items())
        ]

        return {
            "summary": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_tasks": pending_tasks,
                "completion_rate": round(
                    completed_tasks / total_tasks * 100, 1
                ) if total_tasks else 0,
            },
            "pending_by_plant": plant_summary,
            "tasks": tasks,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve maintenance analytics from Exasol.",
        ) from exc

    finally:
        if connection is not None:
            connection.close()
