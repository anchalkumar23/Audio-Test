"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type AnalysisResult, type WordResult } from "@/lib/api";

type Props = {
  result: AnalysisResult;
  onReset: () => void;
};

const TAG_STYLES: Record<WordResult["tag"], string> = {
  correct: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unclear: "bg-amber-50 text-amber-700 border-amber-200",
  mispronounced: "bg-red-50 text-red-700 border-red-200",
  missing: "bg-slate-100 text-slate-400 border-slate-200 line-through",
};

const TAG_TIPS: Record<WordResult["tag"], string> = {
  correct: "Well pronounced.",
  unclear: "Try to enunciate more clearly.",
  mispronounced: "Check the phonetic spelling of this word.",
  missing: "This word was skipped.",
};

function scoreColor(s: number) {
  if (s >= 85) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  return "text-red-600";
}

function SubBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
    </div>
  );
}

export default function ScoreDisplay({ result, onReset }: Props) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const target = result.score;
    const duration = 900;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [result.score]);

  const mispronounced = result.words.filter((w) => w.tag === "mispronounced");
  const unclear = result.words.filter((w) => w.tag === "unclear");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* Score ring */}
      <div className="flex flex-col items-center gap-1 py-4">
        <span
          className={`text-7xl font-bold tabular-nums tracking-tighter ${scoreColor(result.score)}`}
        >
          {displayed}
        </span>
        <span className="text-sm text-muted-foreground">out of 100</span>
      </div>

      {/* Sub-scores */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <SubBar label="Word accuracy" value={result.word_accuracy} />
        <SubBar label="Fluency" value={result.fluency} />
        <SubBar label="Completeness" value={result.completeness} />
      </div>

      {/* Word-by-word chips */}
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Word analysis
        </p>
        <div className="flex flex-wrap gap-1.5">
          {result.words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.18,
                delay: 0.1 + i * 0.03,
                ease: [0.23, 1, 0.32, 1],
              }}
              title={TAG_TIPS[w.tag]}
              className={[
                "cursor-default rounded-md border px-2 py-0.5 text-sm font-medium select-none transition-transform hover:scale-105",
                TAG_STYLES[w.tag],
              ].join(" ")}
            >
              {w.word}
            </motion.span>
          ))}
        </div>
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {(["correct", "unclear", "mispronounced", "missing"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-sm border ${TAG_STYLES[t]}`} />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Tips */}
      {(mispronounced.length > 0 || unclear.length > 0) && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tips
          </p>
          {mispronounced.length > 0 && (
            <p className="text-sm text-foreground">
              <span className="font-medium text-red-600">Mispronounced: </span>
              Practice "{mispronounced.map((w) => w.word).join(", ")}" — look up the phonetic spelling.
            </p>
          )}
          {unclear.length > 0 && (
            <p className="text-sm text-foreground">
              <span className="font-medium text-amber-600">Unclear: </span>
              Slow down on "{unclear.map((w) => w.word).join(", ")}" and enunciate each syllable.
            </p>
          )}
          {result.fluency < 0.7 && (
            <p className="text-sm text-foreground">
              <span className="font-medium text-amber-600">Fluency: </span>
              Long pauses detected. Practice reading the passage at a steady pace.
            </p>
          )}
        </div>
      )}

      {/* Transcript */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
          Transcript
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          {result.transcript}
        </p>
      </details>

      <Button
        variant="outline"
        className="w-full active:scale-[0.97] transition-transform"
        onClick={onReset}
      >
        Try again
      </Button>
    </motion.div>
  );
}
