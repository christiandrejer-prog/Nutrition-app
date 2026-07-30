"""
Migration script to add instructions column to drinks table if it doesn't exist.
Run this once to update existing databases.
"""
import sqlite3
from app.database.connection import DATABASE_URL

db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(drinks)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        if "instructions" not in column_names:
            print("Adding 'instructions' column to drinks table...")
            cursor.execute("ALTER TABLE drinks ADD COLUMN instructions TEXT")
            conn.commit()
            print("Instructions column added successfully!")
        else:
            print("Instructions column already exists!")

    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"Migrating database: {db_path}")
    migrate()
