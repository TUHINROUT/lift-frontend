import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ClipboardList, CalendarClock, X } from "lucide-react";

const ICONS = {
  lead: { Icon: Briefcase, tone: "bg-[#DF173C] text-white" },
  task: { Icon: ClipboardList, tone: "bg-blue-600 text-white" },
  followup: { Icon: CalendarClock, tone: "bg-amber-500 text-white" },
};

const ToastStack = ({ toasts, onOpen, onClose }) => (
  <div className="pointer-events-none fixed right-4 top-[72px] z-[60] flex w-[340px] max-w-[92vw] flex-col gap-2">
    <AnimatePresence>
      {toasts.map((n) => {
        const { Icon, tone } = ICONS[n.type] || ICONS.task;
        return (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xl"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
            >
              <Icon size={16} />
            </span>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className="min-w-0 flex-1 text-left cursor-pointer"
            >
              <span className="block text-xs font-black text-zinc-950">{n.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                {n.detail}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onClose(n)}
              aria-label="Dismiss"
              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

export default ToastStack;
