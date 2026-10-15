import axios from "axios";

export const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

export const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

// Shared CRM pipeline helpers used by BOTH the Admin (CrmLeads) and the
// Sales Executive (SalesDashboard) screens so they always agree.

export const ASSIGNMENTS_STORAGE_KEY = "guidex_crm_lead_assignments";
export const TIMELINE_STORAGE_KEY = "guidex_crm_lead_timelines";

export const PIPELINE_STAGES = [
  { id: "FRESH_LEAD", name: "Order / Enquiry Placed", desc: "Lead received in system, awaiting contact" },
  { id: "ASSIGNED", name: "Lead Assigned to Sales", desc: "Executive allocated for customer outreach" },
  { id: "CONTACT_ATTEMPTED", name: "Contact Attempted", desc: "Executive dialled, awaiting customer response" },
  { id: "CONTACTED_POSITIVE", name: "Contacted & Positive", desc: "Customer verified requirements and site info" },
  { id: "FOLLOWUP_PENDING", name: "Follow-up In Progress", desc: "Technical discussion or decision awaited" },
  { id: "MEETING_SCHEDULED", name: "Site Survey / Meeting Scheduled", desc: "Field engineer visit confirmed with contractor" },
  { id: "MEETING_COMPLETED", name: "Site Measurement Completed", desc: "Shaft dimensions and travel heights verified" },
  { id: "PROPOSAL_SENT", name: "Proposal / Quotation Dispatched", desc: "Formal technical & commercial offer sent" },
  { id: "NEGOTIATION", name: "Commercial Negotiation", desc: "Finalising pricing terms and milestones" },
  { id: "ORDER_WON", name: "Order Won & Confirmed", desc: "Advance cleared; handover to Factory & Finance" },
  { id: "ORDER_LOST", name: "Closed / Not Proceeding", desc: "Archived with documented reason" },
];

const readJson = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("CRM storage write error:", e);
  }
};

export const getSavedAssignments = () => readJson(ASSIGNMENTS_STORAGE_KEY);
export const getSavedTimelines = () => readJson(TIMELINE_STORAGE_KEY);
export const saveAssignments = (data) => writeJson(ASSIGNMENTS_STORAGE_KEY, data);

export const getStageById = (id) =>
  PIPELINE_STAGES.find((s) => s.id === id) || PIPELINE_STAGES[0];

const toId = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Merge raw API leads with locally saved assignment / stage / accepted state.
// A local assignment only wins while the server value is still what it was when
// the admin assigned. If the server value changes (another device / screen),
// the server wins, so an assignment can never get "stuck" or locked.
export const mergeLeads = (rawLeads) => {
  const saved = getSavedAssignments();
  return (Array.isArray(rawLeads) ? rawLeads : []).map((l) => {
    const s = saved[l.id];
    const apiId = toId(l.assigned_to_id);
    let assignedId = apiId;
    if (s && s.assigned_to_id !== undefined) {
      const base = s.api_at_assign === undefined ? null : toId(s.api_at_assign);
      if (apiId === base) assignedId = toId(s.assigned_to_id);
    }
    const sameAssignee = s && toId(s.assigned_to_id) === assignedId;
    let stage = (sameAssignee && s.stage) || l.stage || "FRESH_LEAD";
    if (assignedId && stage === "FRESH_LEAD") stage = "ASSIGNED";
    if (!assignedId) stage = "FRESH_LEAD";
    return {
      ...l,
      api_assigned_id: apiId,
      assigned_to_id: assignedId,
      stage,
      accepted: Boolean(sameAssignee && s.accepted),
    };
  });
};

