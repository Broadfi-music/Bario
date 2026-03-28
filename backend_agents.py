from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict

from backend_models import AnalysisSummary, RemixSubmission

try:
    from langgraph.graph import END, START, StateGraph
except Exception as exc:  # pragma: no cover - optional runtime dependency
    END = START = StateGraph = None
    _LANGGRAPH_IMPORT_ERROR = exc
else:  # pragma: no cover - import guard bookkeeping
    _LANGGRAPH_IMPORT_ERROR = None


@dataclass(frozen=True, slots=True)
class GenreAgentConfig:
    agent_name: str
    prompt_focus: tuple[str, ...]
    workflow_steps: tuple[str, ...]
    summary: str


@dataclass(frozen=True, slots=True)
class GenreAgentPlan:
    agent_name: str
    genre: str
    resolved_prompt: str
    resolved_duration_seconds: int
    workflow_notes: list[str]
    summary: str
    prompt_controls: "PromptControlSet" = field(default_factory=lambda: PromptControlSet())


@dataclass(frozen=True, slots=True)
class BatchSequencePlan:
    agent_name: str
    total_duration_seconds: int
    per_song_duration_seconds: float
    workflow_notes: list[str]
    summary: str


@dataclass(frozen=True, slots=True)
class PromptControlSet:
    overlay_genre: str | None = None
    instrument_requests: tuple[str, ...] = ()
    style_requests: tuple[str, ...] = ()
    arrangement_requests: tuple[str, ...] = ()
    bass_delta: float = 0.0
    drums_delta: float = 0.0
    texture_delta: float = 0.0
    vocal_delta: float = 0.0
    accompaniment_delta: float = 0.0
    bpm_shift: int = 0
    keep_vocals_override: bool | None = None


class GenreAgentState(TypedDict, total=False):
    genre: str
    requested_duration_seconds: int
    resolved_duration_seconds: int
    user_prompt: str
    source_bpm: float | None
    source_key: str | None
    source_scale: str | None
    song_title: str | None
    artist_name: str | None
    source_label: str | None
    batch_index: int | None
    batch_total: int | None
    target_bpm: int | None
    baseline_tags: list[str]
    agent_name: str
    prompt_segments: list[str]
    workflow_notes: list[str]
    summary: str
    overlay_genre: str | None
    instrument_requests: list[str]
    style_requests: list[str]
    arrangement_requests: list[str]
    bass_delta: float
    drums_delta: float
    texture_delta: float
    vocal_delta: float
    accompaniment_delta: float
    bpm_shift: int
    keep_vocals_override: bool | None


_COMMON_PROMPT_SEGMENTS = (
    "full genre transformation",
    "replace the original drums bassline harmony and arrangement",
    "preserve only broad song identity and topline feeling",
    "DJ style arrangement",
    "club-ready production",
)

_GENRE_NAME_ALIASES = {
    "Amapiano": ("amapiano",),
    "Trap": ("trap",),
    "Funk": ("funk",),
    "Hip Hop": ("hip hop", "hiphop"),
    "Country": ("country",),
    "80s": ("80s", "80's", "eighties", "1980s"),
    "R&B": ("r&b", "rnb", "r and b"),
    "Soul": ("soul",),
    "Pop": ("pop",),
    "Gen Z": ("gen z", "genz", "hyperpop", "tiktok"),
    "Jazz": ("jazz",),
    "Reggae": ("reggae",),
    "Gospel": ("gospel",),
    "Instrumental": ("instrumental", "no vocals"),
}

_PROMPT_INSTRUMENT_RULES = {
    "flute": "featured flute accents",
    "percussion": "extra percussion layers",
    "shakers": "wide shaker patterns",
    "guitar": "guitar-driven support lines",
    "piano": "clear piano phrasing",
    "strings": "lifted string layers",
    "violin": "expressive violin phrases",
    "sax": "featured sax phrases",
    "brass": "brass stabs",
    "organ": "organ support",
    "choir": "choir-style backing harmonies",
    "pads": "richer synth pads",
    "synth": "stronger synth hooks",
    "808": "stronger 808 bass",
    "log drum": "log-drum bass movement",
}

