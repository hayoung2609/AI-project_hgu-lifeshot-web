from __future__ import annotations

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "leaderboard.sqlite3"


def _db_path() -> Path:
    return Path(os.getenv("LEADERBOARD_DB_PATH", str(DEFAULT_DB_PATH)))


def _connect() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def init_leaderboard_db() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_name TEXT NOT NULL,
                final_score REAL NOT NULL,
                aesthetic_score REAL NOT NULL,
                handong_similarity_score REAL NOT NULL,
                landmark_bonus INTEGER NOT NULL,
                landmark_class TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_leaderboard_score
            ON leaderboard_entries (final_score DESC, created_at ASC)
            """
        )


def add_leaderboard_entries(results: list[dict[str, Any]]) -> None:
    if not results:
        return

    init_leaderboard_db()
    now = datetime.now(UTC).isoformat()
    rows = [
        (
            str(result.get("image_name") or "익명 업로드"),
            float(result["final_score"]),
            float(result["aesthetic_score"]),
            float(result["handong_similarity_score"]),
            int(result.get("landmark_bonus") or 0),
            result.get("landmark_class"),
            now,
        )
        for result in results
    ]

    with _connect() as connection:
        connection.executemany(
            """
            INSERT INTO leaderboard_entries (
                image_name,
                final_score,
                aesthetic_score,
                handong_similarity_score,
                landmark_bonus,
                landmark_class,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )


def get_top_leaderboard(limit: int = 3) -> list[dict[str, Any]]:
    safe_limit = min(max(limit, 1), 20)
    init_leaderboard_db()

    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                image_name,
                final_score,
                aesthetic_score,
                handong_similarity_score,
                landmark_bonus,
                landmark_class,
                created_at
            FROM leaderboard_entries
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY image_name
                            ORDER BY final_score DESC, created_at ASC, id ASC
                        ) AS rank_for_image
                    FROM leaderboard_entries
                )
                WHERE rank_for_image = 1
            )
            ORDER BY final_score DESC, created_at ASC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def clear_leaderboard() -> int:
    init_leaderboard_db()

    with _connect() as connection:
        cursor = connection.execute("DELETE FROM leaderboard_entries")
        connection.execute(
            "DELETE FROM sqlite_sequence WHERE name = ?",
            ("leaderboard_entries",),
        )
        return cursor.rowcount
