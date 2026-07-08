"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ScriptPicker from "@/components/ScriptPicker";
import { type Script } from "@/lib/api";

type Props = {
  scripts: Script[];
  selectedScript: string;
  onSelectScript: (id: string) => void;
  onSubmit: (file: Blob, filename: string, scriptId: string) => void;
  loading: boolean;
};

const MIN_S = 30;
const MAX_S = 45;

type RecordState = "idle" | "recording" | "done";

export default function AudioInput({
  scripts,
  selectedScript,
  onSelectScript,
  onSubmit,
  loading,
}: Props) {
  const [error, setError] = useState("");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecordState("done");
  }, []);

  async function startRecording() {
    setError("");
    setAudioBlob(null);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      startTimeRef.current = Date.now();
      setRecordState("recording");

      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(s);
        if (s >= MAX_S) stopRecording();
      }, 200);
    } catch {
      setError("Microphone access denied. Allow microphone permission and try again.");
    }
  }

  function reset() {
    setRecordState("idle");
    setAudioBlob(null);
    setElapsed(0);
    setError("");
  }

  function handleFileValidate(file: File) {
    setError("");
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      if (d < MIN_S) {
        setError(`Audio is ${d.toFixed(1)}s — minimum is 30 seconds.`);
        return;
      }
      if (d > MAX_S) {
        setError(`Audio is ${d.toFixed(1)}s — maximum is 45 seconds.`);
        return;
      }
      setUploadedFile(file);
    };
    audio.onerror = () => setError("Could not read audio file. Try a different format.");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileValidate(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("audio/")) handleFileValidate(file);
    else setError("Please drop an audio file.");
  }

  const pct = Math.min((elapsed / MAX_S) * 100, 100);
  const inRange = elapsed >= MIN_S;
  const script = scripts.find((s) => s.id === selectedScript);

  return (
    <Tabs defaultValue="record" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-10">
        <TabsTrigger value="record" className="text-sm">Record</TabsTrigger>
        <TabsTrigger value="upload" className="text-sm">Upload</TabsTrigger>
      </TabsList>

      {/* RECORD TAB */}
      <TabsContent value="record" className="mt-5 space-y-4">
        <ScriptPicker
          scripts={scripts}
          selected={selectedScript}
          onSelect={onSelectScript}
        />

        <AnimatePresence>
          {script && recordState !== "idle" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Read aloud
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {script.text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer */}
        <AnimatePresence>
          {recordState === "recording" && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Recording
                </span>
                <span
                  className={
                    inRange
                      ? "font-semibold tabular-nums text-primary"
                      : "tabular-nums text-muted-foreground"
                  }
                >
                  {elapsed}s / {MAX_S}s
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full ${inRange ? "bg-primary" : "bg-muted-foreground/40"}`}
                  style={{ width: `${pct}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
              {!inRange && (
                <p className="text-xs text-muted-foreground">
                  Keep reading - {MIN_S - elapsed}s more
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio playback after recording */}
        <AnimatePresence>
          {recordState === "done" && audioBlob && (
            <motion.audio
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              controls
              src={URL.createObjectURL(audioBlob)}
              className="w-full rounded-lg"
            />
          )}
        </AnimatePresence>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {recordState === "idle" && (
            <Button
              className="w-full active:scale-[0.97] transition-transform"
              onClick={startRecording}
              disabled={!selectedScript || loading}
            >
              Start Recording
            </Button>
          )}

          {recordState === "recording" && (
            <button
              onClick={stopRecording}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-all active:scale-[0.97] hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <span className="h-3 w-3 rounded-sm bg-red-500" />
              Stop {inRange ? "" : `(${MIN_S - elapsed}s left)`}
            </button>
          )}

          {recordState === "done" && (
            <>
              <Button
                variant="outline"
                className="flex-1 active:scale-[0.97] transition-transform"
                onClick={reset}
              >
                Re-record
              </Button>
              <Button
                className="flex-1 active:scale-[0.97] transition-transform"
                onClick={() => {
                  if (!audioBlob || !selectedScript) return;
                  if (elapsed < MIN_S) {
                    setError(`Recording is ${elapsed}s - minimum is 30 seconds.`);
                    return;
                  }
                  onSubmit(audioBlob, "recording.webm", selectedScript);
                }}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </>
          )}
        </div>
      </TabsContent>

      {/* UPLOAD TAB */}
      <TabsContent value="upload" className="mt-5 space-y-4">
        <ScriptPicker
          scripts={scripts}
          selected={selectedScript}
          onSelect={onSelectScript}
        />

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={[
            "group relative rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-150",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : uploadedFile
              ? "border-primary/40 bg-primary/3"
              : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
          ].join(" ")}
        >
          <input
            id="file-input"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="file-input" className="cursor-pointer space-y-2 block">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            {uploadedFile ? (
              <div>
                <p className="text-sm font-semibold text-primary">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024).toFixed(0)} KB - ready to analyze
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drop audio file or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  MP3, WAV, M4A, WebM - must be 30 to 45 seconds
                </p>
              </div>
            )}
          </label>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full active:scale-[0.97] transition-transform"
          onClick={() => {
            if (!uploadedFile || !selectedScript) return;
            onSubmit(uploadedFile, uploadedFile.name, selectedScript);
          }}
          disabled={!uploadedFile || !selectedScript || loading}
        >
          {loading ? "Analyzing..." : "Analyze Pronunciation"}
        </Button>
      </TabsContent>
    </Tabs>
  );
}