_PROMPT_STYLE_RULES = (
    ("darker", "darker tone"),
    ("brighter", "brighter top-end"),
    ("cleaner", "cleaner mix tone"),
    ("wider", "wider stereo image"),
    ("cinematic", "cinematic lift"),
    ("atmospheric", "more atmosphere"),
    ("club", "club-weighted energy"),
    ("bouncy", "bouncier groove"),
    ("modern", "more modern production"),
    ("retro", "retro flavor"),
)

_PROMPT_ARRANGEMENT_RULES = (
    ("intro", "shape a stronger intro section"),
    ("hook", "focus the most dramatic changes around the hook"),
    ("chorus", "lift the chorus section harder"),
    ("drop", "build a stronger drop moment"),
    ("bridge", "reshape the bridge with contrast"),
)


_GENRE_AGENT_CONFIGS: dict[str, GenreAgentConfig] = {
    "Amapiano": GenreAgentConfig(
        agent_name="Amapiano Groove Agent",
        prompt_focus=("log-drum bass pressure", "airy piano chops", "wide shakers", "deep late-night pocket"),
        workflow_steps=(
            "Rebuild the groove around rolling log drums and softer piano stabs.",
            "Keep the arrangement spacious so the bass movement stays dominant.",
            "Push the bounce toward a relaxed but dance-floor-ready pocket.",
        ),
        summary="Plans deep log-drum movement, lighter harmonic stabs, and a smooth club groove.",
    ),
    "Trap": GenreAgentConfig(
        agent_name="Trap Energy Agent",
        prompt_focus=("808 sub pressure", "rapid hats", "dark synth beds", "hard trap drops"),
        workflow_steps=(
            "Swap the rhythmic foundation for heavy 808s and tight hi-hat motion.",
            "Darken the harmonic bed and tighten transitions into drops.",
            "Leave space for punchy vocal placement over a harder beat.",
        ),
        summary="Drives the remix toward 808-heavy drums, darker harmony, and harder drop sections.",
    ),
    "Funk": GenreAgentConfig(
        agent_name="Funk Pocket Agent",
        prompt_focus=("syncopated bass groove", "snappy drums", "rhythm guitar feel", "live-band bounce"),
        workflow_steps=(
            "Shift the low-end into syncopated groove patterns.",
            "Tighten the drums for a live-band pocket instead of a flat loop.",
            "Bring the harmony forward with brighter rhythmic movement.",
        ),
        summary="Targets a tighter live groove with syncopated bass and brighter rhythmic phrasing.",
    ),
    "Hip Hop": GenreAgentConfig(
        agent_name="Hip Hop Bounce Agent",
        prompt_focus=("punchy drums", "808 bass", "sampled texture", "head-nod pocket"),
        workflow_steps=(
            "Center the beat around punchy drums and strong low-end pocket.",
            "Simplify the arrangement into loop-driven phrases.",
            "Keep the topline clear over a heavier beat bed.",
        ),
        summary="Builds a loop-driven beat with punchier drums and stronger low-end weight.",
    ),
    "Country": GenreAgentConfig(
        agent_name="Country Band Agent",
        prompt_focus=("acoustic guitars", "live snare feel", "open arrangement", "storytelling tone"),
        workflow_steps=(
            "Open the arrangement and reduce dense electronic layering.",
            "Introduce cleaner live-band rhythm cues and strummed movement.",
            "Preserve vocal clarity with a warmer backing bed.",
        ),
        summary="Moves the remix into an open live-band feel with more guitars and warmer space.",
    ),
    "80s": GenreAgentConfig(
        agent_name="Eighties Retro Agent",
        prompt_focus=("retro synths", "gated drums", "bright pads", "anthemic lift"),
        workflow_steps=(
            "Introduce retro synth layers and brighter harmonic pads.",
            "Push the drums into a sharper gated character.",
            "Lift the chorus moments into a bigger nostalgic arc.",
        ),
        summary="Adds retro synth staging, gated drums, and a brighter nostalgic chorus lift.",
    ),
    "R&B": GenreAgentConfig(
        agent_name="RNB Smooth Agent",
        prompt_focus=("silky chords", "deep bass", "clean pocket", "late-night warmth"),
        workflow_steps=(
            "Smooth the drums and give the harmony more space and warmth.",
            "Keep the bass clean and rounded rather than aggressive.",
            "Support the topline with a softer late-night groove.",
        ),
        summary="Softens the rhythm section and warms the harmony for a smoother late-night feel.",
    ),
    "Soul": GenreAgentConfig(
        agent_name="Soul Warmth Agent",
        prompt_focus=("warm keys", "expressive rhythm section", "organic groove", "lifted chorus feel"),
        workflow_steps=(
            "Warm the harmonic bed and favor more organic rhythm phrasing.",
            "Lean into expressive transitions rather than mechanical loop jumps.",
            "Keep the vocal space prominent with richer chord support.",
        ),
        summary="Warms the chord bed and rhythm section for a more organic soulful performance.",
    ),
    "Pop": GenreAgentConfig(
        agent_name="Pop Hook Agent",
        prompt_focus=("clean drums", "hook-first arrangement", "radio polish", "wide chorus lift"),
        workflow_steps=(
            "Tighten the structure toward clean verse and chorus payoff.",
            "Polish the drums and simplify the harmonic stack for clarity.",
            "Push the chorus lift so the remix feels more mainstream and direct.",
        ),
        summary="Refocuses the song into a cleaner hook-driven structure with brighter lift points.",
    ),
    "Gen Z": GenreAgentConfig(
        agent_name="Gen Z Trend Agent",
        prompt_focus=("hyper-modern textures", "digital ear candy", "trend-ready low end", "fast contrast shifts"),
        workflow_steps=(
            "Modernize the texture palette with sharper digital transitions.",
            "Use stronger contrast between sections for trend-driven energy.",
            "Keep the low end loud and the hooks immediate.",
        ),
        summary="Modernizes the texture palette with trend-driven contrast, effects, and louder low end.",
    ),
    "Jazz": GenreAgentConfig(
        agent_name="Jazz Harmony Agent",
        prompt_focus=("richer chord color", "swing-informed movement", "live ensemble feel", "roomy dynamics"),
        workflow_steps=(
            "Expand the harmony and leave more dynamic breathing room.",
            "Soften the strict grid so the groove feels more played than programmed.",
            "Support the topline with richer chord color and cleaner spacing.",
        ),
        summary="Expands the harmony and loosens the groove for a more live, dynamic jazz feel.",
    ),
    "Reggae": GenreAgentConfig(
        agent_name="Reggae Skank Agent",
        prompt_focus=("offbeat guitar chops", "dub bass", "laid-back groove", "space-heavy mix"),
        workflow_steps=(
            "Move the groove toward offbeat accents and heavier sub movement.",
            "Open the mix with more space and laid-back motion.",
            "Reduce density so the groove breathes around the vocal.",
        ),
        summary="Shifts the rhythm into offbeat skank accents with more dub space and heavier bass.",
    ),
    "Gospel": GenreAgentConfig(
        agent_name="Gospel Lift Agent",
        prompt_focus=("uplifted keys", "choir-style harmony support", "live drums", "big emotional rise"),
        workflow_steps=(
            "Raise the harmonic lift and give the arrangement more emotional climb.",
            "Make the drums feel more live and supportive than aggressive.",
            "Build sections that can hold a bigger chorus-style payoff.",
        ),
        summary="Plans more harmonic lift, stronger emotional rise, and a live supportive rhythm section.",
    ),
    "Instrumental": GenreAgentConfig(
        agent_name="Instrumental Focus Agent",
        prompt_focus=("instrumental lead lines", "no vocal lead", "cinematic arrangement", "clear motif development"),
        workflow_steps=(
            "Remove the need for lead vocals and let the instruments carry the hook.",
            "Strengthen the arrangement so motifs evolve without relying on topline lyrics.",
            "Keep the final mix cleaner and more cinematic.",
        ),
        summary="Builds an instrumental-first arrangement with more motif development and cleaner space.",
    ),
}


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def _contains_phrase(text: str, phrase: str) -> bool:
    return phrase in text


