"""
Migration script to add price column to foods table if it doesn't exist.
Run this once to update existing databases.
"""
import sqlite3
from app.database.connection import DATABASE_URL

# Extract the file path from DATABASE_URL
# Format: sqlite:///path/to/database.db
db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

def migrate():
    """Add price column to foods table if it doesn't exist."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if price column exists
        cursor.execute("PRAGMA table_info(foods)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if "price" not in column_names:
            print("Adding 'price' column to foods table...")
            cursor.execute("ALTER TABLE foods ADD COLUMN price REAL")
            conn.commit()
            print("✓ Price column added successfully!")
        else:
            print("✓ Price column already exists!")
            
        # Display current schema
        print("\nCurrent foods table schema:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
            
    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"Migrating database: {db_path}")
    migrate()
