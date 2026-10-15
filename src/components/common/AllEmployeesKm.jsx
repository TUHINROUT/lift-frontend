import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { MapPin, RefreshCw, Search, Route } from "lucide-react";
import { API_URL, authHeaders, userDisplayName } from "../../utils/crmStore";
import { loadTravelDays } from "../../utils/travelKm";
import { localISO } from "../../utils/salesPortal";
import { useAutoSync } from "../../hooks/useAutoSync";

const isActive = (u) =>
  !(u?.is_active === false || u?.is_active === 0 || u?.active === false ||
    String(u?.status || "").toLowerCase() === "inactive");

const roleText = (u) =>
  u?.designation?.name || u?.designation_name ||
  (typeof u?.designation === "string" ? u.designation : "") ||
  u?.department?.name || u?.department_name ||
  (typeof u?.department === "string" ? u.department : "") ||
  u?.role?.name || (typeof u?.role === "string" ? u.role : "") || "Employee";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

// Kilometres travelled by EVERY employee for a chosen day. Auto-syncs.
const AllEmployeesKm = ({ dark = false }) => {
  const [date, setDate] = useState(localISO());
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    let users;
    try {
      const res = await axios.get(`${API_URL}users`, authHeaders());
      const d = res.data;
      users = Array.isArray(d) ? d : d?.items || d?.data || [];
    } catch (err) {
      const denied = [401, 403].includes(err?.response?.status);
      setError(
        denied
          ? "Your login does not have permission to list employees (backend returned 403)."
          : "Could not load employees. Retrying automatically…",
      );
      setLoadedOnce(true);
      return;
    }
    setError("");
    const staff = users.filter(isActive);
    const out = [];
    // First employee goes alone: if the backend refuses tracking for this login,
    // the refusal is remembered and the rest are skipped without extra requests.
    for (let i = 0; i < staff.length; i += i === 0 ? 1 : 6) {
      const chunk = staff.slice(i, i === 0 ? 1 : i + 6);
      const res = await Promise.all(
        chunk.map(async (u) => {
          const [day] = await loadTravelDays(u.id, [date]);
          return {
            id: u.id,
            name: userDisplayName(u),
            role: roleText(u),
            km: day?.failed ? null : day?.km ?? 0,
            points: day?.points ?? 0,
            firstAt: day?.firstAt,
            lastAt: day?.lastAt,
          };
        }),
      );
      out.push(...res);
    }
    setRows(out);
    setLoadedOnce(true);
  }, [date]);

  const { sync, syncing, lastSync } = useAutoSync(load, 60000);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => !s || `${r.name} ${r.role}`.toLowerCase().includes(s))
      .sort((a, b) => (b.km ?? -1) - (a.km ?? -1));
  }, [rows, q]);

  const totalKm = shown.reduce((a, r) => a + (r.km || 0), 0);
  const active = shown.filter((r) => (r.km || 0) > 0).length;
  const unavailable = shown.filter((r) => r.km === null).length;
  const max = Math.max(1, ...shown.map((r) => r.km || 0));

  const card = dark
    ? "bg-white/[0.04] border-white/10 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const input = dark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-slate-900">
            <Route size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Kilometres — all employees</h3>
            <p className={`text-xs ${muted}`}>
              {lastSync ? `Auto-synced ${lastSync.toLocaleTimeString("en-IN")}` : "Syncing…"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search employee"
              className={`pl-8 pr-3 py-2 rounded-xl border text-sm outline-none ${input}`}
            />
          </div>
          <input
            type="date"
            value={date}
            max={localISO()}
            onChange={(e) => {
              setLoadedOnce(false);
              setRows([]);
              setDate(e.target.value || localISO());
            }}
            className={`px-3 py-2 rounded-xl border text-sm outline-none ${input}`}
          />
          <button
            onClick={sync}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          ["Total distance", `${totalKm.toFixed(1)} km`],
          ["Moved today", `${active} / ${shown.length}`],
          ["No tracking data", String(unavailable)],
        ].map(([l, v]) => (
          <div key={l} className={`rounded-2xl border p-3 ${dark ? "border-white/10" : "border-slate-200 bg-slate-50"}`}>
            <p className={`text-[11px] uppercase tracking-wider ${muted}`}>{l}</p>
            <p className="text-xl font-extrabold mt-1">{v}</p>
          </div>
        ))}
      </div>

      {!error && shown.length > 0 && unavailable === shown.length && (
        <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-400/10 text-amber-600 px-4 py-3 text-sm">
          The server did not return tracking data for this login (permission denied). Ask the admin
          to allow this role to read employee tracking — km will appear here automatically.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-400/10 text-amber-600 dark:text-amber-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loadedOnce ? (
        <p className={`py-10 text-center text-sm ${muted}`}>Loading employee kilometres…</p>
      ) : shown.length === 0 ? (
        <p className={`py-10 text-center text-sm ${muted}`}>No employees to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[11px] uppercase tracking-wider ${muted}`}>
                <th className="py-2 pr-3">Employee</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3 w-1/3">Distance</th>
                <th className="py-2 pr-3 text-right">Pings</th>
                <th className="py-2 text-right">First → Last</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-t ${dark ? "border-white/5" : "border-slate-100"}`}>
                  <td className="py-3 pr-3 font-semibold">{r.name}</td>
                  <td className={`py-3 pr-3 ${muted}`}>{r.role}</td>
                  <td className="py-3 pr-3">
                    {r.km === null ? (
                      <span className={muted}>Not available</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className={`h-2 flex-1 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-slate-100"}`}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                            style={{ width: `${Math.max(2, (r.km / max) * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold tabular-nums w-20 text-right inline-flex items-center justify-end gap-1">
                          <MapPin size={12} /> {r.km.toFixed(1)} km
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={`py-3 pr-3 text-right tabular-nums ${muted}`}>{r.points}</td>
                  <td className={`py-3 text-right tabular-nums ${muted}`}>
                    {fmtTime(r.firstAt)} → {fmtTime(r.lastAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllEmployeesKm;