def _extract_overlay_genre(selected_genre: str, prompt_lower: str) -> str | None:
    for genre_name, aliases in _GENRE_NAME_ALIASES.items():
        if genre_name == selected_genre:
            continue
        if any(_contains_phrase(prompt_lower, alias) for alias in aliases):
            return genre_name
    return None


def _build_prompt_controls(selected_genre: str, user_prompt: str) -> PromptControlSet:
    prompt_lower = user_prompt.casefold()
    overlay_genre = _extract_overlay_genre(selected_genre, prompt_lower)

    instrument_requests = [
        label
        for key, label in _PROMPT_INSTRUMENT_RULES.items()
        if _contains_phrase(prompt_lower, key)
    ]
    style_requests = [
        label
        for key, label in _PROMPT_STYLE_RULES
        if _contains_phrase(prompt_lower, key)
    ]
    arrangement_requests = [
        label
        for key, label in _PROMPT_ARRANGEMENT_RULES
        if _contains_phrase(prompt_lower, key)
    ]

    bass_delta = 0.0
    if any(token in prompt_lower for token in ("more bass", "stronger bass", "deep bass", "heavier bass", "808")):
        bass_delta += 0.1
    if any(token in prompt_lower for token in ("less bass", "reduce bass", "lighter bass")):
        bass_delta -= 0.08

    drums_delta = 0.0
    if any(token in prompt_lower for token in ("more percussion", "more drums", "harder drums", "extra percussion", "punchier drums")):
        drums_delta += 0.08
    if any(token in prompt_lower for token in ("less percussion", "lighter drums", "reduce drums")):
        drums_delta -= 0.06

    texture_delta = 0.0
    if any(token in prompt_lower for token in ("fuller", "richer", "wider", "cinematic", "atmospheric", "more texture")):
        texture_delta += 0.08
    if any(token in prompt_lower for token in ("dryer", "thinner", "strip back")):
        texture_delta -= 0.06

    vocal_delta = 0.0
    keep_vocals_override: bool | None = None
    if any(token in prompt_lower for token in ("instrumental", "no vocals", "remove vocals", "drop vocals")):
        keep_vocals_override = False
        vocal_delta = -1.0
    elif any(token in prompt_lower for token in ("keep vocals", "more vocals", "clearer vocals", "bring vocals up")):
        keep_vocals_override = True
        vocal_delta = 0.1

    accompaniment_delta = 0.0
    if any(token in prompt_lower for token in ("fuller", "bigger", "wider", "more energy", "harder")):
        accompaniment_delta += 0.06
    if any(token in prompt_lower for token in ("smoother", "softer", "gentler")):
        accompaniment_delta -= 0.03

    bpm_shift = 0
    if any(token in prompt_lower for token in ("faster", "more energy", "upbeat", "quicker")):
        bpm_shift += 6
    if any(token in prompt_lower for token in ("slower", "laid back", "laid-back", "chill", "calmer")):
        bpm_shift -= 6

    return PromptControlSet(
        overlay_genre=overlay_genre,
        instrument_requests=tuple(_dedupe(instrument_requests)),
        style_requests=tuple(_dedupe(style_requests)),
        arrangement_requests=tuple(_dedupe(arrangement_requests)),
        bass_delta=bass_delta,
        drums_delta=drums_delta,
        texture_delta=texture_delta,
        vocal_delta=vocal_delta,
        accompaniment_delta=accompaniment_delta,
        bpm_shift=bpm_shift,
        keep_vocals_override=keep_vocals_override,
    )


