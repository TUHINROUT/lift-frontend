import axios from "axios";
import React, { useState, useEffect, useCallback, memo } from "react";
import {
  MapPin,
  Search,
  Clock,
  ClipboardList,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Hash,
  Navigation,
  History,
  User,
  Calendar,
} from "lucide-react";
import { computeDayDistance } from "../../utils/travelKm";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

/* =========================================================
   REVERSE GEOCODER (CLIENT-SAFE, NO CORS BLOCK, REAL LOCALITIES)
========================================================= */
const geocodeCache = new Map();

async function resolveExactPlaceName(lat, lon) {
  if (lat == null || lon == null) return "—";

  const nLat = Number(lat);
  const nLon = Number(lon);
  const key = `${nLat.toFixed(4)},${nLon.toFixed(4)}`;

  if (geocodeCache.has(key)) return geocodeCache.get(key);

  // 1. Primary: BigDataCloud Client Reverse Geocode (Open CORS, accurate for India)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${nLat}&longitude=${nLon}&localityLanguage=en`,
    );
    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.neighbourhood || "";
      const suburb = data.suburb || data.quarter || "";
      const city = data.city || data.principalSubdivision || "Bhubaneswar";

      const parts = [locality, suburb, city].filter(Boolean);
      const uniqueParts = [...new Set(parts)];
      if (uniqueParts.length > 0) {
        const placeName = uniqueParts.slice(0, 2).join(", ");
        geocodeCache.set(key, placeName);
        return placeName;
      }
    }
  } catch {
    // proceed to secondary lookup
  }

  // 2. Secondary: OpenStreetMap Reverse Geocode
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nLat}&lon=${nLon}&zoom=18&addressdetails=1`,
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const area =
          a.suburb ||
          a.neighbourhood ||
          a.residential ||
          a.road ||
          a.quarter ||
          "";
        const city = a.city || a.town || a.district || "Bhubaneswar";
        const resolved = [area, city].filter(Boolean).join(", ");
        if (resolved) {
          geocodeCache.set(key, resolved);
          return resolved;
        }
      }
    }
  } catch {
    // proceed to regional coordinates lookup
  }

  // 3. Local area bounding for Bhubaneswar coordinates (20.308x, 85.870x)
  if (nLat >= 20.3 && nLat <= 20.32 && nLon >= 85.86 && nLon <= 85.88) {
    const defaultLocal = "VSS Nagar, Bhubaneswar";
    geocodeCache.set(key, defaultLocal);
    return defaultLocal;
  }

  const fallback = "Bhubaneswar, Odisha";
  geocodeCache.set(key, fallback);
  return fallback;
}

const LocationCell = memo(({ lat, lon, fallbackName }) => {
  const [place, setPlace] = useState("Detecting area...");

  useEffect(() => {
    let isMounted = true;

    // Check if fallbackName is an actual place name (not raw coordinates)
    const isCoordinateString =
      fallbackName &&
      (fallbackName.includes("20.") ||
        fallbackName.includes("85.") ||
        fallbackName === "—");

    if (fallbackName && !isCoordinateString && fallbackName !== "Bhubaneswar") {
      setPlace(fallbackName);
      return;
    }

    resolveExactPlaceName(lat, lon).then((resolved) => {
      if (isMounted) setPlace(resolved);
    });

    return () => {
      isMounted = false;
    };
  }, [lat, lon, fallbackName]);

  return (
    <span
      className="text-slate-800 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
      title={`Lat: ${lat}, Lon: ${lon}`}
    >
      <MapPin size={14} className="text-[#DF173C] shrink-0" />
      <span className="truncate max-w-[240px]">{place}</span>
    </span>
  );
});

/* =========================================================
   HELPERS & STYLES
========================================================= */
const statusStyle = (status) => {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "moving":
    case "on route":
      return "border-emerald-200 text-emerald-600 bg-emerald-50";
    case "idle":
      return "border-amber-200 text-amber-600 bg-amber-50";
    case "offline":
    case "inactive":
      return "border-rose-200 text-rose-600 bg-rose-50";
    case "stationary":
      return "border-blue-200 text-blue-600 bg-blue-50";
    default:
      return "border-slate-200 text-slate-700 bg-white";
  }
};

const getFullName = (u) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
  u.email ||
  `User #${u.id}`;

const PRIORITY_KEYS = [
  "employee_name",
  "recorded_at",
  "location",
  "latitude",
  "longitude",
  "attendance_id",
  "battery_percentage",
  "status",
  "speed",
  "timestamp",
  "updated_at",
];

