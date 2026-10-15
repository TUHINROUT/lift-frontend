import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import {
  MapPin,
  Navigation,
  Phone,
  Radio,
  Search,
  RefreshCw,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const MapFlyToController = ({ selectedAgent }) => {
  const map = useMap();
  useEffect(() => {
    if (
      selectedAgent &&
      !isNaN(Number(selectedAgent.latitude)) &&
      !isNaN(Number(selectedAgent.longitude)) &&
      Number(selectedAgent.latitude) !== 0 &&
      Number(selectedAgent.longitude) !== 0
    ) {
      map.flyTo(
        [Number(selectedAgent.latitude), Number(selectedAgent.longitude)],
        15,
        {
          duration: 1.2,
        },
      );
    }
  }, [selectedAgent, map]);
  return null;
};

const MapResizeFix = () => {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t = setTimeout(fix, 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

const createRiderPin = (agent, isSelected) => {
  const isMoving =
    (agent.status || "").toLowerCase() === "on route" ||
    Number(agent.speed) > 2;

  const initials = agent.name
    ? agent.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "TR";

  return L.divIcon({
    className: "custom-rider-pin",
    html: `
      <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
        ${
          isMoving
            ? `<div style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background: rgba(223, 23, 60, 0.28); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        <div style="
          position: absolute; 
          top: -2px; 
          width: 0; 
          height: 0; 
          border-left: 5px solid transparent; 
          border-right: 5px solid transparent; 
          border-bottom: 8px solid ${isSelected ? "#DF173C" : "#18181b"};
          transform-origin: center 25px;
          transform: rotate(${Number(agent.heading) || 0}deg);
          transition: transform 0.4s ease-out;
        "></div>
        <div style="
          position: relative; 
          width: 36px; 
          height: 36px; 
          border-radius: 9999px; 
          background: #09090b; 
          border: 2px solid ${isSelected ? "#DF173C" : isMoving ? "#DF173C" : "#10b981"}; 
          box-shadow: 0 4px 16px rgba(0,0,0,0.4); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #ffffff; 
          font-weight: 800; 
          font-size: 12px;
          outline: ${isSelected ? "3px solid rgba(223,23,60,0.3)" : "none"};
        ">
          ${initials}
          <span style="
            position: absolute; 
            bottom: -2px; 
            right: -2px; 
            width: 9px; 
            height: 9px; 
            border-radius: 9999px; 
            background: ${isMoving ? "#DF173C" : "#10b981"}; 
            border: 2px solid #ffffff;
          "></span>
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
};

const FleetRadar = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const historyTrails = useRef({});

  const formatAgent = useCallback((item) => {
    const lat = parseFloat(item.latitude || item.lat);
    const lng = parseFloat(item.longitude || item.lng);
    const userId = item.user_id || item.id;

    const prevHistory = historyTrails.current[userId] || [];
    let updatedTrail = prevHistory;

    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      const newPos = [lat, lng];
      const lastPos = prevHistory[prevHistory.length - 1];
      if (!lastPos || lastPos[0] !== lat || lastPos[1] !== lng) {
        updatedTrail = [...prevHistory.slice(-15), newPos];
        historyTrails.current[userId] = updatedTrail;
      }
    }

    const fullName =
      item.name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      item.email ||
      `Agent #${userId}`;

    return {
      user_id: userId,
      name: fullName,
      employee_code:
        item.employee_code ||
        item.employee_id ||
        `EMP-${String(userId).padStart(3, "0")}`,
      phone: item.phone || item.mobile || "—",
      latitude: !isNaN(lat) ? lat : 20.2961,
      longitude: !isNaN(lng) ? lng : 85.8245,
      hasValidCoords: !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0,
      speed: Number(item.speed) || 0,
      heading: Number(item.heading) || 0,
      status: item.status || "Idle",
      current_destination:
        item.current_destination ||
        item.destination ||
        "Pending Site Allocation",
      battery_level: Number(item.battery_level) || 100,
      trail: updatedTrail,
    };
  }, []);

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API_URL}tracking/live`, authHeaders());
      } catch {
        res = await axios.get(`${API_URL}tracking`, authHeaders());
      }

      if (Array.isArray(res.data)) {
        const formatted = res.data.map(formatAgent);
        setAgents(formatted);
        setError(null);
        setSelectedAgentId((prev) => {
          if (prev && formatted.some((a) => a.user_id === prev)) return prev;
          return formatted[0]?.user_id || null;
        });
      } else {
        setAgents([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "No active telemetry data stream");
    } finally {
      setLoading(false);
    }
  }, [formatAgent]);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry]);

  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return agents.filter(
      (a) =>
        (a.name || "").toLowerCase().includes(q) ||
        (a.employee_code || "").toLowerCase().includes(q) ||
        (a.current_destination || "").toLowerCase().includes(q),
    );
  }, [agents, searchTerm]);

  const selectedAgent = useMemo(
    () =>
      agents.find((a) => a.user_id === selectedAgentId) ||
      filteredAgents[0] ||
      null,
    [agents, selectedAgentId, filteredAgents],
  );

  return (
    <div className="pt-20 p-4 sm:p-6 bg-[#f5f6f8] min-h-screen flex flex-col gap-5">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-[#DF173C]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              Live Fleet Control
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
            Fleet Radar Map
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time GPS delivery-style tracking for on-field sales reps &
            technicians
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Radio size={13} className="text-emerald-500 animate-pulse" />
            Live 4s Streaming
          </span>
          <button
            onClick={fetchLiveTelemetry}
            className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition cursor-pointer"
            title="Refresh Radar"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin text-[#DF173C]" : ""}
            />
          </button>
        </div>
      </div>

      {error && agents.length === 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>Telemetry sync notice: {error}</span>
          </div>
          <button
            onClick={fetchLiveTelemetry}
            className="font-bold underline text-amber-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Console Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start">
        {/* Left Side: Reps List */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-col h-[700px]">
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search field rep or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#DF173C]"
            />
          </div>

          <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Reps Active ({filteredAgents.length})</span>
            <span>Speed / Status</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => {
                const isSelected = agent.user_id === selectedAgentId;
                const isMoving =
                  (agent.status || "").toLowerCase() === "on route" ||
                  Number(agent.speed) > 2;

                return (
                  <div
                    key={agent.user_id}
                    onClick={() => setSelectedAgentId(agent.user_id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-rose-50/60 border-[#DF173C] shadow-sm"
                        : "bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs text-white ${
                            isSelected ? "bg-[#DF173C]" : "bg-zinc-900"
                          }`}
                        >
                          {(agent.name || "TR").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                            {agent.name}
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#DF173C]" />
                            )}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {agent.employee_code}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            isMoving
                              ? "bg-rose-50 text-[#DF173C] border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {agent.status}
                        </span>
                        <p className="text-[10px] font-mono font-bold text-zinc-700 mt-1">
                          {Math.round(agent.speed || 0)} km/h
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin size={12} className="text-[#DF173C]" />
                        <span className="truncate">
                          {agent.current_destination}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold">
                        {agent.battery_level}% Batt
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 gap-2">
                <Users size={32} className="text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-600">
                  No field reps broadcasting
                </p>
                <p className="text-[11px] text-zinc-400">
                  Reps signed into the mobile application will automatically
                  appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map Radar Viewport */}
        <div className="relative h-[700px] rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-100 shadow-sm">
          <MapContainer
            center={[
              selectedAgent?.latitude || 20.2961,
              selectedAgent?.longitude || 85.8245,
            ]}
            zoom={14}
            zoomControl={false}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
          >
            <MapResizeFix />
            <MapFlyToController selectedAgent={selectedAgent} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {agents
              .filter((a) => a.hasValidCoords)
              .map((agent) => {
                const isSelected = agent.user_id === selectedAgentId;
                return (
                  <React.Fragment key={agent.user_id}>
                    {agent.trail && agent.trail.length > 1 && (
                      <Polyline
                        positions={agent.trail}
                        pathOptions={{
                          color: isSelected ? "#DF173C" : "#71717a",
                          weight: isSelected ? 4 : 2.5,
                          dashArray: isSelected ? "4, 6" : "2, 6",
                          opacity: isSelected ? 0.9 : 0.4,
                        }}
                      />
                    )}

                    <Marker
                      position={[agent.latitude, agent.longitude]}
                      icon={createRiderPin(agent, isSelected)}
                      eventHandlers={{
                        click: () => setSelectedAgentId(agent.user_id),
                      }}
                    >
                      <Popup>
                        <div className="p-1 font-sans min-w-[170px]">
                          <p className="font-extrabold text-xs text-zinc-900">
                            {agent.name}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-medium">
                            Dest: {agent.current_destination}
                          </p>
                          <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-[#DF173C]">
                              {Math.round(agent.speed || 0)} km/h
                            </span>
                            <span className="font-semibold text-zinc-500">
                              {agent.status}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}
          </MapContainer>

          {/* Telemetry Inspection Card */}
          {selectedAgent && (
            <div className="absolute left-4 right-4 sm:right-auto sm:left-4 bottom-4 z-10 sm:w-[390px] bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/80 shadow-2xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-extrabold text-sm">
                    {(selectedAgent.name || "TR").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-950">
                      {selectedAgent.name}
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-400 font-bold">
                      {selectedAgent.employee_code} • {selectedAgent.status}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black font-mono text-[#DF173C] block">
                    {Math.round(selectedAgent.speed || 0)} km/h
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Telemetry
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <Navigation
                    size={14}
                    className="text-[#DF173C] shrink-0 mt-0.5 -rotate-45"
                  />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Active Destination Site
                    </p>
                    <p className="text-xs font-bold text-zinc-800 mt-0.5">
                      {selectedAgent.current_destination}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-zinc-500 font-medium">
                  <span>Battery: {selectedAgent.battery_level}%</span>
                  <span>
                    Lat/Lng: {Number(selectedAgent.latitude).toFixed(4)},{" "}
                    {Number(selectedAgent.longitude).toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100 flex gap-2">
                <a
                  href={`tel:${selectedAgent.phone}`}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Phone size={13} />
                  Call Field Rep
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetRadar;
