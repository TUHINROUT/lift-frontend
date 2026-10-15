import {
  getSavedTimelines,
  getSavedAssignments,
  getLeadName,
  getLeadLocation,
} from "./crmStore";

/* ---------- dates ---------- */

// Local (not UTC) YYYY-MM-DD, so "today" is correct in India before 5:30 AM too.
export const localISO = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const lastNDates = (n) => {
  const out = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    out.push(localISO(new Date(base.getTime() - i * 86400000)));
  }
  return out;
};

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export const formatDay = (iso, opts) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(dt.getTime())) return String(iso);
  return dt.toLocaleDateString(
    "en-GB",
    opts || { day: "2-digit", month: "short", year: "numeric" },
  );
};

export const formatTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export const timeAgo = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 0) return "upcoming";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

export const initials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "SE";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ---------- tasks ---------- */

export const normStatus = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

export const isTaskClosed = (t) =>
  ["completed", "cancelled", "canceled", "done", "closed"].includes(
    normStatus(t?.status),
  );

export const taskAssigneeId = (t) => {
  const raw = t?.assigned_to ?? t?.assigned_to_id ?? t?.employee_id;
  const v = raw && typeof raw === "object" ? raw.id : raw;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* ---------- follow-ups (derived from the timeline notes) ---------- */

const CLOSED_STAGES = ["ORDER_WON", "ORDER_LOST"];

// A lead is "awaiting acceptance" only while it is still at the Assigned stage.
// (Leads the server already moved further along are not waiting on the executive.)
export const needsAcceptance = (l) => Boolean(l) && !l.accepted && l.stage === "ASSIGNED";

export const getDueFollowUps = (leads) => {
  const timelines = getSavedTimelines();
  const today = localISO();
  const out = [];
  (leads || []).forEach((lead) => {
    if (CLOSED_STAGES.includes(lead.stage)) return;
    const list = Array.isArray(timelines[lead.id]) ? timelines[lead.id] : [];
    // list is newest first
    const idx = list.findIndex((ev) => ev && ev.nextAction);
    if (idx === -1) return;
    const due = String(list[idx].nextAction).slice(0, 10);
    if (due > today) return;
    const doneLater = list
      .slice(0, idx)
      .some(
        (ev) =>
          ev?.type === "note" &&
          ev?.timestamp &&
          localISO(new Date(ev.timestamp)) >= due,
      );
    if (doneLater) return;
    out.push({ lead, due, overdue: due < today });
  });
  return out.sort((a, b) => a.due.localeCompare(b.due));
};

/* ---------- notifications ---------- */

const notifKey = (uid) => `guidex_sales_notif_v1_${uid || "anon"}`;

export const readNotifState = (uid) => {
  try {
    const p = JSON.parse(localStorage.getItem(notifKey(uid)) || "null");
    if (p && typeof p === "object") {
      return {
        read: Array.isArray(p.read) ? p.read : [],
        announced: Array.isArray(p.announced) ? p.announced : [],
        baselined: Boolean(p.baselined),
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { read: [], announced: [], baselined: false };
};

export const writeNotifState = (uid, s) => {
  try {
    localStorage.setItem(
      notifKey(uid),
      JSON.stringify({
        read: s.read.slice(-500),
        announced: s.announced.slice(-500),
        baselined: s.baselined,
      }),
    );
  } catch {
    /* storage full / blocked: notifications still work for this session */
  }
};

export const buildNotifications = ({ leads, tasks, followUps }) => {
  const saved = getSavedAssignments();
  const items = [];

  (leads || []).forEach((l) => {
    if (!needsAcceptance(l)) return;
    const stamp =
      saved[l.id]?.updated_at || l.assigned_at || l.updated_at || l.created_at || "";
    items.push({
      id: `lead-${l.id}-${stamp}`,
      type: "lead",
      title: "New lead assigned to you",
      detail: `${getLeadName(l)} • ${getLeadLocation(l)}`,
      ts: stamp ? Date.parse(stamp) || 0 : 0,
      ref: String(l.id),
    });
  });

  (tasks || []).forEach((t) => {
    if (isTaskClosed(t)) return;
    const bits = [
      t.category || "Task",
      t.location_name,
      t.due_date ? `Due ${formatDay(t.due_date)}` : null,
    ].filter(Boolean);
    items.push({
      id: `task-${t.id}`,
      type: "task",
      title: `New task assigned${t.priority ? ` · ${t.priority}` : ""}`,
      detail: bits.join(" • "),
      ts: Date.parse(t.created_at || t.updated_at || "") || 0,
      ref: String(t.id),
    });
  });

  (followUps || []).forEach((f) => {
    items.push({
      id: `fu-${f.lead.id}-${f.due}`,
      type: "followup",
      title: f.overdue ? "Follow-up overdue" : "Follow-up due today",
      detail: `${getLeadName(f.lead)} • ${formatDay(f.due)}`,
      ts: Date.parse(`${f.due}T00:00:00`) || 0,
      ref: String(f.lead.id),
    });
  });

  return items.sort((a, b) => b.ts - a.ts);
};
