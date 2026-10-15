import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const Designations = () => {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchDesignations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}designations`, authHeaders());
      setDesignations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load designations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await axios.post(
        `${API_URL}designations`,
        { name: form.name.trim(), description: form.description.trim() },
        authHeaders(),
      );
      setDesignations((prev) => [res.data, ...prev]);
      setForm({ name: "", description: "" });
      setShowModal(false);
    } catch (err) {
      setFormError(
        err.response?.data?.detail?.[0]?.msg ||
          err.response?.data?.detail ||
          "Failed to create designation",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (desig) => {
    setTogglingId(desig.id);
    const action = desig.is_active ? "deactivate" : "activate";
    try {
      const res = await axios.patch(
        `${API_URL}designations/${desig.id}/${action}`,
        {},
        authHeaders(),
      );
      setDesignations((prev) =>
        prev.map((d) => (d.id === desig.id ? res.data : d)),
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          `Failed to ${action} designation`,
      );
    } finally {
      setTogglingId(null);
    }
  };

  const filteredDesignations = designations.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.designation_code?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    );
  });

  const activeCount = designations.filter((d) => d.is_active).length;
  const inactiveCount = designations.length - activeCount;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-full bg-[#f4f4f5] px-3 py-4 sm:px-5 lg:px-7 xl:px-8 animate-in fade-in duration-500">
      <div className="mx-auto max-w-[1500px] space-y-4">
        {/* Executive Header */}
        <section className="relative overflow-hidden rounded-[26px] bg-[#09090b] text-white shadow-[0_22px_60px_-32px_rgba(0,0,0,0.65)]">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#DF173C]/20 blur-3xl" />
          <div className="absolute bottom-[-90px] left-[42%] h-52 w-72 rounded-full bg-white/[0.04] blur-3xl" />

          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-7">
            <div className="flex items-start gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-inner shadow-white/5">
                <Briefcase size={24} className="text-[#ff3157]" />
                <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#09090b] bg-emerald-400" />
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Workforce Administration
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live System
                  </span>
                </div>

                <h1 className="text-[27px] font-black leading-none tracking-[-0.04em] sm:text-[32px]">
                  Designations
                </h1>
                <p className="mt-2 max-w-2xl text-xs font-medium leading-5 text-zinc-400 sm:text-sm">
                  Define employee roles, responsibilities, and workforce
                  positions across the organization.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:justify-end">
              <div className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 sm:block">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Directory
                </p>
                <p className="mt-0.5 text-sm font-black text-white">
                  {loading ? "—" : designations.length} Roles
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#DF173C] px-5 text-sm font-bold text-white shadow-[0_10px_30px_-12px_rgba(223,23,60,0.8)] transition-all duration-200 hover:bg-[#f01b43] hover:shadow-[0_14px_35px_-12px_rgba(223,23,60,0.9)] active:scale-[0.98]"
              >
                <Plus size={17} />
                New Designation
              </button>
            </div>
          </div>
        </section>

        {/* Search Command Row */}
        <section className="flex flex-col gap-3 rounded-[20px] border border-zinc-200/80 bg-white p-2 shadow-[0_10px_30px_-25px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search size={18} className="text-zinc-400" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designations, codes, or descriptions..."
              className="h-11 w-full rounded-xl border border-transparent bg-zinc-50 pl-11 pr-11 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-[#DF173C]/20 focus:bg-white focus:ring-4 focus:ring-[#DF173C]/5"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-1 sm:pr-1">
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 sm:block">
              Status
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {loading ? "Syncing" : "Operational"}
            </span>
          </div>
        </section>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              title: "Total Designations",
              value: designations.length,
              caption: "Defined employee roles",
              icon: <Briefcase size={19} />,
              iconClass: "border-zinc-200 bg-zinc-950 text-[#ff3157]",
            },
            {
              title: "Active",
              value: activeCount,
              caption: "Currently available",
              icon: <CheckCircle size={19} />,
              iconClass: "border-emerald-100 bg-emerald-50 text-emerald-600",
            },
            {
              title: "Inactive",
              value: inactiveCount,
              caption: "Requires attention",
              icon: <XCircle size={19} />,
              iconClass: "border-rose-100 bg-rose-50 text-rose-600",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-[19px] border border-zinc-200/80 bg-white p-4.5 shadow-[0_10px_30px_-26px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_38px_-25px_rgba(0,0,0,0.42)]"
            >
              <div className="absolute right-[-25px] top-[-25px] h-24 w-24 rounded-full bg-zinc-100 blur-2xl opacity-70" />

              <div className="relative flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.iconClass}`}
                >
                  {card.icon}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.17em] text-zinc-400">
                  Live Metric
                </span>
              </div>

              <div className="relative mt-4">
                <div className="text-[32px] font-black leading-none tracking-[-0.05em] text-zinc-950">
                  {loading ? (
                    <Loader2 size={23} className="animate-spin text-zinc-300" />
                  ) : (
                    card.value
                  )}
                </div>
                <p className="mt-2 text-xs font-black text-zinc-800">
                  {card.title}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                  {card.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Directory */}
        <section className="overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_14px_40px_-30px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/10">
                <Briefcase size={18} className="text-[#ff3157]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-black tracking-[-0.01em] text-zinc-950">
                    Role Directory
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                    {filteredDesignations.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                  Employee positions and current availability
                </p>
              </div>
            </div>

            <button
              onClick={fetchDesignations}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-600 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 size={14} className={loading ? "animate-spin" : ""} />
              Refresh Directory
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Loader2 size={21} className="animate-spin text-[#DF173C]" />
                </div>
                <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Synchronizing roles
                </span>
              </div>
            ) : filteredDesignations.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-300 shadow-sm">
                  <Briefcase size={24} />
                </div>
                <p className="mt-3 text-sm font-bold text-zinc-700">
                  No designations found
                </p>
                <p className="mt-1 max-w-xs text-xs font-medium text-zinc-400">
                  Try another search or create a new employee designation.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {filteredDesignations.map((desig, index) => (
                  <div
                    key={desig.id}
                    className="group relative overflow-hidden rounded-[18px] border border-zinc-100 bg-[#fafafa] p-4 transition-all duration-250 hover:border-zinc-200 hover:bg-white hover:shadow-[0_14px_32px_-25px_rgba(0,0,0,0.45)]"
                  >
                    <div
                      className={`absolute left-0 top-0 h-full w-0.5 ${
                        desig.is_active ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                    />

                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                          desig.is_active
                            ? "border-emerald-100 bg-white text-emerald-600"
                            : "border-zinc-200 bg-white text-zinc-400"
                        }`}
                      >
                        <Briefcase size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black tracking-[-0.01em] text-zinc-900">
                            {desig.name}
                          </h3>

                          {desig.designation_code && (
                            <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-zinc-400">
                              {desig.designation_code}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-5 text-zinc-400">
                          {desig.description || "No description provided"}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[9px] font-semibold text-zinc-400">
                          {desig.created_at && (
                            <span className="flex items-center gap-1.5">
                              <Calendar size={11} />
                              Created {formatDate(desig.created_at)}
                            </span>
                          )}

                          {desig.updated_at && (
                            <span className="flex items-center gap-1.5">
                              <span className="text-zinc-300">•</span>
                              Updated {formatDate(desig.updated_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <span
                          className={`hidden rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] sm:inline-flex ${
                            desig.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-white text-zinc-500"
                          }`}
                        >
                          {desig.is_active ? "Active" : "Inactive"}
                        </span>

                        <button
                          onClick={() => handleToggleActive(desig)}
                          disabled={togglingId === desig.id}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-inner transition-all duration-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                            desig.is_active ? "bg-emerald-500" : "bg-zinc-300"
                          }`}
                          title={
                            desig.is_active
                              ? "Click to Deactivate"
                              : "Click to Activate"
                          }
                          aria-label={
                            desig.is_active
                              ? `Deactivate ${desig.name}`
                              : `Activate ${desig.name}`
                          }
                        >
                          <span
                            className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 ${
                              desig.is_active
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          >
                            {togglingId === desig.id && (
                              <Loader2
                                size={13}
                                className={`animate-spin ${
                                  desig.is_active
                                    ? "text-emerald-600"
                                    : "text-zinc-400"
                                }`}
                              />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                        Role {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            desig.is_active ? "bg-emerald-500" : "bg-zinc-300"
                          }`}
                        />
                        {desig.is_active ? "Available" : "Disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3.5 text-[10px] font-semibold text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              {searchQuery
                ? `${filteredDesignations.length} matching designation${
                    filteredDesignations.length === 1 ? "" : "s"
                  }`
                : `${designations.length} designation${
                    designations.length === 1 ? "" : "s"
                  } registered`}
            </span>

            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Directory synchronized
            </span>
          </div>
        </section>
      </div>

      {/* Create Designation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-4 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setFormError(null);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_35px_90px_-25px_rgba(0,0,0,0.6)]">
            <div className="relative overflow-hidden bg-zinc-950 px-5 py-5 text-white sm:px-6">
              <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#DF173C]/20 blur-3xl" />

              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                    <Briefcase size={18} className="text-[#ff3157]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">New Designation</h3>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                      Add a new employee role
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Designation Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Senior Developer"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-[#DF173C]/40 focus:bg-white focus:ring-4 focus:ring-[#DF173C]/5"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Short description..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-[#DF173C]/40 focus:bg-white focus:ring-4 focus:ring-[#DF173C]/5"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError(null);
                  }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-950"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#DF173C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#DF173C]/20 transition-all hover:bg-[#c91235] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? "Creating..." : "Create Designation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Designations;
