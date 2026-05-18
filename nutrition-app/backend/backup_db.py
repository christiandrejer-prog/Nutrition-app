from pathlib import Path

from app.database.connection import backup_database, get_database_path


if __name__ == "__main__":
    db_path = get_database_path()
    print(f"Current database file: {db_path}")

    backup_path = backup_database()
    print(f"Database backup created at: {backup_path}")
