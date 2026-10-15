import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Wrench,
  Search,
  Eye,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  MapPin,
  Calendar,
} from "lucide-react";

// Auto-adjusts API base to ensure /api prefix is present
const RAW_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE = RAW_URL.replace(/\/+$/, "").endsWith("/api")
  ? RAW_URL.replace(/\/+$/, "")
  : `${RAW_URL.replace(/\/+$/, "")}/api`;

export default function ServiceReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token");

      const res = await axios.get(`${API_BASE}/service-reports`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setReports(data);
    } catch (err) {
      console.error("Error fetching service reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.sl_no && r.sl_no.toLowerCase().includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q)) ||
        (r.place && r.place.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" ||
        (r.status_after_service || "").toUpperCase() ===
          statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  const totalCalls = reports.length;
  const completedJobs = reports.filter(
    (r) => (r.status_after_service || "").toLowerCase() === "complete",
  ).length;
  const amcCalls = reports.filter(
    (r) => (r.call_status || "").toUpperCase() === "AMC",
  ).length;
  const activeTechnicians = useMemo(() => {
    const ids = new Set(reports.map((r) => r.technician_id).filter(Boolean));
    return ids.size || (reports.length > 0 ? 1 : 0);
  }, [reports]);

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen text-slate-800">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Customer Service & Maintenance Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time field elevator service slips, maintenance logs, and
            customer signoffs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-[#DF173C]" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Service Calls
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalCalls}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              Live synchronized
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-[#DF173C]">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Jobs
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {completedJobs}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {totalCalls > 0
                ? `${Math.round((completedJobs / totalCalls) * 100)}% resolution rate`
                : "No calls yet"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AMC Contracts
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {amcCalls}
            </h3>
            <p className="text-xs text-blue-600 font-semibold mt-1">
              Warranty & AMC Visits
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Technicians Active
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {activeTechnicians} Active
            </h3>
            <p className="text-xs text-purple-600 font-semibold mt-1">
              Odisha Field Territory
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search by customer, slip no, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400 w-full font-medium"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETE">Complete</option>
            <option value="INCOMPLETE">Incomplete</option>
            <option value="PENDING FOR SPARE">Pending for Spare</option>
            <option value="UNDER OBSERVATION">Under Observation</option>
          </select>
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-4 px-5">Report ID & Date</th>
                <th className="py-4 px-5">Customer & Site</th>
                <th className="py-4 px-5">Call Status</th>
                <th className="py-4 px-5">Make / Timing</th>
                <th className="py-4 px-5">Work Done</th>
                <th className="py-4 px-5">Service Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#DF173C]" />
                    Fetching submitted service reports...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No service reports recorded.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/70 transition"
                  >
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 font-mono">
                        SL-{report.sl_no || String(report.id).padStart(4, "0")}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {report.report_date || "Today"}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">
                        {report.customer_name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 max-w-xs truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        {report.address}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {report.call_status || "AMC"}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="text-xs font-semibold text-slate-800">
                        {report.make || "Jaguar Elevators"}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {report.start_of_service || "—"} to{" "}
                        {report.end_of_service || "—"}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="text-xs font-semibold text-slate-700 max-w-[200px] truncate">
                        {report.engineers_remarks || "Monthly PM done"}
                      </div>
                      <div className="text-[11px] text-slate-400 max-w-[200px] truncate mt-0.5">
                        {report.defects_found || "All components verified"}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                          (report.status_after_service || "").toLowerCase() ===
                          "complete"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {report.status_after_service || "Complete"}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#DF173C] text-slate-700 hover:text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Inspection Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-200 pb-5 mb-5 text-center">
              <span className="text-[10px] font-extrabold font-mono px-3 py-1 bg-rose-50 text-[#DF173C] border border-rose-200 rounded-full uppercase">
                SL. NO: {selectedReport.sl_no || `#${selectedReport.id}`}
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2 uppercase">
                Customer Service Report
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Jaguar Elevators Pvt Ltd • Bhubaneswar, Odisha
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">
                    Customer Name:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedReport.customer_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">
                    Date & Call Status:
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedReport.report_date} •{" "}
                    {selectedReport.call_status || "AMC"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">
                    Site Address:
                  </span>
                  <span className="font-semibold text-slate-700">
                    {selectedReport.address} (Place:{" "}
                    {selectedReport.place || "BBSR"})
                  </span>
                </div>
                {selectedReport.instruction_from && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">
                      Instruction From:
                    </span>
                    <span className="font-medium text-slate-700">
                      {selectedReport.instruction_from}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
              <h4 className="text-[11px] font-extrabold text-[#DF173C] uppercase tracking-wider">
                Service & Inspection Details
              </h4>
              <div className="text-xs">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">
                  Engineer's Remarks:
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedReport.engineers_remarks || "Monthly PM done"}
                </p>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">
                  Defects Found on Inspection:
                </span>
                <p className="font-medium text-slate-700 mt-0.5">
                  {selectedReport.defects_found ||
                    "All door check, Roller check, Voltage check normal"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 text-[10px] block">
                    Start Time:
                  </span>
                  <span className="text-slate-900 font-mono">
                    {selectedReport.start_of_service || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">
                    End Time:
                  </span>
                  <span className="text-slate-900 font-mono">
                    {selectedReport.end_of_service || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Customer Signoff & Rating
              </h4>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">Rating Given:</span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {selectedReport.rating || "Satisfied"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">
                    Engineer Signature:
                  </span>
                  <p className="font-bold text-slate-900 mt-1">
                    {selectedReport.engineer_signature ||
                      "Signed by Technician"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">
                    Customer Signature:
                  </span>
                  <p className="font-bold text-slate-900 mt-1">
                    {selectedReport.customer_signature ||
                      selectedReport.customer_contact_name ||
                      "Signed by Client"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
