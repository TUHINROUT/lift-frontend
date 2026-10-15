import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  RefreshCw,
  Share2,
  MapPin,
  Phone,
  Edit3,
  UserPlus,
  Check,
  Circle,
  User,
} from "lucide-react";
import {
  PIPELINE_STAGES,
  mergeLeads,
  assignLead,
  buildSalesStaff,
  getRepName,
  loadCrmData,
  isStaffDebug,
  API_URL,
  authHeaders,
  getLeadEvents,
  groupEventsByStage,
  getStageById,
  getLeadName,
  getLeadPhone,
  getLeadLocation,
  getLeadCode,
  ASSIGNMENTS_STORAGE_KEY,
  TIMELINE_STORAGE_KEY,
} from "../../utils/crmStore";
import StaffDebug from "../common/StaffDebug";

const CrmLeads = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rawLeads, setRawLeads] = useState([]);
  const [localVersion, setLocalVersion] = useState(0);
  const [crmData, setCrmData] = useState({ users: [], employees: [], departments: [], designations: [], roles: [] });
  const [selectedId, setSelectedId] = useState(() => searchParams.get("lead_id"));
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState(null);
  const [activeViewFilter, setActiveViewFilter] = useState("unassigned");
  const mountedRef = useRef(true);

  // Leads merged with the latest saved assignment / stage state.
  // localVersion is bumped whenever localStorage changes (this tab or the Sales tab).
  const leads = useMemo(() => {
    void localVersion;
    return mergeLeads(rawLeads);
  }, [rawLeads, localVersion]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const matchesSearch =
        getLeadName(l).toLowerCase().includes(q) ||
        String(getLeadPhone(l)).toLowerCase().includes(q) ||
        getLeadCode(l).toLowerCase().includes(q);
      if (!matchesSearch) return false;
      // Unassigned tab hides every lead that already has a sales person.
      return activeViewFilter === "assigned" ? !!l.assigned_to_id : !l.assigned_to_id;
    });
  }, [leads, searchQuery, activeViewFilter]);

  const unassignedCount = useMemo(() => leads.filter((l) => !l.assigned_to_id).length, [leads]);
  const assignedCount = leads.length - unassignedCount;

  // The lead you are working on stays open in the right panel even right after it
  // is assigned (and so disappears from the Unassigned list).
  const selectedLead = useMemo(() => {
    if (leads.length === 0) return null;
    return (
      leads.find((l) => String(l.id) === String(selectedId)) ||
      filteredLeads[0] ||
      null
    );
  }, [leads, filteredLeads, selectedId]);

  const handleTabChange = (tab) => {
    setActiveViewFilter(tab);
    const first = leads.find((l) => (tab === "assigned" ? !!l.assigned_to_id : !l.assigned_to_id));
    if (first) {
      setSelectedId(String(first.id));
      setSearchParams({ lead_id: first.id }, { replace: true });
    }
  };

  const handleSelectLead = (lead) => {
    setSelectedId(String(lead.id));
    setSearchParams({ lead_id: lead.id }, { replace: true });
  };

  // Pure loader: returns data, never touches state (state is applied by the caller).
  const loadData = useCallback(async () => {
    const d = await loadCrmData();
    return {
      leads: d.leadsOk ? d.leads : null,
      users: { users: d.users, employees: d.employees, departments: d.departments, designations: d.designations, roles: d.roles },
    };
  }, []);

  const applyData = useCallback((data) => {
    if (!mountedRef.current) return;
    if (data.leads) setRawLeads(data.leads);
    if (data.users) setCrmData(data.users);
    setLoading(false);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadData().then(applyData);
  };

  useEffect(() => {
    mountedRef.current = true;
    loadData().then(applyData);
    return () => {
      mountedRef.current = false;
    };
  }, [loadData, applyData]);

  // Live sync: the Sales Executive works in another tab / window.
  useEffect(() => {
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
    const id = setInterval(() => setLocalVersion((v) => v + 1), 3000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(id);
    };
  }, []);

  const selectedLeadId = selectedLead?.id;
  useEffect(() => {
    if (!selectedLeadId) return undefined;
    let cancelled = false;
    axios
      .post(`${API_URL}crm/leads/${selectedLeadId}/proposal/share`, {}, authHeaders())
      .then((res) => {
        if (!cancelled) setShareData(res.data);
      })
      .catch(() => {
        if (!cancelled) setShareData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLeadId]);

  // ONLY Sales staff are selectable. `people` is everyone, used to show names.
  const { staff: employees, people, fallback: staffFallback } = useMemo(
    () => buildSalesStaff(crmData),
    [crmData],
  );

  const getAssignedExecutiveName = useCallback(
    (empId) => getRepName(people, empId),
    [people],
  );

  const handleAssignSalesPerson = async (employeeId) => {
    if (!selectedLead) return;
    const empId = employeeId ? Number(employeeId) : null;
    if (empId === (selectedLead.assigned_to_id || null)) return;
    const empName = getAssignedExecutiveName(empId);
    const leadId = selectedLead.id;

    const { serverOk } = await assignLead({ lead: selectedLead, empId, empName, actor: "Admin" });
    setLocalVersion((v) => v + 1);
    setMessage({
      type: "success",
      text:
        (empId
          ? `Lead #${leadId} assigned to ${empName} successfully!`
          : `Lead #${leadId} is now unassigned.`) +
        (serverOk ? "" : " (Saved here - server sync pending)"),
    });
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

  // Make sure the currently assigned user is always an option in the dropdown.
  const assignedId = selectedLead?.assigned_to_id;
  const assignedMissingFromOptions =
    assignedId && !employees.some((e) => Number(e.id) === Number(assignedId));

  return (
    <div className="min-h-full bg-[#f8f9fa] text-zinc-900 pb-20 font-sans">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
        {isStaffDebug() && <StaffDebug people={people} staff={employees} />}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-[#DF173C]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DF173C]">
                GUIDEX ADMIN MONITORING
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
              Leads & Pipeline Supervision
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Supervise company leads, allocate sales representatives, and
              monitor live execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-white p-1 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => handleTabChange("unassigned")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeViewFilter === "unassigned"
                    ? "bg-zinc-900 text-white font-extrabold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Unassigned ({unassignedCount})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("assigned")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeViewFilter === "assigned"
                    ? "bg-[#DF173C] text-white font-extrabold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <User size={13} />
                <span>
                  Assigned ({assignedCount})
                </span>
              </button>
            </div>

            <button
              onClick={() => navigate("/admin/crm/upload")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 transition cursor-pointer"
            >
              <UserPlus size={14} className="text-[#DF173C]" />
              <span>Bulk / Add Lead</span>
            </button>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DF173C] px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/20 hover:bg-[#c91435] transition cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden flex flex-col h-[840px]">
            <div className="p-3.5 border-b border-zinc-100">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-3 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search by name, phone, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:border-[#DF173C]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 space-y-1">
              {filteredLeads.length === 0 ? (
                <div className="py-16 text-center text-zinc-400">
                  <Users size={28} className="mx-auto mb-2 text-zinc-300" />
                  <p className="text-xs font-bold text-zinc-700">
                    No Leads Found
                  </p>
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  const leadName = getLeadName(lead);
                  const leadPhone = getLeadPhone(lead);
                  const leadLoc = getLeadLocation(lead);
                  const leadCode = getLeadCode(lead);
                  const currentStageObj = getStageById(lead.stage || "FRESH_LEAD");

                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#DF173C]/10 border-2 border-[#DF173C]"
                          : "hover:bg-zinc-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">
                            {leadCode}
                          </span>
                          <h4 className="text-xs font-black text-zinc-950 truncate">
                            {leadName}
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 uppercase shrink-0">
                          {currentStageObj.name}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                        <Phone size={11} className="shrink-0" />
                        <span className="truncate">{leadPhone}</span>
                        <span>•</span>
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{leadLoc}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {selectedLead ? (
              <>
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                        {getLeadCode(selectedLead)}
                      </span>
                      <h2 className="text-xl font-black text-zinc-950 mt-0.5">
                        {getLeadName(selectedLead)}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                        <Phone size={12} className="text-[#DF173C]" />
                        <span>{getLeadPhone(selectedLead)}</span>
                        <span>•</span>
                        <MapPin size={12} className="text-[#DF173C]" />
                        <span>{getLeadLocation(selectedLead)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/crm/proposals?lead_id=${selectedLead.id}`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-800 transition shadow-xs cursor-pointer"
                      >
                        <Edit3 size={13} className="text-[#DF173C]" />
                        <span>View Proposal</span>
                      </button>

                      {shareData?.whatsapp_share_url && (
                        <a
                          href={shareData.whatsapp_share_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                        >
                          <Share2 size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-zinc-400 block mb-0.5">
                        Assigned Sales Executive
                      </span>
                      <p className="text-xs font-black text-zinc-950">
                        {getAssignedExecutiveName(selectedLead.assigned_to_id)}
                      </p>
                    </div>

                    <div className="w-full sm:w-72">
                      <select
                        value={
                          selectedLead.assigned_to_id
                            ? String(selectedLead.assigned_to_id)
                            : ""
                        }
                        onChange={(e) =>
                          handleAssignSalesPerson(e.target.value)
                        }
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer"
                      >
                        <option value="">
                          -- Assign Sales Representative --
                        </option>
                        {assignedMissingFromOptions && (
                          <option value={String(assignedId)}>
                            {getAssignedExecutiveName(assignedId)}
                          </option>
                        )}
                        {employees.map((emp) => (
                          <option key={emp.id} value={String(emp.id)}>
                            {emp.label}
                          </option>
                        ))}
                      </select>
                      {staffFallback && (
                        <p className="text-[10px] font-bold text-amber-600 mt-1">
                          No Sales-department staff detected - showing all non-admin staff.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                        <span>Live Sales Execution & Monitoring</span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                          Read-Only View
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Viewing progress and call logs updated by the sales
                        executive.
                      </p>
                    </div>

                    <span className="text-xs font-mono font-black text-zinc-500">
                      Step {currentStageIndex + 1} of {PIPELINE_STAGES.length}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6">
                    <div className="absolute left-[35px] top-3 bottom-3 w-[2.5px] bg-zinc-200 -z-0" />

                    {PIPELINE_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const stageEvents = eventsByStage[stage.id] || [];

                      return (
                        <div
                          key={stage.id}
                          className="relative flex items-start gap-4"
                        >
                          <div className="relative z-10 shrink-0">
                            {isCompleted ? (
                              <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Check size={13} strokeWidth={3} />
                              </div>
                            ) : isCurrent ? (
                              <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-emerald-100 animate-pulse">
                                <Circle size={8} fill="white" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-zinc-300 bg-white flex items-center justify-center" />
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
                                <span className="rounded px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                  Current Stage
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] mt-0.5 ${isCompleted || isCurrent ? "text-zinc-600" : "text-zinc-400"}`}
                            >
                              {stage.desc}
                            </p>

                            {stageEvents.length > 0 && (
                              <div className="mt-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                                  Activity & Call Records:
                                </span>
                                {stageEvents.map((ev, evIdx) => (
                                  <div
                                    key={`${ev.timestamp}-${evIdx}`}
                                    className="text-xs pl-2.5 border-l-2 border-emerald-500 py-0.5 min-w-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-zinc-900 leading-tight">
                                        {ev.title}
                                      </p>
                                      {ev.author && (
                                        <span className="text-[9px] font-extrabold text-[#DF173C] bg-red-50 px-1.5 py-0.5 rounded">
                                          {ev.author}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-zinc-600 mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">
                                      {ev.detail}
                                    </p>
                                    <span className="text-[9px] text-zinc-400 font-mono mt-0.5 block">
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
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-400">
                <Users size={32} className="mx-auto mb-2 text-zinc-300" />
                <p className="text-xs font-bold text-zinc-700">
                  No Assigned Lead Selected
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Select an account from your assigned queue to track progress.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmLeads;
