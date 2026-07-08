"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("dpdp_consent")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("dpdp_consent", "1");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/95 backdrop-blur-sm px-5 py-4 shadow-lg"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Privacy: </span>
              Audio is processed in memory only and never stored. No personal
              data is retained after your session. Compliant with India&apos;s
              DPDP Act 2023.
            </p>
            <Button
              size="sm"
              onClick={accept}
              className="shrink-0 active:scale-[0.97] transition-transform"
            >
              I understand
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
