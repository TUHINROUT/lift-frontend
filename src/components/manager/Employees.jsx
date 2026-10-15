import axios from 'axios';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Mail,
  User,
  RefreshCw,
  X,
  Building2,
  Briefcase,
  ShieldCheck,
  Hash,
} from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});


const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal state
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/users -> id, employee_code, first_name, last_name, email,
      // department_name, designation_name, role_name, is_active, ...
      const res = await axios.get(`${API_URL}users`, authHeaders());
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const departmentName = (emp) => emp.department_name || '—';
  const designationName = (emp) => emp.designation_name || '—';
  const roleName = (emp) => emp.role_name || '—';

  const resolvePhotoUrl = (photo) => {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo)) return photo;
    const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    return `${base}/uploads/${photo.replace(/^\/+/, '')}`;
  };

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q)
      );
    });
  }, [employees, searchQuery]);

  // Open modal immediately with the row's data (from the list) while the
  // full GET /users/{id} record loads in the background.
  const openEmployee = useCallback(async (emp) => {
    setSelectedId(emp.id);
    setSelectedEmployee(emp);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}users/${emp.id}`, authHeaders());
      setSelectedEmployee(res.data);
    } catch (err) {
      setDetailError(err.response?.data?.detail || err.message || 'Failed to load employee details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeModal = () => {
    setSelectedId(null);
    setSelectedEmployee(null);
    setDetailError(null);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">Employees</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {employees.length} employee{employees.length === 1 ? '' : 's'} total
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email..."
              className="pl-10 pr-4 py-2.5 w-full sm:w-64 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF173C]/20 focus:border-[#DF173C] transition-all font-medium text-sm"
            />
          </div>
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="shrink-0 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Loading / empty */}
      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 size={28} className="animate-spin text-[#DF173C]" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400">
          <User size={40} className="mb-3" />
          <p className="font-semibold text-sm">No employees found</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list (below sm) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredEmployees.map((emp) => {
              const photoUrl = resolvePhotoUrl(emp.profile_photo);
              return (
                <button
                  key={emp.id}
                  onClick={() => openEmployee(emp)}
                  className="w-full text-left bg-white border border-slate-200 rounded-2xl shadow-sm p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${emp.first_name} ${emp.last_name}`}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                        <User size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <Mail size={12} className="shrink-0" /> {emp.email}
                      </p>
                    </div>
                    {emp.is_active ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                        <CheckCircle size={10} /> Active
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold">
                        <XCircle size={10} /> Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="text-slate-400 font-medium">Department</div>
                    <div className="text-slate-600 font-semibold text-right truncate">{departmentName(emp)}</div>
                    <div className="text-slate-400 font-medium">Designation</div>
                    <div className="text-slate-600 font-semibold text-right truncate">{designationName(emp)}</div>
                    <div className="text-slate-400 font-medium">Role</div>
                    <div className="text-slate-600 font-semibold text-right truncate">{roleName(emp)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* sm and up: table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Employee</th>
                    <th className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Department</th>
                    <th className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Designation</th>
                    <th className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                    <th className="text-left px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const photoUrl = resolvePhotoUrl(emp.profile_photo);
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => openEmployee(emp)}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={`${emp.first_name} ${emp.last_name}`}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <User size={16} />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Mail size={12} /> {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 font-medium">{departmentName(emp)}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-medium">{designationName(emp)}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-medium">{roleName(emp)}</td>
                        <td className="px-6 py-3.5">
                          {emp.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                              <CheckCircle size={12} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                              <XCircle size={12} /> Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 z-10">
              <h3 className="text-base sm:text-lg font-black text-slate-800">Employee Details</h3>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5">
              {detailLoading && !selectedEmployee ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={26} className="animate-spin text-[#DF173C]" />
                </div>
              ) : detailError && !selectedEmployee ? (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  {detailError}
                </div>
              ) : selectedEmployee ? (
                <>
                  {detailLoading && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Loader2 size={14} className="animate-spin" /> Refreshing details...
                    </div>
                  )}
                  {detailError && (
                    <div className="mb-3 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                      <AlertCircle size={16} className="shrink-0" />
                      {detailError}
                    </div>
                  )}

                  {/* Identity */}
                  <div className="flex items-center gap-4 mb-5">
                    {resolvePhotoUrl(selectedEmployee.profile_photo) ? (
                      <img
                        src={resolvePhotoUrl(selectedEmployee.profile_photo)}
                        alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                        className="w-16 h-16 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                        <User size={26} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-lg truncate">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </p>
                      <p className="text-sm text-slate-500 font-medium truncate flex items-center gap-1.5">
                        <Mail size={14} className="shrink-0" /> {selectedEmployee.email}
                      </p>
                      {selectedEmployee.is_active ? (
                        <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold">
                          <CheckCircle size={11} /> Active
                        </span>
                      ) : (
                        <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[11px] font-bold">
                          <XCircle size={11} /> Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                      <Hash size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Employee Code</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedEmployee.employee_code || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                      <Building2 size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Department</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedEmployee.department_name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                      <Briefcase size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Designation</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedEmployee.designation_name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                      <ShieldCheck size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Role</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedEmployee.role_name || '—'}</p>
                      </div>
                    </div>
                 
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;