import { useEffect, useMemo, useState } from "react";
import { Route, RefreshCw, TrendingUp, CalendarDays, Gauge, Info } from "lucide-react";
import { loadTravelDays } from "../../utils/travelKm";
import { formatDay, formatTime, lastNDates, localISO } from "../../utils/salesPortal";

const RANGES = [7, 14, 30];
const EMPTY_ROWS = [];

const dayStatus = (r) => {
  if (r.failed) return { label: "Couldn't load", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (!r.points) return { label: "No GPS data", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  if (r.km >= 0.5) return { label: "Field day", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { label: "Local / office", cls: "bg-blue-50 text-blue-700 border-blue-200" };
};

const fmtKm = (v) => (Number(v) || 0).toFixed(1);

const TravelPanel = ({ empId }) => {
  const [days, setDays] = useState(7);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: "", rows: [] });

  const key = `${empId || "none"}|${days}|${tick}`;
  const loading = Boolean(empId) && result.key !== key;

  useEffect(() => {
    if (!empId) return undefined;
    let cancelled = false;
    const dates = lastNDates(days);
    const run = () =>
      loadTravelDays(empId, dates)
        .then((rows) => {
          if (!cancelled) setResult({ key, rows });
        })
        .catch(() => {
          if (!cancelled) {
            setResult({
              key,
              rows: dates.map((d) => ({ date: d, km: 0, points: 0, failed: true })),
            });
          }
        });
    run();
    const timer = setInterval(run, 60000); // keep today's km live
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [empId, days, key]);

  const rows = result.key === key ? result.rows : EMPTY_ROWS;
  const today = localISO();

  const stats = useMemo(() => {
    const todayRow = rows.find((r) => r.date === today);
    const total = rows.reduce((s, r) => s + (r.km || 0), 0);
    const active = rows.filter((r) => r.km > 0);
    const best = rows.reduce((b, r) => (r.km > (b?.km || 0) ? r : b), null);
    return {
      today: todayRow?.km || 0,
      total,
      avg: active.length ? total / active.length : 0,
      activeDays: active.length,
      best,
      max: Math.max(1, ...rows.map((r) => r.km || 0)),
    };
  }, [rows, today]);

  const cards = [
    { label: "Today", value: fmtKm(stats.today), unit: "km", icon: Route, tone: "from-[#DF173C] to-[#a80f2c] text-white" },
    { label: `Last ${days} days`, value: fmtKm(stats.total), unit: "km", icon: TrendingUp, tone: "from-zinc-900 to-black text-white" },
    { label: "Average / field day", value: fmtKm(stats.avg), unit: "km", icon: Gauge, tone: "from-white to-white text-zinc-900 border border-zinc-200" },
    { label: "Field days", value: String(stats.activeDays), unit: `of ${days}`, icon: CalendarDays, tone: "from-white to-white text-zinc-900 border border-zinc-200" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-zinc-950">My travel &amp; kilometres</h2>
          <p className="text-xs text-zinc-400">
            Actual distance covered each day, calculated from your phone's GPS trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  days === r ? "bg-black text-white" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition hover:text-[#DF173C] cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-[#DF173C]" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {!empId ? (
        <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-xs font-bold text-zinc-500">
          Loading your profile…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(({ label, value, unit, icon: Icon, tone }) => (
              <div key={label} className={`rounded-2xl bg-gradient-to-br p-5 shadow-xs ${tone}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                    {label}
                  </span>
                  <Icon size={16} className="opacity-70" />
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black tracking-tight">
                    {loading ? "…" : value}
                  </span>
                  <span className="text-xs font-bold opacity-70">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-950">Daily distance</h3>
              {stats.best && stats.best.km > 0 && (
                <span className="text-[11px] font-bold text-zinc-400">
                  Best day: {formatDay(stats.best.date, { day: "2-digit", month: "short" })} ·{" "}
                  {fmtKm(stats.best.km)} km
                </span>
              )}
            </div>
            <div className="flex h-44 items-end gap-1.5 overflow-x-auto pb-1">
              {rows.map((r) => {
                const h = r.km > 0 ? Math.max(6, (r.km / stats.max) * 140) : 3;
                const isToday = r.date === today;
                return (
                  <div
                    key={r.date}
                    className="flex min-w-[22px] flex-1 flex-col items-center justify-end gap-1"
                    title={`${formatDay(r.date)} · ${fmtKm(r.km)} km`}
                  >
                    <span className="text-[9px] font-bold text-zinc-500">
                      {r.km > 0 ? fmtKm(r.km) : ""}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isToday ? "bg-[#DF173C]" : r.km > 0 ? "bg-zinc-800" : "bg-zinc-200"
                      }`}
                      style={{ height: `${h}px` }}
                    />
                    <span
                      className={`text-[9px] font-mono ${isToday ? "font-black text-[#DF173C]" : "text-zinc-400"}`}
                    >
                      {r.date.slice(8, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Distance</th>
                    <th className="px-5 py-3">GPS pings</th>
                    <th className="px-5 py-3">First ping</th>
                    <th className="px-5 py-3">Last ping</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[...rows].reverse().map((r) => {
                    const st = dayStatus(r);
                    return (
                      <tr key={r.date} className={r.date === today ? "bg-red-50/40" : ""}>
                        <td className="whitespace-nowrap px-5 py-3 font-bold text-zinc-900">
                          {formatDay(r.date)}
                          {r.date === today && (
                            <span className="ml-2 rounded bg-[#DF173C] px-1.5 py-0.5 text-[9px] font-black text-white">
                              TODAY
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-black text-zinc-950">{fmtKm(r.km)} km</td>
                        <td className="px-5 py-3 font-mono text-zinc-600">{r.points || 0}</td>
                        <td className="px-5 py-3 font-mono text-zinc-600">{formatTime(r.firstAt)}</td>
                        <td className="px-5 py-3 font-mono text-zinc-600">{formatTime(r.lastAt)}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-[11px] leading-relaxed text-zinc-500">
            <Info size={14} className="mt-0.5 shrink-0 text-zinc-400" />
            <p>
              Kilometres are measured between consecutive GPS pings sent by your phone
              while you are on duty. Movements under 20 m (GPS drift) and impossible jumps
              are ignored. If a day shows &quot;No GPS data&quot;, tracking was not running
              or the phone was offline.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TravelPanel;
