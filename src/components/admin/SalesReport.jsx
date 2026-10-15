import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  DollarSign,
  Filter,
  Download,
  Search,
  MapPin,
  UserCheck,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Phone,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const formatCurrencyINR = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "₹ 0";
  const num = Number(val);
  return "₹ " + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const formatPipelineTotal = (total) => {
  if (!total || isNaN(total)) return "₹ 0";
  if (total >= 10000000) {
    return `₹ ${(total / 10000000).toFixed(2)} Cr`;
  }
  if (total >= 100000) {
    return `₹ ${(total / 100000).toFixed(2)} Lakh`;
  }
  return formatCurrencyINR(total);
};

const formatVisitDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split("T")[0];
};

const formatVisitTime = (timeStr) => {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  const parts = String(timeStr).split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, "0")}:${minutes} ${ampm}`;
  }
  return timeStr;
};

const SalesReport = () => {
  const [visits, setVisits] = useState([]);
  const [, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedVisit, setSelectedVisit] = useState(null);

  const fetchSalesVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitsRes, usersRes] = await Promise.allSettled([
        axios.get(`${API_URL}sales-visits`, authHeaders()),
        axios.get(`${API_URL}users`, authHeaders()),
      ]);

      const usersDict = {};
      if (
        usersRes.status === "fulfilled" &&
        Array.isArray(usersRes.value?.data)
      ) {
        usersRes.value.data.forEach((u) => {
          const fullName = [u.first_name, u.last_name]
            .filter(Boolean)
            .join(" ");
          usersDict[u.id] = {
            name: fullName || u.email || `Staff #${u.id}`,
            code:
              u.employee_code ||
              u.employee_id ||
              `EV-EMP-${String(u.id).padStart(3, "0")}`,
          };
        });
      }
      setUsersMap(usersDict);

      if (
        visitsRes.status === "fulfilled" &&
        Array.isArray(visitsRes.value?.data)
      ) {
        const mapped = visitsRes.value.data.map((item) => {
          const userMeta = usersDict[item.created_by] || {
            name: "Sales Executive",
            code: item.created_by ? `EV-EMP-${item.created_by}` : "EV-EMP-001",
          };

          return {
            id: item.report_number || `SR-${item.id}`,
            rawId: item.id,
            salesPerson: userMeta.name,
            employeeId: userMeta.code,
            clientName: item.client_name || "Unknown Client",
            contactPerson: item.contact_person || "Site Contact",
            phone: item.phone || "—",
            location: item.location || "Odisha",
            liftType: item.lift_type || "Standard Elevator",
            units: Number(item.units) || 1,
            estimatedQuote: Number(item.estimated_quote) || 0,
            visitDate: formatVisitDate(item.visit_date),
            visitTime: formatVisitTime(item.visit_time),
            status: item.status || "New Lead",
            notes: item.notes || "No visit notes recorded.",
            siteImage: item.site_image || null,
          };
        });
        setVisits(mapped);
      } else {
        setVisits([]);
        if (visitsRes.status === "rejected") {
          setError(
            visitsRes.reason?.response?.data?.detail ||
              "Could not retrieve field records",
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not synchronize field visits",
      );
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesVisits();
  }, [fetchSalesVisits]);

  // Filtered visits based on user search and dropdown filter
  const filteredVisits = useMemo(() => {
    return visits.filter((item) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (item.salesPerson || "").toLowerCase().includes(q) ||
        (item.clientName || "").toLowerCase().includes(q) ||
        (item.location || "").toLowerCase().includes(q) ||
        (item.id || "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "All" ||
        (item.status || "").toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [visits, searchTerm, statusFilter]);

  // Derived KPI calculations synced with active database view
  const totalVisitsCount = filteredVisits.length;

  const pipelineValue = useMemo(() => {
    return filteredVisits.reduce((acc, curr) => {
      const quote = Number(curr.estimatedQuote);
      return acc + (isNaN(quote) ? 0 : quote);
    }, 0);
  }, [filteredVisits]);

  const dealsConvertedCount = useMemo(() => {
    return filteredVisits.filter(
      (v) => (v.status || "").toLowerCase() === "deal closed",
    ).length;
  }, [filteredVisits]);

  const conversionPercentage = useMemo(() => {
    if (!totalVisitsCount) return "0.0";
    return ((dealsConvertedCount / totalVisitsCount) * 100).toFixed(1);
  }, [dealsConvertedCount, totalVisitsCount]);

  const uniqueSalesReps = useMemo(() => {
    const repSet = new Set(
      filteredVisits.map((v) => v.salesPerson).filter(Boolean),
    );
    return repSet.size;
  }, [filteredVisits]);

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "deal closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "negotiation":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "follow-up needed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Field Sales & Visit Reports
          </h1>
          <p className="text-sm text-gray-500">
            Real-time field client visit logs, lift specifications, and deal
            updates submitted by sales reps
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSalesVisits}
            className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors shadow-xs cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin text-[#DF173C]" : ""}
            />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#DF173C] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#c01333] transition-colors shadow-xs cursor-pointer"
          >
            <Download size={18} />
            Export All Records
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>Notice: {error}</span>
          </div>
          <button
            onClick={fetchSalesVisits}
            className="font-semibold underline text-amber-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Client Visits
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <Loader2 size={20} className="animate-spin text-gray-300" />
              ) : (
                totalVisitsCount
              )}
            </h3>
            <span className="text-xs font-medium text-emerald-600 mt-1 inline-block">
              Live synchronized
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-[#DF173C]">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Pipeline Value
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <Loader2 size={20} className="animate-spin text-gray-300" />
              ) : (
                formatPipelineTotal(pipelineValue)
              )}
            </h3>
            <span className="text-xs font-medium text-blue-600 mt-1 inline-block">
              Across {totalVisitsCount} recorded quotes
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Deals Converted
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <Loader2 size={20} className="animate-spin text-gray-300" />
              ) : (
                dealsConvertedCount
              )}
            </h3>
            <span className="text-xs font-medium text-emerald-600 mt-1 inline-block">
              {conversionPercentage}% conversion rate
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Reps On Field
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <Loader2 size={20} className="animate-spin text-gray-300" />
              ) : (
                `${uniqueSalesReps} Active`
              )}
            </h3>
            <span className="text-xs font-medium text-gray-500 mt-1 inline-block">
              Odisha Territory
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <UserCheck size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by sales rep, customer, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#DF173C]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Filter size={18} className="text-gray-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#DF173C]"
          >
            <option value="All">All Statuses</option>
            <option value="New Lead">New Lead</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Follow-up Needed">Follow-up Needed</option>
            <option value="Deal Closed">Deal Closed</option>
          </select>
        </div>
      </div>

      {/* Submissions Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Report ID & Date</th>
                <th className="px-6 py-4">Sales Executive</th>
                <th className="px-6 py-4">Client / Site</th>
                <th className="px-6 py-4">Lift Requirement</th>
                <th className="px-6 py-4">Est. Quote</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVisits.length > 0 ? (
                filteredVisits.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 block font-mono">
                        {item.id}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {item.visitDate}{" "}
                        {item.visitTime ? `• ${item.visitTime}` : ""}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {item.salesPerson}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.employeeId}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {item.clientName}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-[#DF173C]" />{" "}
                        {item.location}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-gray-900 font-medium block">
                        {item.liftType}
                      </span>
                      <span className="text-xs text-gray-400">
                        Quantity: {item.units} unit(s)
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                      {formatCurrencyINR(item.estimatedQuote)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedVisit(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-[#DF173C] hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye size={14} /> Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={36} className="text-gray-300" />
                      <p className="font-medium text-gray-600">
                        No field visit reports recorded yet
                      </p>
                      <p className="text-xs text-gray-400">
                        New logs submitted by field executives will appear here
                        automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Inspection Modal for Admin */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-6">
                <div>
                  <span className="text-xs font-bold text-[#DF173C] tracking-wider uppercase">
                    Field Visit Details
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1 font-mono">
                    {selectedVisit.id}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <span
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border ${getStatusBadge(
                    selectedVisit.status,
                  )}`}
                >
                  Current Status: {selectedVisit.status}
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Executive Info
                  </p>
                  <p className="text-gray-800 font-medium">
                    Logged By:{" "}
                    <span className="text-gray-900 font-bold">
                      {selectedVisit.salesPerson}
                    </span>{" "}
                    ({selectedVisit.employeeId})
                  </p>
                  <p className="text-gray-600">
                    Time of Visit: {selectedVisit.visitDate}{" "}
                    {selectedVisit.visitTime
                      ? `at ${selectedVisit.visitTime}`
                      : ""}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Customer / Building
                  </p>
                  <p className="text-gray-900 font-bold text-base">
                    {selectedVisit.clientName}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-gray-400" />
                    Contact: {selectedVisit.contactPerson}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    {selectedVisit.phone}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#DF173C]" />{" "}
                    {selectedVisit.location}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Lift Specification & Deal Value
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Configuration:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedVisit.liftType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Required Units:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedVisit.units} Unit(s)
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                    <span className="text-gray-900 font-bold">
                      Estimated Deal Value:
                    </span>
                    <span className="text-lg font-extrabold text-[#DF173C]">
                      {formatCurrencyINR(selectedVisit.estimatedQuote)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Executive On-Site Notes
                  </p>
                  <p className="text-gray-700 leading-relaxed italic bg-white p-3 rounded-lg border border-gray-200">
                    "{selectedVisit.notes}"
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-3 mt-6">
              <a
                href={`tel:${selectedVisit.phone}`}
                className="flex-1 py-2.5 px-4 bg-gray-900 text-white rounded-xl text-center text-sm font-medium hover:bg-black transition-colors"
              >
                Call Contact
              </a>
              <button
                onClick={() => setSelectedVisit(null)}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl text-center text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReport;
