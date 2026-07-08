import { motion } from "motion/react";
import { type Script } from "@/lib/api";

type Props = {
  scripts: Script[];
  selected: string;
  onSelect: (id: string) => void;
};

export default function ScriptPicker({ scripts, selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Choose a passage to read
      </p>
      <div className="grid gap-2">
        {scripts.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.22,
              delay: i * 0.04,
              ease: [0.23, 1, 0.32, 1],
            }}
            onClick={() => onSelect(s.id)}
            className={[
              "w-full rounded-lg border px-4 py-3 text-left transition-all duration-150",
              "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected === s.id
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                : "border-border bg-white hover:border-primary/40 hover:bg-primary/3",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                {s.title}
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.category}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {s.text}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
