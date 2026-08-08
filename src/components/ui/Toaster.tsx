import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useAppStore } from "../../store/store";

const ICONS = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
};

export function Toaster() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone ?? "default"];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => dismissToast(toast.id)}
              className="pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <Icon
                className={
                  toast.tone === "success"
                    ? "h-4 w-4 shrink-0 text-green-600"
                    : toast.tone === "error"
                      ? "h-4 w-4 shrink-0 text-red-600"
                      : "h-4 w-4 shrink-0 text-blue-600"
                }
              />
              {toast.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
