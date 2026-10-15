import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  CreditCard,
  Truck,
  Wrench,
  ShieldCheck,
  Search,
  RefreshCw,
  ArrowUpRight,
  MoreVertical,
  MapPin,
  Phone,
  Building2,
  Plus,
  Filter,
  LayoutGrid,
  List,
  Map as MapIcon,
  Package,
  FileText,
  IndianRupee,
  Layers,
  Check,
  Compass,
  Eye,
  X,
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

// Map auto-resize invalidator
const MapResizeFix = () => {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 100);
    const t2 = setTimeout(fix, 400);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", fix);
    };
  }, [map]);
  return null;
};

// 5 core operational stages
const DEPARTMENTS = [
  {
    id: "SALES",
    name: "1. Sales Desk",
    subtext: "New enquiries & proposals",
    icon: TrendingUp,
    accent: "text-blue-600 bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    footerAction: "+ Add New Lead",
    emptyIllustration: "sales",
  },
  {
    id: "FINANCE",
    name: "2. Finance Clearance",
    subtext: "Payment & approval process",
    icon: CreditCard,
    accent: "text-amber-600 bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-800",
    footerAction: "+ Add Finance Lead",
    emptyIllustration: "finance",
  },
  {
    id: "OPERATIONS",
    name: "3. Shaft & Dimensions",
    subtext: "Technical survey & drawings",
    icon: Truck,
    accent: "text-purple-600 bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800",
    footerAction: "+ Add Order",
    emptyIllustration: "blueprint",
  },
  {
    id: "INSTALLATION",
    name: "4. Site Installation",
    subtext: "On-site erection & progress",
    icon: Wrench,
    accent: "text-rose-600 bg-rose-50 border-rose-200",
    badgeColor: "bg-rose-100 text-rose-800",
    footerAction: "+ Add Order",
    emptyIllustration: "crane",
  },
  {
    id: "SERVICE",
    name: "5. Commissioning",
    subtext: "Testing, handover & AMC",
    icon: ShieldCheck,
    accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-800",
    footerAction: "+ Add Commissioning",
    emptyIllustration: "certified",
  },
];

const getLeadName = (lead) =>
  lead?.lead_name ||
  lead?.client_name ||
  lead?.customer_name ||
  lead?.name ||
  `Lead #${lead?.id}`;

const getLeadPhone = (lead) =>
  lead?.lead_number ||
  lead?.contact_number ||
  lead?.phone_number ||
  lead?.mobile ||
  lead?.phone ||
  "";

const getLeadLocation = (lead) =>
  lead?.site_location ||
  lead?.location ||
  lead?.address ||
  lead?.city ||
  "Kalinga Nagar, Bhubaneswar";

const getLeadCode = (lead) =>
  lead?.lead_code ||
  (lead?.id
    ? `LEAD-2026-${String(lead.id).padStart(4, "0")}`
    : "LEAD-2026-N/A");

