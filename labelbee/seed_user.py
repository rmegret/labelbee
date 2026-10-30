import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load settings from .env
load_dotenv("../.env")

# Map existing MYSQL_* environment variables to PostgreSQL connection parameters
db_host = os.getenv("MYSQL_HOST", "localhost")
db_name = os.getenv("MYSQL_DATABASE")
db_user = os.getenv("MYSQL_USER")
db_pass = os.getenv("MYSQL_PASSWORD")
db_port = os.getenv("MYSQL_PORT", "5432")

missing = [
    name for name, val in [
        ("MYSQL_DATABASE", db_name),
        ("MYSQL_USER", db_user),
        ("MYSQL_PASSWORD", db_pass),
    ] if not val
]

if missing:
    print(f"Error: Missing required variables in .env: {', '.join(missing)}")
    sys.exit(1)

DEFAULT_UUID = "00000000-0000-0000-0000-000000000001"

try:
    conn = psycopg2.connect(
        host=db_host,
        dbname=db_name,
        user=db_user,
        password=db_pass,
        port=db_port,
    )
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users (id, name, email)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (DEFAULT_UUID, "Default User", "default@example.com"),
    )
    conn.commit()
    cur.close()
    conn.close()
    print("Default user seeded successfully.")
except Exception as e:
    print(f"Error seeding user: {e}")
