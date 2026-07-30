"""
Migration script to replace garnishes.source_name (free text) with
garnishes.source_food_id (FK to foods). Creates a Food row for each existing
source_name (so it carries a brand/price and can double as a meal
ingredient), migrates any garnish_stock rows into the shared stock table,
then drops the old source_name column and the garnish_stock table.
Run this once to update existing databases.
"""
import sqlite3
from app.database.connection import DATABASE_URL

db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")


def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(garnishes)")
        columns = [col[1] for col in cursor.fetchall()]

        if "source_food_id" not in columns:
            print("Adding 'source_food_id' column to garnishes table...")
            cursor.execute("ALTER TABLE garnishes ADD COLUMN source_food_id INTEGER REFERENCES foods(id)")
            conn.commit()

        if "source_name" in columns:
            print("Backfilling Food rows for existing garnish source_name values...")
            cursor.execute("SELECT id, source_name FROM garnishes WHERE source_name IS NOT NULL")
            for garnish_id, source_name in cursor.fetchall():
                cursor.execute(
                    "SELECT id FROM foods WHERE LOWER(name) = LOWER(?)",
                    (source_name,),
                )
                row = cursor.fetchone()
                if row:
                    food_id = row[0]
                else:
                    cursor.execute(
                        "INSERT INTO foods (name, brand, price, base_amount, base_unit) VALUES (?, NULL, NULL, 1, 'piece')",
                        (source_name,),
                    )
                    food_id = cursor.lastrowid
                    print(f"  Created food '{source_name}' (id={food_id})")

                cursor.execute(
                    "UPDATE garnishes SET source_food_id = ? WHERE id = ?",
                    (food_id, garnish_id),
                )
            conn.commit()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='garnish_stock'")
        if cursor.fetchone():
            print("Migrating garnish_stock rows into the shared stock table...")
            cursor.execute("SELECT garnish_id, amount FROM garnish_stock")
            for garnish_id, amount in cursor.fetchall():
                cursor.execute("SELECT source_food_id FROM garnishes WHERE id = ?", (garnish_id,))
                row = cursor.fetchone()
                food_id = row[0] if row else None
                if not food_id:
                    print(f"  Skipping garnish_stock for garnish_id={garnish_id}: no linked source food")
                    continue

                cursor.execute("SELECT id, amount FROM stock WHERE food_id = ?", (food_id,))
                stock_row = cursor.fetchone()
                if stock_row:
                    cursor.execute(
                        "UPDATE stock SET amount = amount + ? WHERE id = ?",
                        (amount, stock_row[0]),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO stock (food_id, amount, unit) VALUES (?, ?, 'piece')",
                        (food_id, amount),
                    )
            conn.commit()

            print("Dropping garnish_stock table...")
            cursor.execute("DROP TABLE garnish_stock")
            conn.commit()

        cursor.execute("PRAGMA table_info(garnishes)")
        columns = [col[1] for col in cursor.fetchall()]
        if "source_name" in columns:
            print("Dropping 'source_name' column from garnishes table...")
            cursor.execute("ALTER TABLE garnishes DROP COLUMN source_name")
            conn.commit()

        print("Garnish source-food migration complete!")

    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    print(f"Migrating database: {db_path}")
    migrate()