class LangGraphGenrePlanner:
    install_hint = "LangGraph is not installed. Install it with: python -m pip install langgraph"

    def __init__(self) -> None:
        self.available = StateGraph is not None
        self._graph = self._build_graph() if self.available else None

    @property
    def import_error(self) -> Exception | None:
        return _LANGGRAPH_IMPORT_ERROR

    def plan(
        self,
        submission: RemixSubmission,
        analysis: AnalysisSummary,
        *,
        target_bpm: int | None,
        baseline_tags: tuple[str, ...],
    ) -> GenreAgentPlan:
        if self._graph is None:
            raise RuntimeError(self.install_hint)

        state: GenreAgentState = {
            "genre": submission.genre,
            "requested_duration_seconds": submission.target_duration_seconds,
            "resolved_duration_seconds": submission.target_duration_seconds,
            "user_prompt": submission.remix_prompt or "",
            "source_bpm": analysis.bpm,
            "source_key": analysis.musical_key,
            "source_scale": analysis.scale,
            "song_title": submission.song_title,
            "artist_name": submission.artist_name,
            "source_label": submission.source_label,
            "batch_index": submission.batch_index,
            "batch_total": submission.batch_total,
            "target_bpm": target_bpm,
            "baseline_tags": list(baseline_tags),
            "prompt_segments": [],
            "workflow_notes": [],
            "agent_name": "",
            "summary": "",
            "overlay_genre": None,
            "instrument_requests": [],
            "style_requests": [],
            "arrangement_requests": [],
            "bass_delta": 0.0,
            "drums_delta": 0.0,
            "texture_delta": 0.0,
            "vocal_delta": 0.0,
            "accompaniment_delta": 0.0,
            "bpm_shift": 0,
            "keep_vocals_override": None,
        }
        result = self._graph.invoke(state)
        prompt_segments = _dedupe(result.get("prompt_segments", []))
        workflow_notes = _dedupe(result.get("workflow_notes", []))
        prompt_controls = PromptControlSet(
            overlay_genre=result.get("overlay_genre"),
            instrument_requests=tuple(_dedupe(list(result.get("instrument_requests", [])))),
            style_requests=tuple(_dedupe(list(result.get("style_requests", [])))),
            arrangement_requests=tuple(_dedupe(list(result.get("arrangement_requests", [])))),
            bass_delta=float(result.get("bass_delta") or 0.0),
            drums_delta=float(result.get("drums_delta") or 0.0),
            texture_delta=float(result.get("texture_delta") or 0.0),
            vocal_delta=float(result.get("vocal_delta") or 0.0),
            accompaniment_delta=float(result.get("accompaniment_delta") or 0.0),
            bpm_shift=int(result.get("bpm_shift") or 0),
            keep_vocals_override=result.get("keep_vocals_override"),
        )
        return GenreAgentPlan(
            agent_name=result.get("agent_name") or f"{submission.genre} Agent",
            genre=submission.genre,
            resolved_prompt=", ".join(prompt_segments),
            resolved_duration_seconds=int(result.get("resolved_duration_seconds") or submission.target_duration_seconds),
            workflow_notes=workflow_notes,
            summary=result.get("summary") or f"{submission.genre} remix plan prepared with LangGraph.",
            prompt_controls=prompt_controls,
        )

    def plan_batch_sequence(
        self,
        *,
        genre: str,
        source_labels: list[str],
        total_duration_seconds: int,
        remix_prompt: str | None,
    ) -> BatchSequencePlan:
        item_count = max(1, len(source_labels))
        resolved_total = max(4, min(int(total_duration_seconds), 300))
        per_song = round(resolved_total / item_count, 2)
        cleaned_labels = [label.strip() for label in source_labels if label.strip()]
        summary = (
            f"LangGraph Batch Sequence Agent arranged {item_count} {genre.lower()} remixes into one continuous sequence."
        )
        notes = [
            f"LangGraph Batch Sequence Agent activated for {item_count} songs.",
            f"Total requested sequence length: {resolved_total} seconds.",
            f"Each song receives about {per_song} seconds in the merged remix.",
        ]
        if cleaned_labels:
            notes.append("Ordered source list: " + ", ".join(cleaned_labels) + ".")
        if remix_prompt:
            notes.append(f"Shared batch prompt influence: {remix_prompt}.")
        notes.append("Technique: keep the original songs full-length in sequence, but trim every remixed song to an equal section before concatenating the final remix.")
        return BatchSequencePlan(
            agent_name="LangGraph Batch Sequence Agent",
            total_duration_seconds=resolved_total,
            per_song_duration_seconds=per_song,
            workflow_notes=notes,
            summary=summary,
        )

    def _build_graph(self):
        graph = StateGraph(GenreAgentState)
        graph.add_node("prepare", self._prepare_state)
        graph.add_node("interpret_prompt", self._interpret_prompt)
        graph.add_node("finalize", self._finalize_state)
        for genre_name in _GENRE_AGENT_CONFIGS:
            graph.add_node(self._node_name(genre_name), self._make_genre_node(genre_name))

        graph.add_edge(START, "prepare")
        graph.add_edge("prepare", "interpret_prompt")
        graph.add_conditional_edges(
            "interpret_prompt",
            self._route_genre,
            {genre_name: self._node_name(genre_name) for genre_name in _GENRE_AGENT_CONFIGS},
        )
        for genre_name in _GENRE_AGENT_CONFIGS:
            graph.add_edge(self._node_name(genre_name), "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    def _node_name(self, genre_name: str) -> str:
        return f"genre_{genre_name.lower().replace('&', 'and').replace(' ', '_')}"

    def _route_genre(self, state: GenreAgentState) -> str:
        genre = state.get("genre") or "Pop"
        return genre if genre in _GENRE_AGENT_CONFIGS else "Pop"

    def _prepare_state(self, state: GenreAgentState) -> GenreAgentState:
        genre = state.get("genre") or "Pop"
        prompt_segments = [f"{genre} remix", *_COMMON_PROMPT_SEGMENTS]
        target_bpm = state.get("target_bpm")
        if target_bpm:
            prompt_segments.append(f"target around {target_bpm} BPM")
        source_bpm = state.get("source_bpm")
        if source_bpm:
            prompt_segments.append(f"starting from source around {round(source_bpm)} BPM")
        source_key = state.get("source_key")
        source_scale = state.get("source_scale")
        if source_key and source_scale:
            prompt_segments.append(f"respect tonal center around {source_key} {source_scale}")

        prompt_segments.extend(state.get("baseline_tags", []))
        workflow_notes = [f"LangGraph routed this remix to the {genre} specialist."]
        batch_total = state.get("batch_total") or 0
        batch_index = state.get("batch_index") or 0
        source_label = state.get("source_label")
        if batch_total > 1 and batch_index > 0:
            label = f" for {source_label}" if source_label else ""
            workflow_notes.append(f"Batch task {batch_index} of {batch_total}{label}.")

        resolved_duration = max(4, min(int(state.get("requested_duration_seconds") or 20), 60))
        return {
            "resolved_duration_seconds": resolved_duration,
            "prompt_segments": prompt_segments,
            "workflow_notes": workflow_notes,
        }

    def _interpret_prompt(self, state: GenreAgentState) -> GenreAgentState:
        user_prompt = (state.get("user_prompt") or "").strip()
        if not user_prompt:
            return {}

        selected_genre = state.get("genre") or "Pop"
        prompt_controls = _build_prompt_controls(selected_genre, user_prompt)
        prompt_segments: list[str] = []
        workflow_notes: list[str] = ["LangGraph Prompt Interpreter Agent translated the free-text remix request into structured controls."]

        if prompt_controls.overlay_genre:
            prompt_segments.append(f"hybrid of {selected_genre} and {prompt_controls.overlay_genre}")
            workflow_notes.append(
                f"Prompt interpreter detected a cross-genre request: mix {selected_genre} with {prompt_controls.overlay_genre}."
            )

        if prompt_controls.instrument_requests:
            prompt_segments.extend(prompt_controls.instrument_requests)
            workflow_notes.append(
                "Instrument requests: " + ", ".join(prompt_controls.instrument_requests) + "."
            )

        if prompt_controls.style_requests:
            prompt_segments.extend(prompt_controls.style_requests)
            workflow_notes.append(
                "Style requests: " + ", ".join(prompt_controls.style_requests) + "."
            )

        if prompt_controls.arrangement_requests:
            prompt_segments.extend(prompt_controls.arrangement_requests)
            workflow_notes.append(
                "Arrangement requests: " + ", ".join(prompt_controls.arrangement_requests) + "."
            )

        if abs(prompt_controls.bass_delta) > 0.01:
            workflow_notes.append(
                f"Low-end reinforcement adjusted by {round(prompt_controls.bass_delta * 100)}% from the prompt."
            )
        if abs(prompt_controls.drums_delta) > 0.01:
            workflow_notes.append(
                f"Drum and percussion reinforcement adjusted by {round(prompt_controls.drums_delta * 100)}% from the prompt."
            )
        if abs(prompt_controls.texture_delta) > 0.01:
            workflow_notes.append(
                f"Texture support adjusted by {round(prompt_controls.texture_delta * 100)}% from the prompt."
            )
        if abs(prompt_controls.vocal_delta) > 0.01:
            workflow_notes.append(
                f"Vocal blend adjusted by {round(prompt_controls.vocal_delta * 100)}% from the prompt."
            )
        if abs(prompt_controls.accompaniment_delta) > 0.01:
            workflow_notes.append(
                f"Generated accompaniment intensity adjusted by {round(prompt_controls.accompaniment_delta * 100)}% from the prompt."
            )
        if prompt_controls.bpm_shift:
            workflow_notes.append(f"Prompt requested a tempo feel shift of about {prompt_controls.bpm_shift:+d} BPM.")
        if prompt_controls.keep_vocals_override is False:
            workflow_notes.append("Prompt requested vocal removal or a near-instrumental finish.")
        elif prompt_controls.keep_vocals_override is True:
            workflow_notes.append("Prompt requested stronger vocal presence in the final remix.")

        return {
            "prompt_segments": list(state.get("prompt_segments", [])) + prompt_segments,
            "workflow_notes": list(state.get("workflow_notes", [])) + workflow_notes,
            "overlay_genre": prompt_controls.overlay_genre,
            "instrument_requests": list(prompt_controls.instrument_requests),
            "style_requests": list(prompt_controls.style_requests),
            "arrangement_requests": list(prompt_controls.arrangement_requests),
            "bass_delta": prompt_controls.bass_delta,
            "drums_delta": prompt_controls.drums_delta,
            "texture_delta": prompt_controls.texture_delta,
            "vocal_delta": prompt_controls.vocal_delta,
            "accompaniment_delta": prompt_controls.accompaniment_delta,
            "bpm_shift": prompt_controls.bpm_shift,
            "keep_vocals_override": prompt_controls.keep_vocals_override,
        }

    def _make_genre_node(self, genre_name: str):
        config = _GENRE_AGENT_CONFIGS[genre_name]

        def _node(state: GenreAgentState) -> GenreAgentState:
            prompt_segments = list(state.get("prompt_segments", [])) + list(config.prompt_focus)
            overlay_genre = state.get("overlay_genre")
            if overlay_genre and overlay_genre in _GENRE_AGENT_CONFIGS:
                prompt_segments.extend(_GENRE_AGENT_CONFIGS[overlay_genre].prompt_focus)
            if state.get("song_title"):
                prompt_segments.append(f"song title {state['song_title']}")
            if state.get("artist_name"):
                prompt_segments.append(f"inspired by {state['artist_name']}")
            if state.get("user_prompt"):
                prompt_segments.append(state["user_prompt"])

            workflow_notes = list(state.get("workflow_notes", []))
            workflow_notes.append(f"{config.agent_name} selected for {genre_name}.")
            workflow_notes.extend(f"Agent task: {step}" for step in config.workflow_steps)
            if overlay_genre and overlay_genre in _GENRE_AGENT_CONFIGS:
                workflow_notes.append(
                    f"Hybrid influence borrowed from {_GENRE_AGENT_CONFIGS[overlay_genre].agent_name}."
                )
            if state.get("user_prompt"):
                workflow_notes.append(f"User prompt override: {state['user_prompt']}.")

            return {
                "agent_name": config.agent_name,
                "prompt_segments": prompt_segments,
                "workflow_notes": workflow_notes,
                "summary": config.summary,
            }

        return _node

    def _finalize_state(self, state: GenreAgentState) -> GenreAgentState:
        workflow_notes = list(state.get("workflow_notes", []))
        resolved_duration = int(state.get("resolved_duration_seconds") or 20)
        workflow_notes.append(f"Remix duration target set to {resolved_duration} seconds.")
        return {
            "prompt_segments": _dedupe(list(state.get("prompt_segments", []))),
            "workflow_notes": _dedupe(workflow_notes),
        }
