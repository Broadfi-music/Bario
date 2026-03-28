from __future__ import annotations

import os
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from threading import Lock

from pydantic import BaseModel, Field


@dataclass(slots=True)
class Settings:
    project_root: Path
    data_dir: Path
    jobs_dir: Path
    temp_dir: Path
    logs_dir: Path
    library_dir: Path
    library_db_path: Path
    separator_provider: str
    demucs_model: str
    generator_provider: str
    musicgen_model: str
    musicgen_cache_dir: Path | None
    musicgen_local_only: bool
    replicate_api_token: str | None
    replicate_model: str
    replicate_model_version: str
    replicate_audio_input_name: str
    replicate_attach_audio: bool
    replicate_output_format: str
    replicate_demucs_model: str
    replicate_demucs_model_name: str
    replicate_demucs_shifts: int
    replicate_demucs_overlap: float
    replicate_demucs_output_format: str
    replicate_request_timeout_seconds: int
    replicate_download_timeout_seconds: int
    replicate_retry_count: int
    replicate_retry_backoff_seconds: float
    replicate_top_k: int
    replicate_top_p: float
    replicate_temperature: float
    replicate_continuation: bool
    replicate_continuation_start: int
    replicate_multi_band_diffusion: bool
    replicate_normalization_strategy: str
    replicate_classifier_free_guidance: float
    replicate_beat_sync_threshold: float
    replicate_large_chord_voca: bool
    replicate_chroma_coefficient: float
    replicate_seed: int
    target_duration_seconds: int
    long_source_trigger_seconds: int
    max_processing_source_seconds: int
    allow_mock_fallback: bool
    device_preference: str
    demucs_segment_seconds: int


def load_settings(project_root: Path) -> Settings:
    data_dir = project_root / "data"
    library_dir = data_dir / "library"
    cache_dir_value = os.getenv("MUSICGEN_CACHE_DIR")
    replicate_api_token = os.getenv("REPLICATE_API_TOKEN")
    default_provider = "replicate" if replicate_api_token else "local"
    return Settings(
        project_root=project_root,
        data_dir=data_dir,
        jobs_dir=data_dir / "jobs",
        temp_dir=data_dir / "tmp",
        logs_dir=data_dir / "logs",
        library_dir=library_dir,
        library_db_path=library_dir / "library.db",
        separator_provider=os.getenv("REMIX_SEPARATOR_PROVIDER", default_provider).strip().lower(),
        demucs_model=os.getenv("DEMUCS_MODEL", "htdemucs"),
        generator_provider=os.getenv("REMIX_GENERATOR_PROVIDER", default_provider).strip().lower(),
        musicgen_model=os.getenv("MUSICGEN_MODEL", "facebook/musicgen-melody"),
        musicgen_cache_dir=Path(cache_dir_value).expanduser() if cache_dir_value else None,
        musicgen_local_only=os.getenv("MUSICGEN_LOCAL_ONLY", "0") == "1",
        replicate_api_token=replicate_api_token,
        replicate_demucs_model=os.getenv(
            "REPLICATE_DEMUCS_MODEL",
            "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
        ),
        replicate_demucs_model_name=os.getenv("REPLICATE_DEMUCS_MODEL_NAME", "htdemucs_ft"),
        replicate_demucs_shifts=int(os.getenv("REPLICATE_DEMUCS_SHIFTS", "1")),
        replicate_demucs_overlap=float(os.getenv("REPLICATE_DEMUCS_OVERLAP", "0.25")),
        replicate_demucs_output_format=os.getenv("REPLICATE_DEMUCS_OUTPUT_FORMAT", "wav").strip().lower(),
        replicate_request_timeout_seconds=int(os.getenv("REPLICATE_REQUEST_TIMEOUT_SECONDS", "300")),
        replicate_download_timeout_seconds=int(os.getenv("REPLICATE_DOWNLOAD_TIMEOUT_SECONDS", "300")),
        replicate_retry_count=int(os.getenv("REPLICATE_RETRY_COUNT", "3")),
        replicate_retry_backoff_seconds=float(os.getenv("REPLICATE_RETRY_BACKOFF_SECONDS", "2.0")),
        replicate_model=os.getenv(
            "REPLICATE_MODEL",
            "sakemin/musicgen-remixer:e89b6e5f6e2acf5fd95ee0475799b8dd527109195e201d9dca8a9de95551d035",
        ),
        replicate_model_version=os.getenv("REPLICATE_MODEL_VERSION", "stereo-chord"),
        replicate_audio_input_name=os.getenv("REPLICATE_AUDIO_INPUT_NAME", "melody").strip(),
        replicate_attach_audio=os.getenv("REPLICATE_ATTACH_AUDIO", "0") == "1",
        replicate_output_format=os.getenv("REPLICATE_OUTPUT_FORMAT", "wav").strip().lower(),
        replicate_top_k=int(os.getenv("REPLICATE_TOP_K", "250")),
        replicate_top_p=float(os.getenv("REPLICATE_TOP_P", "0")),
        replicate_temperature=float(os.getenv("REPLICATE_TEMPERATURE", "1")),
        replicate_continuation=os.getenv("REPLICATE_CONTINUATION", "0") == "1",
        replicate_continuation_start=int(os.getenv("REPLICATE_CONTINUATION_START", "0")),
        replicate_multi_band_diffusion=os.getenv("REPLICATE_MULTI_BAND_DIFFUSION", "0") == "1",
        replicate_normalization_strategy=os.getenv("REPLICATE_NORMALIZATION_STRATEGY", "peak").strip(),
        replicate_classifier_free_guidance=float(os.getenv("REPLICATE_CLASSIFIER_FREE_GUIDANCE", "3")),
        replicate_beat_sync_threshold=float(os.getenv("REPLICATE_BEAT_SYNC_THRESHOLD", "0.75")),
        replicate_large_chord_voca=os.getenv("REPLICATE_LARGE_CHORD_VOCA", "1") == "1",
        replicate_chroma_coefficient=float(os.getenv("REPLICATE_CHROMA_COEFFICIENT", "1")),
        replicate_seed=int(os.getenv("REPLICATE_SEED", "-1")),
        target_duration_seconds=int(os.getenv("REMIX_TARGET_DURATION", "20")),
        long_source_trigger_seconds=int(os.getenv("REMIX_LONG_SOURCE_TRIGGER_SECONDS", "75")),
        max_processing_source_seconds=int(os.getenv("REMIX_MAX_PROCESSING_SOURCE_SECONDS", "45")),
        allow_mock_fallback=os.getenv("REMIX_ALLOW_MOCK_FALLBACK", "0") == "1",
        device_preference=os.getenv("REMIX_DEVICE", "cuda").strip().lower(),
        demucs_segment_seconds=int(os.getenv("DEMUCS_SEGMENT_SECONDS", "7")),
    )