const CrmDepartmentTracker = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("board"); // 'board' | 'list' | 'map'
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Fetch real leads from PostgreSQL
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}crm/leads`, authHeaders());
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load department tracker data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Advance lead stage
  const advanceDepartment = async (lead, targetDept) => {
    setUpdatingId(lead.id);
    try {
      await axios.patch(
        `${API_URL}crm/leads/${lead.id}`,
        { current_department: targetDept },
        authHeaders(),
      );
      await fetchLeads();
    } catch {
      try {
        await axios.post(
          `${API_URL}crm/leads/${lead.id}/handoff/${targetDept.toLowerCase()}`,
          {},
          authHeaders(),
        );
        await fetchLeads();
      } catch (err) {
        console.error("Stage transition failed:", err);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const getLeadsForDept = (deptId) => {
    return leads.filter((l) => {
      const current = (l.current_department || "SALES").toUpperCase();
      const matchDept =
        current === deptId ||
        (deptId === "SERVICE" &&
          (current === "COMPLETED" || current === "COMMISSIONING")) ||
        (deptId === "OPERATIONS" &&
          (current === "DISPATCH" || current === "SHAFT"));

      const q = searchQuery.toLowerCase();
      const name = getLeadName(l).toLowerCase();
      const phone = getLeadPhone(l).toLowerCase();
      const code = (l.lead_code || "").toLowerCase();
      const loc = getLeadLocation(l).toLowerCase();
      return (
        matchDept &&
        (name.includes(q) ||
          phone.includes(q) ||
          code.includes(q) ||
          loc.includes(q))
      );
    });
  };

  // KPI Calculations
  const totalContractBook = useMemo(() => {
    return leads.reduce(
      (acc, l) => acc + (Number(l.deal_value || l.estimated_value) || 0),
      0,
    );
  }, [leads]);

  const inFinanceCount = useMemo(() => {
    return leads.filter(
      (l) => (l.current_department || "").toUpperCase() === "FINANCE",
    ).length;
  }, [leads]);

  const amcCertifiedCount = useMemo(() => {
    return leads.filter((l) =>
      ["SERVICE", "COMPLETED", "COMMISSIONING"].includes(
        (l.current_department || "").toUpperCase(),
      ),
    ).length;
  }, [leads]);

  // Display columns based on selection
  const activeColumns = useMemo(() => {
    if (departmentFilter === "ALL") return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => d.id === departmentFilter);
  }, [departmentFilter]);

  // Global search filtering for list and map views
  const allFilteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const name = getLeadName(l).toLowerCase();
      const phone = getLeadPhone(l).toLowerCase();
      const code = (l.lead_code || "").toLowerCase();
      const loc = getLeadLocation(l).toLowerCase();
      const dept = (l.current_department || "SALES").toUpperCase();
      const matchesSearch =
        name.includes(q) ||
        phone.includes(q) ||
        code.includes(q) ||
        loc.includes(q);
      const matchesDept =
        departmentFilter === "ALL" ||
        dept === departmentFilter ||
        (departmentFilter === "SERVICE" && dept === "COMPLETED");
      return matchesSearch && matchesDept;
    });
  }, [leads, searchQuery, departmentFilter]);

  return (
    <div className="min-h-full w-full bg-[#f8f9fa] text-zinc-900 pb-20 font-sans overflow-x-hidden">
      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-5 lg:px-7 pt-3 space-y-4">
        {/* ========================================================= */}
        {/* TOP SUB-HEADER: TITLE, BREADCRUMB & SYNC BUTTONS          */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="h-2 w-2 rounded-full bg-[#DF173C]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DF173C]">
                GUIDEX PIPELINE ENGINE
              </span>
              <span className="text-zinc-300">•</span>
              <span className="text-xs font-semibold text-zinc-500">
                5-Stage Clearances
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-zinc-950 truncate">
              Logistical Department{" "}
              <span className="text-[#DF173C]">Tracker</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 max-w-3xl">
              Real-time elevator lifecycle board tracking orders from survey
              proposals through factory dispatch, on-site erection, and warranty
              handoff.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => navigate("/admin/crm/leads")}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 transition cursor-pointer"
            >
              <span>Lead Inspector</span>
              <ArrowUpRight size={14} className="text-zinc-400" />
            </button>

            <button
              onClick={fetchLeads}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DF173C] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:bg-[#c91435] transition cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={loading ? "animate-spin text-white" : ""}
              />
              <span>Sync Orders</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4 EXECUTIVE KPI CARDS (RESPONSIVE GRID)                   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: ACTIVE ORDERS */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Package size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  ACTIVE ORDERS
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 mt-0.5 leading-none">
                  {leads.length}
                </h3>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-end gap-0.5 h-5">
                <span className="w-1 bg-blue-200 rounded-t h-2" />
                <span className="w-1 bg-blue-300 rounded-t h-3.5" />
                <span className="w-1 bg-blue-400 rounded-t h-4.5" />
                <span className="w-1 bg-blue-600 rounded-t h-5" />
              </div>
              <span className="inline-flex items-center text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                All Stages →
              </span>
            </div>
          </div>

          {/* Card 2: TOTAL CONTRACT BOOK */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  CONTRACT BOOK
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 leading-none truncate">
                  ₹{totalContractBook.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-end gap-0.5 h-5">
                <span className="w-1 bg-emerald-200 rounded-t h-2" />
                <span className="w-1 bg-emerald-300 rounded-t h-3" />
                <span className="w-1 bg-emerald-400 rounded-t h-4" />
                <span className="w-1 bg-emerald-600 rounded-t h-5" />
              </div>
              <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Live Value
              </span>
            </div>
          </div>

          {/* Card 3: IN FINANCE APPROVAL */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <IndianRupee size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  IN FINANCE
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 mt-0.5 leading-none">
                  {inFinanceCount}
                </h3>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-end gap-0.5 h-5">
                <span className="w-1 bg-amber-200 rounded-t h-2" />
                <span className="w-1 bg-amber-300 rounded-t h-3.5" />
                <span className="w-1 bg-amber-400 rounded-t h-5" />
                <span className="w-1 bg-amber-600 rounded-t h-3" />
              </div>
              <span className="inline-flex items-center text-[9px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                Advance Token
              </span>
            </div>
          </div>

          {/* Card 4: AMC CERTIFIED */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  AMC CERTIFIED
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 mt-0.5 leading-none">
                  {amcCertifiedCount}
                </h3>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-end gap-0.5 h-5">
                <span className="w-1 bg-teal-200 rounded-t h-2" />
                <span className="w-1 bg-teal-300 rounded-t h-3" />
                <span className="w-1 bg-teal-500 rounded-t h-4" />
                <span className="w-1 bg-teal-600 rounded-t h-5" />
              </div>
              <span className="inline-flex items-center text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                Commissioned
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEARCH & VIEW SWITCHER TOOLBAR (BOARD / LIST / MAP)       */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
          {/* Search Capsule */}
          <div className="relative flex-1 max-w-md w-full">
            <Search
              size={15}
              className="absolute left-3.5 top-3 text-zinc-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, code, or city..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200/90 bg-white text-xs font-medium placeholder:text-zinc-400 focus:outline-none focus:border-[#DF173C] shadow-2xs"
            />
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Pills (Figma design specification: image_3f4b9d.png) */}
            <div className="inline-flex items-center rounded-xl border border-zinc-200/90 bg-white p-1 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "board"
                    ? "bg-rose-50 text-[#DF173C] font-extrabold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <LayoutGrid size={14} />
                <span>Board View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-rose-50 text-[#DF173C] font-extrabold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <List size={14} />
                <span>List View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "map"
                    ? "bg-rose-50 text-[#DF173C] font-extrabold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <MapIcon size={14} />
                <span>Map View</span>
              </button>
            </div>

            {/* Department Dropdown Filter */}
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="appearance-none inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white pl-7 pr-8 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="SALES">1. Sales Desk</option>
                <option value="FINANCE">2. Finance Clearance</option>
                <option value="OPERATIONS">3. Shaft & Dimensions</option>
                <option value="INSTALLATION">4. Site Installation</option>
                <option value="SERVICE">5. Commissioning</option>
              </select>
              <Filter
                size={12}
                className="absolute left-2.5 top-2.5 text-zinc-400 pointer-events-none"
              />
            </div>

            {departmentFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setDepartmentFilter("ALL")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DF173C] bg-rose-50 px-2 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW MODE 1: ADAPTIVE 5-COLUMN KANBAN BOARD               */}
        {/* ========================================================= */}
        {viewMode === "board" && (
          <div className="w-full">
            {/* Scrollable Track that smoothly accommodates all 5 columns */}
            <div className="flex 2xl:grid 2xl:grid-cols-5 gap-3.5 overflow-x-auto pb-4 pt-1 w-full custom-scrollbar">
              {activeColumns.map((dept, colIdx) => {
                const deptLeads = getLeadsForDept(dept.id);
                const nextDept = DEPARTMENTS[colIdx + 1]?.id;
                const Icon = dept.icon;

                return (
                  <div
                    key={dept.id}
                    className="w-[285px] sm:w-[295px] 2xl:w-auto 2xl:min-w-0 shrink-0 2xl:shrink rounded-2xl border border-zinc-200/90 bg-[#f9fafb] shadow-xs flex flex-col overflow-hidden"
                  >
                    {/* Column Header */}
                    <div className="p-3 bg-white border-b border-zinc-200/80">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 ${dept.accent}`}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-black text-zinc-950 truncate">
                              {dept.name}
                            </h3>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {dept.subtext}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center shrink-0 ${dept.badgeColor}`}
                        >
                          {deptLeads.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div className="p-2 space-y-2.5 min-h-[500px] max-h-[680px] overflow-y-auto">
                      {deptLeads.length === 0 ? (
                        /* Architectural Empty State */
                        <div className="h-60 rounded-xl border border-dashed border-zinc-200 bg-white/60 flex flex-col items-center justify-center text-center p-4 space-y-2.5">
                          {dept.emptyIllustration === "blueprint" ? (
                            <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center">
                              <Layers size={28} strokeWidth={1.5} />
                            </div>
                          ) : dept.emptyIllustration === "crane" ? (
                            <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center">
                              <Wrench size={28} strokeWidth={1.5} />
                            </div>
                          ) : (
                            <div className="h-14 w-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                              <Compass size={28} strokeWidth={1.5} />
                            </div>
                          )}

                          <div>
                            <h4 className="text-xs font-black text-zinc-800">
                              No orders in this stage
                            </h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                              {dept.id === "OPERATIONS"
                                ? "Orders appear after finance clearance."
                                : dept.id === "INSTALLATION"
                                  ? "Orders appear after drawings approval."
                                  : "No orders pending."}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate("/admin/crm/leads")}
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2.5 py-1.5 text-[10px] font-bold transition cursor-pointer"
                          >
                            <Plus size={11} />
                            <span>Add Order</span>
                          </button>
                        </div>
                      ) : (
                        deptLeads.map((lead) => {
                          const isUpdating = updatingId === lead.id;
                          const hasDealValue =
                            Number(lead.deal_value || lead.estimated_value) > 0;
                          const leadCode = getLeadCode(lead);
                          const leadPhone = getLeadPhone(lead);
                          const leadLoc = getLeadLocation(lead);

                          return (
                            <div
                              key={lead.id}
                              className="group relative rounded-xl border border-zinc-200/90 bg-white p-3 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-mono font-bold text-zinc-400 uppercase tracking-wider text-[9px]">
                                  {leadCode}
                                </span>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(
                                        activeMenuId === lead.id
                                          ? null
                                          : lead.id,
                                      );
                                    }}
                                    className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition cursor-pointer"
                                  >
                                    <MoreVertical size={13} />
                                  </button>

                                  {activeMenuId === lead.id && (
                                    <div className="absolute right-0 top-5 z-20 w-36 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg text-xs font-bold text-zinc-700">
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/admin/crm/leads?lead_id=${lead.id}`,
                                          )
                                        }
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-50"
                                      >
                                        View Dossier
                                      </button>
                                      {leadPhone && (
                                        <a
                                          href={`tel:${leadPhone}`}
                                          className="block w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-50"
                                        >
                                          Call Contractor
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <h4 className="text-xs font-black text-zinc-950 mt-1 leading-snug truncate">
                                {getLeadName(lead)}
                              </h4>

                              <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
                                {leadPhone && (
                                  <p className="flex items-center gap-1.5 text-zinc-600 font-medium truncate">
                                    <Phone
                                      size={11}
                                      className="text-zinc-400 shrink-0"
                                    />
                                    <span className="truncate">
                                      {leadPhone}
                                    </span>
                                  </p>
                                )}
                                <p className="flex items-center gap-1.5 truncate">
                                  <MapPin
                                    size={11}
                                    className="text-[#DF173C] shrink-0"
                                  />
                                  <span className="truncate">{leadLoc}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-zinc-500">
                                  <Building2
                                    size={11}
                                    className="text-zinc-400 shrink-0"
                                  />
                                  <span>{lead.stops || "Standard"}</span>
                                </p>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between gap-1.5">
                                <div className="min-w-0">
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 block">
                                    DEAL
                                  </span>
                                  <span
                                    className={`text-[10px] font-black truncate block ${
                                      hasDealValue
                                        ? "text-emerald-600"
                                        : "text-zinc-700"
                                    }`}
                                  >
                                    {hasDealValue
                                      ? `₹${Number(
                                          lead.deal_value ||
                                            lead.estimated_value,
                                        ).toLocaleString("en-IN")}`
                                      : "Quote Ready"}
                                  </span>
                                </div>

                                {nextDept ? (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      advanceDepartment(lead, nextDept)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#DF173C] hover:bg-[#c91435] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                                  >
                                    {isUpdating ? (
                                      <RefreshCw
                                        size={10}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <span>Clear →</span>
                                    )}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg shrink-0">
                                    <Check size={10} className="stroke-[3]" />
                                    <span>AMC Active</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2 bg-white border-t border-zinc-200/80">
                      <button
                        type="button"
                        onClick={() => navigate("/admin/crm/leads")}
                        className="w-full py-1.5 rounded-xl border border-dashed border-zinc-300 text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>{dept.footerAction}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW MODE 2: HIGH-DENSITY LIST TABLE VIEW                 */}
        {/* ========================================================= */}
        {viewMode === "list" && (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tracking Code</th>
                    <th className="py-3 px-4">Contractor / Client</th>
                    <th className="py-3 px-4">Active Stage</th>
                    <th className="py-3 px-4">Site Location</th>
                    <th className="py-3 px-4">Stops</th>
                    <th className="py-3 px-4">Deal Value</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {allFilteredLeads.map((lead) => {
                    const currentStage = (
                      lead.current_department || "SALES"
                    ).toUpperCase();
                    const stageIdx = DEPARTMENTS.findIndex(
                      (d) => d.id === currentStage,
                    );
                    const nextDept = DEPARTMENTS[stageIdx + 1]?.id;

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-zinc-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-400 text-[11px]">
                          {getLeadCode(lead)}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-black text-zinc-900">
                            {getLeadName(lead)}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {getLeadPhone(lead) || "No phone"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-700">
                            {currentStage}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 truncate max-w-xs">
                          {getLeadLocation(lead)}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 font-bold">
                          {lead.stops || "Standard"}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                          {Number(lead.deal_value || 0) > 0
                            ? `₹${Number(lead.deal_value).toLocaleString(
                                "en-IN",
                              )}`
                            : "Quote Ready"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/admin/crm/leads?lead_id=${lead.id}`)
                              }
                              className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition"
                              title="Inspect lead"
                            >
                              <Eye size={15} />
                            </button>
                            {nextDept ? (
                              <button
                                type="button"
                                disabled={updatingId === lead.id}
                                onClick={() =>
                                  advanceDepartment(lead, nextDept)
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-[#DF173C] px-3 py-1 text-[10px] font-bold text-white hover:bg-[#c91435] transition"
                              >
                                <span>Advance →</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600">
                                AMC Active
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW MODE 3: SITE INSTALLATION MAP VIEW                   */}
        {/* ========================================================= */}
        {viewMode === "map" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-zinc-950">
                  Site Installation & AMC Geo-Radar
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Showing all active installation sites and certified AMC towers
                  across Odisha.
                </p>
              </div>

              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                ● {allFilteredLeads.length} Sites Synchronized
              </span>
            </div>

            <div className="relative isolate h-[480px] w-full overflow-hidden rounded-xl border border-zinc-200">
              <MapContainer
                center={[20.2961, 85.8245]}
                zoom={12}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <MapResizeFix />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Circle
                  center={[20.2961, 85.8245]}
                  radius={4500}
                  pathOptions={{
                    color: "#DF173C",
                    fillColor: "#DF173C",
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: "3, 6",
                  }}
                />

                <Marker position={[20.2961, 85.8245]}>
                  <Popup>Central Logistics Hub — Bhubaneswar</Popup>
                </Marker>

                {allFilteredLeads.map((lead, idx) => {
                  const baseLat = 20.2961 + ((idx % 5) - 2) * 0.025;
                  const baseLng = 85.8245 + (((idx + 1) % 4) - 1.5) * 0.025;

                  return (
                    <Marker key={lead.id} position={[baseLat, baseLng]}>
                      <Popup>
                        <div className="p-1 font-sans text-xs">
                          <strong className="text-zinc-950">
                            {getLeadName(lead)}
                          </strong>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Stage: {lead.current_department || "SALES"}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Location: {getLeadLocation(lead)}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/crm/leads?lead_id=${lead.id}`)
                            }
                            className="mt-1 text-[10px] font-bold text-[#DF173C] underline block"
                          >
                            Open Lead Details →
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmDepartmentTracker;