// Every timeline entry is stored WITH the stage it belongs to, so a custom
// note typed while a lead is in phase X always stays under phase X.
export const saveTimelineEvent = (leadId, { title, detail, author, stage, type, nextAction }) => {
  const timelines = getSavedTimelines();
  const list = Array.isArray(timelines[leadId]) ? timelines[leadId] : [];
  list.unshift({
    title,
    detail,
    author: author || "Sales Executive",
    stage: stage || "FRESH_LEAD",
    type: type || "note",
    nextAction: nextAction || undefined,
    timestamp: new Date().toISOString(),
  });
  timelines[leadId] = list;
  writeJson(TIMELINE_STORAGE_KEY, timelines);
};

// Older saved events have no `stage`; work it out by replaying them oldest->newest.
export const getLeadEvents = (leadId) => {
  if (!leadId) return [];
  const raw = getSavedTimelines()[leadId];
  if (!Array.isArray(raw)) return [];
  let current = "FRESH_LEAD";
  const out = [];
  for (let i = raw.length - 1; i >= 0; i--) {
    const ev = raw[i];
    let stage = ev.stage;
    let type = ev.type;
    if (!stage) {
      const m = /^Milestone (?:Advanced|Reached):\s*(.+)$/i.exec(ev.title || "");
      if (m) {
        const found = PIPELINE_STAGES.find((s) => s.name === m[1].replace(/^"|"$/g, "").trim());
        if (found) current = found.id;
        type = "milestone";
      } else if (/^Lead Acknowledged/i.test(ev.title || "")) {
        current = "CONTACT_ATTEMPTED";
        type = "accept";
      } else if (/^Lead Assigned/i.test(ev.title || "")) {
        current = "ASSIGNED";
        type = "assign";
      }
      stage = current;
    } else {
      current = stage;
    }
    out.push({ ...ev, stage, type: type || "note" });
  }
  return out.reverse(); // newest first
};

export const groupEventsByStage = (events) => {
  const map = {};
  events.forEach((ev) => {
    (map[ev.stage] = map[ev.stage] || []).push(ev);
  });
  return map;
};

export const getLeadName = (lead) =>
  lead?.lead_name || lead?.client_name || lead?.customer_name || lead?.name ||
  (lead?.id ? `Lead #${lead.id}` : "Unnamed Lead");

export const getLeadPhone = (lead) =>
  lead?.lead_number || lead?.contact_number || lead?.phone_number || lead?.mobile ||
  lead?.phone || "No contact logged";

export const getLeadLocation = (lead) =>
  lead?.site_location || lead?.location || lead?.address || lead?.city ||
  "Location not specified";

export const getLeadCode = (lead) =>
  lead?.lead_code || (lead?.id ? `LEAD-${String(lead.id).padStart(4, "0")}` : "LEAD-N/A");