class JobStatus(str, Enum):
    queued = "queued"
    ingesting = "ingesting"
    planning = "planning"
    separating = "separating"
    analyzing = "analyzing"
    generating = "generating"
    mixing = "mixing"
    completed = "completed"
    failed = "failed"


class RemixSubmission(BaseModel):
    genre: str = Field(min_length=1)
    song_url: str | None = None
    remix_prompt: str | None = None
    song_title: str | None = None
    artist_name: str | None = None
    source_label: str | None = None
    batch_index: int | None = Field(default=None, ge=1)
    batch_total: int | None = Field(default=None, ge=1)
    target_duration_seconds: int = Field(default=20, ge=4, le=60)


class MergeBatchItem(BaseModel):
    source_label: str
    input_audio_public_url: str
    remix_public_url: str


class MergeBatchSubmission(BaseModel):
    genre: str = Field(min_length=1)
    remix_prompt: str | None = None
    target_duration_seconds: int = Field(default=20, ge=4, le=300)
    items: list[MergeBatchItem] = Field(min_length=2)


class AnalysisSummary(BaseModel):
    bpm: float | None = None
    beat_count: int | None = None
    rhythm_confidence: float | None = None
    musical_key: str | None = None
    scale: str | None = None
    key_strength: float | None = None
    duration_seconds: float | None = None
    notes: list[str] = Field(default_factory=list)


class ArtifactSummary(BaseModel):
    library_entry_id: str | None = None
    input_file: str | None = None
    input_public_url: str | None = None
    input_audio_file: str | None = None
    input_audio_public_url: str | None = None
    source_media_kind: str | None = None
    stems_dir: str | None = None
    guide_file: str | None = None
    accompaniment_file: str | None = None
    styled_accompaniment_file: str | None = None
    remix_file: str | None = None
    public_remix_url: str | None = None


class ComparisonSummary(BaseModel):
    models_used: list[str] = Field(default_factory=list)
    summary: str | None = None
    changes: list[str] = Field(default_factory=list)


class RemixJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    current_stage: str
    message: str
    source_type: str
    genre: str
    created_at: datetime
    updated_at: datetime
    analysis: AnalysisSummary = Field(default_factory=AnalysisSummary)
    remix_analysis: AnalysisSummary = Field(default_factory=AnalysisSummary)
    comparison: ComparisonSummary = Field(default_factory=ComparisonSummary)
    artifacts: ArtifactSummary = Field(default_factory=ArtifactSummary)
    error: str | None = None


class RemixJobCreated(BaseModel):
    job_id: str
    status: JobStatus
    current_stage: str


