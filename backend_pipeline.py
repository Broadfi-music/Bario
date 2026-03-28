from __future__ import annotations

import importlib.util
import mimetypes
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.error
import urllib.request
import uuid
import wave
from contextlib import contextmanager
from dataclasses import dataclass, replace
from pathlib import Path

from backend_agents import BatchSequencePlan, GenreAgentPlan, LangGraphGenrePlanner, PromptControlSet
from backend_library import LibraryStore
from backend_models import (
    AnalysisSummary,
    ComparisonSummary,
    DependencyStatus,
    JobStatus,
    JobStore,
    MergeBatchResponse,
    MergeBatchSubmission,
    RemixJobCreated,
    RemixSubmission,
    RuntimeCheckResponse,
    Settings,
)

os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
os.environ.setdefault("TRANSFORMERS_NO_FLAX", "1")
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")
os.environ.setdefault("PYTORCH_NO_CUDA_MEMORY_CACHING", "1")


class AdapterError(RuntimeError):
    """Raised when a model adapter cannot complete the requested action."""


def inspect_runtime() -> RuntimeCheckResponse:
    preferred_device = os.getenv("REMIX_DEVICE", "cuda").strip().lower()
    replicate_token = os.getenv("REPLICATE_API_TOKEN")
    default_provider = "replicate" if replicate_token else "local"
    separator_provider = os.getenv("REMIX_SEPARATOR_PROVIDER", default_provider).strip().lower()
    generator_provider = os.getenv("REMIX_GENERATOR_PROVIDER", default_provider).strip().lower()
    separator_model = (
        os.getenv("REPLICATE_DEMUCS_MODEL", "cjwbw/demucs")
        if separator_provider == "replicate"
        else os.getenv("DEMUCS_MODEL", "htdemucs")
    )
    generator_model = (
        os.getenv("REPLICATE_MODEL", "sakemin/musicgen-remixer")
        if generator_provider == "replicate"
        else os.getenv("MUSICGEN_MODEL", "facebook/musicgen-melody")
    )
    selected_device, cuda_available, cuda_device_name, cuda_version = _inspect_torch_device(preferred_device)
    dependencies = {
        "demucs": _dependency_status("demucs", "python -m pip install demucs"),
        "langgraph": _dependency_status("langgraph", "python -m pip install langgraph"),
        "librosa": _dependency_status("librosa", "python -m pip install librosa soundfile"),
        "replicate": _replicate_dependency_status(separator_provider, generator_provider),
        "transformers": _dependency_status("transformers", "python -m pip install transformers"),
        "torch": _dependency_status("torch", "python -m pip install torch"),
        "torchaudio": _dependency_status("torchaudio", "pip install torchaudio"),
        "soundfile": _dependency_status("soundfile", "pip install soundfile"),
        "yt_dlp": _dependency_status("yt_dlp", "pip install yt-dlp"),
        "ffmpeg": _binary_status("ffmpeg", "Install ffmpeg and ensure it is on PATH."),
    }
    return RuntimeCheckResponse(
        python_version=sys.version.split()[0],
        platform=sys.platform,
        recommended_environment="Windows 10/11 or Linux, Python 3.10/3.11, ffmpeg on PATH, LangGraph installed for agent orchestration, GPU recommended for local MusicGen. Replicate mode requires internet access and REPLICATE_API_TOKEN.",
        agent_framework="langgraph",
        separator_provider=separator_provider,
        generator_provider=generator_provider,
        separator_model=separator_model,
        generator_model=generator_model,
        selected_device=selected_device,
        cuda_available=cuda_available,
        cuda_device_name=cuda_device_name,
        cuda_version=cuda_version,
        dependencies=dependencies,
    )


def _dependency_status(module_name: str, install_hint: str) -> DependencyStatus:
    available = importlib.util.find_spec(module_name) is not None
    return DependencyStatus(available=available, detail="available" if available else install_hint)


def _replicate_dependency_status(separator_provider: str, generator_provider: str) -> DependencyStatus:
    available = importlib.util.find_spec("replicate") is not None
    token_present = bool(os.getenv("REPLICATE_API_TOKEN"))
    if generator_provider == "replicate" or separator_provider == "replicate":
        if not available:
            return DependencyStatus(available=False, detail="python -m pip install replicate")
        if not token_present:
            return DependencyStatus(available=False, detail="Set REPLICATE_API_TOKEN to your Replicate API token.")
        return DependencyStatus(available=True, detail="available")
    return DependencyStatus(available=available, detail="available" if available else "Optional: python -m pip install replicate")


def _binary_status(binary_name: str, install_hint: str) -> DependencyStatus:
    available = shutil.which(binary_name) is not None
    return DependencyStatus(available=available, detail="available on PATH" if available else install_hint)


def _inspect_torch_device(preferred_device: str) -> tuple[str, bool, str | None, str | None]:
    try:
        import torch
    except ImportError:
        selected = "cpu" if preferred_device == "cpu" else preferred_device or "cpu"
        return selected, False, None, None

    cuda_available = bool(torch.cuda.is_available())
    cuda_device_name = torch.cuda.get_device_name(0) if cuda_available else None
    cuda_version = torch.version.cuda

    if preferred_device == "cpu":
        return "cpu", cuda_available, cuda_device_name, cuda_version
    if preferred_device == "cuda":
        return ("cuda" if cuda_available else "cpu"), cuda_available, cuda_device_name, cuda_version
    return ("cuda" if cuda_available else "cpu"), cuda_available, cuda_device_name, cuda_version


def _resolve_torch_device(settings: Settings) -> str:
    selected_device, cuda_available, _, _ = _inspect_torch_device(settings.device_preference)
    if settings.device_preference == "cuda" and not cuda_available and not settings.allow_mock_fallback:
        raise AdapterError("REMIX_DEVICE is set to cuda but CUDA is not available in this Python environment.")
    return selected_device


def _is_timeout_error(exc: Exception) -> bool:
    lowered = str(exc).lower()
    return isinstance(exc, (TimeoutError, socket.timeout)) or "timed out" in lowered or "timeout" in lowered


def _is_transient_remote_error(exc: Exception) -> bool:
    lowered = str(exc).lower()
    return (
        _is_timeout_error(exc)
        or "connection reset" in lowered
        or "temporarily unavailable" in lowered
        or "bad gateway" in lowered
        or "gateway timeout" in lowered
        or "service unavailable" in lowered
        or "503" in lowered
        or "504" in lowered
        or "502" in lowered
    )


def _retry_with_backoff(action, *, attempts: int, delay_seconds: float):
    last_exc: Exception | None = None
    safe_attempts = max(1, attempts)
    for attempt in range(safe_attempts):
        try:
            return action()
        except Exception as exc:
            last_exc = exc
            if attempt >= safe_attempts - 1 or not _is_transient_remote_error(exc):
                raise
            time.sleep(max(0.1, delay_seconds) * (attempt + 1))
    if last_exc is not None:
        raise last_exc
    raise RuntimeError("Retry helper exhausted without an exception or result.")


def _read_remote_binary_payload(
    payload: object,
    default_suffix: str = ".wav",
    *,
    timeout_seconds: int = 180,
    retry_count: int = 1,
    retry_backoff_seconds: float = 2.0,
) -> tuple[bytes, str]:
    resolved = payload
    if isinstance(resolved, dict):
        for key in ("audio", "output", "file", "url"):
            if key in resolved:
                resolved = resolved[key]
                break
    if isinstance(resolved, (list, tuple)):
        if not resolved:
            raise AdapterError("Replicate returned an empty output payload.")
        resolved = resolved[0]

    if hasattr(resolved, "read"):
        data = resolved.read()
        if isinstance(data, str):
            data = data.encode("utf-8")
        if not isinstance(data, (bytes, bytearray)):
            raise AdapterError("Replicate returned a non-binary file payload.")
        return bytes(data), default_suffix

    url_value = getattr(resolved, "url", None)
    if isinstance(url_value, str):
        resolved = url_value

    if isinstance(resolved, str):
        suffix = Path(urllib.parse.urlparse(resolved).path).suffix or default_suffix
        def _download() -> tuple[bytes, str]:
            with urllib.request.urlopen(resolved, timeout=timeout_seconds) as response:
                return response.read(), suffix

        return _retry_with_backoff(
            _download,
            attempts=retry_count,
            delay_seconds=retry_backoff_seconds,
        )

    raise AdapterError("Replicate returned an unsupported output payload.")


@dataclass(slots=True)
class ResolvedSource:
    original_path: Path
    audio_path: Path
    media_kind: str


@dataclass(slots=True)
class ProcessingSource:
    audio_path: Path
    source_duration_seconds: float | None
    excerpt_applied: bool
    excerpt_start_seconds: float | None
    excerpt_duration_seconds: float | None
    notes: list[str]


@dataclass(frozen=True, slots=True)
class GenreProfile:
    target_bpm: int | None
    prompt_tags: tuple[str, ...]
    drums_level: float = 1.0
    bass_level: float = 1.0
    other_level: float = 1.0
    harmonic_level: float = 1.0
    percussive_level: float = 1.0
    pitch_shift_steps: float = 0.0
    guide_drive: float = 0.0
    vocal_mix: float = 0.8
    accompaniment_mix: float = 1.15
    bass_reinforcement_mix: float = 0.2
    drums_reinforcement_mix: float = 0.12
    texture_reinforcement_mix: float = 0.06
    keep_vocals: bool = True
    filter_chain: tuple[str, ...] = ()
    master_filter_chain: tuple[str, ...] = ()


_DEFAULT_GENRE_PROFILE = GenreProfile(
    target_bpm=118,
    prompt_tags=(
        "new drums",
        "new bassline",
        "new harmony stack",
        "clear genre transformation",
        "festival-ready arrangement",
    ),
    drums_level=1.1,
    bass_level=1.1,
    other_level=0.9,
    harmonic_level=1.0,
    percussive_level=1.1,
    guide_drive=0.1,
    vocal_mix=0.7,
    accompaniment_mix=1.18,
    bass_reinforcement_mix=0.2,
    drums_reinforcement_mix=0.12,
    texture_reinforcement_mix=0.06,
    filter_chain=(
        "highpass=f=35",
        "bass=g=3:f=110:w=0.9",
        "acompressor=threshold=-18dB:ratio=2.5:attack=15:release=120",
    ),
    master_filter_chain=(
        "bass=g=1.8:f=95:w=0.8",
        "acompressor=threshold=-16dB:ratio=2.2:attack=12:release=110",
        "alimiter=limit=0.93",
    ),
)