export const userDisplayName = (u) =>
  [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() ||
  u?.full_name || u?.employee_name || u?.name || u?.email ||
  (u?.id ? `User #${u.id}` : "Unknown");

const asArray = (result) => {
  if (result?.status !== "fulfilled") return [];
  const data = result.value?.data;
  if (Array.isArray(data)) return data;
  for (const k of ["items", "data", "results", "users", "employees"]) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
};

// Loads everything the CRM screens need in one go (never throws).
export const loadCrmData = async () => {
  const [leadsRes, usersRes, deptRes, desigRes, rolesRes] = await Promise.allSettled([
    axios.get(`${API_URL}crm/leads`, authHeaders()),
    axios.get(`${API_URL}users`, authHeaders()),
    axios.get(`${API_URL}departments`, authHeaders()),
    axios.get(`${API_URL}designations`, authHeaders()),
    axios.get(`${API_URL}roles`, authHeaders()),
  ]);
  return {
    leadsOk: leadsRes.status === "fulfilled",
    leads: asArray(leadsRes),
    users: asArray(usersRes),
    employees: [],
    roles: asArray(rolesRes),
    departments: asArray(deptRes),
    designations: asArray(desigRes),
  };
};

const SALES_RE = /\bsale\w*|\bmarketing\b|\bbusiness\s*dev\w*|\bbdm\b|\bbde\b|\bcrm\b|\benquir\w*|\bslaes\b/;
const PRIVILEGED_RE = /\b(super\s?admin|admin|director)\b/;

// Everyone who can be shown by name (assignable id = the USER id, which is what a
// sales person logs in with), enriched with employee / department / designation data.
export const buildPeople = ({ users = [], employees = [], departments = [], designations = [], roles = [] }) => {
  const roleMap = new Map(roles.map((r) => [String(r.id), String(r.name || "")]));
  const deptMap = new Map(departments.map((d) => [String(d.id), String(d.name || d.department_name || "")]));
  const desigMap = new Map(designations.map((d) => [String(d.id), String(d.name || d.designation_name || "")]));
  const empByUserId = new Map();
  const empByEmail = new Map();
  employees.forEach((e) => {
    if (e?.user_id !== undefined && e.user_id !== null) empByUserId.set(Number(e.user_id), e);
    if (e?.email) empByEmail.set(String(e.email).toLowerCase(), e);
  });

  const base = users.length ? users : employees;
  const out = [];
  const seen = new Set();
  base.forEach((u) => {
    const id = toId(u?.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    const emp =
      (users.length &&
        (empByUserId.get(id) || (u.email && empByEmail.get(String(u.email).toLowerCase())))) ||
      null;
    const m = { ...(emp || {}), ...u, id };
    const roleStr = [
      roleMap.get(String(m.role_id)), m.role?.name, m.role_name, typeof m.role === "string" ? m.role : "",
      ...(Array.isArray(m.roles) ? m.roles.map((r) => (typeof r === "string" ? r : r?.name)) : []),
    ].filter(Boolean).join(" ").toLowerCase();
    const desigStr = [
      m.designation?.name, m.designation_name, m.job_title, m.position,
      typeof m.designation === "string" ? m.designation : "",
      desigMap.get(String(m.designation_id)),
    ].filter(Boolean).join(" ").toLowerCase();
    const deptStr = [
      m.department?.name, m.department_name,
      typeof m.department === "string" ? m.department : "",
      deptMap.get(String(m.department_id)),
    ].filter(Boolean).join(" ").toLowerCase();
    const identity = `${userDisplayName(m)} ${m.email || ""}`.toLowerCase();
    const active = !(
      m.is_active === false || m.is_active === 0 || m.active === false ||
      String(m.status || "").toLowerCase() === "inactive"
    );
    const explicitlySales =
      m.is_sales === true || m.is_sales_executive === true || m.sales_enabled === true;
    const isSales =
      explicitlySales || SALES_RE.test(roleStr) || SALES_RE.test(desigStr) ||
      SALES_RE.test(deptStr) ||
      SALES_RE.test(identity);
    const isPrivileged = PRIVILEGED_RE.test(`${roleStr} ${identity}`);
    out.push({ ...m, displayName: userDisplayName(m), active, isSales, isPrivileged, deptStr, desigStr, roleStr });
  });
  return out;
};

// Only Sales department / designation / role people. If the API gives no way to
// recognise anyone as Sales, fall back to non-admin staff (and flag it) so the
// dropdown is never empty.
export const buildSalesStaff = (data) => {
  const people = buildPeople(data);
  let staff = people.filter((p) => p.active && p.isSales && !p.isPrivileged);
  let fallback = false;
  if (staff.length === 0) {
    staff = people.filter((p) => p.active && !p.isPrivileged);
    fallback = true;
  }
  if (staff.length === 0) {
    staff = people.filter((p) => p.active);
    fallback = true;
  }
  const nameCount = {};
  staff.forEach((p) => {
    const k = p.displayName.toLowerCase();
    nameCount[k] = (nameCount[k] || 0) + 1;
  });
  staff = staff.map((p) => ({
    ...p,
    label: nameCount[p.displayName.toLowerCase()] > 1 && p.email ? `${p.displayName} (${p.email})` : p.displayName,
  }));
  return { staff, people, fallback };
};

export const getRepName = (people, id) => {
  const n = toId(id);
  if (!n) return "Unassigned";
  const p = people.find((x) => Number(x.id) === n);
  return p ? p.displayName : `Sales Agent #${n}`;
};

// THE one place every screen assigns / re-assigns a lead. It can be called any
// number of times for the same lead (no lock). Local state is written first so
// the UI updates instantly, then the server is asked (best effort, 2 endpoints).
export const assignLead = async ({ lead, empId, empName, actor = "Admin" }) => {
  const id = toId(empId);
  const leadId = lead.id;
  const apiNow = lead.api_assigned_id !== undefined ? toId(lead.api_assigned_id) : toId(lead.assigned_to_id);

  const saved = getSavedAssignments();
  saved[leadId] = {
    assigned_to_id: id,
    stage: id ? "ASSIGNED" : "FRESH_LEAD",
    accepted: false,
    api_at_assign: apiNow,
    updated_at: new Date().toISOString(),
  };
  saveAssignments(saved);

  saveTimelineEvent(leadId, {
    title: id ? "Lead Assigned to Sales" : "Lead Unassigned",
    detail: id ? `${actor} assigned this lead to ${empName}.` : `${actor} removed the sales assignment.`,
    author: actor,
    stage: id ? "ASSIGNED" : "FRESH_LEAD",
    type: "assign",
  });

  const payload = {
    assigned_to_id: id,
    salesperson_id: id,
    user_id: id,
    stage: id ? "ASSIGNED" : "FRESH_LEAD",
    current_department: "SALES",
  };
  try {
    await axios.post(`${API_URL}crm/leads/${leadId}/handoff/sales`, payload, authHeaders());
    return { serverOk: true };
  } catch {
    try {
      await axios.put(`${API_URL}crm/leads/${leadId}`, { assigned_to_id: id }, authHeaders());
      return { serverOk: true };
    } catch {
      return { serverOk: false };
    }
  }
};

// ---------------------------------------------------------------------------
// Creating a lead. The backend answers 405 for POST on "/crm/leads" (that route
// is GET-only there), so the real create route is discovered from the API's own
// /openapi.json once, cached, and reused. Falls back to trailing-slash variants.
// ---------------------------------------------------------------------------
let createPathPromise = null;

const resolveCreateLeadUrl = () => {
  if (!createPathPromise) {
    createPathPromise = (async () => {
      try {
        const root = String(import.meta.env.VITE_API_URL || "")
          .replace(/\/+$/, "")
          .replace(/\/api$/, "");
        const res = await axios.get(`${root}/openapi.json`);
        const paths = res.data?.paths || {};
        const posts = Object.keys(paths).filter((p) => paths[p]?.post);
        const exactSlash = posts.find((p) => /\/crm\/leads\/$/.test(p));
        const exact = posts.find((p) => /\/crm\/leads$/.test(p));
        const named = posts.find(
          (p) =>
            /\/crm\/leads\/(create|new|add|manual|single)\/?$/.test(p) ||
            /\/crm\/(create-lead|new-lead|add-lead)\/?$/.test(p),
        );
        const found = exactSlash || exact || named;
        return found ? `${root}${found}` : null;
      } catch {
        return null;
      }
    })();
  }
  return createPathPromise;
};

export const createLead = async (payload) => {
  const discovered = await resolveCreateLeadUrl();
  const urls = discovered
    ? [discovered]
    : [`${API_URL}crm/leads/`, `${API_URL}crm/leads`];
  let lastErr;
  for (const url of urls) {
    try {
      return await axios.post(url, payload, authHeaders());
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status !== 404 && status !== 405) throw err;
    }
  }
  throw lastErr;
};

// Hidden helper: any CRM page opened with ?debug=staff shows the staff diagnostics.
export const isStaffDebug = () =>
  new URLSearchParams(window.location.search).get("debug") === "staff";