class MergeBatchResponse(BaseModel):
    library_entry_id: str | None = None
    title: str
    source_media_kind: str = "audio"
    merged_source_public_url: str
    merged_remix_public_url: str
    summary: str
    changes: list[str] = Field(default_factory=list)
    models_used: list[str] = Field(default_factory=list)


class DependencyStatus(BaseModel):
    available: bool
    detail: str


class RuntimeCheckResponse(BaseModel):
    python_version: str
    platform: str
    recommended_environment: str
    agent_framework: str | None = None
    separator_provider: str | None = None
    generator_provider: str | None = None
    separator_model: str | None = None
    generator_model: str | None = None
    selected_device: str | None = None
    cuda_available: bool | None = None
    cuda_device_name: str | None = None
    cuda_version: str | None = None
    dependencies: dict[str, DependencyStatus]


class SourcePreviewResponse(BaseModel):
    source_media_kind: str
    input_public_url: str
    input_audio_public_url: str


class LibraryEntryResponse(BaseModel):
    entry_id: str
    job_id: str
    title: str
    artist_name: str | None = None
    genre: str
    source_type: str
    source_media_kind: str
    song_url: str | None = None
    remix_prompt: str | None = None
    created_at: datetime
    source_public_url: str | None = None
    source_audio_public_url: str | None = None
    remix_public_url: str | None = None
    comparison_summary: str | None = None
    changes: list[str] = Field(default_factory=list)
    models_used: list[str] = Field(default_factory=list)
    source_bpm: float | None = None
    remix_bpm: float | None = None
    source_key: str | None = None
    remix_key: str | None = None


class LibraryListResponse(BaseModel):
    entries: list[LibraryEntryResponse] = Field(default_factory=list)


@dataclass
class JobRecord:
    job_id: str
    source_type: str
    submission: RemixSubmission
    status: JobStatus
    current_stage: str
    message: str
    created_at: datetime
    updated_at: datetime
    analysis: AnalysisSummary = field(default_factory=AnalysisSummary)
    remix_analysis: AnalysisSummary = field(default_factory=AnalysisSummary)
    comparison: ComparisonSummary = field(default_factory=ComparisonSummary)
    artifacts: ArtifactSummary = field(default_factory=ArtifactSummary)
    error: str | None = None

    def to_response(self) -> RemixJobResponse:
        return RemixJobResponse(
            job_id=self.job_id,
            status=self.status,
            current_stage=self.current_stage,
            message=self.message,
            source_type=self.source_type,
            genre=self.submission.genre,
            created_at=self.created_at,
            updated_at=self.updated_at,
            analysis=AnalysisSummary(**self.analysis.model_dump()),
            remix_analysis=AnalysisSummary(**self.remix_analysis.model_dump()),
            comparison=ComparisonSummary(**self.comparison.model_dump()),
            artifacts=ArtifactSummary(**self.artifacts.model_dump()),
            error=self.error,
        )


class JobStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._jobs: dict[str, JobRecord] = {}

    def create(self, job_id: str, submission: RemixSubmission, source_type: str) -> RemixJobCreated:
        now = datetime.now(timezone.utc)
        record = JobRecord(
            job_id=job_id,
            source_type=source_type,
            submission=submission,
            status=JobStatus.queued,
            current_stage="queued",
            message="Job queued.",
            created_at=now,
            updated_at=now,
        )

        with self._lock:
            self._jobs[job_id] = record

        return RemixJobCreated(
            job_id=job_id,
            status=record.status,
            current_stage=record.current_stage,
        )

    def get(self, job_id: str) -> RemixJobResponse | None:
        with self._lock:
            record = self._jobs.get(job_id)
            if record is None:
                return None
            snapshot = deepcopy(record)

        return snapshot.to_response()

    def update(
        self,
        job_id: str,
        *,
        status: JobStatus | None = None,
        current_stage: str | None = None,
        message: str | None = None,
        analysis: dict | None = None,
        remix_analysis: dict | None = None,
        comparison: dict | None = None,
        artifacts: dict | None = None,
        error: str | None = None,
    ) -> None:
        with self._lock:
            record = self._jobs[job_id]

            if status is not None:
                record.status = status
            if current_stage is not None:
                record.current_stage = current_stage
            if message is not None:
                record.message = message
            if analysis is not None:
                record.analysis = AnalysisSummary(**{**record.analysis.model_dump(), **analysis})
            if remix_analysis is not None:
                record.remix_analysis = AnalysisSummary(**{**record.remix_analysis.model_dump(), **remix_analysis})
            if comparison is not None:
                record.comparison = ComparisonSummary(**{**record.comparison.model_dump(), **comparison})
            if artifacts is not None:
                record.artifacts = ArtifactSummary(**{**record.artifacts.model_dump(), **artifacts})
            if error is not None:
                record.error = error

            record.updated_at = datetime.now(timezone.utc)