_GENRE_PROFILES = {
    "Amapiano": GenreProfile(
        target_bpm=113,
        prompt_tags=("log drum bass", "percussive piano stabs", "rolling shakers", "deep late-night groove"),
        drums_level=1.2,
        bass_level=1.45,
        other_level=0.82,
        harmonic_level=1.0,
        percussive_level=1.2,
        guide_drive=0.16,
        vocal_mix=0.66,
        accompaniment_mix=1.28,
        bass_reinforcement_mix=0.34,
        drums_reinforcement_mix=0.14,
        texture_reinforcement_mix=0.04,
        filter_chain=("highpass=f=30", "bass=g=6:f=95:w=1.0", "treble=g=1.2:f=7600:w=0.6"),
        master_filter_chain=("bass=g=2.8:f=92:w=1.0", "acompressor=threshold=-15dB:ratio=2.4:attack=10:release=110", "alimiter=limit=0.93"),
    ),
    "Trap": GenreProfile(
        target_bpm=145,
        prompt_tags=("808 sub bass", "rapid hi-hats", "dark pads", "hard trap drums"),
        drums_level=1.35,
        bass_level=1.4,
        other_level=0.72,
        harmonic_level=0.85,
        percussive_level=1.32,
        guide_drive=0.2,
        vocal_mix=0.6,
        accompaniment_mix=1.26,
        bass_reinforcement_mix=0.28,
        drums_reinforcement_mix=0.16,
        texture_reinforcement_mix=0.04,
        filter_chain=(
            "highpass=f=28",
            "bass=g=5:f=88:w=0.8",
            "treble=g=1.5:f=6800:w=0.7",
            "acompressor=threshold=-18dB:ratio=3:attack=10:release=110",
        ),
        master_filter_chain=("bass=g=2.6:f=82:w=0.9", "acompressor=threshold=-14dB:ratio=2.8:attack=8:release=90", "alimiter=limit=0.92"),
    ),
    "Funk": GenreProfile(
        target_bpm=114,
        prompt_tags=("syncopated bass guitar feel", "tight groove", "snappy drums", "dance-floor swing"),
        drums_level=1.14,
        bass_level=1.32,
        other_level=1.0,
        harmonic_level=1.0,
        percussive_level=1.08,
        guide_drive=0.1,
        vocal_mix=0.74,
        accompaniment_mix=1.16,
        bass_reinforcement_mix=0.22,
        drums_reinforcement_mix=0.15,
        texture_reinforcement_mix=0.1,
        filter_chain=("highpass=f=34", "bass=g=4:f=120:w=0.9", "treble=g=1:f=6200:w=0.5"),
        master_filter_chain=("bass=g=1.8:f=110:w=0.8", "acompressor=threshold=-16dB:ratio=2.1:attack=12:release=120", "alimiter=limit=0.94"),
    ),
    "Hip Hop": GenreProfile(
        target_bpm=92,
        prompt_tags=("punchy drums", "808 bass", "sampled texture", "head-nod groove"),
        drums_level=1.18,
        bass_level=1.24,
        other_level=0.9,
        harmonic_level=0.92,
        percussive_level=1.15,
        guide_drive=0.12,
        vocal_mix=0.78,
        accompaniment_mix=1.18,
        bass_reinforcement_mix=0.24,
        drums_reinforcement_mix=0.14,
        texture_reinforcement_mix=0.08,
        filter_chain=("highpass=f=35", "bass=g=4:f=110:w=0.9", "treble=g=1:f=5600:w=0.6"),
        master_filter_chain=("bass=g=2.2:f=98:w=0.85", "acompressor=threshold=-15dB:ratio=2.4:attack=10:release=105", "alimiter=limit=0.93"),
    ),
    "Country": GenreProfile(
        target_bpm=110,
        prompt_tags=("live drums", "warm bass", "bright guitars", "open country arrangement"),
        drums_level=0.95,
        bass_level=1.0,
        other_level=1.18,
        harmonic_level=1.16,
        percussive_level=0.9,
        vocal_mix=0.84,
        accompaniment_mix=1.06,
        bass_reinforcement_mix=0.14,
        drums_reinforcement_mix=0.1,
        texture_reinforcement_mix=0.16,
        filter_chain=("highpass=f=45", "treble=g=2:f=7000:w=0.7"),
        master_filter_chain=("bass=g=1.2:f=115:w=0.7", "acompressor=threshold=-17dB:ratio=1.9:attack=16:release=130", "alimiter=limit=0.95"),
    ),
    "80s": GenreProfile(
        target_bpm=118,
        prompt_tags=("retro synths", "gated drums", "bright pads", "anthemic chorus lift"),
        drums_level=1.08,
        bass_level=1.0,
        other_level=1.24,
        harmonic_level=1.2,
        percussive_level=1.0,
        pitch_shift_steps=0.5,
        guide_drive=0.12,
        vocal_mix=0.7,
        accompaniment_mix=1.15,
        bass_reinforcement_mix=0.16,
        drums_reinforcement_mix=0.12,
        texture_reinforcement_mix=0.16,
        filter_chain=("highpass=f=40", "treble=g=3:f=8500:w=0.8", "acompressor=threshold=-20dB:ratio=2.3:attack=18:release=130"),
        master_filter_chain=("bass=g=1.6:f=105:w=0.75", "acompressor=threshold=-16dB:ratio=2.1:attack=12:release=120", "alimiter=limit=0.94"),
    ),
    "R&B": GenreProfile(
        target_bpm=84,
        prompt_tags=("smooth drums", "deep bass pocket", "lush chords", "late-night atmosphere"),
        drums_level=0.95,
        bass_level=1.22,
        other_level=1.12,
        harmonic_level=1.15,
        percussive_level=0.85,
        vocal_mix=0.9,
        accompaniment_mix=1.05,
        bass_reinforcement_mix=0.2,
        drums_reinforcement_mix=0.08,
        texture_reinforcement_mix=0.12,
        filter_chain=("highpass=f=38", "bass=g=3:f=110:w=0.8", "treble=g=0.8:f=6000:w=0.6"),
        master_filter_chain=("bass=g=1.8:f=102:w=0.8", "acompressor=threshold=-16dB:ratio=2.0:attack=14:release=125", "alimiter=limit=0.94"),
    ),
    "Soul": GenreProfile(
        target_bpm=96,
        prompt_tags=("warm live drums", "expressive bass", "rich harmony", "organic soul feel"),
        drums_level=0.96,
        bass_level=1.15,
        other_level=1.15,
        harmonic_level=1.2,
        percussive_level=0.88,
        vocal_mix=0.9,
        accompaniment_mix=1.04,
        bass_reinforcement_mix=0.18,
        drums_reinforcement_mix=0.08,
        texture_reinforcement_mix=0.14,
        filter_chain=("highpass=f=40", "bass=g=2.5:f=115:w=0.7"),
        master_filter_chain=("bass=g=1.5:f=108:w=0.75", "acompressor=threshold=-16dB:ratio=2.0:attack=15:release=130", "alimiter=limit=0.94"),
    ),
    "Pop": GenreProfile(
        target_bpm=118,
        prompt_tags=("clean pop drums", "glossy synth layers", "hook-focused arrangement", "radio-ready lift"),
        drums_level=1.02,
        bass_level=1.02,
        other_level=1.2,
        harmonic_level=1.12,
        percussive_level=1.0,
        pitch_shift_steps=0.5,
        guide_drive=0.08,
        vocal_mix=0.88,
        accompaniment_mix=1.08,
        bass_reinforcement_mix=0.16,
        drums_reinforcement_mix=0.1,
        texture_reinforcement_mix=0.14,
        filter_chain=("highpass=f=40", "treble=g=2.3:f=8800:w=0.7", "acompressor=threshold=-20dB:ratio=2.5:attack=16:release=100"),
        master_filter_chain=("bass=g=1.4:f=104:w=0.75", "acompressor=threshold=-16dB:ratio=2.1:attack=12:release=110", "alimiter=limit=0.94"),
    ),
    "Gen Z": GenreProfile(
        target_bpm=138,
        prompt_tags=("hyperpop textures", "bright digital synths", "chopped transitions", "explosive drops"),
        drums_level=1.3,
        bass_level=1.12,
        other_level=1.08,
        harmonic_level=1.06,
        percussive_level=1.22,
        pitch_shift_steps=1.0,
        guide_drive=0.22,
        vocal_mix=0.55,
        accompaniment_mix=1.32,
        bass_reinforcement_mix=0.18,
        drums_reinforcement_mix=0.14,
        texture_reinforcement_mix=0.08,
        filter_chain=(
            "highpass=f=45",
            "bass=g=2:f=125:w=0.8",
            "treble=g=4:f=9200:w=0.8",
            "acompressor=threshold=-20dB:ratio=4:attack=5:release=90",
        ),
        master_filter_chain=("bass=g=1.8:f=118:w=0.8", "acompressor=threshold=-15dB:ratio=2.6:attack=8:release=85", "alimiter=limit=0.92"),
    ),
    "Jazz": GenreProfile(
        target_bpm=126,
        prompt_tags=("walking bass feel", "brush drums", "jazz harmony", "improvised color tones"),
        drums_level=0.76,
        bass_level=0.96,
        other_level=1.28,
        harmonic_level=1.3,
        percussive_level=0.72,
        vocal_mix=0.52,
        accompaniment_mix=1.08,
        bass_reinforcement_mix=0.12,
        drums_reinforcement_mix=0.08,
        texture_reinforcement_mix=0.18,
        filter_chain=("highpass=f=45", "lowpass=f=9000", "treble=g=-0.5:f=6200:w=0.7"),
        master_filter_chain=("bass=g=1.0:f=115:w=0.7", "acompressor=threshold=-18dB:ratio=1.8:attack=20:release=150", "alimiter=limit=0.95"),
    ),
    "Reggae": GenreProfile(
        target_bpm=76,
        prompt_tags=("offbeat skank guitar feel", "heavy bass", "laid-back groove", "dub-influenced space"),
        drums_level=0.88,
        bass_level=1.35,
        other_level=1.0,
        harmonic_level=1.04,
        percussive_level=0.82,
        vocal_mix=0.68,
        accompaniment_mix=1.14,
        bass_reinforcement_mix=0.3,
        drums_reinforcement_mix=0.1,
        texture_reinforcement_mix=0.08,
        filter_chain=("highpass=f=32", "bass=g=5:f=92:w=0.9", "treble=g=0.5:f=5800:w=0.5"),
        master_filter_chain=("bass=g=2.4:f=90:w=0.95", "acompressor=threshold=-15dB:ratio=2.2:attack=11:release=120", "alimiter=limit=0.93"),
    ),
    "Gospel": GenreProfile(
        target_bpm=98,
        prompt_tags=("uplifting chords", "wide piano voicings", "live-band energy", "gospel progression"),
        drums_level=0.98,
        bass_level=1.05,
        other_level=1.22,
        harmonic_level=1.28,
        percussive_level=0.92,
        vocal_mix=0.86,
        accompaniment_mix=1.08,
        bass_reinforcement_mix=0.16,
        drums_reinforcement_mix=0.1,
        texture_reinforcement_mix=0.16,
        filter_chain=("highpass=f=40", "treble=g=1.2:f=7200:w=0.6"),
        master_filter_chain=("bass=g=1.4:f=108:w=0.7", "acompressor=threshold=-16dB:ratio=2.0:attack=14:release=125", "alimiter=limit=0.94"),
    ),
    "Instrumental": GenreProfile(
        target_bpm=110,
        prompt_tags=("instrumental remix", "new lead instruments", "no lead vocal in final mix", "cinematic dynamics"),
        drums_level=1.08,
        bass_level=1.12,
        other_level=1.18,
        harmonic_level=1.14,
        percussive_level=1.05,
        guide_drive=0.1,
        vocal_mix=0.0,
        accompaniment_mix=1.25,
        bass_reinforcement_mix=0.18,
        drums_reinforcement_mix=0.12,
        texture_reinforcement_mix=0.1,
        keep_vocals=False,
        filter_chain=("highpass=f=35", "bass=g=3:f=105:w=0.8", "treble=g=1.8:f=8200:w=0.6"),
        master_filter_chain=("bass=g=1.7:f=100:w=0.8", "acompressor=threshold=-16dB:ratio=2.2:attack=12:release=110", "alimiter=limit=0.93"),
    ),
}


