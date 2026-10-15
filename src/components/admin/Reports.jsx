import axios from "axios";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  FileBarChart,
  Search,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  Building2,
  User,
  Hash,
  ClipboardList,
  Ticket,
  Layers,
  CheckCircle2,
  Download,
  Calendar,
  MapPin,
  UserCheck,
  FileSignature,
  Image as ImageIcon,
  AlertTriangle,
  MessageSquareText,
  ChevronDown,
  X,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const resolveFileUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, "");
  return `${base}/uploads/${path.replace(/^\/+/, "")}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusColor = (status) => {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "CLOSED", "RESOLVED"].includes(s))
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (["OPEN", "PENDING", "IN_PROGRESS"].includes(s))
    return "text-amber-600 bg-amber-50 border-amber-200";
  if (["HIGH", "CRITICAL", "BREAKDOWN"].includes(s))
    return "text-rose-600 bg-rose-50 border-rose-200";
  return "text-slate-500 bg-slate-100 border-slate-200";
};

const Reports = () => {
  const [liftCode, setLiftCode] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef(null);

  // Lift dropdown state
  const [lifts, setLifts] = useState([]);
  const [liftsLoading, setLiftsLoading] = useState(false);
  const [liftsError, setLiftsError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchLifts = async () => {
      setLiftsLoading(true);
      setLiftsError(null);
      try {
        const res = await axios.get(`${API_URL}lifts`, authHeaders());
        setLifts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setLifts([]);
        setLiftsError(
          err.response?.data?.detail || err.message || "Failed to load lifts",
        );
      } finally {
        setLiftsLoading(false);
      }
    };
    fetchLifts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLifts = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return lifts;
    return lifts.filter((l) =>
      [l.lift_code, l.project_name, l.building_name, l.customer_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [lifts, filterText]);

  const selectLift = (code) => {
    setLiftCode(code);
    setFilterText("");
    setDropdownOpen(false);
  };

  const fetchReport = async (e) => {
    e?.preventDefault();
    const code = liftCode.trim();

    if (!code) {
      setError("Lift code is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      // Query param ensures slashes are never misinterpreted as sub-paths
      const res = await axios.get(`${API_URL}reports/lift`, {
        ...authHeaders(),
        params: { lift_code: code },
      });
      setReport(res.data);
    } catch (err) {
      setReport(null);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Failed to load report");
      } else {
        setError(detail || err.message || "Failed to load report");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!report) return;
    setDownloading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_URL}reports/pdf/lift`, {
        ...authHeaders(),
        params: { lift_code: report.lift_code },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanFileName = String(report.lift_code).replace(/[/\\]/g, "-");
      link.download = `Report-${cleanFileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = "Failed to download PDF";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = Array.isArray(parsed.detail)
            ? parsed.detail[0]?.msg
            : parsed.detail || message;
        } catch {
          // ignore parsing error
        }
      } else {
        message = err.response?.data?.detail || err.message || message;
      }
      setError(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Reports</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Look up a full lift report by lift code
          </p>
        </div>
        {report && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            Download PDF
          </button>
        )}
      </div>

      {/* Search Input */}
      <form
        onSubmit={fetchReport}
        className="relative group shadow-sm rounded-2xl flex gap-3"
      >
        <div className="relative flex-1" ref={dropdownRef}>
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search
              className="text-slate-400 group-focus-within:text-blue-600 transition-colors"
              size={20}
            />
          </div>

          <input
            type="text"
            value={dropdownOpen ? filterText : liftCode}
            onChange={(e) => {
              setFilterText(e.target.value);
              setLiftCode(e.target.value);
              if (!dropdownOpen) setDropdownOpen(true);
            }}
            onFocus={() => {
              setFilterText("");
              setDropdownOpen(true);
            }}
            placeholder={
              liftsLoading ? "Loading lifts..." : "Select or search a lift code"
            }
            autoComplete="off"
            className="w-full pl-14 pr-16 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
          />

          <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-1">
            {liftCode && (
              <button
                type="button"
                onClick={() => {
                  setLiftCode("");
                  setFilterText("");
                }}
                className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Toggle lift list"
            >
              {liftsLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ChevronDown
                  size={16}
                  className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>
          </div>

          {dropdownOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-lg max-h-72 overflow-y-auto">
              {liftsError ? (
                <div className="flex items-center gap-2 px-4 py-3 text-rose-600 text-sm font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  {liftsError}
                </div>
              ) : filteredLifts.length > 0 ? (
                filteredLifts.map((lift) => (
                  <button
                    key={lift.id}
                    type="button"
                    onClick={() => selectLift(lift.lift_code)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <p className="text-sm font-bold text-slate-800">
                      {lift.lift_code}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                      {[lift.project_name, lift.building_name]
                        .filter(Boolean)
                        .join(" — ") || "—"}
                    </p>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-slate-400 text-sm font-semibold">
                  {liftsLoading ? "Loading lifts..." : "No lifts found"}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !liftCode.trim()}
          className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-2xl transition-colors text-sm shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileBarChart size={18} />
          )}
          Get Report
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-semibold text-sm">Loading report...</span>
        </div>
      )}

      {!loading && searched && !error && !report && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileBarChart size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold text-sm">
            No report found
          </p>
        </div>
      )}

      {!loading && report && (
        <div ref={reportRef} className="space-y-6">
          {/* Lift Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <ArrowUpDown size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">
                    {report.lift_code}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Lift ID: {report.lift_id}
                  </p>
                </div>
              </div>
              {report.current_phase && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  Phase: {String(report.current_phase).replace(/_/g, " ")}
                </span>
              )}
            </div>

            {report.customer && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DetailField
                  icon={<User size={14} />}
                  label="Customer"
                  value={report.customer.name}
                />
                <DetailField
                  icon={<Hash size={14} />}
                  label="Customer Code"
                  value={report.customer.customer_code}
                />
                <DetailField
                  icon={<Building2 size={14} />}
                  label="Customer ID"
                  value={report.customer.id}
                />
              </div>
            )}
          </div>

          {/* Phase History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} className="text-[#DF173C]" />
              <h3 className="text-lg font-black text-slate-800">
                Phase History
              </h3>
            </div>
            {report.phase_history?.length > 0 ? (
              <div className="space-y-3">
                {report.phase_history.map((ph, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-emerald-500 shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {String(ph.phase_name || "").replace(/_/g, " ")}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <UserCheck size={12} className="text-slate-400" />{" "}
                          {ph.completed_by || "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Calendar size={12} className="text-slate-400" />{" "}
                          {formatDateTime(ph.completed_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRow
                icon={<Layers size={20} />}
                label="No phase history recorded"
              />
            )}
          </div>

          {/* Tasks */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-[#DF173C]" />
              <h3 className="text-lg font-black text-slate-800">Tasks</h3>
            </div>
            {report.tasks?.length > 0 ? (
              <div className="space-y-4">
                {report.tasks.map((task, idx) => (
                  <div
                    key={task.task_id ?? idx}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          {task.task_number}
                        </p>
                      </div>
                      {task.status && (
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${statusColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailField
                        icon={<User size={14} />}
                        label="Assigned To"
                        value={task.assigned_to}
                      />
                      <DetailField
                        icon={<User size={14} />}
                        label="Assigned By"
                        value={task.assigned_by}
                      />
                      <DetailField
                        icon={<Calendar size={14} />}
                        label="Created"
                        value={formatDateTime(task.created_at)}
                      />
                      <DetailField
                        icon={<Calendar size={14} />}
                        label="Due Date"
                        value={formatDate(task.due_date)}
                      />
                    </div>

                    {task.execution && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-2">
                          Execution
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField
                            icon={<Calendar size={14} />}
                            label="Started"
                            value={formatDateTime(task.execution.start_time)}
                          />
                          <DetailField
                            icon={<Calendar size={14} />}
                            label="Completed"
                            value={formatDateTime(
                              task.execution.completed_time,
                            )}
                          />
                          <DetailField
                            icon={<MapPin size={14} />}
                            label="Start Location"
                            value={
                              task.execution.start_latitude != null
                                ? `${task.execution.start_latitude}, ${task.execution.start_longitude}`
                                : null
                            }
                          />
                          <DetailField
                            icon={<MapPin size={14} />}
                            label="Completion Location"
                            value={
                              task.execution.completed_latitude != null
                                ? `${task.execution.completed_latitude}, ${task.execution.completed_longitude}`
                                : null
                            }
                          />
                        </div>

                        {(task.execution.client_signature ||
                          task.execution.client_photo) && (
                          <div className="flex gap-4 mt-3 flex-wrap">
                            {task.execution.client_signature && (
                              <a
                                href={resolveFileUrl(
                                  task.execution.client_signature,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-col items-center gap-1.5"
                              >
                                <img
                                  src={resolveFileUrl(
                                    task.execution.client_signature,
                                  )}
                                  alt="Client signature"
                                  className="h-16 rounded-lg border border-slate-200 bg-white object-contain px-2"
                                />
                                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                  <FileSignature size={12} /> Signature
                                </span>
                              </a>
                            )}
                            {task.execution.client_photo && (
                              <a
                                href={resolveFileUrl(
                                  task.execution.client_photo,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-col items-center gap-1.5"
                              >
                                <img
                                  src={resolveFileUrl(
                                    task.execution.client_photo,
                                  )}
                                  alt="Client photo"
                                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                                />
                                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                  <ImageIcon size={12} /> Photo
                                </span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {task.questions_and_answers?.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <MessageSquareText size={14} /> Questions & Answers
                        </p>
                        <div className="space-y-2">
                          {task.questions_and_answers.map((qa, qIdx) => (
                            <div key={qIdx} className="text-sm">
                              <p className="font-semibold text-slate-700">
                                {qa.question}
                              </p>
                              <p className="text-slate-500 font-medium">
                                {qa.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRow
                icon={<ClipboardList size={20} />}
                label="No tasks recorded"
              />
            )}
          </div>

          {/* Tickets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Ticket size={18} className="text-[#DF173C]" />
              <h3 className="text-lg font-black text-slate-800">Tickets</h3>
            </div>
            {report.tickets?.length > 0 ? (
              <div className="space-y-3">
                {report.tickets.map((ticket, idx) => (
                  <div
                    key={ticket.ticket_id ?? idx}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {ticket.ticket_number}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {ticket.complaint_description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ticket.priority && (
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${statusColor(ticket.priority)}`}
                          >
                            <AlertTriangle size={12} /> {ticket.priority}
                          </span>
                        )}
                        {ticket.status && (
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor(ticket.status)}`}
                          >
                            {ticket.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailField
                        icon={<Hash size={14} />}
                        label="Type"
                        value={ticket.ticket_type}
                      />
                      <DetailField
                        icon={<Calendar size={14} />}
                        label="Created"
                        value={formatDateTime(ticket.created_at)}
                      />
                      <DetailField
                        icon={<Calendar size={14} />}
                        label="Closed"
                        value={formatDateTime(ticket.closed_at)}
                      />
                      <DetailField
                        icon={<MessageSquareText size={14} />}
                        label="Closing Remarks"
                        value={ticket.closing_remarks}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRow
                icon={<Ticket size={20} />}
                label="No tickets recorded"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DetailField = ({ icon, label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <p className="text-sm text-slate-700 font-semibold break-words">
      {value ?? "—"}
    </p>
  </div>
);

const EmptyRow = ({ icon, label }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-300">
    {icon}
    <p className="text-slate-500 font-semibold text-sm mt-2">{label}</p>
  </div>
);

export default Reports;
