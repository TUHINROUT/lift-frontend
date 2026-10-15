import { useMemo, useState } from "react";
import {
  ClipboardList,
  MapPin,
  Calendar,
  Tag,
  Flag,
  AlertTriangle,
  Navigation,
  Loader2,
} from "lucide-react";
import { formatDay, isTaskClosed, localISO, normStatus } from "../../utils/salesPortal";

const priorityStyle = (p) => {
  switch (String(p || "").toLowerCase()) {
    case "urgent":
      return "border-rose-200 text-rose-600 bg-rose-50";
    case "high":
      return "border-orange-200 text-orange-600 bg-orange-50";
    case "medium":
      return "border-amber-200 text-amber-600 bg-amber-50";
    case "low":
      return "border-emerald-200 text-emerald-600 bg-emerald-50";
    default:
      return "border-zinc-200 text-zinc-600 bg-zinc-50";
  }
};

const statusStyle = (s) => {
  switch (normStatus(s)) {
    case "completed":
      return "border-emerald-200 text-emerald-700 bg-emerald-50";
    case "inprogress":
      return "border-blue-200 text-blue-700 bg-blue-50";
    case "cancelled":
    case "canceled":
      return "border-rose-200 text-rose-600 bg-rose-50";
    default:
      return "border-amber-200 text-amber-700 bg-amber-50";
  }
};

const FILTERS = [
  ["open", "Open"],
  ["all", "All"],
  ["done", "Closed"],
];

const TasksPanel = ({ tasks, loaded, error }) => {
  const [filter, setFilter] = useState("open");
  const today = localISO();

  const visible = useMemo(() => {
    const list = tasks.filter((t) =>
      filter === "all" ? true : filter === "open" ? !isTaskClosed(t) : isTaskClosed(t),
    );
    return [...list].sort((a, b) => {
      const da = a.due_date ? String(a.due_date).slice(0, 10) : "9999-12-31";
      const db = b.due_date ? String(b.due_date).slice(0, 10) : "9999-12-31";
      return da.localeCompare(db);
    });
  }, [tasks, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-zinc-950">Tasks assigned to me</h2>
          <p className="text-xs text-zinc-400">
            Everything the admin has allocated to you, nearest deadline first.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                filter === key ? "bg-black text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-16 text-xs font-bold text-zinc-500">
          <Loader2 size={16} className="animate-spin text-[#DF173C]" /> Loading tasks…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs font-semibold text-amber-800">
          Tasks could not be loaded right now ({error}). They will appear
          automatically as soon as the server responds.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center">
          <ClipboardList size={30} className="mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-700">
            {filter === "open" ? "No open tasks right now" : "No tasks in this view"}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            When the admin assigns you a task you will get a notification here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visible.map((t) => {
            const due = t.due_date ? String(t.due_date).slice(0, 10) : null;
            const overdue = due && due < today && !isTaskClosed(t);
            const hasCoords = t.latitude != null && t.longitude != null && t.latitude !== "";
            return (
              <div
                key={t.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                  overdue ? "border-rose-300" : "border-zinc-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    TASK-{String(t.id).padStart(4, "0")}
                  </span>
                  {t.priority && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${priorityStyle(t.priority)}`}
                    >
                      <Flag size={10} /> {t.priority}
                    </span>
                  )}
                  {t.status && (
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${statusStyle(t.status)}`}
                    >
                      {t.status}
                    </span>
                  )}
                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                      <AlertTriangle size={10} /> Overdue
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-sm font-black text-zinc-950">
                  {t.category || "Task"}
                  {t.sub_category ? ` · ${t.sub_category}` : ""}
                </h3>

                {t.instructions && (
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs text-zinc-600 [overflow-wrap:anywhere]">
                    {t.instructions}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-500">
                  {due && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} className="text-[#DF173C]" /> Due {formatDay(due)}
                    </span>
                  )}
                  {t.location_name && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-[#DF173C]" /> {t.location_name}
                    </span>
                  )}
                  {t.category && (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={12} className="text-[#DF173C]" /> {t.category}
                    </span>
                  )}
                </div>

                {hasCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-bold text-zinc-800 transition hover:bg-zinc-100"
                  >
                    <Navigation size={12} className="text-[#DF173C]" /> Navigate to site
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TasksPanel;