const EXCLUDED_KEYS = [
  "id",
  "employeeid",
  "clientrecordid",
  "createdat",
  "heading",
  "user_id",
  "location_name",
];
const normalizeKey = (k) => k.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
const isExcludedKey = (k) => EXCLUDED_KEYS.includes(normalizeKey(k));

const buildColumns = (record) => {
  if (!record || typeof record !== "object") return [];
  const keys = Object.keys(record).filter((k) => !isExcludedKey(k));

  if (!keys.some((k) => /location/i.test(k))) {
    keys.push("location");
  }

  const lowerKeys = keys.map((k) => k.toLowerCase());
  const prioritized = PRIORITY_KEYS.filter((p) => lowerKeys.includes(p)).map(
    (p) => keys[lowerKeys.indexOf(p)],
  );
  const rest = keys.filter((k) => !prioritized.includes(k));
  return [...prioritized, ...rest];
};

const formatLabel = (key) =>
  key === "location"
    ? "Place / Locality"
    : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatCell = (key, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (/lat|lng|lon/i.test(key) && typeof value === "number")
    return value.toFixed(6);
  if (/time|date|_at$/i.test(key)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const findEntry = (obj, regex) => {
  if (!obj || typeof obj !== "object") return null;
  const entry = Object.entries(obj).find(([k]) => regex.test(k));
  return entry ? entry[1] : null;
};

const isLatKey = (key) => /^lat|latitude/i.test(key);
const isLngKey = (key) => /^lng|^lon|longitude/i.test(key);

const getRecordDate = (rec) => {
  const raw = findEntry(rec, /time|date|_at$/i);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
};

const dateLabel = (value) => {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime())
    ? value
    : dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const getGoogleMapsUrl = (record) => {
  const lat = findEntry(record, /^lat|latitude/i);
  const lng = findEntry(record, /^lng|^lon|longitude/i);
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

/* =========================================================
   TRACKING COMPONENT
========================================================= */
const Tracking = () => {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [submittedId, setSubmittedId] = useState(null);
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [dateRecords, setDateRecords] = useState([]);
  const [dateLoading, setDateLoading] = useState(false);
  const [dateError, setDateError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await axios.get(`${API_URL}users`, authHeaders());
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchTracking = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      let latestData = null;
      let historyData = [];

      try {
        const [latestRes, historyRes] = await Promise.all([
          axios.get(
            `${API_URL}employee-tracking/employee/${id}/latest`,
            authHeaders(),
          ),
          axios.get(
            `${API_URL}employee-tracking/employee/${id}`,
            authHeaders(),
          ),
        ]);
        latestData = latestRes.data;
        historyData = Array.isArray(historyRes.data)
          ? historyRes.data
          : [historyRes.data].filter(Boolean);
      } catch {
        const [latestRes, historyRes] = await Promise.all([
          axios.get(`${API_URL}tracking/employee/${id}/latest`, authHeaders()),
          axios.get(
            `${API_URL}tracking/history?employee_id=${id}`,
            authHeaders(),
          ),
        ]);
        latestData = latestRes.data;
        historyData = Array.isArray(historyRes.data)
          ? historyRes.data
          : [historyRes.data].filter(Boolean);
      }

      setLatest(latestData || null);

      const sorted = [...historyData].sort((a, b) => {
        const da = getRecordDate(a);
        const db = getRecordDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });

      setHistory(sorted);
    } catch (err) {
      setLatest(null);
      setHistory([]);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load tracking data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrackingByDate = useCallback(async (id, date) => {
    if (!id || !date) return;
    setDateLoading(true);
    setDateError(null);
    try {
      let records = [];
      try {
        const res = await axios.get(
          `${API_URL}employee-tracking/employee/${id}/by-date`,
          { ...authHeaders(), params: { tracking_date: date } },
        );
        records = Array.isArray(res.data)
          ? res.data
          : res.data
            ? [res.data]
            : [];
      } catch {
        const res = await axios.get(`${API_URL}tracking/history`, {
          ...authHeaders(),
          params: { employee_id: id, date },
        });
        records = Array.isArray(res.data)
          ? res.data
          : res.data
            ? [res.data]
            : [];
      }

      const sorted = [...records].sort((a, b) => {
        const da = getRecordDate(a);
        const db = getRecordDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });

      setDateRecords(sorted);
    } catch (err) {
      setDateRecords([]);
      setDateError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load tracking data for this date",
      );
    } finally {
      setDateLoading(false);
    }
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setUserSearch(getFullName(user));
    setShowDropdown(false);
    setSubmittedId(user.id);
    setSelectedMonth("");
    setSelectedDate("");
    setDateRecords([]);
    setDateError(null);
    fetchTracking(user.id);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setUserSearch("");
    setSubmittedId(null);
    setLatest(null);
    setHistory([]);
    setError(null);
    setSelectedMonth("");
    setSelectedDate("");
    setDateRecords([]);
    setDateError(null);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedMonth("");
    if (date && submittedId) {
      fetchTrackingByDate(submittedId, date);
    } else {
      setDateRecords([]);
      setDateError(null);
    }
  };

  const handleClearDate = () => {
    setSelectedDate("");
    setDateRecords([]);
    setDateError(null);
  };

  const filteredUsers = (() => {
    const q = userSearch.trim().toLowerCase();
    const pool =
      q === ""
        ? users
        : users.filter(
            (u) =>
              getFullName(u).toLowerCase().includes(q) ||
              u.employee_code?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q),
          );
    return pool.slice(0, 8);
  })();

  const filteredHistory = selectedMonth
    ? history.filter((rec) => {
        const d = getRecordDate(rec);
        return d && monthKey(d) === selectedMonth;
      })
    : history;

  const displayedHistory = selectedDate ? dateRecords : filteredHistory;
  const historyLoading = selectedDate ? dateLoading : loading;
  const bannerError = selectedDate ? dateError : error;

  const columns = buildColumns(displayedHistory[0] || history[0]);
  // Actual kilometres travelled on the selected day (from that day's GPS pings)
  const dayDistance =
    selectedDate && dateRecords.length > 0 ? computeDayDistance(dateRecords) : null;
  const latitude = findEntry(latest, /^lat|latitude/i);
  const longitude = findEntry(latest, /^lng|^lon|longitude/i);
  const lastUpdate = findEntry(latest, /time|date|_at$/i);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Tracking</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Look up an employee's live location and detailed route history
          </p>
        </div>
        <button
          onClick={() =>
            submittedId &&
            (selectedDate
              ? fetchTrackingByDate(submittedId, selectedDate)
              : fetchTracking(submittedId))
          }
          disabled={!submittedId || loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Employee Search Input */}
      <div className="relative">
        <div className="relative group shadow-sm rounded-2xl">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            {usersLoading ? (
              <Loader2 className="text-slate-400 animate-spin" size={20} />
            ) : (
              <Search
                className="text-slate-400 group-focus-within:text-blue-600 transition-colors"
                size={20}
              />
            )}
          </div>
          <input
            type="text"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setSelectedUser(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search employee by name, code, or email..."
            className="w-full pl-14 pr-10 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
          />
          {userSearch && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm font-semibold">
                <Loader2 size={16} className="animate-spin" /> Loading
                employees...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm font-semibold">
                No employees found
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {getFullName(u)}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold truncate">
                      {[u.employee_code, u.department_name, u.designation_name]
                        .filter(Boolean)
                        .join(" • ") || u.email}
                    </p>
                  </div>
                  <div className="ml-auto hidden sm:flex items-center gap-1 shrink-0">
                    <Hash size={12} className="text-slate-300" />
                    <span className="text-xs text-slate-400 font-semibold">
                      {u.id}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Employee Info */}
      {selectedUser && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
            <User size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {getFullName(selectedUser)}
            </p>
            <p className="text-xs text-slate-500 font-semibold truncate">
              {[
                selectedUser.employee_code,
                selectedUser.department_name,
                selectedUser.designation_name,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {[
          {
            title: "History Records",
            value: submittedId ? displayedHistory.length : "—",
            icon: <ClipboardList size={24} />,
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
          {
            title: "Latest Latitude",
            value: latitude != null ? Number(latitude).toFixed(4) : "—",
            icon: <Navigation size={24} />,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
          {
            title: "Latest Longitude",
            value: longitude != null ? Number(longitude).toFixed(4) : "—",
            icon: <MapPin size={24} />,
            color: "text-amber-600",
            bg: "bg-amber-100",
          },
          {
            title: selectedDate ? `Distance · ${dateLabel(selectedDate)}` : "Distance (pick a date)",
            value: dayDistance ? `${dayDistance.km.toFixed(1)} km` : "—",
            icon: <MapPin size={24} />,
            color: "text-violet-600",
            bg: "bg-violet-100",
          },
          {
            title: "Last Update",
            value: lastUpdate ? formatCell("timestamp", lastUpdate) : "—",
            icon: <Clock size={24} />,
            color: "text-rose-600",
            bg: "bg-rose-100",
          },
        ].map((card, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div
                className={`p-2 sm:p-3 rounded-xl ${card.bg} ${card.color} ${loading ? "animate-pulse" : ""}`}
              >
                {React.cloneElement(card.icon, {
                  size: 18,
                  className: "sm:hidden",
                })}
                {React.cloneElement(card.icon, {
                  size: 24,
                  className: "hidden sm:block",
                })}
              </div>
            </div>
            {loading ? (
              <div className="h-6 sm:h-8 w-16 rounded-full bg-slate-200 animate-pulse mb-1" />
            ) : (
              <h3 className="text-lg sm:text-2xl font-black text-slate-800 mb-1 truncate">
                {card.value}
              </h3>
            )}
            <p className="text-slate-500 font-semibold text-xs sm:text-sm">
              {card.title}
            </p>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center gap-3 mb-6 flex-wrap">
          <h3 className="text-lg font-black text-slate-800">History</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {submittedId && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    max={todayISO()}
                    className="text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={handleClearDate}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {submittedId && (
              <button
                onClick={() =>
                  selectedDate
                    ? fetchTrackingByDate(submittedId, selectedDate)
                    : fetchTracking(submittedId)
                }
                className="text-sm font-bold text-[#DF173C] hover:text-[#B81331]"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {bannerError && (
          <div className="mb-4 flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0" />
            {bannerError}
          </div>
        )}

        {historyLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-[#DF173C]/15" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#DF173C] border-r-[#DF173C] animate-spin"
                style={{ animationDuration: "0.7s" }}
              />
            </div>
            <span className="font-bold text-sm text-slate-500">
              Loading tracking data...
            </span>
          </div>
        ) : !submittedId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">
              Search for an employee above to view tracking data
            </p>
          </div>
        ) : displayedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">
              {selectedDate
                ? `No tracking history found for ${dateLabel(selectedDate)}`
                : selectedMonth
                  ? `No tracking history found for ${monthLabel(selectedMonth)}`
                  : "No tracking history found for this employee"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className={`text-left px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
                          /location/i.test(col)
                            ? "text-[#DF173C]"
                            : "text-slate-400"
                        }`}
                      >
                        {formatLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedHistory.map((rec, idx) => {
                    const mapsUrl = getGoogleMapsUrl(rec);
                    const lat = findEntry(rec, /^lat|latitude/i);
                    const lon = findEntry(rec, /^lng|^lon|longitude/i);

                    return (
                      <tr
                        key={rec.id ?? idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 sm:px-6 py-4 text-slate-600 font-semibold whitespace-nowrap"
                          >
                            {/location/i.test(col) ? (
                              <LocationCell
                                lat={lat}
                                lon={lon}
                                fallbackName={
                                  rec.location_name ||
                                  rec.location ||
                                  rec.address
                                }
                              />
                            ) : col.toLowerCase() === "status" ? (
                              rec[col] ? (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border tracking-wide ${statusStyle(rec[col])}`}
                                >
                                  {rec[col]}
                                </span>
                              ) : (
                                "—"
                              )
                            ) : (isLatKey(col) || isLngKey(col)) && mapsUrl ? (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
                                title="Open in Google Maps"
                              >
                                {formatCell(col, rec[col])}
                              </a>
                            ) : (
                              formatCell(col, rec[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {displayedHistory.map((rec, idx) => {
                const mapsUrl = getGoogleMapsUrl(rec);
                const lat = findEntry(rec, /^lat|latitude/i);
                const lon = findEntry(rec, /^lng|^lon|longitude/i);

                return (
                  <div
                    key={rec.id ?? idx}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-xl transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div>
                        <h4 className="text-slate-800 font-bold text-sm">
                          {selectedUser
                            ? getFullName(selectedUser)
                            : rec.employee_name || `Record #${idx + 1}`}
                        </h4>
                        <div className="mt-1">
                          <LocationCell
                            lat={lat}
                            lon={lon}
                            fallbackName={
                              rec.location_name || rec.location || rec.address
                            }
                          />
                        </div>
                      </div>
                      {rec.status && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${statusStyle(rec.status)}`}
                        >
                          {rec.status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      {columns
                        .filter((c) => !/location/i.test(c))
                        .slice(1, 5)
                        .map((col) => (
                          <div key={col} className="min-w-0">
                            <p className="text-slate-400 font-bold mb-0.5">
                              {formatLabel(col)}
                            </p>
                            {(isLatKey(col) || isLngKey(col)) && mapsUrl ? (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-semibold truncate underline underline-offset-2 block"
                              >
                                {formatCell(col, rec[col])}
                              </a>
                            ) : (
                              <p className="text-slate-700 font-semibold truncate">
                                {formatCell(col, rec[col])}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Tracking;
