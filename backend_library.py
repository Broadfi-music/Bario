from __future__ import annotations

import json
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from backend_models import (
    AnalysisSummary,
    ComparisonSummary,
    LibraryEntryResponse,
    RemixSubmission,
    Settings,
)


class LibraryStore:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._entries_dir = settings.library_dir / "entries"
        self._entries_dir.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS library_entries (
                    entry_id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    artist_name TEXT,
                    genre TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    source_media_kind TEXT NOT NULL,
                    song_url TEXT,
                    remix_prompt TEXT,
                    created_at TEXT NOT NULL,
                    source_public_url TEXT,
                    source_audio_public_url TEXT,
                    remix_public_url TEXT,
                    comparison_summary TEXT,
                    changes_json TEXT NOT NULL,
                    models_json TEXT NOT NULL,
                    source_bpm REAL,
                    remix_bpm REAL,
                    source_key TEXT,
                    remix_key TEXT
                )
                """
            )

    def list_entries(self, limit: int = 24) -> list[LibraryEntryResponse]:
        with self._lock, self._connect() as connection:
            rows = connection.execute(
                """
                SELECT entry_id, job_id, title, artist_name, genre, source_type, source_media_kind,
                       song_url, remix_prompt, created_at, source_public_url, source_audio_public_url,
                       remix_public_url, comparison_summary, changes_json, models_json, source_bpm,
                       remix_bpm, source_key, remix_key
                FROM library_entries
                ORDER BY datetime(created_at) DESC
                LIMIT ?
                """,
                (max(1, limit),),
            ).fetchall()
        return [self._row_to_entry(row) for row in rows]

    def save_completed_remix(
        self,
        *,
        job_id: str,
        source_type: str,
        submission: RemixSubmission,
        source_media_kind: str,
        source_original_path: Path,
        source_audio_path: Path,
        remix_path: Path,
        original_analysis: AnalysisSummary,
        remix_analysis: AnalysisSummary,
        comparison: ComparisonSummary,
    ) -> LibraryEntryResponse:
        with self._lock:
            with self._connect() as connection:
                existing = connection.execute(
                    """
                    SELECT entry_id, job_id, title, artist_name, genre, source_type, source_media_kind,
                           song_url, remix_prompt, created_at, source_public_url, source_audio_public_url,
                           remix_public_url, comparison_summary, changes_json, models_json, source_bpm,
                           remix_bpm, source_key, remix_key
                    FROM library_entries
                    WHERE job_id = ?
                    """,
                    (job_id,),
                ).fetchone()
                if existing is not None:
                    return self._row_to_entry(existing)

                entry_id = uuid.uuid4().hex
                entry_dir = self._entries_dir / entry_id
                entry_dir.mkdir(parents=True, exist_ok=True)

                source_copy = self._copy_artifact(source_original_path, entry_dir, "source")
                source_audio_copy = self._copy_artifact(source_audio_path, entry_dir, "source_audio")
                remix_copy = self._copy_artifact(remix_path, entry_dir, "remix")

                created_at = datetime.now(timezone.utc).isoformat()
                title = self._resolve_title(submission, source_original_path)
                source_key = self._build_key_label(original_analysis)
                remix_key = self._build_key_label(remix_analysis)

                payload = (
                    entry_id,
                    job_id,
                    title,
                    submission.artist_name,
                    submission.genre,
                    source_type,
                    source_media_kind,
                    submission.song_url,
                    submission.remix_prompt,
                    created_at,
                    self._public_url(source_copy),
                    self._public_url(source_audio_copy),
                    self._public_url(remix_copy),
                    comparison.summary,
                    json.dumps(comparison.changes),
                    json.dumps(comparison.models_used),
                    original_analysis.bpm,
                    remix_analysis.bpm,
                    source_key,
                    remix_key,
                )
                connection.execute(
                    """
                    INSERT INTO library_entries (
                        entry_id, job_id, title, artist_name, genre, source_type, source_media_kind,
                        song_url, remix_prompt, created_at, source_public_url, source_audio_public_url,
                        remix_public_url, comparison_summary, changes_json, models_json, source_bpm,
                        remix_bpm, source_key, remix_key
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    payload,
                )
                row = connection.execute(
                    """
                    SELECT entry_id, job_id, title, artist_name, genre, source_type, source_media_kind,
                           song_url, remix_prompt, created_at, source_public_url, source_audio_public_url,
                           remix_public_url, comparison_summary, changes_json, models_json, source_bpm,
                           remix_bpm, source_key, remix_key
                    FROM library_entries
                    WHERE entry_id = ?
                    """,
                    (entry_id,),
                ).fetchone()

        return self._row_to_entry(row)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._settings.library_db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _copy_artifact(self, source_path: Path, entry_dir: Path, stem: str) -> Path:
        suffix = source_path.suffix or ".bin"
        target = entry_dir / f"{stem}{suffix}"
        shutil.copy2(source_path, target)
        return target

    def _public_url(self, path: Path | None) -> str | None:
        if path is None:
            return None
        return f"/files/{path.relative_to(self._settings.data_dir).as_posix()}"

    def _resolve_title(self, submission: RemixSubmission, source_original_path: Path) -> str:
        if submission.song_title:
            return submission.song_title
        if submission.source_label:
            label_path = Path(submission.source_label)
            return label_path.stem.replace("_", " ").replace("-", " ").strip() or submission.source_label
        if source_original_path.stem.lower() == "source":
            return f"{submission.genre} Remix Source"
        return source_original_path.stem.replace("_", " ").replace("-", " ").strip() or f"{submission.genre} Remix Source"

    def _build_key_label(self, analysis: AnalysisSummary) -> str | None:
        if not analysis.musical_key:
            return None
        if analysis.scale:
            return f"{analysis.musical_key} {analysis.scale}"
        return analysis.musical_key

    def _row_to_entry(self, row: sqlite3.Row) -> LibraryEntryResponse:
        return LibraryEntryResponse(
            entry_id=row["entry_id"],
            job_id=row["job_id"],
            title=row["title"],
            artist_name=row["artist_name"],
            genre=row["genre"],
            source_type=row["source_type"],
            source_media_kind=row["source_media_kind"],
            song_url=row["song_url"],
            remix_prompt=row["remix_prompt"],
            created_at=datetime.fromisoformat(row["created_at"]),
            source_public_url=row["source_public_url"],
            source_audio_public_url=row["source_audio_public_url"],
            remix_public_url=row["remix_public_url"],
            comparison_summary=row["comparison_summary"],
            changes=json.loads(row["changes_json"] or "[]"),
            models_used=json.loads(row["models_json"] or "[]"),
            source_bpm=row["source_bpm"],
            remix_bpm=row["remix_bpm"],
            source_key=row["source_key"],
            remix_key=row["remix_key"],
        )
