
"""
FactoryPulse AI - Exasol CSV preparation.

Reads the generated synthetic CSV files and prepares
Exasol-compatible copies with:
- Uppercase column headers
- UTF-8 encoding without BOM
- Unix LF line endings

The actual data values are preserved.
"""

import csv
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent.parent

SOURCE_DIR = PROJECT_DIR / "data" / "sample_synthetic_data"
OUTPUT_DIR = PROJECT_DIR / "data" / "factorypulse_upload"

FILES = [
    "machines.csv",
    "sensor_readings.csv",
    "downtime_events.csv",
    "maintenance_logs.csv",
]


def prepare_file(filename: str) -> int:
    source = SOURCE_DIR / filename
    destination = OUTPUT_DIR / filename

    if not source.is_file():
        raise FileNotFoundError(f"Source file not found: {source}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with source.open(
        "r", encoding="utf-8-sig", newline=""
    ) as input_file:

        reader = csv.reader(input_file)

        header = next(reader, None)

        if not header:
            raise ValueError(f"Empty CSV file: {filename}")

        output_header = [column.strip().upper() for column in header]

        if len(output_header) != len(set(output_header)):
            raise ValueError(f"Duplicate column names in {filename}")

        row_count = 0

        with destination.open(
            "w", encoding="utf-8", newline=""
        ) as output_file:

            writer = csv.writer(
                output_file,
                lineterminator="\n"
            )

            writer.writerow(output_header)

            for row in reader:
                if len(row) != len(output_header):
                    raise ValueError(
                        f"Invalid column count in {filename}, "
                        f"record {row_count + 2}"
                    )

                writer.writerow(row)
                row_count += 1

    print(f"Prepared {filename}: {row_count} records")

    return row_count


def main():
    print("Preparing FactoryPulse datasets for Exasol...\n")

    total_rows = 0

    for filename in FILES:
        total_rows += prepare_file(filename)

    print("\nDataset preparation completed.")
    print(f"Output folder: {OUTPUT_DIR}")
    print(f"Total records: {total_rows}")


if __name__ == "__main__":
    main()
