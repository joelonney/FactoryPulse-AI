
"""
FactoryPulse AI - Exasol database connection.

Credentials are read from the local .env configuration.
The database password is read from the Exasol starter-kit
credential file and is never hardcoded here.
"""

import os
from pathlib import Path

import pyexasol
from dotenv import load_dotenv


# Project root: parent directory of backend/
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load configuration from the project root.
load_dotenv(PROJECT_ROOT / ".env")


def get_connection():
    """Create and return a secure connection to Exasol."""

    dsn = os.getenv("EXASOL_DSN")
    user = os.getenv("EXASOL_USER")
    password_file = os.getenv("EXASOL_PASSWORD_FILE")
    schema = os.getenv("EXASOL_SCHEMA", "FACTORYPULSE")

    # Validate configuration.
    if not dsn or not user or not password_file:
        raise RuntimeError(
            "Missing Exasol configuration. Check the project .env file."
        )

    # Read the password from the existing local credential file.
    credential_path = Path(password_file).expanduser()

    if not credential_path.is_file():
        raise RuntimeError(
            "Exasol credential file not found. Check EXASOL_PASSWORD_FILE."
        )

    password = credential_path.read_text(
        encoding="utf-8-sig"
    ).strip()

    if not password:
        raise RuntimeError("The Exasol credential file is empty.")

    # The DSN contains the SHA-256 TLS certificate fingerprint.
    return pyexasol.connect(
        dsn=dsn,
        user=user,
        password=password,
        schema=schema,
        encryption=True,
        connection_timeout=10,
        socket_timeout=30,
    )
