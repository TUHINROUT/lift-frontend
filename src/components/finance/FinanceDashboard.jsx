import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Landmark,
  RefreshCw,
  LogOut,
  Search,
  BadgeIndianRupee,
  ShieldCheck,
  Hourglass,
  Trophy,
  Route,
  LayoutDashboard,
  ReceiptText,
} from "lucide-react";
import {
  API_URL,
  authHeaders,
  mergeLeads,
  getLeadName,
  getLeadCode,
  getRepName,
  buildPeople,
  loadCrmData,
  PIPELINE_STAGES,
  getStageById,
} from "../../utils/crmStore";
import { useAutoSync } from "../../hooks/useAutoSync";
import AllEmployeesKm from "../common/AllEmployeesKm";

const dealValue = (l) => Number(l?.deal_value || l?.estimated_value) || 0;

const inr = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const inrShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return inr(v);
};

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "ledger", label: "Deal Ledger", icon: ReceiptText },
  { id: "km", label: "Employee KM", icon: Route },
];

const Kpi = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5">
    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-40 ${accent}`} />
    <div className="relative flex items-center gap-3">
      <div className={`h-10 w-10 rounded-2xl grid place-items-center text-slate-900 ${accent}`}>
        <Icon size={20} />
      </div>
      <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
    </div>
    <p className="relative mt-4 text-3xl font-extrabold text-white tabular-nums">{value}</p>
    {sub && <p className="relative mt-1 text-xs text-slate-400">{sub}</p>}
  </div>
);

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [raw, setRaw] = useState({ leads: [], users: [], departments: [], designations: [], roles: [] });
  const [leadsOk, setLeadsOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    const [crm, meRes] = await Promise.all([
      loadCrmData(),
      axios.get(`${API_URL}auth/me`, authHeaders()).catch(() => null),
    ]);
    setRaw(crm);
    setLeadsOk(crm.leadsOk);
    if (meRes?.data?.id) setMe(meRes.data);
    setLoaded(true);
  }, []);

  const { sync, syncing, lastSync } = useAutoSync(load, 15000);

  const people = useMemo(() => buildPeople(raw), [raw]);
  const leads = useMemo(() => mergeLeads(raw.leads), [raw.leads]);

  const stats = useMemo(() => {
    const won = leads.filter((l) => l.stage === "ORDER_WON");
    const lost = leads.filter((l) => l.stage === "ORDER_LOST");
    const open = leads.filter((l) => l.stage !== "ORDER_WON" && l.stage !== "ORDER_LOST");
    const sum = (a) => a.reduce((t, l) => t + dealValue(l), 0);
    const finQueue = leads.filter(
      (l) => String(l.current_department || "").toUpperCase() === "FINANCE",
    );
    const byStage = PIPELINE_STAGES.filter((s) => s.id !== "ORDER_LOST").map((s) => {
      const list = leads.filter((l) => l.stage === s.id);
      return { ...s, count: list.length, value: sum(list) };
    });
    return {
      won: sum(won),
      wonCount: won.length,
      pipeline: sum(open),
      openCount: open.length,
      lost: sum(lost),
      lostCount: lost.length,
      finQueue: sum(finQueue),
      finCount: finQueue.length,
      total: sum(leads),
      avg: leads.filter((l) => dealValue(l) > 0).length
        ? sum(leads) / leads.filter((l) => dealValue(l) > 0).length
        : 0,
      byStage,
    };
  }, [leads]);

  const ledger = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads
      .filter((l) => dealValue(l) > 0)
      .filter(
        (l) =>
          !s ||
          `${getLeadName(l)} ${getLeadCode(l)} ${getRepName(people, l.assigned_to_id)}`
            .toLowerCase()
            .includes(s),
      )
      .sort((a, b) => dealValue(b) - dealValue(a));
  }, [leads, q, people]);

  const maxStage = Math.max(1, ...stats.byStage.map((s) => s.value));

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}auth/logout`, {}, { ...authHeaders(), timeout: 4000 });
    } catch {
      /* local logout is enough */
    }
    ["access_token", "token_type", "role", "user_id", "user_name", "login_time"].forEach((k) =>
      localStorage.removeItem(k),
    );
    navigate("/login", { replace: true });
  };

  const name =
    (me && [me.first_name, me.last_name].filter(Boolean).join(" ")) ||
    localStorage.getItem("user_name") ||
    "Finance";

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-amber-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-indigo-500/20 blur-[140px]" />

      <header className="relative z-10 border-b border-white/10 bg-[#070b16]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 grid place-items-center text-slate-900 shadow-lg shadow-amber-500/30">
              <Landmark size={22} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight leading-tight">Finance Command Centre</h1>
              <p className="text-xs text-slate-400">Welcome, {name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-400 px-3 py-2 rounded-xl border border-white/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {lastSync ? `Live · ${lastSync.toLocaleTimeString("en-IN")}` : "Connecting…"}
            </span>
            <button
              onClick={sync}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Sync
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/10"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!leadsOk && loaded && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-200 px-4 py-3 text-sm">
            Deal data is not available for this login (the server refused <code>/crm/leads</code>). Ask the
            admin to grant the Finance role read access to CRM leads — figures below will fill in automatically
            once it does.
          </div>
        )}

        {tab === "overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={Trophy} label="Orders won" value={inrShort(stats.won)} sub={`${stats.wonCount} confirmed orders`} accent="bg-emerald-400" />
              <Kpi icon={TrendingUp} label="Open pipeline" value={inrShort(stats.pipeline)} sub={`${stats.openCount} live deals`} accent="bg-amber-400" />
              <Kpi icon={ShieldCheck} label="Finance clearance" value={inrShort(stats.finQueue)} sub={`${stats.finCount} awaiting finance`} accent="bg-sky-400" />
              <Kpi icon={BadgeIndianRupee} label="Avg deal size" value={inrShort(stats.avg)} sub={`Total book ${inrShort(stats.total)}`} accent="bg-fuchsia-400" />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Wallet size={18} className="text-amber-300" />
                  <h3 className="font-bold">Money by pipeline stage</h3>
                </div>
                <div className="space-y-3">
                  {stats.byStage.map((s) => (
                    <div key={s.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{s.name}</span>
                        <span className="text-slate-400 tabular-nums">
                          {s.count} · {inrShort(s.value)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.id === "ORDER_WON"
                              ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                              : "bg-gradient-to-r from-amber-400 to-orange-500"
                          }`}
                          style={{ width: `${s.value ? Math.max(2, (s.value / maxStage) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Hourglass size={18} className="text-amber-300" />
                  <h3 className="font-bold">Summary</h3>
                </div>
                <dl className="space-y-4 text-sm">
                  {[
                    ["Total contract book", inr(stats.total)],
                    ["Won & confirmed", inr(stats.won)],
                    ["Open pipeline", inr(stats.pipeline)],
                    ["Closed / lost", `${inr(stats.lost)} (${stats.lostCount})`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-3">
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="font-bold tabular-nums text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </>
        )}

        {tab === "ledger" && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-bold flex items-center gap-2">
                <ReceiptText size={18} className="text-amber-300" /> Deal ledger
                <span className="text-xs font-normal text-slate-400">({ledger.length})</span>
              </h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search deal, code or rep"
                  className="pl-8 pr-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
            {ledger.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {loaded ? "No deals with a value yet." : "Loading…"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Deal</th>
                      <th className="py-2 pr-3">Sales rep</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id} className="border-t border-white/5">
                        <td className="py-3 pr-3 text-slate-400 tabular-nums">{getLeadCode(l)}</td>
                        <td className="py-3 pr-3 font-semibold">{getLeadName(l)}</td>
                        <td className="py-3 pr-3 text-slate-300">{getRepName(people, l.assigned_to_id)}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              l.stage === "ORDER_WON"
                                ? "bg-emerald-400/15 text-emerald-300"
                                : l.stage === "ORDER_LOST"
                                  ? "bg-rose-400/15 text-rose-300"
                                  : "bg-amber-400/15 text-amber-300"
                            }`}
                          >
                            {getStageById(l.stage).name}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold tabular-nums">{inr(dealValue(l))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "km" && <AllEmployeesKm dark />}
      </main>
    </div>
  );
};

export default FinanceDashboard;
