from datetime import datetime
from pathlib import Path
import os
import shutil

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", BASE_DIR / "nutrition.db"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine)


def get_database_path() -> Path:
    return DATABASE_PATH


def backup_database(backup_dir: Path | str | None = None) -> Path:
    if backup_dir is None:
        backup_dir = BASE_DIR / "backups"
    backup_dir = Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"nutrition_backup_{timestamp}.db"
    shutil.copy2(DATABASE_PATH, backup_file)
    return backup_file