def _get_genre_profile(genre: str) -> GenreProfile:
    return _GENRE_PROFILES.get(genre.strip(), _DEFAULT_GENRE_PROFILE)


def _clamp_mix(value: float, minimum: float = 0.0, maximum: float = 1.6) -> float:
    return max(minimum, min(maximum, value))


class SourceResolver:
    _audio_suffixes = {".mp3", ".mpeg", ".wav", ".ogg", ".m4a", ".aac", ".flac"}
    _video_suffixes = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mpg"}

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def stage_source(
        self,
        job_dir: Path,
        *,
        song_url: str | None,
        upload_bytes: bytes | None,
        upload_filename: str | None,
        upload_content_type: str | None,
    ) -> ResolvedSource:
        input_dir = job_dir / "input"
        input_dir.mkdir(parents=True, exist_ok=True)

        if upload_bytes is not None:
            suffix = Path(upload_filename or "upload.bin").suffix or ".bin"
            original_path = input_dir / f"source{suffix}"
            original_path.write_bytes(upload_bytes)
            media_kind = self._infer_media_kind(original_path, upload_content_type)
            audio_path = self._ensure_audio_source(original_path, media_kind, job_dir)
            return ResolvedSource(original_path=original_path, audio_path=audio_path, media_kind=media_kind)

        if not song_url:
            raise AdapterError("No song URL or upload was provided.")

        if self._is_direct_media_url(song_url):
            original_path = self._download_direct(song_url, input_dir)
        else:
            original_path = self._download_with_ytdlp(song_url, input_dir)

        media_kind = self._infer_media_kind(original_path, None)
        audio_path = self._ensure_audio_source(original_path, media_kind, job_dir)
        return ResolvedSource(original_path=original_path, audio_path=audio_path, media_kind=media_kind)

    def _infer_media_kind(self, path: Path, content_type: str | None) -> str:
        if content_type:
            if content_type.startswith("video/"):
                return "video"
            if content_type.startswith("audio/"):
                return "audio"

        suffix = path.suffix.lower()
        if suffix in self._video_suffixes:
            return "video"
        return "audio"

    def _is_direct_media_url(self, song_url: str) -> bool:
        suffix = Path(urllib.parse.urlparse(song_url).path).suffix.lower()
        return suffix in self._audio_suffixes or suffix in self._video_suffixes

    def _download_direct(self, song_url: str, input_dir: Path) -> Path:
        request = urllib.request.Request(song_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            content_type = response.headers.get_content_type()
            extension = Path(urllib.parse.urlparse(song_url).path).suffix
            if not extension:
                extension = mimetypes.guess_extension(content_type) or ".bin"
            source_path = input_dir / f"source{extension}"
            source_path.write_bytes(response.read())
        return source_path

    def _download_with_ytdlp(self, song_url: str, input_dir: Path) -> Path:
        try:
            import yt_dlp
        except ImportError as exc:
            raise AdapterError(
                "Non-direct song URLs require yt-dlp. Install it or upload the file directly."
            ) from exc

        options = {
            "format": "bestaudio/best",
            "outtmpl": str(input_dir / "source.%(ext)s"),
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(options) as downloader:
            downloader.download([song_url])

        matches = sorted(input_dir.glob("source.*"))
        if not matches:
            raise AdapterError("yt-dlp did not produce an audio file.")
        return matches[0]

    def _ensure_audio_source(self, original_path: Path, media_kind: str, job_dir: Path) -> Path:
        if shutil.which("ffmpeg") is None:
            if media_kind == "video":
                raise AdapterError("ffmpeg is required to extract audio from uploaded video files.")
            return original_path

        normalized_dir = job_dir / "normalized"
        normalized_dir.mkdir(parents=True, exist_ok=True)
        audio_path = normalized_dir / "source.wav"

        command = [
            "ffmpeg",
            "-y",
            "-i",
            str(original_path),
            "-vn",
            "-ac",
            "2",
            "-ar",
            "44100",
            str(audio_path),
        ]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            if media_kind == "audio" and self._settings.allow_mock_fallback:
                return original_path
            raise AdapterError(f"ffmpeg could not prepare the input source: {completed.stderr.strip()}")

        return audio_path

    def prepare_processing_audio(
        self,
        audio_path: Path,
        job_dir: Path,
        *,
        requested_duration_seconds: int,
    ) -> ProcessingSource:
        duration_seconds = self._measure_audio_duration_seconds(audio_path)
        max_processing_seconds = max(12, int(self._settings.max_processing_source_seconds))
        trigger_seconds = max(max_processing_seconds + 1, int(self._settings.long_source_trigger_seconds))
        desired_window_seconds = min(
            max_processing_seconds,
            max(24, int(requested_duration_seconds) * 2),
        )

        if (
            duration_seconds is None
            or duration_seconds <= trigger_seconds
            or shutil.which("ffmpeg") is None
        ):
            return ProcessingSource(
                audio_path=audio_path,
                source_duration_seconds=duration_seconds,
                excerpt_applied=False,
                excerpt_start_seconds=None,
                excerpt_duration_seconds=None,
                notes=[],
            )

        excerpt_duration_seconds = min(float(desired_window_seconds), duration_seconds)
        excerpt_start_seconds = max(0.0, (duration_seconds - excerpt_duration_seconds) / 2.0)
        processing_dir = job_dir / "processing"
        processing_dir.mkdir(parents=True, exist_ok=True)
        excerpt_path = processing_dir / "core_excerpt.wav"

        command = [
            "ffmpeg",
            "-y",
            "-ss", f"{excerpt_start_seconds:.2f}",
            "-i", str(audio_path),
            "-t", f"{excerpt_duration_seconds:.2f}",
            "-vn",
            "-ac", "2",
            "-ar", "44100",
            str(excerpt_path),
        ]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            if self._settings.allow_mock_fallback:
                return ProcessingSource(
                    audio_path=audio_path,
                    source_duration_seconds=duration_seconds,
                    excerpt_applied=False,
                    excerpt_start_seconds=None,
                    excerpt_duration_seconds=None,
                    notes=[],
                )
            raise AdapterError(f"ffmpeg could not prepare the core remix excerpt: {completed.stderr.strip()}")

        notes = [
            (
                "Long-track optimization selected a core remix window from "
                f"{excerpt_start_seconds:.1f}s to {excerpt_start_seconds + excerpt_duration_seconds:.1f}s "
                f"out of the {duration_seconds:.1f}s source to reduce remote processing load."
            ),
            (
                f"Only about {excerpt_duration_seconds:.1f}s of the source was sent through analysis, separation, "
                "and generation for this remix."
            ),
        ]
        return ProcessingSource(
            audio_path=excerpt_path,
            source_duration_seconds=duration_seconds,
            excerpt_applied=True,
            excerpt_start_seconds=excerpt_start_seconds,
            excerpt_duration_seconds=excerpt_duration_seconds,
            notes=notes,
        )

    def _measure_audio_duration_seconds(self, audio_path: Path) -> float | None:
        try:
            with wave.open(str(audio_path), "rb") as handle:
                frame_count = handle.getnframes()
                frame_rate = handle.getframerate()
                if frame_rate <= 0:
                    return None
                return frame_count / float(frame_rate)
        except Exception:
            return None


class DemucsSeparator:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._provider = settings.separator_provider
        self._device = _resolve_torch_device(settings) if self._provider == "local" else "cpu"

    @property
    def comparison_label(self) -> str:
        if self._provider == "replicate":
            return f"Replicate {self._settings.replicate_demucs_model}"
        return "Demucs"

    def separate(self, source_path: Path, stems_dir: Path) -> dict[str, Path]:
        if self._provider == "replicate":
            return self._separate_with_replicate(source_path, stems_dir)
        if self._provider not in {"local", "", None}:
            raise AdapterError(
                f"Unsupported REMIX_SEPARATOR_PROVIDER '{self._provider}'. Use 'local' or 'replicate'."
            )

        try:
            import demucs.separate
        except ImportError as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError("Demucs is not installed.") from exc

        stems_dir.mkdir(parents=True, exist_ok=True)

        try:
            command = ["-d", self._device, "-n", self._settings.demucs_model, "--out", str(stems_dir)]
            if self._device == "cuda" and self._settings.demucs_segment_seconds > 0:
                command.extend(["--segment", str(self._settings.demucs_segment_seconds)])
            command.append(str(source_path))
            demucs.separate.main(command)
        except Exception as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError(f"Demucs separation failed: {exc}") from exc

        stem_files = {
            stem_path.stem: stem_path
            for stem_path in stems_dir.rglob("*.wav")
            if stem_path.is_file()
        }
        if not stem_files:
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError("Demucs completed but no stem files were found.")
        return stem_files

    def _separate_with_replicate(self, source_path: Path, stems_dir: Path) -> dict[str, Path]:
        try:
            import replicate
        except ImportError as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError("Replicate separation is enabled but the 'replicate' package is not installed.") from exc

        if self._settings.replicate_api_token:
            os.environ["REPLICATE_API_TOKEN"] = self._settings.replicate_api_token
        if not os.getenv("REPLICATE_API_TOKEN"):
            raise AdapterError(
                "Replicate separation is enabled but REPLICATE_API_TOKEN is not set. Add your Replicate API token before starting the server."
            )

        stems_dir.mkdir(parents=True, exist_ok=True)
        def _invoke_replicate():
            payload = {
                "audio": source_path.open("rb"),
                "model_name": self._settings.replicate_demucs_model_name,
                "shifts": self._settings.replicate_demucs_shifts,
                "overlap": self._settings.replicate_demucs_overlap,
                "output_format": self._settings.replicate_demucs_output_format,
            }
            try:
                return replicate.run(self._settings.replicate_demucs_model, input=payload)
            finally:
                audio_file = payload.get("audio")
                if hasattr(audio_file, "close"):
                    audio_file.close()

        try:
            output = _retry_with_backoff(
                _invoke_replicate,
                attempts=self._settings.replicate_retry_count,
                delay_seconds=self._settings.replicate_retry_backoff_seconds,
            )
        except Exception as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError(self._format_replicate_demucs_error(exc)) from exc

        if not isinstance(output, dict):
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError("Replicate Demucs did not return a stem object.")

        stem_files: dict[str, Path] = {}
        for stem_name in ("vocals", "drums", "bass", "other", "guitar", "piano"):
            payload_value = output.get(stem_name)
            if payload_value is None:
                continue
            data, suffix = _read_remote_binary_payload(
                payload_value,
                default_suffix=f".{self._settings.replicate_demucs_output_format.lstrip('.') or 'wav'}",
                timeout_seconds=self._settings.replicate_download_timeout_seconds,
                retry_count=self._settings.replicate_retry_count,
                retry_backoff_seconds=self._settings.replicate_retry_backoff_seconds,
            )
            stem_path = stems_dir / f"{stem_name}{suffix}"
            stem_path.write_bytes(data)
            stem_files[stem_name] = stem_path

        if not stem_files:
            if self._settings.allow_mock_fallback:
                return self._mock_stems(source_path, stems_dir)
            raise AdapterError("Replicate Demucs completed but no stem files were returned.")
        return stem_files

    def _format_replicate_demucs_error(self, exc: Exception) -> str:
        lowered = str(exc).lower()
        if "404" in lowered or "requested resource could not be found" in lowered:
            return (
                "Replicate Demucs separation failed because the configured separator model could not be found. "
                "Check REPLICATE_DEMUCS_MODEL and use a valid versioned reference."
            )
        if "replicate_api_token" in lowered or "authentication" in lowered or "401" in lowered or "unauthorized" in lowered:
            return "Replicate Demucs separation failed because REPLICATE_API_TOKEN is missing or invalid."
        if _is_timeout_error(exc):
            return (
                "Replicate Demucs separation timed out while waiting for stems. "
                "The backend already retried automatically. Try again, reduce batch size, or increase "
                "REPLICATE_REQUEST_TIMEOUT_SECONDS / REPLICATE_DOWNLOAD_TIMEOUT_SECONDS."
            )
        return f"Replicate Demucs separation failed: {exc}"

    def _mock_stems(self, source_path: Path, stems_dir: Path) -> dict[str, Path]:
        mock_dir = stems_dir / "mock"
        mock_dir.mkdir(parents=True, exist_ok=True)
        copied = mock_dir / f"other{source_path.suffix or '.bin'}"
        shutil.copy2(source_path, copied)
        return {"other": copied}


class LibrosaAnalyzer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def analyze(self, source_path: Path) -> AnalysisSummary:
        try:
            import librosa
            import numpy as np
        except ImportError as exc:
            if self._settings.allow_mock_fallback:
                return AnalysisSummary(notes=["librosa is not installed. Returning mock analysis."])
            raise AdapterError("librosa is not installed.") from exc

        try:
            audio, sample_rate = librosa.load(str(source_path), sr=22050, mono=True)
            onset_env = librosa.onset.onset_strength(y=audio, sr=sample_rate)
            tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sample_rate)
            chroma = librosa.feature.chroma_stft(y=audio, sr=sample_rate)
            key, scale, strength = self._estimate_key(chroma)
            duration_seconds = len(audio) / float(sample_rate)
            tempo_value = float(np.asarray(tempo).reshape(-1)[0]) if np.size(tempo) else None
            rhythm_confidence = float(np.max(onset_env) / (np.mean(onset_env) + 1e-6)) if onset_env.size else None
        except Exception as exc:
            if self._settings.allow_mock_fallback:
                return AnalysisSummary(notes=[f"librosa analysis failed. Returning mock analysis. ({exc})"])
            raise AdapterError(f"librosa analysis failed: {exc}") from exc

        return AnalysisSummary(
            bpm=round(tempo_value, 2) if tempo_value is not None else None,
            beat_count=len(beat_frames),
            rhythm_confidence=round(rhythm_confidence, 4) if rhythm_confidence is not None else None,
            musical_key=key,
            scale=scale,
            key_strength=round(float(strength), 4) if strength is not None else None,
            duration_seconds=round(duration_seconds, 2),
        )

    def _estimate_key(self, chroma) -> tuple[str | None, str | None, float | None]:
        import numpy as np

        if chroma.size == 0:
            return None, None, None

        chroma_vector = chroma.mean(axis=1)
        if not np.any(chroma_vector):
            return None, None, None

        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        pitch_classes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

        major_scores = [float(np.dot(np.roll(major_profile, index), chroma_vector)) for index in range(12)]
        minor_scores = [float(np.dot(np.roll(minor_profile, index), chroma_vector)) for index in range(12)]

        if max(major_scores) >= max(minor_scores):
            key_index = int(np.argmax(major_scores))
            return pitch_classes[key_index], "major", major_scores[key_index]

        key_index = int(np.argmax(minor_scores))
        return pitch_classes[key_index], "minor", minor_scores[key_index]


class GuideTrackBuilder:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def build(
        self,
        stems: dict[str, Path],
        *,
        original_analysis: AnalysisSummary,
        submission: RemixSubmission,
        output_dir: Path,
        profile: GenreProfile | None = None,
    ) -> tuple[Path, list[str]]:
        profile = profile or _get_genre_profile(submission.genre)
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            import librosa
            import numpy as np
            import soundfile as sf
        except ImportError as exc:
            if self._settings.allow_mock_fallback:
                fallback = stems.get("other") or stems.get("vocals") or next(iter(stems.values()), None)
                if fallback is None:
                    raise AdapterError("Guide builder could not find a usable stem.") from exc
                return fallback, ["Guide builder dependencies are missing, so the raw accompaniment stem was used."]
            raise AdapterError("Guide track builder dependencies are not installed.") from exc

        sample_rate = 32000
        notes: list[str] = []
        weighted_sources = [
            ("drums", stems.get("drums"), profile.drums_level),
            ("bass", stems.get("bass"), profile.bass_level),
            ("other", stems.get("other"), profile.other_level),
        ]

        loaded: list[tuple[str, "np.ndarray", float]] = []
        max_length = 0
        for stem_name, stem_path, weight in weighted_sources:
            if stem_path is None or weight <= 0:
                continue
            audio, _ = librosa.load(str(stem_path), sr=sample_rate, mono=True)
            if audio.size == 0:
                continue
            loaded.append((stem_name, audio, weight))
            max_length = max(max_length, audio.shape[0])

        if not loaded:
            fallback = stems.get("other") or stems.get("vocals") or next(iter(stems.values()), None)
            if fallback is None:
                raise AdapterError("Demucs did not return a usable stem for the V2 guide builder.")
            return fallback, ["Demucs returned limited stems, so V2 used the closest available guide track."]

        mixed = np.zeros(max_length, dtype=np.float32)
        used_names: list[str] = []
        for stem_name, audio, weight in loaded:
            if audio.shape[0] < max_length:
                audio = np.pad(audio, (0, max_length - audio.shape[0]))
            mixed += audio.astype(np.float32) * float(weight)
            used_names.append(stem_name)

        peak = float(np.max(np.abs(mixed))) if mixed.size else 0.0
        if peak > 0:
            mixed = mixed / peak

        harmonic, percussive = librosa.effects.hpss(mixed)
        mixed = harmonic * float(profile.harmonic_level) + percussive * float(profile.percussive_level)

        if original_analysis.bpm and profile.target_bpm:
            raw_rate = float(profile.target_bpm) / max(float(original_analysis.bpm), 1.0)
            clamped_rate = min(1.28, max(0.84, raw_rate))
            if abs(clamped_rate - 1.0) >= 0.03:
                mixed = librosa.effects.time_stretch(mixed, rate=clamped_rate)
                notes.append(
                    f"V2 guide track tempo was nudged toward {profile.target_bpm} BPM for the {submission.genre} groove."
                )

        if abs(profile.pitch_shift_steps) >= 0.25:
            mixed = librosa.effects.pitch_shift(mixed, sr=sample_rate, n_steps=profile.pitch_shift_steps)
            notes.append(f"V2 guide track pitch was shifted by {profile.pitch_shift_steps:+.1f} semitones for style color.")

        if profile.guide_drive > 0:
            mixed = np.tanh(mixed * (1.0 + float(profile.guide_drive)))

        peak = float(np.max(np.abs(mixed))) if mixed.size else 0.0
        if peak > 0:
            mixed = (mixed / peak) * 0.92

        guide_path = output_dir / "guide.wav"
        sf.write(str(guide_path), mixed, sample_rate)
        notes.insert(0, f"V2 guide track was rebuilt from {', '.join(used_names)} stems with genre-specific weighting.")
        return guide_path, notes


class MusicGenGenerator:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._provider = settings.generator_provider
        self._processor = None
        self._model = None
        self._device = _resolve_torch_device(settings) if self._provider == "local" else "cpu"

    @property
    def comparison_label(self) -> str:
        if self._provider == "replicate":
            return f"Replicate {self._settings.replicate_model.split(':', 1)[0]}"
        return "Transformers MusicGen Melody"

    def generate(self, melody_source: Path, prompt: str, output_dir: Path, duration_seconds: int) -> Path:
        if self._provider == "replicate":
            return self._generate_with_replicate(melody_source, prompt, output_dir, duration_seconds)
        if self._provider not in {"local", "", None}:
            raise AdapterError(
                f"Unsupported REMIX_GENERATOR_PROVIDER '{self._provider}'. Use 'local' or 'replicate'."
            )
        return self._generate_with_transformers(melody_source, prompt, output_dir, duration_seconds)

    def _generate_with_transformers(self, melody_source: Path, prompt: str, output_dir: Path, duration_seconds: int) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            import librosa
            import numpy as np
            import soundfile as sf
            import torch
            from transformers import AutoProcessor, MusicgenForConditionalGeneration
            import torchaudio
        except ImportError as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_generation(melody_source, output_dir)
            raise AdapterError("transformers MusicGen dependencies are not installed.") from exc

        try:
            if self._model is None:
                model_kwargs = {"torch_dtype": torch.float16 if self._device == "cuda" else torch.float32}
                load_kwargs = {}
                if self._settings.musicgen_cache_dir is not None:
                    load_kwargs["cache_dir"] = str(self._settings.musicgen_cache_dir)
                if self._settings.musicgen_local_only or Path(self._settings.musicgen_model).exists():
                    load_kwargs["local_files_only"] = True

                self._processor = AutoProcessor.from_pretrained(self._settings.musicgen_model, **load_kwargs)
                self._model = MusicgenForConditionalGeneration.from_pretrained(
                    self._settings.musicgen_model,
                    **model_kwargs,
                    **load_kwargs,
                )
                self._model.to(self._device)
                self._model.eval()

            sample_rate = int(self._model.config.audio_encoder.sampling_rate)
            frame_rate = int(getattr(self._model.config.audio_encoder, "frame_rate", 50))
            max_source_samples = sample_rate * min(max(duration_seconds, 8), 30)
            melody, _ = librosa.load(str(melody_source), sr=sample_rate, mono=True)
            if melody.size == 0:
                raise AdapterError("The selected source could not be decoded into audio samples.")
            if melody.shape[0] > max_source_samples:
                melody = melody[:max_source_samples]

            inputs = self._processor(
                text=[prompt],
                audio=[melody],
                sampling_rate=sample_rate,
                padding=True,
                return_tensors="pt",
            )
            inputs = {key: value.to(self._device) if hasattr(value, "to") else value for key, value in inputs.items()}

            max_new_tokens = max(128, min(1503, int(duration_seconds * frame_rate)))
            with torch.inference_mode():
                generated = self._model.generate(
                    **inputs,
                    do_sample=True,
                    guidance_scale=3.0,
                    max_new_tokens=max_new_tokens,
                )

            audio_tensor = generated[0].detach().cpu()
            audio_array = audio_tensor.numpy()
            if audio_array.ndim == 2:
                audio_array = audio_array.T
            audio_array = np.clip(audio_array, -1.0, 1.0)

            output_path = output_dir / "accompaniment.wav"
            sf.write(str(output_path), audio_array, sample_rate)
            if self._device == "cuda":
                torch.cuda.empty_cache()
            return output_path
        except Exception as exc:
            if "out of memory" in str(exc).lower() and self._device == "cuda":
                torch.cuda.empty_cache()
            if self._settings.allow_mock_fallback:
                return self._mock_generation(melody_source, output_dir)
            raise AdapterError(self._format_generation_error(exc)) from exc

    def _generate_with_replicate(self, melody_source: Path, prompt: str, output_dir: Path, duration_seconds: int) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            import replicate
        except ImportError as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_generation(melody_source, output_dir)
            raise AdapterError("Replicate generation is enabled but the 'replicate' package is not installed.") from exc

        if self._settings.replicate_api_token:
            os.environ["REPLICATE_API_TOKEN"] = self._settings.replicate_api_token
        if not os.getenv("REPLICATE_API_TOKEN"):
            raise AdapterError(
                "Replicate generation is enabled but REPLICATE_API_TOKEN is not set. Add your Replicate API token before starting the server."
            )

        try:
            if self._replicate_model_is_remixer():
                return self._generate_with_replicate_remixer(replicate, melody_source, prompt, output_dir, duration_seconds)
            return self._generate_with_replicate_musicgen(replicate, melody_source, prompt, output_dir, duration_seconds)
        except Exception as exc:
            if self._settings.allow_mock_fallback:
                return self._mock_generation(melody_source, output_dir)
            raise AdapterError(self._format_replicate_error(exc, self._settings.replicate_audio_input_name)) from exc

    def _generate_with_replicate_musicgen(self, replicate_module, melody_source: Path, prompt: str, output_dir: Path, duration_seconds: int) -> Path:
        input_payload = {
            "top_k": self._settings.replicate_top_k,
            "top_p": self._settings.replicate_top_p,
            "prompt": prompt,
            "duration": int(max(4, min(duration_seconds, 60))),
            "temperature": self._settings.replicate_temperature,
            "continuation": self._settings.replicate_continuation,
            "model_version": self._settings.replicate_model_version,
            "output_format": self._settings.replicate_output_format,
            "continuation_start": self._settings.replicate_continuation_start,
            "multi_band_diffusion": self._settings.replicate_multi_band_diffusion,
            "normalization_strategy": self._settings.replicate_normalization_strategy,
            "classifier_free_guidance": self._settings.replicate_classifier_free_guidance,
        }
        input_name = self._settings.replicate_audio_input_name.strip() if self._settings.replicate_audio_input_name else ""
        attach_audio = bool(self._settings.replicate_attach_audio and input_name)
        if attach_audio and self._replicate_model_disables_audio_conditioning():
            attach_audio = False

        def _run_with_audio():
            with melody_source.open("rb") as melody_file:
                input_payload[input_name] = melody_file
                return replicate_module.run(self._settings.replicate_model, input=input_payload)

        def _run_without_audio():
            input_payload.pop(input_name, None)
            return replicate_module.run(self._settings.replicate_model, input=input_payload)

        if attach_audio:
            try:
                output = _retry_with_backoff(
                    _run_with_audio,
                    attempts=self._settings.replicate_retry_count,
                    delay_seconds=self._settings.replicate_retry_backoff_seconds,
                )
            except Exception as exc:
                if self._should_retry_replicate_without_audio(exc):
                    output = _retry_with_backoff(
                        _run_without_audio,
                        attempts=self._settings.replicate_retry_count,
                        delay_seconds=self._settings.replicate_retry_backoff_seconds,
                    )
                else:
                    raise
        else:
            output = _retry_with_backoff(
                _run_without_audio,
                attempts=self._settings.replicate_retry_count,
                delay_seconds=self._settings.replicate_retry_backoff_seconds,
            )

        output_bytes, output_suffix = _read_remote_binary_payload(
            output,
            default_suffix=f".{self._settings.replicate_output_format.lstrip('.') or 'mp3'}",
            timeout_seconds=self._settings.replicate_download_timeout_seconds,
            retry_count=self._settings.replicate_retry_count,
            retry_backoff_seconds=self._settings.replicate_retry_backoff_seconds,
        )
        output_path = output_dir / f"accompaniment{output_suffix}"
        output_path.write_bytes(output_bytes)
        return output_path

    def _generate_with_replicate_remixer(self, replicate_module, melody_source: Path, prompt: str, output_dir: Path, duration_seconds: int) -> Path:
        input_payload = {
            "prompt": prompt,
            "music_input": melody_source.open("rb"),
            "duration": int(max(4, min(duration_seconds, 60))),
            "model_version": self._settings.replicate_model_version,
            "output_format": self._settings.replicate_output_format,
            "top_k": self._settings.replicate_top_k,
            "top_p": self._settings.replicate_top_p,
            "temperature": self._settings.replicate_temperature,
            "multi_band_diffusion": self._settings.replicate_multi_band_diffusion,
            "normalization_strategy": self._settings.replicate_normalization_strategy,
            "classifier_free_guidance": self._settings.replicate_classifier_free_guidance,
            "beat_sync_threshold": self._settings.replicate_beat_sync_threshold,
            "large_chord_voca": self._settings.replicate_large_chord_voca,
            "chroma_coefficient": self._settings.replicate_chroma_coefficient,
        }
        if self._settings.replicate_seed >= 0:
            input_payload["seed"] = self._settings.replicate_seed

        try:
            output = _retry_with_backoff(
                lambda: replicate_module.run(self._settings.replicate_model, input=input_payload),
                attempts=self._settings.replicate_retry_count,
                delay_seconds=self._settings.replicate_retry_backoff_seconds,
            )
        finally:
            music_input_file = input_payload.get("music_input")
            if hasattr(music_input_file, "close"):
                music_input_file.close()

        output_bytes, output_suffix = _read_remote_binary_payload(
            output,
            default_suffix=f".{self._settings.replicate_output_format.lstrip('.') or 'wav'}",
            timeout_seconds=self._settings.replicate_download_timeout_seconds,
            retry_count=self._settings.replicate_retry_count,
            retry_backoff_seconds=self._settings.replicate_retry_backoff_seconds,
        )
        output_path = output_dir / f"accompaniment{output_suffix}"
        output_path.write_bytes(output_bytes)
        return output_path

    def _mock_generation(self, melody_source: Path, output_dir: Path) -> Path:
        copied = output_dir / f"accompaniment{melody_source.suffix or '.bin'}"
        shutil.copy2(melody_source, copied)
        return copied

    def _format_generation_error(self, exc: Exception) -> str:
        message = str(exc)
        lowered = message.lower()
        if "input_features" in lowered and "not used by the model" in lowered:
            return (
                "Local MusicGen generation failed because the installed transformers/MusicGen path is mismatched. "
                "This AI remix backend should use Replicate Demucs + sakemin/musicgen-remixer instead. "
                "Set REPLICATE_API_TOKEN and run with REMIX_SEPARATOR_PROVIDER=replicate and REMIX_GENERATOR_PROVIDER=replicate."
            )
        if "huggingface.co" in lowered or "nameresolutionerror" in lowered or "getaddrinfo failed" in lowered:
            cache_hint = ""
            if self._settings.musicgen_cache_dir is not None:
                cache_hint = f" Current MUSICGEN_CACHE_DIR: {self._settings.musicgen_cache_dir}."
            return (
                "MusicGen generation failed because the backend could not download model files from Hugging Face. "
                "Your machine either has no internet access or DNS resolution for huggingface.co is failing. "
                "Fix it by either: 1) connecting to the internet and rerunning once so the model downloads, or "
                "2) downloading the MusicGen model manually and setting MUSICGEN_MODEL to that local folder. "
                "Optional: set MUSICGEN_LOCAL_ONLY=1 to force offline local loading."
                f"{cache_hint}"
            )
        return f"MusicGen generation failed: {exc}"

    def _format_replicate_error(self, exc: Exception, input_name: str) -> str:
        message = str(exc)
        lowered = message.lower()

        if "replicate_api_token" in lowered or "authentication" in lowered or "401" in lowered or "unauthorized" in lowered:
            return "Replicate generation failed because REPLICATE_API_TOKEN is missing or invalid."
        if "replicate.com" in lowered and ("nameresolutionerror" in lowered or "getaddrinfo failed" in lowered):
            return "Replicate generation failed because the backend could not reach replicate.com. Check internet access, DNS, or firewall settings."
        if _is_timeout_error(exc):
            return (
                "Replicate generation timed out while waiting for the remote model output. "
                "The backend already retried automatically. Try again or increase "
                "REPLICATE_REQUEST_TIMEOUT_SECONDS / REPLICATE_DOWNLOAD_TIMEOUT_SECONDS."
            )
        if "prediction" in lowered and "failed" in lowered:
            return f"Replicate generation failed remotely: {exc}"

        return (
            "Replicate generation failed. "
            "Check REPLICATE_MODEL, REPLICATE_MODEL_VERSION, and REPLICATE_* generation settings. "
            f"Current audio input name: {input_name or 'disabled'}. "
            f"Original error: {exc}"
        )

    def _should_retry_replicate_without_audio(self, exc: Exception) -> bool:
        lowered = str(exc).lower()
        return (
            "boolean value of tensor with more than one value is ambiguous" in lowered
            or "if melody and not continuation" in lowered
        )

    def _replicate_model_disables_audio_conditioning(self) -> bool:
        model_ref = self._settings.replicate_model.strip().lower()
        model_version = self._settings.replicate_model_version.strip().lower()
        return (
            model_ref.startswith("meta/musicgen:671ac645")
            or (model_ref == "meta/musicgen" and model_version == "stereo-large")
        )

    def _replicate_model_is_remixer(self) -> bool:
        return self._settings.replicate_model.strip().lower().startswith("sakemin/musicgen-remixer")


class AudioMixer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def mix(
        self,
        stems: dict[str, Path],
        accompaniment_path: Path,
        output_dir: Path,
        profile: GenreProfile,
        target_duration_seconds: int,
    ) -> tuple[Path, Path]:
        output_dir.mkdir(parents=True, exist_ok=True)
        styled_path = self._style_accompaniment(accompaniment_path, output_dir, profile)
        target_path = output_dir / f"remix{styled_path.suffix or '.bin'}"

        if shutil.which("ffmpeg") is None:
            shutil.copy2(styled_path, target_path)
            return target_path, styled_path

        mix_inputs: list[tuple[Path, float]] = [(styled_path, 1.0)]
        vocals_path = stems.get("vocals")
        if profile.keep_vocals and profile.vocal_mix > 0.01 and vocals_path is not None:
            mix_inputs.append((vocals_path, profile.vocal_mix))

        bass_path = stems.get("bass")
        if profile.bass_reinforcement_mix > 0.01 and bass_path is not None:
            mix_inputs.append((bass_path, profile.bass_reinforcement_mix))

        drums_path = stems.get("drums")
        if profile.drums_reinforcement_mix > 0.01 and drums_path is not None:
            mix_inputs.append((drums_path, profile.drums_reinforcement_mix))

        other_path = stems.get("other")
        if profile.texture_reinforcement_mix > 0.01 and other_path is not None:
            mix_inputs.append((other_path, profile.texture_reinforcement_mix))

        pre_master_path = output_dir / "remix_pre_master.wav"
        if len(mix_inputs) == 1:
            command = [
                "ffmpeg",
                "-y",
                "-i", str(styled_path),
                "-t", str(max(4, target_duration_seconds)),
                str(pre_master_path),
            ]
        else:
            command = ["ffmpeg", "-y"]
            filter_parts: list[str] = []
            input_labels: list[str] = []

            for index, (input_path, input_volume) in enumerate(mix_inputs):
                command.extend(["-i", str(input_path)])
                filter_parts.append(f"[{index}:a]volume={input_volume}[a{index}]")
                input_labels.append(f"[a{index}]")

            filter_parts.append(
                "".join(input_labels) + f"amix=inputs={len(mix_inputs)}:duration=longest:normalize=0[mix]"
            )
            command.extend([
                "-filter_complex", ";".join(filter_parts),
                "-map", "[mix]",
                "-t", str(max(4, target_duration_seconds)),
                str(pre_master_path),
            ])

        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            if self._settings.allow_mock_fallback:
                shutil.copy2(styled_path, target_path)
                return target_path, styled_path
            raise AdapterError(f"ffmpeg mix failed: {completed.stderr.strip()}")
        mastered_path = self._master_final_mix(pre_master_path, output_dir, profile)
        return mastered_path, styled_path

    def _style_accompaniment(self, accompaniment_path: Path, output_dir: Path, profile: GenreProfile) -> Path:
        if shutil.which("ffmpeg") is None:
            return accompaniment_path

        if not profile.filter_chain and abs(profile.accompaniment_mix - 1.0) < 0.01:
            return accompaniment_path

        styled_path = output_dir / "styled_accompaniment.wav"
        filter_chain = [f"volume={profile.accompaniment_mix}"] + list(profile.filter_chain)
        command = [
            "ffmpeg",
            "-y",
            "-i", str(accompaniment_path),
            "-af", ",".join(filter_chain),
            str(styled_path),
        ]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            if self._settings.allow_mock_fallback:
                return accompaniment_path
            raise AdapterError(f"ffmpeg accompaniment styling failed: {completed.stderr.strip()}")
        return styled_path

    def _master_final_mix(self, mix_path: Path, output_dir: Path, profile: GenreProfile) -> Path:
        if shutil.which("ffmpeg") is None or not profile.master_filter_chain:
            return mix_path

        mastered_path = output_dir / "remix.wav"
        command = [
            "ffmpeg",
            "-y",
            "-i", str(mix_path),
            "-af", ",".join(profile.master_filter_chain),
            str(mastered_path),
        ]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            if self._settings.allow_mock_fallback:
                return mix_path
            raise AdapterError(f"ffmpeg mastering failed: {completed.stderr.strip()}")
        return mastered_path


class RemixPipeline:
    def __init__(self, settings: Settings, jobs: JobStore, library: LibraryStore) -> None:
        self._settings = settings
        self._jobs = jobs
        self._library = library
        self._planner = LangGraphGenrePlanner()
        self._resolver = SourceResolver(settings)
        self._separator = DemucsSeparator(settings)
        self._analyzer = LibrosaAnalyzer(settings)
        self._guide_builder = GuideTrackBuilder(settings)
        self._generator = MusicGenGenerator(settings)
        self._mixer = AudioMixer(settings)
        self._runtime = inspect_runtime()
        self._runtime_notes = self._build_runtime_notes()

    @contextmanager
    def _stage_heartbeat(
        self,
        job_id: str,
        *,
        status: JobStatus,
        current_stage: str,
        message: str,
        interval_seconds: float = 20.0,
    ):
        stop_event = threading.Event()

        def _pulse() -> None:
            while not stop_event.wait(interval_seconds):
                try:
                    self._jobs.update(
                        job_id,
                        status=status,
                        current_stage=current_stage,
                        message=message,
                    )
                except Exception:
                    return

        worker = threading.Thread(target=_pulse, daemon=True)
        worker.start()
        try:
            yield
        finally:
            stop_event.set()
            worker.join(timeout=1.0)

    def submit(
        self,
        submission: RemixSubmission,
        *,
        upload_bytes: bytes | None,
        upload_filename: str | None,
        upload_content_type: str | None,
    ) -> RemixJobCreated:
        source_type = "upload" if upload_bytes is not None else "url"
        job_id = uuid.uuid4().hex
        created = self._jobs.create(job_id, submission, source_type)

        worker = threading.Thread(
            target=self._run_job,
            kwargs={
                "job_id": job_id,
                "submission": submission,
                "upload_bytes": upload_bytes,
                "upload_filename": upload_filename,
                "upload_content_type": upload_content_type,
            },
            daemon=True,
        )
        worker.start()
        return created

    def merge_batch_remixes(self, submission: MergeBatchSubmission) -> MergeBatchResponse:
        if len(submission.items) < 2:
            raise AdapterError("Select at least two completed remix jobs before creating a merged batch sequence.")
        if shutil.which("ffmpeg") is None:
            raise AdapterError("ffmpeg is required to merge multiple remixed songs into one sequence.")

        batch_plan = self._planner.plan_batch_sequence(
            genre=submission.genre,
            source_labels=[item.source_label for item in submission.items],
            total_duration_seconds=submission.target_duration_seconds,
            remix_prompt=submission.remix_prompt,
        )
        batch_job_id = f"merge-{uuid.uuid4().hex}"
        batch_dir = self._settings.jobs_dir / batch_job_id / "batch_sequence"
        segment_dir = batch_dir / "segments"
        segment_dir.mkdir(parents=True, exist_ok=True)

        segment_durations = self._distribute_batch_segment_durations(
            batch_plan.total_duration_seconds,
            len(submission.items),
        )
        source_segments: list[Path] = []
        remix_segments: list[Path] = []

        for index, item in enumerate(submission.items, start=1):
            source_audio_path = self._resolve_public_data_path(item.input_audio_public_url)
            remix_path = self._resolve_public_data_path(item.remix_public_url)
            duration_seconds = segment_durations[index - 1]
            source_segments.append(
                self._prepare_batch_segment(
                    source_audio_path,
                    segment_dir / f"source_{index:02d}.wav",
                    None,
                )
            )
            remix_segments.append(
                self._prepare_batch_segment(
                    remix_path,
                    segment_dir / f"remix_{index:02d}.wav",
                    duration_seconds,
                )
            )

        merged_source_path = self._concat_audio_segments(source_segments, batch_dir / "merged_source.wav")
        merged_remix_path = self._concat_audio_segments(remix_segments, batch_dir / "merged_remix.wav")

        original_analysis = self._analyzer.analyze(merged_source_path)
        remix_analysis = self._analyzer.analyze(merged_remix_path)
        comparison_payload = self._build_batch_merge_comparison(
            submission,
            batch_plan,
            original_analysis,
            remix_analysis,
        )
        comparison_summary = ComparisonSummary(**comparison_payload)

        library_submission = RemixSubmission(
            genre=submission.genre,
            remix_prompt=submission.remix_prompt,
            song_title=self._build_batch_sequence_title(submission),
            source_label=self._build_batch_sequence_label(submission),
            target_duration_seconds=batch_plan.total_duration_seconds,
        )
        library_entry = self._library.save_completed_remix(
            job_id=batch_job_id,
            source_type="merged_batch",
            submission=library_submission,
            source_media_kind="audio",
            source_original_path=merged_source_path,
            source_audio_path=merged_source_path,
            remix_path=merged_remix_path,
            original_analysis=original_analysis,
            remix_analysis=remix_analysis,
            comparison=comparison_summary,
        )

        return MergeBatchResponse(
            library_entry_id=library_entry.entry_id,
            title=library_entry.title,
            source_media_kind="audio",
            merged_source_public_url=self._public_url(merged_source_path),
            merged_remix_public_url=self._public_url(merged_remix_path),
            summary=comparison_summary.summary or "Merged the selected remixes into one continuous sequence.",
            changes=comparison_summary.changes,
            models_used=comparison_summary.models_used,
        )

    def _run_job(
        self,
        *,
        job_id: str,
        submission: RemixSubmission,
        upload_bytes: bytes | None,
        upload_filename: str | None,
        upload_content_type: str | None,
    ) -> None:
        job_dir = self._settings.jobs_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        profile = _get_genre_profile(submission.genre)
        effective_profile = profile
        agent_plan: GenreAgentPlan | None = None
        processing_source: ProcessingSource | None = None

        try:
            self._jobs.update(job_id, status=JobStatus.ingesting, current_stage="ingesting", message="Resolving source.")
            source = self._resolver.stage_source(
                job_dir,
                song_url=submission.song_url,
                upload_bytes=upload_bytes,
                upload_filename=upload_filename,
                upload_content_type=upload_content_type,
            )
            self._jobs.update(
                job_id,
                artifacts={
                    "input_file": self._relative(source.original_path),
                    "input_public_url": self._public_url(source.original_path),
                    "input_audio_file": self._relative(source.audio_path),
                    "input_audio_public_url": self._public_url(source.audio_path),
                    "source_media_kind": source.media_kind,
                },
            )
            processing_source = self._resolver.prepare_processing_audio(
                source.audio_path,
                job_dir,
                requested_duration_seconds=submission.target_duration_seconds,
            )
            if processing_source.excerpt_applied:
                self._jobs.update(
                    job_id,
                    status=JobStatus.ingesting,
                    current_stage="ingesting",
                    message="Optimizing a core remix window for the long source.",
                )

            self._jobs.update(job_id, status=JobStatus.analyzing, current_stage="analyzing", message="Analyzing source.")
            original_analysis = self._analyzer.analyze(processing_source.audio_path)
            self._jobs.update(job_id, analysis=original_analysis.model_dump())

            self._jobs.update(
                job_id,
                status=JobStatus.planning,
                current_stage="planning",
                message="LangGraph is assigning the genre remix agent.",
            )
            try:
                agent_plan = self._planner.plan(
                    submission,
                    original_analysis,
                    target_bpm=profile.target_bpm,
                    baseline_tags=profile.prompt_tags,
                )
            except RuntimeError as exc:
                raise AdapterError(str(exc)) from exc
            effective_profile = self._apply_prompt_controls(profile, agent_plan.prompt_controls)

            self._jobs.update(
                job_id,
                status=JobStatus.planning,
                current_stage="planning",
                message=f"{agent_plan.agent_name} planned the remix tasks.",
                comparison={
                    "models_used": ["LangGraph Prompt Interpreter", "LangGraph Genre Agent"],
                    "summary": agent_plan.summary,
                    "changes": agent_plan.workflow_notes,
                },
            )

            self._jobs.update(
                job_id,
                status=JobStatus.separating,
                current_stage="separating",
                message=self._separation_stage_message(),
            )
            stems_dir = job_dir / "stems"
            with self._stage_heartbeat(
                job_id,
                status=JobStatus.separating,
                current_stage="separating",
                message=self._separation_stage_message(),
            ):
                stems = self._separator.separate(processing_source.audio_path, stems_dir)
            self._jobs.update(job_id, artifacts={"stems_dir": self._relative(stems_dir)})

            self._jobs.update(
                job_id,
                status=JobStatus.generating,
                current_stage="generating",
                message="Building V2 genre guide.",
            )
            guide_path, guide_notes = self._guide_builder.build(
                stems,
                original_analysis=original_analysis,
                submission=submission,
                output_dir=job_dir / "guide",
                profile=effective_profile,
            )
            self._jobs.update(job_id, artifacts={"guide_file": self._relative(guide_path)})

            self._jobs.update(
                job_id,
                status=JobStatus.generating,
                current_stage="generating",
                message=self._generation_stage_message(),
            )
            with self._stage_heartbeat(
                job_id,
                status=JobStatus.generating,
                current_stage="generating",
                message=self._generation_stage_message(),
            ):
                accompaniment_path = self._generator.generate(
                    melody_source=guide_path,
                    prompt=(agent_plan.resolved_prompt if agent_plan else self._build_prompt(submission, original_analysis, effective_profile)),
                    output_dir=job_dir / "generated",
                    duration_seconds=(agent_plan.resolved_duration_seconds if agent_plan else submission.target_duration_seconds),
                )
            self._jobs.update(job_id, artifacts={"accompaniment_file": self._relative(accompaniment_path)})

            self._jobs.update(job_id, status=JobStatus.mixing, current_stage="mixing", message="Applying V2 genre mix.")
            with self._stage_heartbeat(
                job_id,
                status=JobStatus.mixing,
                current_stage="mixing",
                message="Applying V2 genre mix.",
            ):
                remix_path, styled_path = self._mixer.mix(
                    stems=stems,
                    accompaniment_path=accompaniment_path,
                    output_dir=job_dir / "final",
                    profile=effective_profile,
                    target_duration_seconds=(agent_plan.resolved_duration_seconds if agent_plan else submission.target_duration_seconds),
                )
                remix_analysis = self._analyzer.analyze(remix_path)
                comparison_payload = self._build_comparison(
                    source.media_kind,
                    submission,
                    original_analysis,
                    remix_analysis,
                    self._runtime_notes,
                    guide_notes,
                    effective_profile,
                    agent_plan,
                    processing_source,
                )
                library_entry = self._library.save_completed_remix(
                    job_id=job_id,
                    source_type="upload" if upload_bytes is not None else "url",
                    submission=submission,
                    source_media_kind=source.media_kind,
                    source_original_path=source.original_path,
                    source_audio_path=source.audio_path,
                    remix_path=remix_path,
                    original_analysis=original_analysis,
                    remix_analysis=remix_analysis,
                    comparison=ComparisonSummary(**comparison_payload),
                )
            self._jobs.update(
                job_id,
                status=JobStatus.completed,
                current_stage="completed",
                message="Remix ready (mock fallback)." if self._runtime_notes else "Remix ready.",
                remix_analysis=remix_analysis.model_dump(),
                comparison=comparison_payload,
                artifacts={
                    "library_entry_id": library_entry.entry_id,
                    "styled_accompaniment_file": self._relative(styled_path),
                    "remix_file": self._relative(remix_path),
                    "public_remix_url": self._public_url(remix_path),
                },
            )
        except AdapterError as exc:
            self._jobs.update(
                job_id,
                status=JobStatus.failed,
                current_stage="failed",
                message="Remix job failed.",
                error=str(exc),
            )
        except Exception as exc:  # pragma: no cover
            self._jobs.update(
                job_id,
                status=JobStatus.failed,
                current_stage="failed",
                message="Unexpected backend error.",
                error=str(exc),
            )

    def _build_prompt(
        self,
        submission: RemixSubmission,
        analysis: AnalysisSummary,
        profile: GenreProfile,
    ) -> str:
        parts = [
            f"{submission.genre} remix",
            "full genre transformation",
            "replace the original drums bassline harmony and arrangement",
            "preserve only broad song identity and topline feeling",
            "DJ style arrangement",
            "club-ready production",
        ]
        if profile.target_bpm:
            parts.append(f"target around {profile.target_bpm} BPM")
        parts.extend(profile.prompt_tags)
        if submission.song_title:
            parts.append(f"song title {submission.song_title}")
        if submission.artist_name:
            parts.append(f"inspired by {submission.artist_name}")
        if analysis.bpm:
            parts.append(f"around {round(analysis.bpm)} BPM")
        if analysis.musical_key and analysis.scale:
            parts.append(f"in {analysis.musical_key} {analysis.scale}")
        if submission.remix_prompt:
            parts.append(submission.remix_prompt)
        return ", ".join(parts)

    def _apply_prompt_controls(self, profile: GenreProfile, controls: PromptControlSet) -> GenreProfile:
        adjusted_profile = profile

        if controls.overlay_genre:
            overlay_profile = _get_genre_profile(controls.overlay_genre)
            adjusted_profile = replace(
                adjusted_profile,
                target_bpm=(
                    int(round(((adjusted_profile.target_bpm or 0) * 0.65) + ((overlay_profile.target_bpm or 0) * 0.35)))
                    if adjusted_profile.target_bpm and overlay_profile.target_bpm
                    else adjusted_profile.target_bpm or overlay_profile.target_bpm
                ),
                accompaniment_mix=_clamp_mix((adjusted_profile.accompaniment_mix * 0.7) + (overlay_profile.accompaniment_mix * 0.3), 0.8, 1.7),
                bass_reinforcement_mix=_clamp_mix((adjusted_profile.bass_reinforcement_mix * 0.7) + (overlay_profile.bass_reinforcement_mix * 0.3), 0.0, 0.5),
                drums_reinforcement_mix=_clamp_mix((adjusted_profile.drums_reinforcement_mix * 0.7) + (overlay_profile.drums_reinforcement_mix * 0.3), 0.0, 0.3),
                texture_reinforcement_mix=_clamp_mix((adjusted_profile.texture_reinforcement_mix * 0.7) + (overlay_profile.texture_reinforcement_mix * 0.3), 0.0, 0.3),
                vocal_mix=_clamp_mix((adjusted_profile.vocal_mix * 0.7) + (overlay_profile.vocal_mix * 0.3), 0.0, 1.2),
                prompt_tags=tuple(dict.fromkeys(adjusted_profile.prompt_tags + overlay_profile.prompt_tags)),
            )

        target_bpm = adjusted_profile.target_bpm
        if target_bpm and controls.bpm_shift:
            target_bpm = max(60, min(180, target_bpm + controls.bpm_shift))

        adjusted_profile = replace(
            adjusted_profile,
            target_bpm=target_bpm,
            bass_reinforcement_mix=_clamp_mix(adjusted_profile.bass_reinforcement_mix + controls.bass_delta, 0.0, 0.55),
            drums_reinforcement_mix=_clamp_mix(adjusted_profile.drums_reinforcement_mix + controls.drums_delta, 0.0, 0.35),
            texture_reinforcement_mix=_clamp_mix(adjusted_profile.texture_reinforcement_mix + controls.texture_delta, 0.0, 0.35),
            vocal_mix=_clamp_mix(adjusted_profile.vocal_mix + controls.vocal_delta, 0.0, 1.25),
            accompaniment_mix=_clamp_mix(adjusted_profile.accompaniment_mix + controls.accompaniment_delta, 0.8, 1.8),
            keep_vocals=adjusted_profile.keep_vocals if controls.keep_vocals_override is None else controls.keep_vocals_override,
        )
        return adjusted_profile

    def _build_comparison(
        self,
        media_kind: str,
        submission: RemixSubmission,
        original_analysis: AnalysisSummary,
        remix_analysis: AnalysisSummary,
        runtime_notes: list[str],
        guide_notes: list[str],
        profile: GenreProfile,
        agent_plan: GenreAgentPlan | None,
        processing_source: ProcessingSource | None,
    ) -> dict[str, object]:
        changes: list[str] = list(runtime_notes)

        if agent_plan is not None:
            changes.append(f"LangGraph agent: {agent_plan.agent_name}.")
            changes.extend(agent_plan.workflow_notes)

        if processing_source is not None and processing_source.notes:
            changes.extend(processing_source.notes)

        changes.extend(guide_notes)

        if media_kind == "video":
            changes.append("Extracted audio from the uploaded video before running the remix pipeline.")
        else:
            changes.append("Used the uploaded or fetched audio directly as the remix source.")

        changes.append(f"Execution device: {self._runtime.selected_device or 'unknown'}" + (
            f" ({self._runtime.cuda_device_name})" if self._runtime.selected_device == "cuda" and self._runtime.cuda_device_name else "."
        ))
        changes.append(f"Target genre applied: {submission.genre}.")
        if profile.target_bpm:
            changes.append(f"V2 target groove was aimed at roughly {profile.target_bpm} BPM.")
        if agent_plan is not None:
            changes.append(f"Resolved remix length: {agent_plan.resolved_duration_seconds} seconds.")
        if not profile.keep_vocals:
            changes.append("Lead vocals were intentionally removed from the final mix for an instrumental result.")
        else:
            changes.append(f"Original vocals were mixed back at {round(profile.vocal_mix * 100)}% intensity for a clearer genre shift.")
        changes.append(
            "Original support stems were blended back in to reduce isolated artifacts: "
            f"bass {round(profile.bass_reinforcement_mix * 100)}%, "
            f"drums {round(profile.drums_reinforcement_mix * 100)}%, "
            f"texture {round(profile.texture_reinforcement_mix * 100)}%."
        )
        if profile.master_filter_chain:
            changes.append("A final mastering pass tightened loudness, low-end body, and peak control after the remix stem blend.")

        if original_analysis.bpm and remix_analysis.bpm:
            if abs(original_analysis.bpm - remix_analysis.bpm) >= 1:
                changes.append(
                    f"Tempo shifted from {round(original_analysis.bpm)} BPM to {round(remix_analysis.bpm)} BPM."
                )
            else:
                changes.append(f"Tempo stayed close to {round(original_analysis.bpm)} BPM.")
        elif original_analysis.bpm:
            changes.append(f"Original BPM detected around {round(original_analysis.bpm)}.")

        if original_analysis.musical_key and remix_analysis.musical_key:
            original_key = f"{original_analysis.musical_key} {original_analysis.scale or ''}".strip()
            remix_key = f"{remix_analysis.musical_key} {remix_analysis.scale or ''}".strip()
            if original_key != remix_key:
                changes.append(f"Key moved from {original_key} to {remix_key}.")
            else:
                changes.append(f"Key stayed around {original_key}.")
        elif original_analysis.musical_key:
            changes.append(f"Original key detected as {original_analysis.musical_key} {original_analysis.scale or ''}".strip() + ".")

        if submission.remix_prompt:
            changes.append(f"Prompt influence: {submission.remix_prompt}.")
        if submission.batch_total and submission.batch_total > 1 and submission.batch_index:
            changes.append(f"Batch item {submission.batch_index} of {submission.batch_total} was processed in this run.")

        return {
            "models_used": [
                "LangGraph Prompt Interpreter",
                f"LangGraph {agent_plan.agent_name}" if agent_plan is not None else "LangGraph Genre Agent",
                self._separator.comparison_label,
                "librosa",
                "V2 Stem Guide Builder",
                self._generator.comparison_label,
                "FFmpeg Genre Mixer",
            ],
            "summary": (
                f"Converted the source into a {submission.genre.lower()} remix using "
                f"{agent_plan.agent_name if agent_plan is not None else 'LangGraph genre planning'}, "
                f"V2 stem reconstruction, genre-conditioned generation via {self._generator.comparison_label}, "
                f"stem reinjection, and a mastered final mix."
            ),
            "changes": changes,
        }

    def _build_batch_merge_comparison(
        self,
        submission: MergeBatchSubmission,
        batch_plan: BatchSequencePlan,
        original_analysis: AnalysisSummary,
        remix_analysis: AnalysisSummary,
    ) -> dict[str, object]:
        source_labels = [item.source_label for item in submission.items]
        changes: list[str] = list(self._runtime_notes)
        changes.append(f"LangGraph batch agent: {batch_plan.agent_name}.")
        changes.extend(batch_plan.workflow_notes)
        changes.append(
            f"Merged {len(submission.items)} individually remixed songs into one continuous {submission.genre.lower()} sequence."
        )
        if source_labels:
            changes.append(f"Sequence order: {', '.join(source_labels)}.")
        changes.append("Original batch preview keeps the full uploaded songs in sequence without trimming.")
        changes.append(
            f"Only the remixed output was time-sliced, with each selected song trimmed to about {batch_plan.per_song_duration_seconds:.2f} seconds."
        )
        if submission.remix_prompt:
            changes.append(f"Shared batch prompt influence: {submission.remix_prompt}.")
        if original_analysis.bpm and remix_analysis.bpm:
            changes.append(
                f"Merged sequence tempo moved from about {round(original_analysis.bpm)} BPM to {round(remix_analysis.bpm)} BPM."
            )
        if original_analysis.musical_key and remix_analysis.musical_key:
            source_key = f"{original_analysis.musical_key} {original_analysis.scale or ''}".strip()
            remix_key = f"{remix_analysis.musical_key} {remix_analysis.scale or ''}".strip()
            changes.append(f"Merged key center: {source_key} -> {remix_key}.")

        return {
            "models_used": [
                batch_plan.agent_name,
                self._separator.comparison_label,
                "librosa",
                "V2 Stem Guide Builder",
                self._generator.comparison_label,
                "FFmpeg Batch Sequencer",
            ],
            "summary": (
                f"Built one continuous {submission.genre.lower()} remix sequence from {len(submission.items)} songs "
                f"using {batch_plan.agent_name}, while keeping the original batch preview full-length."
            ),
            "changes": changes,
        }

    def _build_runtime_notes(self) -> list[str]:
        if not self._settings.allow_mock_fallback:
            return []

        required_dependencies = ["librosa", "soundfile"]
        if self._settings.separator_provider == "replicate":
            required_dependencies.append("replicate")
        else:
            required_dependencies.extend(["demucs", "torch", "torchaudio"])

        if self._settings.generator_provider == "replicate":
            if "replicate" not in required_dependencies:
                required_dependencies.append("replicate")
        else:
            required_dependencies.extend(["transformers", "torch", "torchaudio"])

        required_dependencies = list(dict.fromkeys(required_dependencies))

        missing = [
            dependency
            for dependency in required_dependencies
            if not self._runtime.dependencies[dependency].available
        ]
        if not missing:
            return []

        joined = ", ".join(missing)
        return [
            f"Mock fallback mode was used because these remix dependencies are missing: {joined}.",
            "In mock fallback mode the current backend mostly copies the source audio, so changing genre will not produce a true remix yet.",
        ]

    def _relative(self, path: Path) -> str:
        return path.relative_to(self._settings.project_root).as_posix()

    def _public_url(self, path: Path) -> str:
        return f"/files/{path.relative_to(self._settings.data_dir).as_posix()}"

    def _resolve_public_data_path(self, public_url: str) -> Path:
        parsed = urllib.parse.urlparse(public_url)
        relative_path = urllib.parse.unquote(parsed.path)
        if not relative_path.startswith("/files/"):
            raise AdapterError(f"Batch sequence merge received an invalid media URL: {public_url}")

        data_root = self._settings.data_dir.resolve()
        candidate = (data_root / relative_path.removeprefix("/files/")).resolve()
        try:
            candidate.relative_to(data_root)
        except ValueError as exc:
            raise AdapterError(f"Batch sequence merge rejected an unsafe media path: {public_url}") from exc

        if not candidate.exists():
            raise AdapterError(f"Batch sequence merge could not find the saved media file: {public_url}")
        return candidate

    def _distribute_batch_segment_durations(self, total_duration_seconds: int, item_count: int) -> list[float]:
        safe_count = max(1, item_count)
        safe_total = max(4, int(total_duration_seconds))
        base_duration = round(safe_total / safe_count, 2)
        durations: list[float] = []
        remaining = float(safe_total)

        for index in range(safe_count):
            if index == safe_count - 1:
                durations.append(round(max(0.25, remaining), 2))
                continue

            durations.append(base_duration)
            remaining -= base_duration

        return durations

    def _prepare_batch_segment(self, source_path: Path, target_path: Path, duration_seconds: float | None) -> Path:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        command = [
            "ffmpeg",
            "-y",
            "-i", str(source_path),
            "-vn",
            "-ac", "2",
            "-ar", "44100",
            str(target_path),
        ]
        if duration_seconds is not None:
            command[5:5] = ["-t", f"{max(0.25, duration_seconds):.2f}"]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            raise AdapterError(f"Batch sequence segment preparation failed: {completed.stderr.strip()}")
        return target_path

    def _concat_audio_segments(self, segment_paths: list[Path], output_path: Path) -> Path:
        if not segment_paths:
            raise AdapterError("Batch sequence merge was requested without any prepared segments.")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        concat_file = output_path.parent / f"{output_path.stem}_concat.txt"
        concat_lines = ["ffconcat version 1.0"]
        for segment_path in segment_paths:
            escaped_path = segment_path.resolve().as_posix().replace("'", "\\'")
            concat_lines.append(f"file '{escaped_path}'")
        concat_file.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")

        command = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path),
        ]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            raise AdapterError(f"Batch sequence concatenation failed: {completed.stderr.strip()}")
        return output_path

    def _build_batch_sequence_title(self, submission: MergeBatchSubmission) -> str:
        if len(submission.items) == 2:
            return f"{submission.genre} Sequence: {submission.items[0].source_label} + {submission.items[1].source_label}"
        return f"{submission.genre} Multi-Song Sequence"

    def _build_batch_sequence_label(self, submission: MergeBatchSubmission) -> str:
        labels = [item.source_label for item in submission.items if item.source_label]
        if not labels:
            return f"{submission.genre} sequence"
        if len(labels) <= 3:
            return " + ".join(labels)
        return " + ".join(labels[:3]) + " + more"

    def _separation_stage_message(self) -> str:
        if self._settings.separator_provider == "replicate":
            return f"Separating stems on Replicate via {self._settings.replicate_demucs_model.split(':', 1)[0]}."
        return "Separating stems locally."

    def _generation_stage_message(self) -> str:
        if self._settings.generator_provider == "replicate":
            return f"Generating remix on Replicate via {self._settings.replicate_model.split(':', 1)[0]}."
        return "Generating genre-conditioned accompaniment locally."
