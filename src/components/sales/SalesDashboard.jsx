import {
  useState,
  useEffect,
  useEffectEvent,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Edit3,
  Send,
  MessageSquare,
  Check,
  Circle,
  ShieldAlert,
  PlayCircle,
  LogOut,
  Briefcase,
  ClipboardList,
  CalendarClock,
  Route,
  Hourglass,
  LayoutDashboard,
} from "lucide-react";
import {
  PIPELINE_STAGES,
  getSavedAssignments,
  saveAssignments,
  mergeLeads,
  saveTimelineEvent,
  getLeadEvents,
  groupEventsByStage,
  getStageById,
  getLeadName,
  getLeadPhone,
  getLeadLocation,
  getLeadCode,
  userDisplayName,
  ASSIGNMENTS_STORAGE_KEY,
  TIMELINE_STORAGE_KEY,
  API_URL,
  authHeaders,
} from "../../utils/crmStore";
import {
  buildNotifications,
  getDueFollowUps,
  greeting,
  initials,
  isTaskClosed,
  localISO,
  needsAcceptance,
  taskAssigneeId,
} from "../../utils/salesPortal";
import { loadTravelDays } from "../../utils/travelKm";
import { isBlocked, markBlocked, isDenied } from "../../utils/apiAccess";
import { isFinanceUser } from "../../utils/roleDetect";
import useNotificationStore from "./useNotificationStore";
import NotificationBell from "./NotificationBell";
import ToastStack from "./ToastStack";
import TasksPanel from "./TasksPanel";
import TravelPanel from "./TravelPanel";

