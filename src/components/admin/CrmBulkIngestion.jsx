import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Search,
  Users,
  Download,
  ArrowRight,
  X,
  UserCheck,
  CheckSquare,
  Square,
  Eye,
  ArrowUpRight,
  DollarSign,
  Clock,
  CalendarDays,
} from "lucide-react";

import {
  mergeLeads,
  assignLead,
  buildSalesStaff,
  getRepName,
  loadCrmData,
  createLead,
  isStaffDebug,
  ASSIGNMENTS_STORAGE_KEY,
} from "../../utils/crmStore";
import StaffDebug from "../common/StaffDebug";

// Format lead name cleanly across various DB column conventions
const getLeadName = (lead) =>
  lead?.lead_name ||
  lead?.client_name ||
  lead?.customer_name ||
  lead?.name ||
  `Lead #${lead?.id}`;

// Format phone cleanly
const getLeadPhone = (lead) =>
  lead?.lead_number ||
  lead?.contact_number ||
  lead?.phone_number ||
  lead?.mobile ||
  lead?.phone ||
  "No contact logged";

// Format location cleanly
const getLeadLocation = (lead) =>
  lead?.site_location ||
  lead?.location ||
  lead?.address ||
  lead?.city ||
  "Location not specified";

// Format lead tracking code cleanly
const getLeadCode = (lead) =>
  lead?.lead_code ||
  (lead?.id ? `LEAD-${String(lead.id).padStart(4, "0")}` : "LEAD-N/A");

