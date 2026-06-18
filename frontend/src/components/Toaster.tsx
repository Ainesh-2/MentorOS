import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ToastTone } from "@/store/useToast";
import { useToastStore } from "@/store/useToast";

const ICON: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  error: XCircle,
};

const COLOR: Record<ToastTone, string> = {
  success: "var(--signal-green)",
  info: "var(--azure-500)",
  error: "var(--signal-coral)",
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="glass-quiet pointer-events-auto flex items-center gap-3 px-4 py-3"
              role="status"
            >
              <Icon size={18} style={{ color: COLOR[t.tone] }} className="shrink-0" />
              <p className="flex-1 text-caption text-ink">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="rounded-sm p-0.5 text-ink-soft hover:bg-ink/4"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
