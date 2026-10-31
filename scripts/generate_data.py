
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

# Keep the data generator reproducible.
rng = random.Random(42)

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data" / "sample_synthetic_data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# These machines deliberately receive abnormal readings.
HIGH_RISK_MACHINES = {"M-004", "M-009", "M-013", "M-021"}

START_DATE = datetime(2026, 10, 1)

def write_csv(filename, fieldnames, rows):
    """Write rows to a CSV file and report the number of records."""
    path = DATA_DIR / filename

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Created {filename}: {len(rows)} records")


# 1. Machine information
machines = []

plants = ["Plant A", "Plant B", "Plant C"]
machine_types = ["Conveyor", "Pump", "Compressor", "Press"]

for number in range(1, 25):
    machine_id = f"M-{number:03d}"

    if machine_id in HIGH_RISK_MACHINES:
        criticality = "Critical"
    elif number % 3 == 0:
        criticality = "High"
    else:
        criticality = "Medium"

    machines.append({
        "machine_id": machine_id,
        "plant": plants[(number - 1) % len(plants)],
        "machine_type": machine_types[(number - 1) % len(machine_types)],
        "criticality": criticality,
    })

write_csv(
    "machines.csv",
    ["machine_id", "plant", "machine_type", "criticality"],
    machines,
)


# 2. Sensor readings: four readings per day for 14 days
sensor_readings = []
reading_number = 1

for machine in machines:
    machine_id = machine["machine_id"]
    number = int(machine_id.split("-")[1])
    is_high_risk = machine_id in HIGH_RISK_MACHINES

    for day in range(14):
        for reading_slot in range(4):
            reading_time = START_DATE + timedelta(
                days=day, hours=reading_slot * 6
            )

            temperature = 62 + (number % 5) * 2
            vibration = 1.0 + (number % 4) * 0.18
            pressure = 6.7 + (number % 3) * 0.15

            # Simulate abnormal conditions in the final five days.
            if is_high_risk and day >= 9:
                temperature += rng.uniform(12, 20)
                vibration += rng.uniform(1.0, 2.4)

            temperature += rng.uniform(-2, 2)
            vibration += rng.uniform(-0.15, 0.15)
            pressure += rng.uniform(-0.3, 0.3)

            # Deliberately include a few missing readings for later
            # data-quality checks.
            temperature_value = (
                "" if rng.random() < 0.015 else round(temperature, 2)
            )
            vibration_value = (
                "" if rng.random() < 0.015 else round(vibration, 2)
            )
            pressure_value = (
                "" if rng.random() < 0.015 else round(pressure, 2)
            )

            sensor_readings.append({
                "reading_id": f"SR-{reading_number:05d}",
                "machine_id": machine_id,
                "reading_time": reading_time.isoformat(sep=" "),
                "temperature_c": temperature_value,
                "vibration_mm_s": vibration_value,
                "pressure_bar": pressure_value,
            })

            reading_number += 1

write_csv(
    "sensor_readings.csv",
    [
        "reading_id", "machine_id", "reading_time",
        "temperature_c", "vibration_mm_s", "pressure_bar",
    ],
    sensor_readings,
)


# 3. Downtime events
downtime_events = []
event_number = 1

general_failure_types = [
    "Electrical fault",
    "Material jam",
    "Sensor alert",
    "Unplanned stop",
]

for machine in machines:
    machine_id = machine["machine_id"]
    is_high_risk = machine_id in HIGH_RISK_MACHINES

    # The selected machines have more simulated downtime events.
    event_count = 3 if is_high_risk else rng.randint(0, 1)

    for _ in range(event_count):
        start_time = START_DATE + timedelta(
            days=rng.randint(0, 13),
            hours=rng.randint(0, 23),
            minutes=rng.randint(0, 59),
        )

        duration_hours = (
            rng.randint(3, 8) if is_high_risk else rng.randint(1, 4)
        )
        end_time = start_time + timedelta(hours=duration_hours)

        if is_high_risk:
            failure_type = rng.choice([
                "Bearing wear",
                "Overheating",
                "Repeated stoppage",
            ])
            severity = "High"
        else:
            failure_type = rng.choice(general_failure_types)
            severity = "Medium" if machine["criticality"] == "High" else "Low"

        downtime_events.append({
            "event_id": f"DT-{event_number:04d}",
            "machine_id": machine_id,
            "start_time": start_time.isoformat(sep=" "),
            "end_time": end_time.isoformat(sep=" "),
            "failure_type": failure_type,
            "severity": severity,
        })

        event_number += 1

write_csv(
    "downtime_events.csv",
    [
        "event_id", "machine_id", "start_time",
        "end_time", "failure_type", "severity",
    ],
    downtime_events,
)


# 4. Maintenance history
maintenance_logs = []
maintenance_number = 1

maintenance_actions = [
    "Routine inspection",
    "Lubrication",
    "Motor check",
    "Vibration check",
]

for machine in machines:
    machine_id = machine["machine_id"]
    is_high_risk = machine_id in HIGH_RISK_MACHINES

    completed_date = START_DATE + timedelta(
        days=rng.randint(1, 10),
        hours=rng.randint(0, 12),
    )

    maintenance_logs.append({
        "maintenance_id": f"MT-{maintenance_number:04d}",
        "machine_id": machine_id,
        "maintenance_date": completed_date.isoformat(sep=" "),
        "action": rng.choice(maintenance_actions),
        "status": "Completed",
    })
    maintenance_number += 1

    # Selected machines have older pending maintenance tasks.
    if is_high_risk:
        pending_date = START_DATE - timedelta(days=rng.randint(7, 20))
        status = "Pending"
    elif int(machine_id.split("-")[1]) % 5 == 0:
        pending_date = START_DATE + timedelta(days=5)
        status = "Pending"
    else:
        pending_date = START_DATE + timedelta(days=11)
        status = "Completed"

    maintenance_logs.append({
        "maintenance_id": f"MT-{maintenance_number:04d}",
        "machine_id": machine_id,
        "maintenance_date": pending_date.isoformat(sep=" "),
        "action": rng.choice(maintenance_actions),
        "status": status,
    })
    maintenance_number += 1

write_csv(
    "maintenance_logs.csv",
    [
        "maintenance_id", "machine_id", "maintenance_date",
        "action", "status",
    ],
    maintenance_logs,
)

print("\nSynthetic factory data generated successfully.")
print(f"Output folder: {DATA_DIR}")
print("All records are fabricated for the hackathon demonstration.")
