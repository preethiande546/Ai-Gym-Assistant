import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "fitness_assistant.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    conn = get_connection()
    with open(schema_path, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    try:
        conn.execute("ALTER TABLE users ADD COLUMN password TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()


init_db()
