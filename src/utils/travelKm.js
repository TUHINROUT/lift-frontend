import axios from "axios";
import { API_URL, authHeaders } from "./crmStore";
import { localISO } from "./salesPortal";
import { isBlocked, markBlocked, isDenied } from "./apiAccess";

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const firstDefined = (rec, keys) => {
  if (!rec || typeof rec !== "object") return null;
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== "") return rec[k];
  }
  return null;
};

export const getPoint = (rec) => {
  const lat = toNum(firstDefined(rec, ["latitude", "lat"]));
  const lng = toNum(firstDefined(rec, ["longitude", "lng", "lon", "long"]));
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
};

export const getTime = (rec) => {
  const raw = firstDefined(rec, [
    "recorded_at",
    "timestamp",
    "captured_at",
    "created_at",
    "updated_at",
  ]);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const haversineKm = (a, b) => {
  const R = 6371.0088;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
};

const MIN_STEP_KM = 0.02; // GPS jitter below 20 m is not travel
const MAX_SPEED_KMH = 160; // faster than this between two pings = GPS glitch
const MAX_ACCURACY_M = 100; // ignore very inaccurate fixes

// Actual distance travelled in one day from that day's GPS pings.
export const computeDayDistance = (records) => {
  const pts = (Array.isArray(records) ? records : [])
    .map((r, i) => ({
      i,
      p: getPoint(r),
      t: getTime(r),
      acc: toNum(firstDefined(r, ["accuracy", "gps_accuracy"])),
    }))
    .filter((x) => x.p && (x.acc === null || x.acc <= MAX_ACCURACY_M));

  if (pts.length > 0 && pts.every((x) => x.t)) {
    pts.sort((a, b) => a.t - b.t || a.i - b.i);
  }

  let km = 0;
  let anchor = pts[0];
  let jumps = 0;
  for (let k = 1; k < pts.length; k++) {
    const cur = pts[k];
    const d = haversineKm(anchor.p, cur.p);
    if (d < MIN_STEP_KM) continue;
    if (anchor.t && cur.t) {
      const hours = (cur.t - anchor.t) / 3600000;
      if (hours > 0 && d / hours > MAX_SPEED_KMH) {
        jumps += 1;
        if (jumps >= 3) {
          // the new place is real: re-anchor without adding the jump
          anchor = cur;
          jumps = 0;
        }
        continue;
      }
    }
    jumps = 0;
    km += d;
    anchor = cur;
  }

  const timed = pts.filter((x) => x.t);
  return {
    km: Math.round(km * 100) / 100,
    points: pts.length,
    firstAt: timed.length ? timed[0].t.toISOString() : null,
    lastAt: timed.length ? timed[timed.length - 1].t.toISOString() : null,
  };
};

const asList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    return [data];
  }
  return [];
};

export const fetchDayRecords = async (empId, iso) => {
  if (!isBlocked("tracking:by-date")) {
    try {
      const res = await axios.get(
        `${API_URL}employee-tracking/employee/${empId}/by-date`,
        { ...authHeaders(), params: { tracking_date: iso } },
      );
      return { ok: true, records: asList(res.data) };
    } catch (err) {
      if (err?.response?.status === 404) return { ok: true, records: [] };
      if (isDenied(err)) markBlocked("tracking:by-date");
    }
  }
  if (isBlocked("tracking:history")) return { ok: false, records: [] };
  try {
    const res = await axios.get(`${API_URL}tracking/history`, {
      ...authHeaders(),
      params: { employee_id: empId, date: iso },
    });
    return { ok: true, records: asList(res.data) };
  } catch (err2) {
    if (err2?.response?.status === 404 && !isBlocked("tracking:by-date")) {
      return { ok: true, records: [] };
    }
    if (isDenied(err2)) markBlocked("tracking:history");
    return { ok: false, records: [] };
  }
};

const cacheKey = (id) => `guidex_travel_km_v1_${id}`;

const readCache = (id) => {
  try {
    const p = JSON.parse(localStorage.getItem(cacheKey(id)) || "{}");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
};

const writeCache = (id, cache) => {
  try {
    const keys = Object.keys(cache).sort().slice(-120);
    const trimmed = {};
    keys.forEach((k) => (trimmed[k] = cache[k]));
    localStorage.setItem(cacheKey(id), JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
};

// Returns [{ date, km, points, firstAt, lastAt, failed }] in the order of `dates`.
// Days older than yesterday never change, so they are cached after the first load.
export const loadTravelDays = async (empId, dates) => {
  const cache = readCache(empId);
  const today = localISO();
  const yesterday = localISO(new Date(Date.now() - 86400000));
  const out = {};
  const todo = [];

  dates.forEach((d) => {
    const stable = d !== today && d !== yesterday;
    if (stable && cache[d]) out[d] = cache[d];
    else todo.push(d);
  });

  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (d) => {
        const { ok, records } = await fetchDayRecords(empId, d);
        if (!ok) return [d, null];
        return [d, computeDayDistance(records)];
      }),
    );
    results.forEach(([d, v]) => {
      if (v) {
        out[d] = v;
        if (d !== today && d !== yesterday) cache[d] = v;
      } else {
        out[d] = { failed: true, km: 0, points: 0, firstAt: null, lastAt: null };
      }
    });
  }

  writeCache(empId, cache);
  return dates.map((d) => ({ date: d, ...out[d] }));
};
