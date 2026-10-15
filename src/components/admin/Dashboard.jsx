import axios from "axios";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Ticket,
  Wrench,
  Search,
  MapPin,
  CheckCircle2,
  Activity,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  RefreshCw,
  TrendingUp,
  FileText,
  UserCheck,
  ExternalLink,
  X,
  ArrowRight,
  Megaphone,
  QrCode,
  AlertTriangle,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAutoSync } from "../../hooks/useAutoSync";
import { isBlocked, markBlocked, isDenied } from "../../utils/apiAccess";
import L from "leaflet";

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const formatInr = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

const getEmployeeName = (u) =>
  [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
  u?.email ||
  (u?.id ? `Employee #${u.id}` : "Unassigned");


const formatTimeAgo = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Recently";
  const diffSec = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const MapResizeFix = () => {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 100);
    const t2 = setTimeout(fix, 500);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", fix);
    };
  }, [map]);
  return null;
};

const createSwiggyMarker = (emp) => {
  const isMoving =
    (emp.status || "").toLowerCase() === "on route" || Number(emp.speed) > 2;
  const initials = emp.name
    ? emp.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "EM";

  return L.divIcon({
    className: "swiggy-fleet-pin",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        ${
          isMoving
            ? `<div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(223, 23, 60, 0.25); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        <div style="
          position: relative; 
          width: 32px; 
          height: 32px; 
          border-radius: 9999px; 
          background: #09090b; 
          border: 2px solid ${isMoving ? "#DF173C" : "#10b981"}; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.35); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #ffffff; 
          font-weight: 800; 
          font-size: 11px;
        ">
          ${initials}
          <span style="
            position: absolute; 
            bottom: -2px; 
            right: -2px; 
            width: 8px; 
            height: 8px; 
            border-radius: 9999px; 
            background: ${isMoving ? "#DF173C" : "#10b981"}; 
            border: 1.5px solid #ffffff;
          "></span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=400&q=80",
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Real Database Entities
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [lifts, setLifts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Sales updates & CRM activity feed
  const [salesUpdates, setSalesUpdates] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [newsFilter, setNewsFilter] = useState("all");
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [isTickerPaused, setIsTickerPaused] = useState(false);

  const [loading, setLoading] = useState(true);
  const [leadsAll, setLeadsAll] = useState([]);
  const loadedRef = useRef(false);
  const [error, setError] = useState(null);

  // Live Workforce Telemetry State
  const [trackingAgents, setTrackingAgents] = useState([]);
  const historyTrails = useRef({});

  // Telemetry polling routine
  const fetchTelemetry = useCallback(async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API_URL}tracking/live`, authHeaders());
      } catch {
        res = await axios.get(`${API_URL}tracking`, authHeaders());
      }

      if (Array.isArray(res.data)) {
        const formatted = res.data
          .filter((item) => {
            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          })
          .map((item) => {
            const userId = item.user_id || item.id;
            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);
            const prevHistory = historyTrails.current[userId] || [];
            const newPos = [lat, lng];
            const updatedTrail = [...prevHistory.slice(-10), newPos];
            historyTrails.current[userId] = updatedTrail;

            return {
              ...item,
              user_id: userId,
              name:
                item.name ||
                [item.first_name, item.last_name].filter(Boolean).join(" ") ||
                `User #${userId}`,
              employee_code: item.employee_code || `EMP-${userId}`,
              latitude: lat,
              longitude: lng,
              speed: Number(item.speed) || 0,
              heading: Number(item.heading) || 0,
              status: item.status || "On Duty",
              current_destination: item.current_destination || "Assigned Site",
              trail: updatedTrail,
            };
          });

        setTrackingAgents(formatted);
      } else {
        setTrackingAgents([]);
      }
    } catch {
      // Retain existing state
    }
  }, []);

  // Fetch Live Sales Updates from CRM
  const fetchSalesUpdates = useCallback(async () => {
    try {
      const [leadsRes, actRes] = await Promise.allSettled([
        axios.get(`${API_URL}crm/leads`, authHeaders()),
        // The /crm/leads/activities route answers 422 on this backend, so it is skipped
        // (the dashboard already falls back to the latest leads below).
        Promise.resolve({ data: [] }),
      ]);

      const leads =
        leadsRes.status === "fulfilled" && Array.isArray(leadsRes.value?.data)
          ? leadsRes.value.data
          : [];

      setLeadsAll(leads);

      let updates = [];

      if (
        actRes.status === "fulfilled" &&
        Array.isArray(actRes.value?.data) &&
        actRes.value.data.length > 0
      ) {
        updates = actRes.value.data;
      } else if (leads.length > 0) {
        updates = [...leads]
          .sort(
            (a, b) =>
              new Date(b.updated_at || b.created_at || 0) -
              new Date(a.updated_at || a.created_at || 0),
          )
          .slice(0, 10)
          .map((lead, index) => {
            return {
              id: lead.id,
              lead_id: lead.id,
              headline_number: lead.id,
              actor_name: lead.assigned_to_name || "Sales Executive",
              client_name:
                lead.client_name ||
                lead.name ||
                lead.customer_name ||
                `Lead #${lead.id}`,
              phone: lead.phone || lead.mobile || "",
              action: lead.current_department
                ? `Department handoff moved to ${lead.current_department}`
                : `Lead stage updated to ${lead.stage || "Fresh Lead"}`,
              details:
                lead.site_location ||
                lead.location ||
                lead.city ||
                "Bhubaneswar, Odisha",
              deal_value: lead.deal_value || lead.estimated_value || 0,
              stops: lead.stops || "Standard",
              current_department: lead.current_department || "SALES",
              stage: lead.stage || "Fresh Lead",
              image: BUILDING_IMAGES[index % BUILDING_IMAGES.length],
              timestamp:
                lead.updated_at || lead.created_at || new Date().toISOString(),
            };
          });
      }

      setSalesUpdates(updates);
    } catch {
      // Retain existing stream
    }
  }, []);

  // Fetch Real Database Tables
  const fetchAll = useCallback(async () => {
    if (!loadedRef.current) setLoading(true);
    try {
      const [usersRes, liftsRes, ticketsRes, tasksRes, meRes] =
        await Promise.allSettled([
          axios.get(`${API_URL}users`, authHeaders()),
          axios.get(`${API_URL}lifts`, authHeaders()),
          axios.get(`${API_URL}tickets`, authHeaders()),
          isBlocked("tasks")
            ? Promise.resolve({ data: [] })
            : axios.get(`${API_URL}tasks`, authHeaders()),
          axios.get(`${API_URL}auth/me`, authHeaders()),
        ]);
      if (tasksRes.status === "rejected" && isDenied(tasksRes.reason)) {
        markBlocked("tasks");
      }
      setError(null);

      setEmployees(
        usersRes.status === "fulfilled" && Array.isArray(usersRes.value?.data)
          ? usersRes.value.data
          : [],
      );
      setLifts(
        liftsRes.status === "fulfilled" && Array.isArray(liftsRes.value?.data)
          ? liftsRes.value.data
          : [],
      );
      setTickets(
        ticketsRes.status === "fulfilled" &&
          Array.isArray(ticketsRes.value?.data)
          ? ticketsRes.value.data
          : [],
      );
      setTasks(
        tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value?.data)
          ? tasksRes.value.data
          : [],
      );

      if (meRes.status === "fulfilled" && meRes.value?.data) {
        setCurrentUser(meRes.value.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load dashboard data",
      );
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }, []);

  const { sync: syncAll, lastSync } = useAutoSync(fetchAll, 10000);

  useEffect(() => {
    fetchTelemetry();
    fetchSalesUpdates();

    const telemetryTimer = setInterval(fetchTelemetry, 5000);
    const salesTimer = setInterval(fetchSalesUpdates, 12000);

    return () => {
      clearInterval(telemetryTimer);
      clearInterval(salesTimer);
    };
  }, [fetchTelemetry, fetchSalesUpdates]);

  // Automatic NEWS LIVE ticker cycler
  useEffect(() => {
    if (salesUpdates.length <= 1 || isTickerPaused) return;
    const tickerInterval = setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % salesUpdates.length);
    }, 4500);
    return () => clearInterval(tickerInterval);
  }, [salesUpdates.length, isTickerPaused]);

  const lookupLiftLabel = useCallback(
    (liftId) => {
      const lift = lifts.find((l) => l.id === liftId);
      return lift
        ? `${lift.lift_code}${lift.building_name ? ` — ${lift.building_name}` : ""}`
        : `Lift #${liftId}`;
    },
    [lifts],
  );

  const lookupEmployeeName = useCallback(
    (empId) => {
      const emp = employees.find((e) => e.id === empId);
      return emp ? getEmployeeName(emp) : "Unassigned";
    },
    [employees],
  );

  // Real Metric Calculations & Dynamic Deltas
  const activeEmployeeCount = useMemo(
    () => employees.filter((e) => e.is_active).length,
    [employees],
  );

  const activeLiftCount = useMemo(
    () => lifts.filter((l) => l.is_active).length,
    [lifts],
  );

  const openTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          !["closed", "cancelled"].includes((t.status || "").toLowerCase()),
      ),
    [tickets],
  );

  const ongoingInstalls = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.category || "").toLowerCase() === "installation" &&
          !["completed", "cancelled"].includes((t.status || "").toLowerCase()),
      ),
    [tasks],
  );

  // Dynamic Delta Calculator vs. 30 Days Ago
  const calculateMonthDelta = useCallback((items) => {
    if (!items || items.length === 0) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastItems = items.filter(
      (item) => item.created_at && new Date(item.created_at) < thirtyDaysAgo,
    );
    if (pastItems.length === 0) return items.length > 0 ? 100 : 0;
    const change = ((items.length - pastItems.length) / pastItems.length) * 100;
    return Math.round(change);
  }, []);

  const employeeDelta = useMemo(
    () => calculateMonthDelta(employees),
    [employees, calculateMonthDelta],
  );
  const liftDelta = useMemo(
    () => calculateMonthDelta(lifts),
    [lifts, calculateMonthDelta],
  );
  const ticketDelta = useMemo(
    () => calculateMonthDelta(tickets),
    [tickets, calculateMonthDelta],
  );
  const installDelta = useMemo(
    () => calculateMonthDelta(ongoingInstalls),
    [ongoingInstalls, calculateMonthDelta],
  );

  // Real Tasks (Sorted by Recency)
  const realRecentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [tasks]);

  const money = useMemo(() => {
    const val = (l) => Number(l.deal_value || l.estimated_value) || 0;
    const stage = (l) => String(l.stage || "").toUpperCase();
    const won = leadsAll.filter((l) => stage(l) === "ORDER_WON");
    const open = leadsAll.filter(
      (l) => stage(l) !== "ORDER_WON" && stage(l) !== "ORDER_LOST",
    );
    const fin = leadsAll.filter(
      (l) => String(l.current_department || "").toUpperCase() === "FINANCE",
    );
    const sum = (a) => a.reduce((t, l) => t + val(l), 0);
    return {
      won: sum(won),
      wonCount: won.length,
      open: sum(open),
      openCount: open.length,
      fin: sum(fin),
      finCount: fin.length,
      total: sum(leadsAll),
    };
  }, [leadsAll]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/admin/lifts?search=${encodeURIComponent(q)}`);
  };

  const filteredSalesNews = useMemo(() => {
    if (newsFilter === "handoffs") {
      return salesUpdates.filter((item) =>
        (item.action || "").toLowerCase().includes("handoff"),
      );
    }
    if (newsFilter === "pipeline") {
      return salesUpdates.filter(
        (item) => !(item.action || "").toLowerCase().includes("handoff"),
      );
    }
    return salesUpdates;
  }, [salesUpdates, newsFilter]);

  const currentTickerItem =
    salesUpdates[activeNewsIndex] || salesUpdates[0] || null;

  const adminDisplayName = currentUser
    ? getEmployeeName(currentUser)
    : "System Administrator";

  return (
    <div className="min-h-full bg-[#f8f9fa] text-zinc-900 pb-12 font-sans">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-4">
        {/* ========================================== */}
        {/* TOP BAR / COMMAND CENTER HEADER           */}
        {/* ========================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
              Welcome back,{" "}
              <span className="font-bold text-zinc-800">
                {adminDisplayName}
              </span>{" "}
              👋
            </p>
            <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-zinc-950 mt-0.5">
              Operations <span className="text-[#DF173C]">Overview</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Monitor workforce, elevators, sales activity, and field
              operations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-700">
                Live
                {lastSync ? ` · ${lastSync.toLocaleTimeString("en-IN")}` : ""}
              </span>
            </div>

            <button
              onClick={() => {
                syncAll();
                fetchTelemetry();
                fetchSalesUpdates();
              }}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 transition cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={
                  loading ? "animate-spin text-[#DF173C]" : "text-zinc-500"
                }
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* 1. REAL CRIMSON NEWS LIVE TICKER CAPSULE  */}
        {/* ========================================== */}
        {currentTickerItem && (
          <div
            onMouseEnter={() => setIsTickerPaused(true)}
            onMouseLeave={() => setIsTickerPaused(false)}
            className="relative overflow-hidden rounded-2xl border border-red-100 bg-[#fff8f8] p-2.5 sm:px-4 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DF173C] px-3 py-1 shadow-sm shrink-0">
                <Megaphone size={13} className="text-white fill-white" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  NEWS LIVE
                </span>
              </div>

              <div
                onClick={() => setSelectedNews(currentTickerItem)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#DF173C] shrink-0" />
                <p className="truncate text-xs sm:text-[13px] font-bold text-zinc-800 group-hover:text-[#DF173C] transition-colors">
                  <span className="font-extrabold text-[#DF173C]">
                    {currentTickerItem.headline_number || activeNewsIndex + 1}
                    .{" "}
                  </span>
                  <span className="font-black text-zinc-950">
                    {currentTickerItem.client_name}:
                  </span>{" "}
                  <span className="font-semibold text-zinc-600">
                    {currentTickerItem.action}
                  </span>
                </p>

                {Number(currentTickerItem.deal_value) > 0 && (
                  <span className="hidden md:inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 shrink-0">
                    INR{" "}
                    {Number(currentTickerItem.deal_value).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                )}

                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#DF173C] shrink-0 group-hover:translate-x-0.5 transition-transform">
                  Details →
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setActiveNewsIndex((prev) =>
                    prev === 0 ? salesUpdates.length - 1 : prev - 1,
                  )
                }
                className="h-7 w-7 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveNewsIndex((prev) => (prev + 1) % salesUpdates.length)
                }
                className="h-7 w-7 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition flex items-center justify-center cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 2. REAL SEARCH BAR WITH SCAN LIFT BUTTON  */}
        {/* ========================================== */}
        <form
          onSubmit={handleSearch}
          className="relative rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 flex-1 px-2">
            <Search size={18} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lift code or building name..."
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#DF173C] px-6 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:bg-[#c91435] transition cursor-pointer"
          >
            <QrCode size={16} />
            <span>Scan Lift</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {error && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm shadow-sm">
            <div className="flex items-center gap-2.5 text-rose-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#DF173C] shadow-sm">
                <AlertTriangle size={17} />
              </div>
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={fetchAll}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* 3. 4-COLUMN REAL KPI CARDS WITH SVG WAVES */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Total Employees */}
          <div
            onClick={() => navigate("/admin/employees")}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users size={19} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    TOTAL EMPLOYEES
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-zinc-300 group-hover:text-zinc-600 transition"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-zinc-950">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-zinc-300" />
                  ) : (
                    employees.length
                  )}
                </h3>
                <span
                  className={`text-[11px] font-bold flex items-center ${employeeDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {employeeDelta >= 0
                    ? `↑ ${employeeDelta}%`
                    : `↓ ${Math.abs(employeeDelta)}%`}
                  <span className="text-zinc-400 font-normal ml-1">
                    vs. last month
                  </span>
                </span>
              </div>

              <div className="h-8 w-full my-2">
                <svg
                  viewBox="0 0 100 25"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 20 Q 25 24, 45 14 T 75 18 T 100 6"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 20 Q 25 24, 45 14 T 75 18 T 100 6 L 100 25 L 0 25 Z"
                    fill="url(#blueGradReal)"
                    opacity="0.15"
                  />
                  <defs>
                    <linearGradient
                      id="blueGradReal"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {activeEmployeeCount} Active Workforce
              </span>
              <span className="font-bold text-zinc-500 group-hover:text-blue-600 transition">
                View →
              </span>
            </div>
          </div>

          {/* Card 2: Total Lifts */}
          <div
            onClick={() => navigate("/admin/lifts")}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Building2 size={19} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    TOTAL LIFTS
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-zinc-300 group-hover:text-zinc-600 transition"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-zinc-950">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-zinc-300" />
                  ) : (
                    lifts.length
                  )}
                </h3>
                <span
                  className={`text-[11px] font-bold flex items-center ${liftDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {liftDelta >= 0
                    ? `↑ ${liftDelta}%`
                    : `↓ ${Math.abs(liftDelta)}%`}
                  <span className="text-zinc-400 font-normal ml-1">
                    vs. last month
                  </span>
                </span>
              </div>

              <div className="h-8 w-full my-2">
                <svg
                  viewBox="0 0 100 25"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 22 Q 30 20, 50 12 T 80 18 T 100 8"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 22 Q 30 20, 50 12 T 80 18 T 100 8 L 100 25 L 0 25 Z"
                    fill="url(#greenGradReal)"
                    opacity="0.15"
                  />
                  <defs>
                    <linearGradient
                      id="greenGradReal"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {activeLiftCount} Active Elevators
              </span>
              <span className="font-bold text-zinc-500 group-hover:text-emerald-600 transition">
                View →
              </span>
            </div>
          </div>

          {/* Card 3: Open Tickets */}
          <div
            onClick={() => navigate("/admin/tickets")}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#DF173C]" />
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#DF173C]">
                  <Ticket size={19} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    OPEN TICKETS
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-zinc-300 group-hover:text-zinc-600 transition"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-zinc-950">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-zinc-300" />
                  ) : (
                    openTickets.length
                  )}
                </h3>
                <span
                  className={`text-[11px] font-bold flex items-center ${ticketDelta <= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {ticketDelta > 0
                    ? `↑ ${ticketDelta}%`
                    : `↓ ${Math.abs(ticketDelta)}%`}
                  <span className="text-zinc-400 font-normal ml-1">
                    vs. last month
                  </span>
                </span>
              </div>

              <div className="h-8 w-full my-2">
                <svg
                  viewBox="0 0 100 25"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 18 Q 30 24, 55 15 T 85 10 T 100 4"
                    fill="none"
                    stroke="#DF173C"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 18 Q 30 24, 55 15 T 85 10 T 100 4 L 100 25 L 0 25 Z"
                    fill="url(#redGradReal)"
                    opacity="0.15"
                  />
                  <defs>
                    <linearGradient
                      id="redGradReal"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#DF173C" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 font-bold text-zinc-700">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                {openTickets.length === 0
                  ? "All Optimal"
                  : `${openTickets.length} Needs Attention`}
              </span>
              <span className="font-bold text-zinc-500 group-hover:text-[#DF173C] transition">
                View →
              </span>
            </div>
          </div>

          {/* Card 4: Ongoing Installs */}
          <div
            onClick={() => navigate("/admin/tasks")}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Wrench size={19} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    ONGOING INSTALLS
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-zinc-300 group-hover:text-zinc-600 transition"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-zinc-950">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-zinc-300" />
                  ) : (
                    ongoingInstalls.length
                  )}
                </h3>
                <span className="text-[11px] font-bold text-zinc-500 flex items-center">
                  {installDelta >= 0
                    ? `↑ ${installDelta}%`
                    : `↓ ${Math.abs(installDelta)}%`}
                  <span className="text-zinc-400 font-normal ml-1">
                    vs. last month
                  </span>
                </span>
              </div>

              <div className="h-8 w-full my-2">
                <svg
                  viewBox="0 0 100 25"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 16 Q 35 22, 60 18 T 85 20 T 100 12"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 16 Q 35 22, 60 18 T 85 20 T 100 12 L 100 25 L 0 25 Z"
                    fill="url(#amberGradReal)"
                    opacity="0.15"
                  />
                  <defs>
                    <linearGradient
                      id="amberGradReal"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {ongoingInstalls.length === 0
                  ? "No Backlogs"
                  : "Active Field Deployments"}
              </span>
              <span className="font-bold text-zinc-500 group-hover:text-amber-600 transition">
                View →
              </span>
            </div>
          </div>
        </div>

        {/* 3b. LIVE MONEY & FIELD PULSE */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-5 sm:p-6 shadow-xl shadow-zinc-900/10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#DF173C]/30 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                Live finance &amp; field pulse
              </p>
              <h3 className="text-lg font-black text-white">Money &amp; movement, in real time</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/km")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-amber-300 transition cursor-pointer"
            >
              <MapPin size={13} /> All employees KM <ArrowRight size={13} />
            </button>
          </div>
          <div className="relative grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ["Orders won", money.won, `${money.wonCount} confirmed`],
              ["Open pipeline", money.open, `${money.openCount} live deals`],
              ["Finance clearance", money.fin, `${money.finCount} awaiting`],
              ["Total contract book", money.total, `${leadsAll.length} leads`],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>
                <p className="mt-1.5 text-2xl font-black text-white tabular-nums">{formatInr(value)}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. REAL LATEST SALES UPDATES FROM DATABASE crm_leads                      */}
        {/* ========================================================================= */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DF173C] text-white shadow-sm">
                <Megaphone size={19} className="fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-[15px] font-black text-zinc-950">
                    Latest Sales Updates & Live News
                  </h2>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#DF173C]">
                    REAL-TIME FEED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Click any update card below to inspect full proposal details
                  or open in CRM.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setNewsFilter("all")}
                  className={`px-3 py-1 rounded-md transition ${
                    newsFilter === "all"
                      ? "bg-[#DF173C] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  All ({salesUpdates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilter("handoffs")}
                  className={`px-3 py-1 rounded-md transition ${
                    newsFilter === "handoffs"
                      ? "bg-[#DF173C] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  Handoffs
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilter("pipeline")}
                  className={`px-3 py-1 rounded-md transition ${
                    newsFilter === "pipeline"
                      ? "bg-[#DF173C] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  Stages
                </button>
              </div>

              <button
                onClick={() => navigate("/admin/crm/leads")}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#DF173C] hover:bg-rose-50 transition cursor-pointer"
              >
                Open CRM →
              </button>
            </div>
          </div>

          {filteredSalesNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
              <TrendingUp size={28} className="text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-700">
                No CRM Leads Found
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                New inquiries and stage promotions from sales reps will appear
                here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredSalesNews.slice(0, 4).map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedNews(item)}
                  className="group relative flex rounded-xl border border-zinc-200/80 bg-white p-3 hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer gap-3"
                >
                  <div className="h-20 w-16 rounded-lg overflow-hidden shrink-0 bg-zinc-100 border border-zinc-100">
                    <img
                      src={
                        item.image ||
                        BUILDING_IMAGES[idx % BUILDING_IMAGES.length]
                      }
                      alt="Site Building"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-extrabold text-zinc-900 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#DF173C]" />
                          {item.client_name}
                        </span>
                        <span className="text-zinc-400 font-medium flex items-center gap-0.5">
                          <Clock size={10} />
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-zinc-700 leading-tight line-clamp-2">
                        {item.action}
                      </p>

                      <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin size={10} className="shrink-0 text-zinc-400" />
                        {item.details}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-2 text-[10px]">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-black text-emerald-700">
                        INR{" "}
                        {Number(item.deal_value || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="font-bold text-[#DF173C] group-hover:translate-x-0.5 transition-transform">
                        Quick View →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 5. BOTTOM SPLIT: REAL-TIME TASKS vs REAL WORKFORCE RADAR MAP              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.1fr] gap-4 items-stretch">
          {/* Left: Real-Time Operations mapped strictly from PostgreSQL */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DF173C] text-white">
                    <Activity size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-zinc-950">
                        Real-Time Operations
                      </h2>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                        ● LIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Live tasks, assignments and service activity
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/admin/tasks")}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-950 transition"
                >
                  View All Tasks →
                </button>
              </div>

              {/* Tasks List */}
              <div className="divide-y divide-zinc-100">
                {realRecentTasks.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400">
                    <ShieldCheck
                      size={32}
                      className="mx-auto mb-2 text-emerald-500"
                    />
                    <p className="text-xs font-bold text-zinc-700">
                      All Operations Clear
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      No tasks currently scheduled.
                    </p>
                  </div>
                ) : (
                  realRecentTasks.map((t) => {
                    const statusStr = (t.status || "Pending").toLowerCase();
                    const isCompleted = statusStr === "completed";
                    const isInProgress = statusStr.includes("progress");

                    return (
                      <div
                        key={t.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-600"
                                : isInProgress
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={15} />
                            ) : isInProgress ? (
                              <Activity size={15} />
                            ) : (
                              <AlertTriangle size={15} />
                            )}
                          </div>
                          <div className="min-w-0 truncate">
                            <h4 className="text-xs font-extrabold text-zinc-900 truncate">
                              {t.title || t.task_number || `Task #${t.id}`}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {lookupLiftLabel(t.lift_id)} •{" "}
                              {lookupEmployeeName(t.assigned_to)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`rounded-md font-bold text-[10px] px-2.5 py-1 ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700"
                                : isInProgress
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {t.status || "Pending"}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                            <Clock size={11} />{" "}
                            {formatTimeAgo(t.created_at || t.due_date)}
                          </span>
                          <MoreHorizontal size={14} className="text-zinc-300" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Right: Real Workforce Telemetry & Radar Map */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DF173C] text-white">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-zinc-950">
                      Workforce Location
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Live tracking of technicians and field staff.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Tracking
                  <ChevronDown size={12} className="text-zinc-400" />
                </div>
              </div>

              {/* Map Container */}
              <div className="relative isolate h-[255px] w-full overflow-hidden rounded-xl border border-zinc-200">
                <MapContainer
                  center={[
                    trackingAgents[0]?.latitude || 20.2961,
                    trackingAgents[0]?.longitude || 85.8245,
                  ]}
                  zoom={12}
                  zoomControl={false}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <MapResizeFix />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Operational Radar Perimeter Circle */}
                  <Circle
                    center={[20.2961, 85.8245]}
                    radius={3500}
                    pathOptions={{
                      color: "#DF173C",
                      fillColor: "#DF173C",
                      fillOpacity: 0.12,
                      weight: 1.5,
                      dashArray: "3, 6",
                    }}
                  />

                  {/* Centered Hub Marker */}
                  <Marker position={[20.2961, 85.8245]}>
                    <Popup>Central Fleet Hub — Bhubaneswar</Popup>
                  </Marker>

                  {/* Active Technicians from Database */}
                  {trackingAgents.map((emp) => (
                    <Marker
                      key={emp.user_id}
                      position={[emp.latitude, emp.longitude]}
                      icon={createSwiggyMarker(emp)}
                    >
                      <Popup>
                        <div className="p-1 font-sans text-xs">
                          <strong>{emp.name}</strong>
                          <p className="text-[10px] text-zinc-500">
                            {emp.current_destination}
                          </p>
                          <span className="text-[9px] font-mono text-zinc-400">
                            Speed: {Math.round(emp.speed || 0)} km/h
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Status Legend Overlay */}
                <div className="absolute top-2.5 left-2.5 z-1000 bg-white/95 backdrop-blur-xs border border-zinc-200 rounded-lg p-2 text-[10px] font-bold space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-zinc-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    On Duty ({activeEmployeeCount})
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    In Transit (
                    {
                      trackingAgents.filter(
                        (a) =>
                          (a.status || "").toLowerCase().includes("route") ||
                          a.speed > 2,
                      ).length
                    }
                    )
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Off Duty (
                    {Math.max(0, employees.length - activeEmployeeCount)})
                  </div>
                </div>

                {/* Map Center City Label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-1000 pointer-events-none text-center">
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-zinc-200 px-3 py-1 text-[11px] font-black text-zinc-900 shadow-md">
                    <span className="h-2 w-2 rounded-full bg-[#DF173C]" />
                    Bhubaneswar Hub
                  </div>
                </div>
              </div>

              {/* Bottom Hub Card */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-zinc-200 overflow-hidden shrink-0">
                    <img
                      src={BUILDING_IMAGES[0]}
                      alt="Hub"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-zinc-900">
                        Central Fleet Network
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                        ● Active
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Bhubaneswar, Odisha
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/admin/fleet-radar")}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                >
                  View Details →
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* REAL DETAIL POPUP MODAL                                                   */}
        {/* ========================================================================= */}
        {selectedNews && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedNews(null)}
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#DF173C]">
                      Lead #{selectedNews.lead_id || selectedNews.id}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatTimeAgo(selectedNews.timestamp)}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-zinc-950 mt-1">
                    {selectedNews.client_name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNews(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Latest Action Taken
                </span>
                <p className="text-xs font-black text-zinc-900">
                  {selectedNews.action}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pt-1">
                  <UserCheck size={12} className="text-[#DF173C]" />
                  <span>
                    Logged by:{" "}
                    <strong>{selectedNews.actor_name || "Admin"}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Site Location
                  </span>
                  <p className="font-bold text-zinc-800 mt-0.5 truncate flex items-center gap-1">
                    <MapPin size={12} className="text-[#DF173C] shrink-0" />
                    {selectedNews.details}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Deal Value
                  </span>
                  <p className="font-black text-emerald-600 mt-0.5">
                    INR{" "}
                    {Number(selectedNews.deal_value || 0).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Elevator Stops
                  </span>
                  <p className="font-bold text-zinc-800 mt-0.5">
                    {selectedNews.stops}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Active Department
                  </span>
                  <p className="font-black text-[#DF173C] mt-0.5">
                    {selectedNews.current_department}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={`${API_URL}crm/leads/${selectedNews.lead_id || selectedNews.id}/proposal/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition"
                >
                  <FileText size={14} className="text-[#DF173C]" />
                  Download PDF
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const leadId = selectedNews.lead_id || selectedNews.id;
                    setSelectedNews(null);
                    navigate(`/admin/crm/leads?lead_id=${leadId}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#DF173C] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#c91435] transition cursor-pointer"
                >
                  <span>Open Full Lead Page</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