// Format dates safely
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const CrmBulkIngestion = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Core Data States
  const [crmData, setCrmData] = useState({ users: [], employees: [], departments: [], designations: [], roles: [] });
  const [localVersion, setLocalVersion] = useState(0);
  const [rawLeads, setRawLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Inspection Drawer & Tab State
  const [inspectLead, setInspectLead] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");

  // Manual Form State
  const [manualForm, setManualForm] = useState(() => ({
    lead_name: "",
    lead_number: "",
    site_location: "",
    stops: "G+3 (4 Stops)",
    deal_value: 885000,
    priority: "MEDIUM",
    source: "OFFLINE",
    assigned_to_id: "",
    next_followup_date: new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0],
    remarks: "Manual entry from CRM Engine",
  }));

  // Bulk File Upload State
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Central Table Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("UNASSIGNED");
  const [salesPersonFilter, setSalesPersonFilter] = useState("ALL");

  // Selection Checkboxes
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [batchSalesAssignee, setBatchSalesAssignee] = useState("");

  // Load data from the API. Leads are merged with the shared assignment state so
  // every screen (Leads, Bulk, Sales) shows exactly the same assignment.
  const applyData = useCallback((d) => {
    setCrmData({
      users: d.users,
      employees: d.employees,
      departments: d.departments,
      designations: d.designations,
      roles: d.roles,
    });
    if (d.leadsOk) {
      setRawLeads(d.leads);
    } else {
      setMessage({
        type: "error",
        text: "Could not load CRM leads from the server. Please check your API connection.",
      });
    }
    setTableLoading(false);
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      applyData(await loadCrmData());
    } catch (err) {
      console.error("Failed to load leads repository:", err);
      setMessage({
        type: "error",
        text: "Failed to load CRM data. Please refresh and try again.",
      });
      setTableLoading(false);
    }
  }, [applyData]);

  const refreshData = () => {
    setTableLoading(true);
    fetchAllData();
  };

  useEffect(() => {
    loadCrmData().then(applyData);
  }, [applyData]);

  // Stay in sync with the Leads page / Sales portal (other tabs) automatically.
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === ASSIGNMENTS_STORAGE_KEY) setLocalVersion((v) => v + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const leads = useMemo(() => {
    void localVersion;
    return mergeLeads(rawLeads);
  }, [rawLeads, localVersion]);

  // ONLY Sales department / designation / role staff can be selected.
  const {
    staff: salesStaff,
    people,
    fallback: staffFallback,
  } = useMemo(() => buildSalesStaff(crmData), [crmData]);

  const getEmployeeDisplayName = useCallback(
    (empId) => getRepName(people, empId),
    [people],
  );

  // Dropdown options for one lead: sales staff + the current assignee (so the
  // select never shows a wrong "Unassigned" if the rep is not in the list).
  const repOptions = (currentId) => {
    const list = [...salesStaff];
    if (currentId && !list.some((e) => Number(e.id) === Number(currentId))) {
      list.unshift({ id: Number(currentId), label: getRepName(people, currentId) });
    }
    return list.map((emp) => (
      <option key={emp.id} value={emp.id}>
        {"👤 "}
        {emp.label}
      </option>
    ));
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
  };

  const extractErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || "Operation failed.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => `${d.loc?.join(".") || "field"}: ${d.msg}`)
        .join(", ");
    }
    return JSON.stringify(detail);
  };

  // Submit Single Lead
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cleanPhone = manualForm.lead_number.replace(/\D/g, "");
    const duplicate = leads.find(
      (l) =>
        (l.lead_number || l.phone || "").replace(/\D/g, "") === cleanPhone &&
        cleanPhone.length > 5,
    );

    if (duplicate) {
      if (
        !window.confirm(
          `Notice: Lead with phone ${manualForm.lead_number} already exists (#${duplicate.id} - ${getLeadName(duplicate)}). Do you want to proceed anyway?`,
        )
      ) {
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        lead_name: manualForm.lead_name,
        client_name: manualForm.lead_name,
        lead_number: manualForm.lead_number,
        contact_number: manualForm.lead_number,
        site_location: manualForm.site_location,
        stops: manualForm.stops,
        deal_value: Number(manualForm.deal_value || 885000),
        assigned_to_id: manualForm.assigned_to_id
          ? Number(manualForm.assigned_to_id)
          : null,
        current_department: "SALES",
      };

      const res = await createLead(payload);

      const createdId = res.data?.id;
      setMessage({
        type: "success",
        text: `Lead #${createdId || "NEW"} saved successfully and added to repository!`,
      });

      setManualForm({
        lead_name: "",
        lead_number: "",
        site_location: "",
        stops: "G+3 (4 Stops)",
        deal_value: 885000,
        assigned_to_id: "",
        next_followup_date: new Date(Date.now() + 86400000)
          .toISOString()
          .split("T")[0],
        remarks: "",
      });

      await fetchAllData();
    } catch (err) {
      setMessage({
        type: "error",
        text: extractErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  // CSV/Excel Parser
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        alert("The uploaded CSV file is empty or missing data rows.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < 2) continue;

        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });

        const leadName =
          rowObj["name"] ||
          rowObj["client_name"] ||
          rowObj["lead_name"] ||
          `Lead #${i}`;
        const phone =
          rowObj["phone"] ||
          rowObj["mobile"] ||
          rowObj["lead_number"] ||
          rowObj["contact"] ||
          "";
        const location =
          rowObj["location"] ||
          rowObj["city"] ||
          rowObj["site_location"] ||
          "Bhubaneswar";
        const stops = rowObj["stops"] || "G+3 (4 Stops)";
        const dealVal = Number(
          rowObj["deal_value"] || rowObj["value"] || 885000,
        );

        const cleanPhone = phone.replace(/\D/g, "");
        const isDuplicate = leads.some(
          (l) =>
            (l.lead_number || l.phone || "").replace(/\D/g, "") ===
              cleanPhone && cleanPhone.length > 5,
        );

        rows.push({
          id: i,
          lead_name: leadName,
          lead_number: phone,
          site_location: location,
          stops: stops,
          deal_value: dealVal,
          isDuplicate: isDuplicate,
        });
      }

      setParsedRows(rows);
    };

    reader.readAsText(file);
  };

  // Bulk File Ingest to Database
  const handleBulkUpload = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    let successCount = 0;
    let firstError = "";

    for (const row of parsedRows) {
      try {
        const payload = {
          lead_name: row.lead_name,
          client_name: row.lead_name,
          lead_number: row.lead_number,
          contact_number: row.lead_number,
          site_location: row.site_location,
          stops: row.stops,
          deal_value: Number(row.deal_value || 885000),
          assigned_to_id: bulkAssigneeId ? Number(bulkAssigneeId) : null,
          current_department: "SALES",
        };

        await createLead(payload);
        successCount++;
      } catch (err) {
        if (!firstError) firstError = extractErrorMessage(err);
      }
    }

    setIsProcessing(false);
    setParsedRows([]);
    setMessage({
      type: successCount === parsedRows.length ? "success" : "error",
      text: `Bulk import completed: ${successCount} of ${parsedRows.length} leads were saved.${successCount === parsedRows.length ? "" : ` Failed rows were not saved${firstError ? ` (${firstError})` : ""}.`}`,
    });
    await fetchAllData();
  };

  // Assign / re-assign (any number of times - never locked).
  const handleAssignSingleLead = async (leadId, salespersonId) => {
    const assignedId = salespersonId ? Number(salespersonId) : null;
    const lead = leads.find((l) => String(l.id) === String(leadId));
    if (!lead) return;
    if (assignedId && !Number.isFinite(assignedId)) return;
    if (assignedId === (lead.assigned_to_id || null)) return;

    setActionLoading(true);
    setMessage(null);
    const name = getEmployeeDisplayName(assignedId);
    const { serverOk } = await assignLead({
      lead,
      empId: assignedId,
      empName: name,
      actor: "Admin",
    });
    setLocalVersion((v) => v + 1);
    setInspectLead((prev) =>
      prev && String(prev.id) === String(leadId)
        ? { ...prev, assigned_to_id: assignedId, stage: assignedId ? "ASSIGNED" : "FRESH_LEAD" }
        : prev,
    );
    setMessage({
      type: "success",
      text:
        (assignedId
          ? `Lead #${leadId} assigned to ${name}.`
          : `Lead #${leadId} is now unassigned.`) +
        (serverOk ? "" : " (Saved here - server sync pending)"),
    });
    setActionLoading(false);
  };

  const handleBatchAssign = async () => {
    if (selectedLeadIds.length === 0 || !batchSalesAssignee || actionLoading) return;
    const assignedId = Number(batchSalesAssignee);
    const name = getEmployeeDisplayName(assignedId);

    setActionLoading(true);
    setMessage(null);
    let pending = 0;
    for (const id of selectedLeadIds) {
      const lead = leads.find((l) => String(l.id) === String(id));
      if (!lead) continue;
      const { serverOk } = await assignLead({ lead, empId: assignedId, empName: name, actor: "Admin" });
      if (!serverOk) pending += 1;
    }
    const total = selectedLeadIds.length;
    setSelectedLeadIds([]);
    setBatchSalesAssignee("");
    setLocalVersion((v) => v + 1);
    setMessage({
      type: "success",
      text:
        `Successfully assigned ${total} lead(s) to ${name}.` +
        (pending ? ` (${pending} saved here - server sync pending)` : ""),
    });
    setActionLoading(false);
  };

  const toggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  // Dynamic Date-Wise & Filter Engine
  const filteredLeads = (() => {
    const q = searchQuery.toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return leads
      .filter((l) => {
        const name = getLeadName(l).toLowerCase();
        const phone = getLeadPhone(l).toLowerCase();
        const loc = getLeadLocation(l).toLowerCase();
        const code = getLeadCode(l).toLowerCase();
        const matchesSearch =
          name.includes(q) ||
          phone.includes(q) ||
          loc.includes(q) ||
          code.includes(q);

        let matchesAssignment = true;
        if (assignmentFilter === "UNASSIGNED") {
          matchesAssignment = !l.assigned_to_id;
        } else if (assignmentFilter === "ASSIGNED") {
          matchesAssignment = !!l.assigned_to_id;
        }

        let matchesSalesPerson = true;
        if (salesPersonFilter !== "ALL") {
          matchesSalesPerson =
            String(l.assigned_to_id) === String(salesPersonFilter);
        }

        const recordDateStr = l.created_at || l.updated_at;
        const recordDate = recordDateStr ? new Date(recordDateStr) : null;
        let matchesDate = true;

        if (dateFilter === "TODAY" && recordDate) {
          matchesDate = recordDate.toISOString().split("T")[0] === todayStr;
        } else if (dateFilter === "YESTERDAY" && recordDate) {
          matchesDate = recordDate.toISOString().split("T")[0] === yesterdayStr;
        } else if (dateFilter === "WEEK" && recordDate) {
          matchesDate = recordDate >= sevenDaysAgo;
        } else if (dateFilter === "MONTH" && recordDate) {
          matchesDate = recordDate >= firstDayOfMonth;
        } else if (dateFilter === "CUSTOM" && recordDate) {
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = recordDate >= start && recordDate <= end;
          }
        }

        return (
          matchesSearch &&
          matchesAssignment &&
          matchesSalesPerson &&
          matchesDate
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
        const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
        return dateB - dateA;
      });
  })();

  const totalLeadsCount = leads.length;
  const unassignedCount = useMemo(
    () => leads.filter((l) => !l.assigned_to_id).length,
    [leads],
  );
  const totalContractBook = useMemo(
    () =>
      leads.reduce(
        (acc, l) => acc + (Number(l.deal_value || l.estimated_value) || 0),
        0,
      ),
    [leads],
  );

  const downloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "lead_name,lead_number,site_location,stops,deal_value\n" +
      "Suresh Mahapatra,9876543210,Patia Bhubaneswar,G+4 (5 Stops),950000\n" +
      "Kalinga Commercial,9437123456,Cuttack Link Road,G+2 (3 Stops),750000\n" +
      "Utkal Heights,9123456789,Khandagiri Bhubaneswar,G+3 (4 Stops),885000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "guidex_sample_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentView = () => {
    if (filteredLeads.length === 0) return;
    const header =
      "ID,Code,Name,Phone,Location,Stops,Deal_Value,Date,Assigned_To\n";
    const rows = filteredLeads.map((l) => {
      const code = getLeadCode(l);
      const name = `"${getLeadName(l).replace(/"/g, '""')}"`;
      const phone = `"${getLeadPhone(l)}"`;
      const loc = `"${getLeadLocation(l).replace(/"/g, '""')}"`;
      const stops = `"${l.stops || "Standard"}"`;
      const val = Number(l.deal_value || 0);
      const date = `"${formatDate(l.created_at || l.updated_at)}"`;
      const rep = `"${getEmployeeDisplayName(l.assigned_to_id)}"`;
      return `${l.id},${code},${name},${phone},${loc},${stops},${val},${date},${rep}`;
    });

    const csvData = "data:text/csv;charset=utf-8," + header + rows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvData));
    link.setAttribute("download", `guidex_leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-[#f8f9fa] text-zinc-900 pb-24 font-sans">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isStaffDebug() && <StaffDebug people={people} staff={salesStaff} />}
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-[#DF173C]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DF173C]">
                GUIDEX CENTRAL INGESTION & REPOSITORY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
              Lead Upload & Assignment Hub
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Input single surveys, import bulk Excel/CSV batches, review
              date-wise leads, and delegate to sales executives.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/admin/crm/leads")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 transition cursor-pointer"
            >
              <span>Sales Pipeline Tracker</span>
              <ArrowUpRight size={14} className="text-zinc-400" />
            </button>

            <button
              onClick={refreshData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DF173C] px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/20 hover:bg-[#c91435] transition cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={tableLoading ? "animate-spin" : ""}
              />
              <span>Refresh Repository</span>
            </button>
          </div>
        </div>

        {/* Global Alert Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-xs animate-in fade-in ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* REPOSITORY KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Total Leads Ingested
              </span>
              <h3 className="text-2xl font-black text-zinc-950 mt-1">
                {totalLeadsCount}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={19} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Unassigned (Needs Action)
              </span>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {unassignedCount}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={19} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Assigned to Sales
              </span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {totalLeadsCount - unassignedCount}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck size={19} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Estimated Book Value
              </span>
              <h3 className="text-2xl font-black text-zinc-950 mt-1">
                ₹{totalContractBook.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign size={19} />
            </div>
          </div>
        </div>

        {/* INGESTION DUAL CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Form 1: Single Manual Lead Creation */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
              <div className="h-8 w-8 rounded-lg bg-red-50 text-[#DF173C] flex items-center justify-center font-bold">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-950">
                  1. Manual Lead Entry
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Single entry from phone survey or site visit
                </p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Contractor / Client Name *
                </label>
                <input
                  type="text"
                  name="lead_name"
                  required
                  value={manualForm.lead_name}
                  onChange={handleManualChange}
                  placeholder="e.g. Asish Kumar Jena (Contractor)"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-bold focus:outline-none focus:border-[#DF173C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    name="lead_number"
                    required
                    value={manualForm.lead_number}
                    onChange={handleManualChange}
                    placeholder="e.g. 94381 14861"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#DF173C]"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Stops / Travel
                  </label>
                  <input
                    type="text"
                    name="stops"
                    value={manualForm.stops}
                    onChange={handleManualChange}
                    placeholder="G+3 (4 Stops)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Site Installation Location
                </label>
                <input
                  type="text"
                  name="site_location"
                  value={manualForm.site_location}
                  onChange={handleManualChange}
                  placeholder="e.g. Kalinga Nagar, Bhubaneswar"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#DF173C]"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Estimated Deal (₹)
                </label>
                <input
                  type="number"
                  name="deal_value"
                  value={manualForm.deal_value}
                  onChange={handleManualChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-bold focus:outline-none"
                />
              </div>

              {/* SALES-PERSON ASSIGNMENT */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2">
                <div>
                  <label className="font-black text-zinc-900 block mb-1 flex items-center justify-between">
                    <span>Assign Directly to Sales Person:</span>
                    <span className="text-[10px] text-[#DF173C] font-bold">
                      {salesStaff.length} Available Staff
                    </span>
                  </label>
                  <select
                    name="assigned_to_id"
                    value={manualForm.assigned_to_id}
                    onChange={handleManualChange}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">
                      -- Unassigned (Store in Master Repository) --
                    </option>
                    {salesStaff.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {"👤 "}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#DF173C] hover:bg-[#c91435] text-white font-black text-xs shadow-md shadow-red-950/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? "Saving to Database..."
                  : "Save Lead & Add to Repository Below"}
              </button>
            </form>
          </div>

          {/* Form 2: Bulk CSV/Excel Ingestion */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">
                    2. Bulk Excel / CSV Ingestion
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Import 100–150 leads at once with duplicate detection
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
              >
                <Download size={12} />
                <span>Sample CSV</span>
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 hover:border-[#DF173C] bg-zinc-50/60 rounded-2xl p-7 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, text/csv, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud size={30} className="mx-auto text-zinc-400 mb-1.5" />
              <h4 className="text-xs font-black text-zinc-900">
                Click to upload lead spreadsheet
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Auto-detects duplicates against existing phone numbers in
                PostgreSQL
              </p>
            </div>

            {parsedRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-black text-zinc-950">
                    Parsed {parsedRows.length} Leads (
                    <span className="text-amber-600 font-bold">
                      {parsedRows.filter((r) => r.isDuplicate).length}{" "}
                      duplicates flagged
                    </span>
                    )
                  </span>

                  <div className="flex items-center gap-2">
                    <select
                      value={bulkAssigneeId}
                      onChange={(e) => setBulkAssigneeId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold"
                    >
                      <option value="">Bulk Assign: None (Unassigned)</option>
                      {salesStaff.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {"👤 "}
                        {emp.label}
                      </option>
                    ))}
                    </select>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleBulkUpload}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing
                        ? "Uploading..."
                        : `Save ${parsedRows.length} Leads to DB`}
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Contact</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Deal</th>
                        <th className="p-2 text-right">Duplicate?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {parsedRows.slice(0, 30).map((r) => (
                        <tr
                          key={r.id}
                          className={r.isDuplicate ? "bg-amber-50/50" : ""}
                        >
                          <td className="p-2 font-bold text-zinc-900 truncate max-w-[120px]">
                            {r.lead_name}
                          </td>
                          <td className="p-2 text-zinc-600">{r.lead_number}</td>
                          <td className="p-2 text-zinc-500 truncate max-w-[120px]">
                            {r.site_location}
                          </td>
                          <td className="p-2 text-emerald-600 font-bold">
                            ₹{r.deal_value.toLocaleString("en-IN")}
                          </td>
                          <td className="p-2 text-right">
                            {r.isDuplicate ? (
                              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800">
                                Exists
                              </span>
                            ) : (
                              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                New
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: CENTRAL LEADS REPOSITORY & DATE-WISE TABLE */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <span>Central Leads Master Repository</span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-700">
                    {filteredLeads.length} Leads
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time database records sorted date-wise with instant sales
                  representative assignment.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportCurrentView}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-xs"
                >
                  <Download size={13} className="text-zinc-400" />
                  <span>Export Filtered (.CSV)</span>
                </button>

                {selectedLeadIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl animate-in fade-in">
                    <span className="text-xs font-black text-[#DF173C]">
                      {selectedLeadIds.length} Selected
                    </span>
                    <select
                      value={batchSalesAssignee}
                      onChange={(e) => setBatchSalesAssignee(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-red-200 bg-white text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer"
                    >
                      <option value="">
                        Assign To Sales Person...
                      </option>
                      {salesStaff.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {"👤 "}
                        {emp.label}
                      </option>
                    ))}
                    </select>

                    <button
                      type="button"
                      disabled={!batchSalesAssignee || actionLoading}
                      onClick={handleBatchAssign}
                      className="rounded-lg bg-[#DF173C] px-3 py-1 text-xs font-bold text-white hover:bg-[#c91435] transition disabled:opacity-50 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Controls: Date-Wise, Assignment & Staff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-3 text-zinc-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, code..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:border-[#DF173C]"
                />
              </div>

              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Date: All Time</option>
                  <option value="TODAY">Date: Added Today</option>
                  <option value="YESTERDAY">Date: Yesterday</option>
                  <option value="WEEK">Date: Last 7 Days</option>
                  <option value="MONTH">Date: This Month</option>
                  <option value="CUSTOM">Date: Custom Date Range...</option>
                </select>
                <CalendarDays
                  size={14}
                  className="absolute left-2.5 top-2.5 text-zinc-400 pointer-events-none"
                />
              </div>

              <div>
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Assignment: All Leads</option>
                  <option value="UNASSIGNED">
                    Assignment: ⚠️ Unassigned Only
                  </option>
                  <option value="ASSIGNED">
                    Assignment: ✓ Assigned Only
                  </option>
                </select>
              </div>

              <div>
                <select
                  value={salesPersonFilter}
                  onChange={(e) => setSalesPersonFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">
                    Sales Rep: All Staff ({salesStaff.length})
                  </option>
                  {salesStaff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {dateFilter === "CUSTOM" && (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs animate-in fade-in">
                <span className="font-bold text-zinc-700">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white font-mono font-bold"
                />
                <span className="font-bold text-zinc-700">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white font-mono font-bold"
                />
              </div>
            )}
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto border border-zinc-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-black uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-zinc-400 hover:text-zinc-700"
                    >
                      {selectedLeadIds.length > 0 &&
                      selectedLeadIds.length === filteredLeads.length ? (
                        <CheckSquare size={16} className="text-[#DF173C]" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Lead Code</th>
                  <th className="py-3 px-3">Date Added</th>
                  <th className="py-3 px-3">Contractor / Client</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Site Location</th>
                  <th className="py-3 px-3">Stops</th>
                  <th className="py-3 px-3">Deal Value</th>
                  <th className="py-3 px-3">
                    Sales Person Assignment
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {tableLoading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-12 text-center text-zinc-400"
                    >
                      <RefreshCw
                        size={20}
                        className="animate-spin text-[#DF173C] mx-auto mb-2"
                      />
                      <span>Loading Master Leads Repository...</span>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-12 text-center text-zinc-400"
                    >
                      <Users size={28} className="mx-auto mb-2 text-zinc-300" />
                      <p className="font-bold text-zinc-700">
                        No Leads Match This Date or Filter
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Try resetting the date filter or clearing search terms.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isChecked = selectedLeadIds.includes(lead.id);
                    const isAssigned = !!lead.assigned_to_id;

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-zinc-50/80 transition-colors ${
                          isChecked ? "bg-red-50/40" : ""
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectLead(lead.id)}
                            className="cursor-pointer text-zinc-400 hover:text-zinc-700"
                          >
                            {isChecked ? (
                              <CheckSquare
                                size={16}
                                className="text-[#DF173C]"
                              />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-zinc-400 text-[11px]">
                          {getLeadCode(lead)}
                        </td>

                        <td className="py-3 px-3 text-zinc-500 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className="text-zinc-400" />
                            <span>
                              {formatDate(lead.created_at || lead.updated_at)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-black text-zinc-900">
                            {getLeadName(lead)}
                          </p>
                        </td>

                        <td className="py-3 px-3 text-zinc-600 font-mono">
                          {getLeadPhone(lead)}
                        </td>

                        <td className="py-3 px-3 text-zinc-600 truncate max-w-[150px]">
                          {getLeadLocation(lead)}
                        </td>

                        <td className="py-3 px-3 font-bold text-zinc-700">
                          {lead.stops || "Standard"}
                        </td>

                        <td className="py-3 px-3 font-black text-emerald-600 whitespace-nowrap">
                          {Number(lead.deal_value || 0) > 0
                            ? `₹${Number(lead.deal_value).toLocaleString("en-IN")}`
                            : "Quote Ready"}
                        </td>

                        {/* Inline Sales Rep Selector */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={lead.assigned_to_id || ""}
                              onChange={(e) =>
                                handleAssignSingleLead(lead.id, e.target.value)
                              }
                              className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors max-w-[180px] truncate ${
                                isAssigned
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                              }`}
                            >
                              <option value="">
                                ⚠️ Unassigned (Choose Rep)
                              </option>
                              {repOptions(lead.assigned_to_id)}
                            </select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectLead(lead);
                                setDrawerTab("overview");
                              }}
                              className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition cursor-pointer"
                              title="Inspect lead details"
                            >
                              <Eye size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/admin/crm/proposals?lead_id=${lead.id}`,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-white px-2.5 py-1 text-[10px] font-bold hover:bg-[#DF173C] transition cursor-pointer"
                            >
                              <span>Proposal</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SLIDE-OVER INSPECTION DRAWER */}
        {inspectLead && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            onClick={() => setInspectLead(null)}
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      {getLeadCode(inspectLead)}
                    </span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black text-[#DF173C] uppercase">
                      {inspectLead.stage || "FRESH_LEAD"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-zinc-950 mt-1">
                    {getLeadName(inspectLead)}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectLead(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDrawerTab("overview")}
                  className={`flex-1 py-1 rounded-lg transition-all ${
                    drawerTab === "overview"
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Contact & Delegation
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("specs")}
                  className={`flex-1 py-1 rounded-lg transition-all ${
                    drawerTab === "specs"
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Elevator Specs
                </button>
              </div>

              {/* Tab 1: Overview */}
              {drawerTab === "overview" && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
                    <label className="text-xs font-black text-zinc-900 block flex items-center justify-between">
                      <span>Assigned Sales Representative:</span>
                      <span className="text-[10px] text-[#DF173C] font-bold">
                        {salesStaff.length} Eligible Representatives
                      </span>
                    </label>
                    <select
                      value={inspectLead.assigned_to_id || ""}
                      onChange={(e) =>
                        handleAssignSingleLead(inspectLead.id, e.target.value)
                      }
                      className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer"
                    >
                      <option value="">
                        -- Unassigned (Admin Queue) --
                      </option>
                      {repOptions(inspectLead.assigned_to_id)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Phone Contact
                      </span>
                      <p className="font-bold text-zinc-800 mt-0.5 font-mono">
                        {getLeadPhone(inspectLead)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Site Location
                      </span>
                      <p className="font-bold text-zinc-800 mt-0.5 truncate">
                        {getLeadLocation(inspectLead)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Deal Value
                      </span>
                      <p className="font-black text-emerald-600 mt-0.5">
                        ₹
                        {Number(inspectLead.deal_value || 0).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Date Ingested
                      </span>
                      <p className="font-bold text-zinc-800 mt-0.5">
                        {formatDate(
                          inspectLead.created_at || inspectLead.updated_at,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Specs */}
              {drawerTab === "specs" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      Car Travel / Stops
                    </span>
                    <p className="font-black text-zinc-900 mt-0.5">
                      {inspectLead.stops || "G+3 (4 Stops)"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      Current Department Flow
                    </span>
                    <p className="font-black text-[#DF173C] mt-0.5">
                      {inspectLead.current_department || "SALES"}
                    </p>
                  </div>
                </div>
              )}

              {/* Drawer Actions */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectLead.id;
                    setInspectLead(null);
                    navigate(`/admin/crm/leads?lead_id=${id}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition cursor-pointer"
                >
                  <span>Open Full CRM Pipeline</span>
                  <ArrowRight size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = inspectLead.id;
                    setInspectLead(null);
                    navigate(`/admin/crm/proposals?lead_id=${id}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#DF173C] px-4 py-2 text-xs font-bold text-white hover:bg-[#c91435] transition shadow-xs cursor-pointer"
                >
                  <span>Create Proposal</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmBulkIngestion;
