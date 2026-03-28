from __future__ import annotations

from pathlib import Path

import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend_library import LibraryStore
from backend_models import (
    JobStore,
    LibraryListResponse,
    MergeBatchResponse,
    MergeBatchSubmission,
    RemixJobCreated,
    RemixJobResponse,
    RemixSubmission,
    RuntimeCheckResponse,
    SourcePreviewResponse,
    load_settings,
)
from backend_pipeline import RemixPipeline, SourceResolver, inspect_runtime


def create_app(project_root: Path | None = None) -> FastAPI:
    root = project_root or Path(__file__).resolve().parent
    settings = load_settings(root)
    for directory in (settings.data_dir, settings.jobs_dir, settings.temp_dir, settings.logs_dir, settings.library_dir):
        directory.mkdir(parents=True, exist_ok=True)

    jobs = JobStore()
    library = LibraryStore(settings)
    pipeline = RemixPipeline(settings, jobs, library)
    source_resolver = SourceResolver(settings)

    app = FastAPI(title="AI Remix Backend", version="0.2.0")
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/system/check", response_model=RuntimeCheckResponse)
    def runtime_check() -> RuntimeCheckResponse:
        return inspect_runtime()

    @app.get("/api/library", response_model=LibraryListResponse)
    def list_library(limit: int = 24) -> LibraryListResponse:
        return LibraryListResponse(entries=library.list_entries(limit=limit))

    @app.post("/api/remix/merge-batch", response_model=MergeBatchResponse)
    def merge_batch_remixes(submission: MergeBatchSubmission) -> MergeBatchResponse:
        try:
            return pipeline.merge_batch_remixes(submission)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/remix", response_model=RemixJobCreated)
    async def create_remix(
        genre: str = Form(...),
        song_url: str | None = Form(default=None),
        remix_prompt: str | None = Form(default=None),
        song_title: str | None = Form(default=None),
        artist_name: str | None = Form(default=None),
        source_label: str | None = Form(default=None),
        batch_index: int | None = Form(default=None),
        batch_total: int | None = Form(default=None),
        target_duration_seconds: int = Form(default=settings.target_duration_seconds),
        song_file: UploadFile | None = File(default=None),
    ) -> RemixJobCreated:
        if not song_url and song_file is None:
            raise HTTPException(status_code=400, detail="Provide either a song URL or an audio/video upload.")

        upload_bytes = await song_file.read() if song_file is not None else None
        upload_filename = song_file.filename if song_file is not None else None
        upload_content_type = song_file.content_type if song_file is not None else None

        submission = RemixSubmission(
            genre=genre,
            song_url=song_url,
            remix_prompt=remix_prompt,
            song_title=song_title,
            artist_name=artist_name,
            source_label=source_label,
            batch_index=batch_index,
            batch_total=batch_total,
            target_duration_seconds=target_duration_seconds,
        )
        return pipeline.submit(
            submission,
            upload_bytes=upload_bytes,
            upload_filename=upload_filename,
            upload_content_type=upload_content_type,
        )

    @app.post("/api/source-preview", response_model=SourcePreviewResponse)
    async def create_source_preview(
        song_url: str | None = Form(default=None),
        song_file: UploadFile | None = File(default=None),
    ) -> SourcePreviewResponse:
        if not song_url and song_file is None:
            raise HTTPException(status_code=400, detail="Provide either a song URL or an audio/video upload.")

        upload_bytes = await song_file.read() if song_file is not None else None
        upload_filename = song_file.filename if song_file is not None else None
        upload_content_type = song_file.content_type if song_file is not None else None

        preview_dir = settings.temp_dir / "previews" / uuid.uuid4().hex
        preview_dir.mkdir(parents=True, exist_ok=True)

        try:
            source = source_resolver.stage_source(
                preview_dir,
                song_url=song_url,
                upload_bytes=upload_bytes,
                upload_filename=upload_filename,
                upload_content_type=upload_content_type,
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return SourcePreviewResponse(
            source_media_kind=source.media_kind,
            input_public_url=f"/files/{source.original_path.relative_to(settings.data_dir).as_posix()}",
            input_audio_public_url=f"/files/{source.audio_path.relative_to(settings.data_dir).as_posix()}",
        )

    @app.get("/api/remix/{job_id}", response_model=RemixJobResponse)
    def get_remix(job_id: str) -> RemixJobResponse:
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found.")
        return job

    @app.get("/", include_in_schema=False)
    def root_index() -> FileResponse:
        return FileResponse(root / "index.html")

    @app.get("/index.html", include_in_schema=False)
    def index_html() -> FileResponse:
        return FileResponse(root / "index.html")

    @app.get("/library", include_in_schema=False)
    def library_page() -> FileResponse:
        return FileResponse(root / "library.html")

    @app.get("/library.html", include_in_schema=False)
    def library_html() -> FileResponse:
        return FileResponse(root / "library.html")

    @app.get("/styles.css", include_in_schema=False)
    def styles() -> FileResponse:
        return FileResponse(root / "styles.css")

    @app.get("/app.js", include_in_schema=False)
    def app_js() -> FileResponse:
        return FileResponse(root / "app.js")

    @app.get("/library.js", include_in_schema=False)
    def library_js() -> FileResponse:
        return FileResponse(root / "library.js")

    app.mount("/files", StaticFiles(directory=settings.data_dir), name="files")
    return app
