"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AudioInput from "@/components/AudioInput";
import ScoreDisplay from "@/components/ScoreDisplay";
import { fetchScripts, analyzeAudio, type Script, type AnalysisResult } from "@/lib/api";

type AppState = "input" | "loading" | "result" | "non_english";

export default function Home() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState("");
  const [appState, setAppState] = useState<AppState>("input");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [nonEnglishMsg, setNonEnglishMsg] = useState("");

  useEffect(() => {
    fetchScripts()
      .then((s) => {
        setScripts(s);
        if (s.length) setSelectedScript(s[0].id);
      })
      .catch(() => setError("Could not load scripts. Is the backend running?"));
  }, []);

  async function handleSubmit(file: Blob, filename: string, scriptId: string) {
    setError("");
    setAppState("loading");
    try {
      const data = await analyzeAudio(file, scriptId, filename);
      if ("error" in data && data.error === "non_english") {
        setNonEnglishMsg(data.message);
        setAppState("non_english");
      } else {
        setResult(data as AnalysisResult);
        setAppState("result");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
      setAppState("input");
    }
  }

  function reset() {
    setResult(null);
    setError("");
    setNonEnglishMsg("");
    setAppState("input");
  }

  return (
    <main className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </span>
            <span className="font-semibold text-foreground tracking-tight">SpeakGrade</span>
          </div>
          <span className="text-xs text-muted-foreground">English Pronunciation Scorer</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-5 py-8">
        <div className="w-full max-w-xl">
          {/* Hero text */}
          <AnimatePresence>
            {appState === "input" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="mb-7 space-y-1.5"
              >
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  How&apos;s your English pronunciation?
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pick a passage, record 30-45 seconds, and get a score with word-by-word feedback.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          <AnimatePresence>
            {appState === "loading" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col items-center gap-4 py-20 text-center"
              >
                <div className="relative flex h-14 w-14 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                  <div className="absolute inset-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Analyzing your pronunciation…</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Transcribing speech and comparing phonemes
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Non-English error */}
          <AnimatePresence>
            {appState === "non_english" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-4 py-8"
              >
                <Alert variant="destructive">
                  <AlertDescription>{nonEnglishMsg}</AlertDescription>
                </Alert>
                <button
                  onClick={reset}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.97]"
                >
                  Try again with English audio
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global error */}
          {error && appState === "input" && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Input form */}
          <AnimatePresence>
            {appState === "input" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <AudioInput
                  scripts={scripts}
                  selectedScript={selectedScript}
                  onSelectScript={setSelectedScript}
                  onSubmit={handleSubmit}
                  loading={false}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {appState === "result" && result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ScoreDisplay result={result} onReset={reset} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Audio is processed in memory only. No data is stored. DPDP Act 2023 compliant.
        </p>
      </footer>
    </main>
  );
}
