"""
Migration script to add unit_name/source_name/yield_per_source/default_essential
columns to the garnishes table, backfill existing rows, and seed a few common
garnish types if they don't already exist.
Run this once to update existing databases.
"""
import sqlite3
from app.database.connection import DATABASE_URL

db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

# name (case-insensitive match against existing rows) -> (unit_name, source_name, yield_per_source, default_essential)
GARNISH_DEFAULTS = {
    "lemon twist": ("piece", "Lemon", 8, True),
    "lime wedge": ("piece", "Lime", 8, False),
    "lemon wedge": ("piece", "Lemon", 8, False),
    "orange slice": ("piece", "Orange", 8, False),
    "mint sprig": ("piece", "Mint bunch", 20, True),
    "citrus twist": ("piece", "Citrus fruit", 8, True),
    "cherry": ("piece", "Cherry jar", 1, False),
    "olive": ("piece", "Olive jar", 1, False),
}

# Seed rows to add if no garnish with that name (case-insensitive) exists yet
SEED_GARNISHES = ["Orange slice", "Cherry", "Olive"]


def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(garnishes)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        if "unit_name" not in column_names:
            print("Adding 'unit_name' column to garnishes table...")
            cursor.execute("ALTER TABLE garnishes ADD COLUMN unit_name VARCHAR DEFAULT 'piece'")
        if "source_name" not in column_names:
            print("Adding 'source_name' column to garnishes table...")
            cursor.execute("ALTER TABLE garnishes ADD COLUMN source_name VARCHAR")
        if "yield_per_source" not in column_names:
            print("Adding 'yield_per_source' column to garnishes table...")
            cursor.execute("ALTER TABLE garnishes ADD COLUMN yield_per_source FLOAT")
        if "default_essential" not in column_names:
            print("Adding 'default_essential' column to garnishes table...")
            cursor.execute("ALTER TABLE garnishes ADD COLUMN default_essential BOOLEAN DEFAULT 0")

        conn.commit()

        print("Backfilling existing garnish rows with default values...")
        cursor.execute("SELECT id, name FROM garnishes")
        existing_rows = cursor.fetchall()
        existing_names_lower = {name.lower() for _, name in existing_rows}

        for garnish_id, name in existing_rows:
            defaults = GARNISH_DEFAULTS.get(name.lower())
            if not defaults:
                continue
            unit_name, source_name, yield_per_source, default_essential = defaults
            cursor.execute(
                """
                UPDATE garnishes
                SET unit_name = ?, source_name = ?, yield_per_source = ?, default_essential = ?
                WHERE id = ?
                """,
                (unit_name, source_name, yield_per_source, int(default_essential), garnish_id),
            )

        print("Seeding common garnish types not already present...")
        for name in SEED_GARNISHES:
            if name.lower() in existing_names_lower:
                continue
            unit_name, source_name, yield_per_source, default_essential = GARNISH_DEFAULTS[name.lower()]
            cursor.execute(
                """
                INSERT INTO garnishes (name, unit_name, source_name, yield_per_source, default_essential)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, unit_name, source_name, yield_per_source, int(default_essential)),
            )

        conn.commit()
        print("Garnish migration complete!")

    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    print(f"Migrating database: {db_path}")
    migrate()
