const configuredBase = (import.meta.env.VITE_REMIX_API_BASE as string | undefined)?.trim();

const API_BASE = configuredBase ? configuredBase.replace(/\/$/, "") : "";

export type RemixJobStatus =
  | "queued"
  | "ingesting"
  | "planning"
  | "separating"
  | "analyzing"
  | "generating"
  | "mixing"
  | "completed"
  | "failed";

export interface AnalysisSummary {
  bpm?: number | null;
  beat_count?: number | null;
  rhythm_confidence?: number | null;
  musical_key?: string | null;
  scale?: string | null;
  key_strength?: number | null;
  duration_seconds?: number | null;
  notes?: string[];
}

export interface ArtifactSummary {
  library_entry_id?: string | null;
  input_public_url?: string | null;
  input_audio_public_url?: string | null;
  source_media_kind?: string | null;
  public_remix_url?: string | null;
}

export interface ComparisonSummary {
  models_used: string[];
  summary?: string | null;
  changes: string[];
}

export interface RemixJobCreated {
  job_id: string;
  status: RemixJobStatus;
  current_stage: string;
}

export interface RemixJobResponse {
  job_id: string;
  status: RemixJobStatus;
  current_stage: string;
  message: string;
  source_type: string;
  genre: string;
  created_at: string;
  updated_at: string;
  analysis: AnalysisSummary;
  remix_analysis: AnalysisSummary;
  comparison: ComparisonSummary;
  artifacts: ArtifactSummary;
  error?: string | null;
}

export interface MergeBatchItem {
  source_label: string;
  input_audio_public_url: string;
  remix_public_url: string;
}

export interface MergeBatchResponse {
  library_entry_id?: string | null;
  title: string;
  source_media_kind: string;
  merged_source_public_url: string;
  merged_remix_public_url: string;
  summary: string;
  changes: string[];
  models_used: string[];
}

export interface DependencyStatus {
  available: boolean;
  detail: string;
}

export interface RuntimeCheckResponse {
  python_version: string;
  platform: string;
  recommended_environment: string;
  agent_framework?: string | null;
  separator_provider?: string | null;
  generator_provider?: string | null;
  separator_model?: string | null;
  generator_model?: string | null;
  selected_device?: string | null;
  cuda_available?: boolean | null;
  cuda_device_name?: string | null;
  cuda_version?: string | null;
  dependencies: Record<string, DependencyStatus>;
}

export interface SourcePreviewResponse {
  source_media_kind: string;
  input_public_url: string;
  input_audio_public_url: string;
}

export interface LibraryEntryResponse {
  entry_id: string;
  job_id: string;
  title: string;
  artist_name?: string | null;
  genre: string;
  source_type: string;
  source_media_kind: string;
  song_url?: string | null;
  remix_prompt?: string | null;
  created_at: string;
  source_public_url?: string | null;
  source_audio_public_url?: string | null;
  remix_public_url?: string | null;
  comparison_summary?: string | null;
  changes: string[];
  models_used: string[];
  source_bpm?: number | null;
  remix_bpm?: number | null;
  source_key?: string | null;
  remix_key?: string | null;
}

interface LibraryListResponse {
  entries: LibraryEntryResponse[];
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<T>;
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload?.detail)) {
      return payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ");
    }
    return `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function resolveBackendUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchRuntimeCheck(): Promise<RuntimeCheckResponse> {
  const response = await fetch(resolveBackendUrl("/api/system/check"));
  return parseJson<RuntimeCheckResponse>(response);
}

export async function fetchLibrary(limit = 24): Promise<LibraryEntryResponse[]> {
  const response = await fetch(resolveBackendUrl(`/api/library?limit=${limit}`));
  const payload = await parseJson<LibraryListResponse>(response);
  return payload.entries;
}

export async function createSourcePreview(payload: { file?: File; songUrl?: string }): Promise<SourcePreviewResponse> {
  const formData = new FormData();
  if (payload.file) {
    formData.append("song_file", payload.file);
  }
  if (payload.songUrl) {
    formData.append("song_url", payload.songUrl);
  }
  const response = await fetch(resolveBackendUrl("/api/source-preview"), {
    method: "POST",
    body: formData,
  });
  return parseJson<SourcePreviewResponse>(response);
}

export async function createRemixJob(formData: FormData): Promise<RemixJobCreated> {
  const response = await fetch(resolveBackendUrl("/api/remix"), {
    method: "POST",
    body: formData,
  });
  return parseJson<RemixJobCreated>(response);
}

export async function fetchRemixJob(jobId: string): Promise<RemixJobResponse> {
  const response = await fetch(resolveBackendUrl(`/api/remix/${jobId}`));
  return parseJson<RemixJobResponse>(response);
}

export async function mergeBatchRemixes(payload: {
  genre: string;
  remix_prompt?: string;
  target_duration_seconds: number;
  items: MergeBatchItem[];
}): Promise<MergeBatchResponse> {
  const response = await fetch(resolveBackendUrl("/api/remix/merge-batch"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJson<MergeBatchResponse>(response);
}
