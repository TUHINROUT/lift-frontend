import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Briefcase,
  ClipboardList,
  CalendarClock,
  CheckCheck,
} from "lucide-react";
import { timeAgo } from "../../utils/salesPortal";

const ICONS = {
  lead: { Icon: Briefcase, tone: "bg-red-50 text-[#DF173C]" },
  task: { Icon: ClipboardList, tone: "bg-blue-50 text-blue-600" },
  followup: { Icon: CalendarClock, tone: "bg-amber-50 text-amber-600" },
};

const NotificationBell = ({
  items,
  unreadCount,
  onOpenItem,
  onMarkAllRead,
  canBrowserAlert,
  onEnableBrowserAlerts,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition hover:text-white cursor-pointer"
      >
        <Bell size={16} className={unreadCount > 0 ? "text-white" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DF173C] px-1 text-[10px] font-black text-white ring-2 ring-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[340px] max-w-[92vw] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <div>
                <h4 className="text-sm font-black text-zinc-950">Notifications</h4>
                <p className="text-[11px] text-zinc-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DF173C] hover:underline cursor-pointer"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={26} className="mx-auto mb-2 text-zinc-300" />
                  <p className="text-xs font-bold text-zinc-700">No notifications yet</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    New leads, tasks and follow-ups will show up here.
                  </p>
                </div>
              ) : (
                items.map((n) => {
                  const { Icon, tone } = ICONS[n.type] || ICONS.task;
                  return (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => {
                        onOpenItem(n);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 border-b border-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-50 cursor-pointer ${
                        n.unread ? "bg-red-50/40" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-black text-zinc-950">
                            {n.title}
                          </span>
                          {n.unread && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#DF173C]" />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                          {n.detail}
                        </span>
                        {n.ts > 0 && (
                          <span className="mt-0.5 block text-[10px] font-mono text-zinc-400">
                            {timeAgo(n.ts)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {canBrowserAlert && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5">
                <button
                  type="button"
                  onClick={onEnableBrowserAlerts}
                  className="text-[11px] font-bold text-zinc-700 hover:text-[#DF173C] cursor-pointer"
                >
                  Turn on desktop alerts for new assignments
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
