export type WordResult = {
  word: string;
  tag: "correct" | "unclear" | "mispronounced" | "missing";
  score: number;
};

export type AnalysisResult = {
  score: number;
  words: WordResult[];
  word_accuracy: number;
  fluency: number;
  completeness: number;
  transcript: string;
  script_id: string;
};

export type NonEnglishResult = {
  error: "non_english";
  message: string;
  score: null;
};

export type Script = {
  id: string;
  title: string;
  category: string;
  text: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchScripts(): Promise<Script[]> {
  const res = await fetch(`${API}/scripts`);
  if (!res.ok) throw new Error("Failed to load scripts");
  return res.json();
}

export async function analyzeAudio(
  file: Blob,
  scriptId: string,
  filename = "audio.wav"
): Promise<AnalysisResult | NonEnglishResult> {
  const form = new FormData();
  form.append("audio", file, filename);
  form.append("script_id", scriptId);

  const res = await fetch(`${API}/analyze`, { method: "POST", body: form });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail ?? "Analysis failed");
  }
  return data;
}