const readCachedId = () => {
  const n = Number(localStorage.getItem("user_id"));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const SalesDashboard = () => {
  const navigate = useNavigate();
  const [rawLeads, setRawLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksState, setTasksState] = useState({ loaded: false, error: "" });
  const [localVersion, setLocalVersion] = useState(0);
  const [me, setMe] = useState(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [tab, setTab] = useState("pipeline");
  const [message, setMessage] = useState(null);
  const [todayKm, setTodayKm] = useState(null);
  const [alertPerm, setAlertPerm] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const mountedRef = useRef(true);
  const firedRef = useRef(new Set());

  const [callRemark, setCallRemark] = useState("");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");

  const myId = me?.id ? Number(me.id) : readCachedId();
  const myName = me
    ? userDisplayName(me)
    : localStorage.getItem("user_name") || "Sales Executive";
  const firstName = myName.split(" ")[0];
  const roleLabel =
    me?.designation?.name ||
    (typeof me?.designation === "string" ? me.designation : "") ||
    me?.designation_name ||
    me?.department?.name ||
    (typeof me?.department === "string" ? me.department : "") ||
    "Sales Executive";

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}auth/logout`, {}, { ...authHeaders(), timeout: 4000 });
    } catch {
      /* logging out locally is enough */
    }
    ["access_token", "token_type", "role", "user_id", "user_name"].forEach((k) =>
      localStorage.removeItem(k),
    );
    navigate("/login", { replace: true });
  };

  // Pure loader: returns data, never touches state (state is applied by the caller).
  const loadData = useCallback(async () => {
    const tasksBlocked = isBlocked("tasks");
    const [leadsRes, meRes, tasksRes] = await Promise.allSettled([
      axios.get(`${API_URL}crm/leads`, authHeaders()),
      axios.get(`${API_URL}auth/me`, authHeaders()),
      tasksBlocked
        ? Promise.resolve({ data: [] })
        : axios.get(`${API_URL}tasks`, authHeaders()),
    ]);
    if (tasksRes.status === "rejected" && isDenied(tasksRes.reason)) {
      markBlocked("tasks");
    }
    return {
      leads:
        leadsRes.status === "fulfilled" && Array.isArray(leadsRes.value?.data)
          ? leadsRes.value.data
          : null,
      me:
        meRes.status === "fulfilled" && meRes.value?.data?.id
          ? meRes.value.data
          : null,
      tasks:
        tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value?.data)
          ? tasksRes.value.data
          : null,
      tasksError:
        tasksRes.status === "rejected" && !isDenied(tasksRes.reason)
          ? tasksRes.reason?.response?.data?.detail?.toString?.() ||
            tasksRes.reason?.message ||
            "server unavailable"
          : "",
    };
  }, []);

  const applyData = useCallback((data) => {
    if (!mountedRef.current) return;
    if (data.leads) setRawLeads(data.leads);
    if (data.me) {
      // A Finance / Accounts login that landed here goes to its own dashboard.
      if (isFinanceUser(data.me)) {
        try {
          localStorage.setItem("role", "finance");
        } catch {
          /* ignore */
        }
        navigate("/finance/dashboard", { replace: true });
        return;
      }
      setMe(data.me);
      try {
        localStorage.setItem("user_id", String(data.me.id));
        localStorage.setItem("user_name", userDisplayName(data.me));
      } catch {
        /* ignore */
      }
    }
    if (data.tasks) setTasks(data.tasks);
    setTasksState({ loaded: true, error: data.tasks ? "" : data.tasksError });
    setLoadedOnce(true);
    setLoading(false);
  }, [navigate]);

  const handleSync = () => {
    setLoading(true);
    loadData().then(applyData);
  };

  useEffect(() => {
    mountedRef.current = true;
    loadData().then(applyData);
    const apiInterval = setInterval(() => loadData().then(applyData), 10000);

    // Admin assigns leads from another tab: pick that up instantly.
    const onStorage = (e) => {
      if (
        !e.key ||
        e.key === ASSIGNMENTS_STORAGE_KEY ||
        e.key === TIMELINE_STORAGE_KEY
      ) {
        setLocalVersion((v) => v + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    const localInterval = setInterval(() => setLocalVersion((v) => v + 1), 2000);

    return () => {
      mountedRef.current = false;
      clearInterval(apiInterval);
      clearInterval(localInterval);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadData, applyData]);

  // Today's kilometres for the header cards (kept live every minute).
  useEffect(() => {
    if (!myId) return undefined;
    let cancelled = false;
    const run = () =>
      loadTravelDays(myId, [localISO()])
        .then((rows) => {
          if (!cancelled) setTodayKm(rows[0]?.failed ? null : rows[0]?.km ?? 0);
        })
        .catch(() => {});
    run();
    const t = setInterval(run, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [myId]);

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  // Only leads assigned to the logged-in executive.
  const leads = useMemo(() => {
    void localVersion;
    return mergeLeads(rawLeads).filter((l) =>
      myId ? Number(l.assigned_to_id) === myId : !!l.assigned_to_id,
    );
  }, [rawLeads, localVersion, myId]);

  const myTasks = useMemo(
    () =>
      tasks.filter(
        (t) => myId && taskAssigneeId(t) === myId && t.is_active !== false,
      ),
    [tasks, myId],
  );
  const openTasks = useMemo(() => myTasks.filter((t) => !isTaskClosed(t)), [myTasks]);

  const followUps = useMemo(() => {
    void localVersion;
    return getDueFollowUps(leads);
  }, [leads, localVersion]);

  /* ---------------- notifications ---------------- */

  const store = useNotificationStore(myId || "anon");
  const ready = loadedOnce && Boolean(myId);

  const notifications = useMemo(() => {
    void localVersion;
    return buildNotifications({ leads, tasks: myTasks, followUps }).map((n) => ({
      ...n,
      unread: !store.read.has(n.id),
    }));
  }, [leads, myTasks, followUps, store.read, localVersion]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const commitBaseline = useEffectEvent(() =>
    store.baseline(notifications.map((n) => n.id)),
  );
  useEffect(() => {
    if (!ready || store.baselined) return undefined;
    const t = setTimeout(() => commitBaseline(), 0);
    return () => clearTimeout(t);
  }, [ready, store.baselined]);

  const pendingToasts =
    ready && store.baselined
      ? notifications.filter((n) => !store.announced.has(n.id)).slice(0, 3)
      : [];
  const pendingKey = pendingToasts.map((n) => n.id).join("|");

  const fireBrowserAlerts = useEffectEvent(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    pendingToasts.forEach((n) => {
      if (firedRef.current.has(n.id)) return;
      firedRef.current.add(n.id);
      try {
        new Notification(n.title, { body: n.detail });
      } catch {
        /* some browsers block constructor use */
      }
    });
  });
  const finishToasts = useEffectEvent(() =>
    store.markAnnounced(pendingToasts.map((n) => n.id)),
  );
  useEffect(() => {
    if (!pendingKey) return undefined;
    fireBrowserAlerts();
    const t = setTimeout(() => finishToasts(), 7000);
    return () => clearTimeout(t);
  }, [pendingKey]);

  const openNotification = (n) => {
    store.markSeen([n.id]);
    if (n.type === "task") {
      setTab("tasks");
    } else {
      setSelectedId(n.ref);
      setTab("pipeline");
    }
  };

  const enableBrowserAlerts = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((p) => setAlertPerm(p));
  };

  /* ---------------- pipeline logic (unchanged behaviour) ---------------- */

  const selectedLead = useMemo(() => {
    if (leads.length === 0) return null;
    return leads.find((l) => String(l.id) === String(selectedId)) || leads[0];
  }, [leads, selectedId]);

  const refreshLocal = () => setLocalVersion((v) => v + 1);

  const handleAcceptLead = () => {
    if (!selectedLead) return;
    const saved = getSavedAssignments();
    saved[selectedLead.id] = {
      ...(saved[selectedLead.id] || {}),
      assigned_to_id: selectedLead.assigned_to_id,
      api_at_assign: saved[selectedLead.id]?.api_at_assign ?? selectedLead.api_assigned_id,
      stage: "CONTACT_ATTEMPTED",
      accepted: true,
    };
    saveAssignments(saved);

    saveTimelineEvent(selectedLead.id, {
      title: "Lead Acknowledged & Accepted",
      detail: "Sales Representative accepted lead assignment and started outreach.",
      author: myName,
      stage: "CONTACT_ATTEMPTED",
      type: "accept",
    });

    refreshLocal();
    setMessage({ type: "success", text: "Lead accepted! Outreach is now marked in progress." });
  };

  const handleStageChange = (newStage) => {
    if (!selectedLead || newStage === selectedLead.stage) return;
    const stageName = getStageById(newStage).name;

    const saved = getSavedAssignments();
    saved[selectedLead.id] = {
      ...(saved[selectedLead.id] || {}),
      assigned_to_id: selectedLead.assigned_to_id,
      api_at_assign: saved[selectedLead.id]?.api_at_assign ?? selectedLead.api_assigned_id,
      stage: newStage,
      accepted:
        newStage === "FRESH_LEAD" || newStage === "ASSIGNED"
          ? Boolean(selectedLead.accepted)
          : true,
    };
    saveAssignments(saved);

    saveTimelineEvent(selectedLead.id, {
      title: `Milestone Advanced: ${stageName}`,
      detail: `Pipeline moved to ${stageName}`,
      author: myName,
      stage: newStage,
      type: "milestone",
    });

    refreshLocal();
    setMessage({ type: "success", text: `Status updated to ${stageName}!` });
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    const remark = callRemark.trim();
    if (!remark || !selectedLead) return;

    // The note is saved under the phase the lead is in RIGHT NOW.
    saveTimelineEvent(selectedLead.id, {
      title: "Sales Outreach / Site Note",
      detail: newFollowUpDate ? `${remark} (Next action: ${newFollowUpDate})` : remark,
      author: myName,
      stage: selectedLead.stage || "FRESH_LEAD",
      type: "note",
      nextAction: newFollowUpDate || undefined,
    });

    setCallRemark("");
    setNewFollowUpDate("");
    refreshLocal();
    setMessage({ type: "success", text: "Activity logged into tracking timeline!" });
  };

  const eventsByStage = useMemo(() => {
    void localVersion;
    return groupEventsByStage(getLeadEvents(selectedLead?.id));
  }, [selectedLead?.id, localVersion]);

  const currentStageIndex = useMemo(() => {
    if (!selectedLead) return 0;
    const idx = PIPELINE_STAGES.findIndex((s) => s.id === (selectedLead.stage || "FRESH_LEAD"));
    return idx >= 0 ? idx : 0;
  }, [selectedLead]);

  const isAssignedPendingAcceptance = needsAcceptance(selectedLead);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        (stageFilter === "ALL" || (l.stage || "FRESH_LEAD") === stageFilter) &&
        (getLeadName(l).toLowerCase().includes(q) ||
          String(getLeadPhone(l)).toLowerCase().includes(q) ||
          getLeadCode(l).toLowerCase().includes(q)),
    );
  }, [leads, searchQuery, stageFilter]);

  const pendingAcceptCount = leads.filter(needsAcceptance).length;
  const progressPct = Math.round(((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100);

  const kpis = [
    { label: "Assigned leads", value: leads.length, icon: Briefcase, go: "pipeline" },
    { label: "Awaiting acceptance", value: pendingAcceptCount, icon: Hourglass, go: "pipeline", hot: pendingAcceptCount > 0 },
    { label: "Open tasks", value: openTasks.length, icon: ClipboardList, go: "tasks", hot: openTasks.length > 0 },
    { label: "Follow-ups due", value: followUps.length, icon: CalendarClock, go: "pipeline", hot: followUps.length > 0 },
    { label: "Km today", value: todayKm === null ? "—" : todayKm.toFixed(1), icon: Route, go: "travel" },
  ];

  const tabs = [
    { id: "pipeline", label: "My Pipeline", icon: LayoutDashboard, count: leads.length },
    { id: "tasks", label: "My Tasks", icon: ClipboardList, count: openTasks.length },
    { id: "travel", label: "Travel & Km", icon: Route },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f9] pb-20 font-sans text-zinc-900">
      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-800 bg-black px-4 py-3 shadow-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#DF173C]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#DF173C]">
              GUIDEX ELEVATOR
            </span>
          </div>
          <span className="hidden text-neutral-600 sm:inline">|</span>
          <span className="hidden text-xs font-bold text-neutral-300 sm:inline">
            Sales Executive Portal
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell
            items={notifications}
            unreadCount={unreadCount}
            onOpenItem={openNotification}
            onMarkAllRead={() => store.markSeen(notifications.map((n) => n.id))}
            canBrowserAlert={alertPerm === "default"}
            onEnableBrowserAlerts={enableBrowserAlerts}
          />

          <div className="hidden items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900 py-1 pl-1 pr-3.5 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#DF173C] to-[#8f0f27] text-[11px] font-black text-white">
              {initials(myName)}
            </span>
            <span className="leading-tight">
              <span className="block max-w-[150px] truncate text-xs font-black text-white">
                {myName}
              </span>
              <span className="block max-w-[150px] truncate text-[10px] font-semibold text-neutral-400">
                {roleLabel}
              </span>
            </span>
          </div>

          <button
            onClick={handleSync}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs font-bold text-neutral-300 transition hover:text-white cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-[#DF173C]" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#DF173C] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#c91435] cursor-pointer"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <ToastStack
        toasts={pendingToasts}
        onOpen={(n) => openNotification(n)}
        onClose={(n) => store.markAnnounced([n.id])}
      />

      <div className="mx-auto max-w-[1680px] space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        {/* ---------- hero ---------- */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-[#1a0509] to-[#5a0a1c] p-6 text-white shadow-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#DF173C]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#DF173C]/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DF173C] to-[#8f0f27] text-xl font-black shadow-lg ring-4 ring-white/10">
                {initials(myName)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-red-200/70">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                  {greeting()}, {firstName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/90">
                    {roleLabel}
                  </span>
                  {me?.email && (
                    <span className="max-w-[240px] truncate rounded-full bg-white/10 px-2.5 py-1 text-white/70">
                      {me.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="max-w-sm text-xs leading-relaxed text-white/60">
              {pendingAcceptCount > 0 || openTasks.length > 0 || followUps.length > 0
                ? `You have ${pendingAcceptCount} lead${pendingAcceptCount === 1 ? "" : "s"} to accept, ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} and ${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} due.`
                : "You're all caught up. New leads and tasks from the admin will appear here instantly."}
            </p>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map(({ label, value, icon: Icon, go, hot }) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(go)}
                className={`rounded-2xl border p-4 text-left backdrop-blur transition hover:bg-white/15 cursor-pointer ${
                  hot ? "border-[#DF173C]/60 bg-[#DF173C]/15" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between text-white/60">
                  <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
                  <Icon size={14} />
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
              </button>
            ))}
          </div>
        </section>

        {message && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 shadow-xs">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* ---------- tabs ---------- */}
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xs">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer ${
                tab === id
                  ? "bg-black text-white shadow-md"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon size={14} className={tab === id ? "text-[#DF173C]" : ""} />
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    tab === id ? "bg-[#DF173C] text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {tab === "tasks" && (
          <TasksPanel tasks={myTasks} loaded={tasksState.loaded} error={tasksState.error} />
        )}

        {tab === "travel" && <TravelPanel empId={myId} />}

        {tab === "pipeline" && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* lead list */}
            <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs lg:col-span-5 lg:h-[820px]">
              <div className="space-y-2 border-b border-zinc-100 p-3.5">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search my assigned leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-xs font-medium focus:border-[#DF173C] focus:outline-none"
                  />
                </div>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 focus:border-[#DF173C] focus:outline-none"
                >
                  <option value="ALL">All stages</option>
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 space-y-1 divide-y divide-zinc-100 overflow-y-auto p-2">
                {filteredLeads.length === 0 ? (
                  <div className="py-20 text-center text-zinc-400">
                    <Users size={32} className="mx-auto mb-2 text-zinc-300" />
                    <p className="text-xs font-bold text-zinc-700">
                      {leads.length === 0 ? "No Assigned Leads Yet" : "No leads match your filters"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {leads.length === 0
                        ? "Leads assigned to you by the Admin will appear here instantly."
                        : "Try clearing the search or stage filter."}
                    </p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    const currentStageObj = getStageById(lead.stage || "FRESH_LEAD");
                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedId(String(lead.id))}
                        className={`cursor-pointer rounded-xl p-3.5 transition-all ${
                          isSelected
                            ? "border-2 border-[#DF173C] bg-[#DF173C]/10"
                            : "border border-transparent hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono font-bold uppercase text-zinc-400">
                              {getLeadCode(lead)}
                            </span>
                            <h4 className="truncate text-xs font-black text-zinc-950">
                              {getLeadName(lead)}
                            </h4>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {needsAcceptance(lead) && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700">
                                New
                              </span>
                            )}
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-700">
                              {currentStageObj.name}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                          <Phone size={11} className="shrink-0" />
                          <span className="truncate">{getLeadPhone(lead)}</span>
                          <span>•</span>
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{getLeadLocation(lead)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* lead detail */}
            <div className="space-y-4 lg:col-span-7">
              {selectedLead ? (
                <>
                  {isAssignedPendingAcceptance && (
                    <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                          <ShieldAlert size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-950">
                            Acceptance Pending for {getLeadName(selectedLead)}
                          </h4>
                          <p className="text-[11px] text-zinc-500">
                            Click accept to acknowledge assignment and start milestone tracking.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAcceptLead}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-emerald-700 cursor-pointer"
                      >
                        <PlayCircle size={14} />
                        <span>Accept Lead &amp; Start Contact</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
                    <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                          {getLeadCode(selectedLead)}
                        </span>
                        <h2 className="mt-0.5 truncate text-xl font-black text-zinc-950">
                          {getLeadName(selectedLead)}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <Phone size={12} className="text-[#DF173C]" />
                          <span>{getLeadPhone(selectedLead)}</span>
                          <span>•</span>
                          <MapPin size={12} className="text-[#DF173C]" />
                          <span>{getLeadLocation(selectedLead)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/sales/proposals?lead_id=${selectedLead.id}`)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 shadow-xs transition hover:bg-zinc-50 cursor-pointer"
                      >
                        <Edit3 size={13} className="text-[#DF173C]" />
                        <span>Open Proposal</span>
                      </button>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        <span>Deal progress</span>
                        <span className="text-zinc-600">{progressPct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#DF173C] to-emerald-500 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                      <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">
                        Update Stage
                      </label>
                      <select
                        value={selectedLead.stage || "FRESH_LEAD"}
                        onChange={(e) => handleStageChange(e.target.value)}
                        className="w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-2 text-xs font-bold text-zinc-800 focus:outline-none"
                      >
                        {PIPELINE_STAGES.map((st, i) => (
                          <option key={st.id} value={st.id}>
                            {i + 1}. {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-950">
                      <MessageSquare size={14} className="text-[#DF173C]" />
                      <span>Log Call Result / Milestone Update</span>
                    </h3>

                    <form onSubmit={handleAddActivity} className="space-y-3">
                      <textarea
                        rows={2}
                        value={callRemark}
                        onChange={(e) => setCallRemark(e.target.value)}
                        placeholder="Type call outcome, customer response, or site inspection feedback..."
                        className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs focus:border-[#DF173C] focus:outline-none"
                      />

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-zinc-600">Next Action Scheduled:</span>
                          <input
                            type="date"
                            value={newFollowUpDate}
                            onChange={(e) => setNewFollowUpDate(e.target.value)}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 font-mono text-xs font-bold"
                          />
                        </div>

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#DF173C] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#c91435] cursor-pointer"
                        >
                          <Send size={13} />
                          <span>Add To Timeline</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-black text-zinc-950">
                          <span>Lead Tracking Progress</span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                            Active Status
                          </span>
                        </h3>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Lifecycle tracking for {getLeadName(selectedLead)}.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-zinc-500">
                        Step {currentStageIndex + 1} of {PIPELINE_STAGES.length}
                      </span>
                    </div>

                    <div className="relative space-y-6 pl-6">
                      <div className="absolute bottom-3 left-[35px] top-3 -z-0 w-[2.5px] bg-zinc-200" />

                      {PIPELINE_STAGES.map((stage, idx) => {
                        const isCompleted = idx < currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        const stageEvents = eventsByStage[stage.id] || [];

                        return (
                          <div key={stage.id} className="relative flex items-start gap-4">
                            <div className="relative z-10 shrink-0">
                              {isCompleted ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                                  <Check size={13} strokeWidth={3} />
                                </div>
                              ) : isCurrent ? (
                                <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-emerald-100">
                                  <Circle size={8} fill="white" />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-300 bg-white" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex items-baseline justify-between gap-2">
                                <h4
                                  className={`text-xs font-black ${isCompleted || isCurrent ? "text-zinc-950" : "text-zinc-400"}`}
                                >
                                  {stage.name}
                                </h4>
                                {isCurrent && (
                                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800">
                                    Current Stage
                                  </span>
                                )}
                              </div>
                              <p
                                className={`mt-0.5 text-[11px] ${isCompleted || isCurrent ? "text-zinc-600" : "text-zinc-400"}`}
                              >
                                {stage.desc}
                              </p>

                              {stageEvents.length > 0 && (
                                <div className="mt-3 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
                                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                                    Activity &amp; Call Records:
                                  </span>
                                  {stageEvents.map((ev, evIdx) => (
                                    <div
                                      key={`${ev.timestamp}-${evIdx}`}
                                      className="min-w-0 border-l-2 border-emerald-500 py-0.5 pl-2.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold leading-tight text-zinc-900">
                                          {ev.title}
                                        </p>
                                        {ev.author && (
                                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold text-[#DF173C]">
                                            {ev.author}
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-zinc-600 [overflow-wrap:anywhere]">
                                        {ev.detail}
                                      </p>
                                      <span className="mt-0.5 block font-mono text-[9px] text-zinc-400">
                                        {new Date(ev.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-400">
                  <Users size={32} className="mx-auto mb-2 text-zinc-300" />
                  <p className="text-xs font-bold text-zinc-700">No Assigned Lead Selected</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Select an account from your assigned queue to track progress.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;
