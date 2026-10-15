import axios from "axios";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { resetApiAccess } from "../../utils/apiAccess";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const DEMO_FINANCE = {
  first_name: "Demo",
  last_name: "Finance",
  email: "finance.demo@somniatetech.com",
  password: "Finance@123",
};

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  department_id: "",
  designation_id: "",
  role_id: "",
  profile_photo: null,
};

const AddEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoInfo, setDemoInfo] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}users`, authHeaders());
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || "Failed to load employees",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    // 1. Fetch all departments
    try {
      const resAll = await axios.get(`${API_URL}departments`, authHeaders());
      const dataAll = Array.isArray(resAll.data) ? resAll.data : [];
      setAllDepartments(dataAll);
      setDepartments(dataAll.filter((d) => d.is_active !== false));
    } catch {
      setAllDepartments([]);
      setDepartments([]);
    }

    // 2. Fetch designations
    try {
      const res = await axios.get(`${API_URL}designations`, authHeaders());
      const data = Array.isArray(res.data) ? res.data : [];
      setDesignations(data.filter((d) => d.is_active !== false));
    } catch {
      setDesignations([]);
    }

    // 3. Fetch roles
    try {
      const res = await axios.get(`${API_URL}roles`, authHeaders());
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchLookups();
  }, [fetchEmployees, fetchLookups]);

  // Clean restricted dropdown strictly to EMPLOYEE and MANAGER
  const filteredRoles = useMemo(() => {
    const mgrRole = roles.find(
      (r) => (r.name || "").trim().toUpperCase() === "MANAGER",
    );
    const empRole = roles.find((r) => {
      const n = (r.name || "").trim().toUpperCase();
      return n === "EMPLOYEE" || n === "TECHNICIAN" || n === "USER";
    });

    const result = [];
    if (empRole) {
      result.push({ id: empRole.id, name: "EMPLOYEE" });
    } else if (roles.length > 0) {
      result.push({ id: roles[0].id, name: "EMPLOYEE" });
    }

    if (mgrRole) {
      result.push({ id: mgrRole.id, name: "MANAGER" });
    }

    return result;
  }, [roles]);

  const departmentName = (id) =>
    allDepartments.find((d) => String(d.id) === String(id))?.name ||
    (id ? `#${id}` : "—");

  const designationName = (id) =>
    designations.find((d) => String(d.id) === String(id))?.name ||
    (id ? `#${id}` : "—");

  const roleName = (id) => {
    const found = roles.find((r) => String(r.id) === String(id));
    if (!found) return id ? `#${id}` : "—";
    const upper = (found.name || "").trim().toUpperCase();
    if (upper === "TECHNICIAN" || upper === "USER") return "EMPLOYEE";
    return found.name;
  };

  const resolvePhotoUrl = (photo) => {
    if (!photo) return null;
    if (typeof photo !== "string") return null;
    if (/^https?:\/\//i.test(photo)) return photo;
    const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const cleanPath = photo.replace(/^\/+/, "");
    if (cleanPath.startsWith("uploads/")) {
      return `${base}/${cleanPath}`;
    }
    return `${base}/uploads/${cleanPath}`;
  };

  const parseErrorMessage = (err, defaultMsg) => {
    const d = err.response?.data?.detail;
    if (Array.isArray(d)) {
      return d
        .map((item) => item.msg || item.message || JSON.stringify(item))
        .join(", ");
    }
    if (typeof d === "string") return d;
    return err.message || defaultMsg;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required");
      return;
    }
    if (!form.email.trim()) {
      setFormError("Email is required");
      return;
    }
    if (!form.password.trim()) {
      setFormError("Password is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("first_name", form.first_name.trim());
      fd.append("last_name", form.last_name.trim());
      fd.append("email", form.email.trim());
      fd.append("password", form.password);

      if (form.department_id) fd.append("department_id", form.department_id);
      if (form.designation_id) fd.append("designation_id", form.designation_id);
      if (form.role_id) fd.append("role_id", form.role_id);
      if (form.profile_photo instanceof File) {
        fd.append("profile_photo", form.profile_photo);
      }

      const res = await axios.post(`${API_URL}users`, fd, authHeaders());
      setEmployees((prev) => [res.data, ...prev]);
      setForm(emptyForm);
      setShowModal(false);
    } catch (err) {
      setFormError(parseErrorMessage(err, "Failed to create employee"));
    } finally {
      setSubmitting(false);
    }
  };


  // One click: makes sure a Finance department + designation exist, then creates
  // (or reuses) a demo Finance login and shows its user id / password.
  const createDemoFinance = async () => {
    setDemoBusy(true);
    setDemoInfo(null);
    const cred = { email: DEMO_FINANCE.email, password: DEMO_FINANCE.password };
    try {
      const pickOrCreate = async (list, re, path, name, description) => {
        const found = list.find((x) => re.test(String(x.name || "")));
        if (found) return found;
        const res = await axios.post(`${API_URL}${path}`, { name, description }, authHeaders());
        return res.data;
      };
      const dept = await pickOrCreate(
        allDepartments, /financ/i, "departments", "Finance", "Finance & Accounts department",
      );
      const desig = await pickOrCreate(
        designations, /financ|account/i, "designations", "Finance Executive", "Finance & Accounts executive",
      );
      const roleId = filteredRoles[0]?.id;

      const exists = employees.find(
        (e) => String(e.email || "").toLowerCase() === cred.email,
      );
      if (exists) {
        setDemoInfo({ ...cred, note: "This demo employee already exists — use the same login below." });
      } else {
        const fd = new FormData();
        fd.append("first_name", DEMO_FINANCE.first_name);
        fd.append("last_name", DEMO_FINANCE.last_name);
        fd.append("email", cred.email);
        fd.append("password", cred.password);
        if (dept?.id) fd.append("department_id", dept.id);
        if (desig?.id) fd.append("designation_id", desig.id);
        if (roleId) fd.append("role_id", roleId);
        const res = await axios.post(`${API_URL}users`, fd, authHeaders());
        setEmployees((prev) => [res.data, ...prev]);
        setDemoInfo({ ...cred, note: "Demo Finance employee created." });
      }
      resetApiAccess();
      fetchLookups();
    } catch (err) {
      const msg = parseErrorMessage(err, "Could not create the demo employee");
      setDemoInfo({
        ...cred,
        error: /exist|already|duplicate|registered/i.test(String(msg))
          ? null
          : msg,
        note: /exist|already|duplicate|registered/i.test(String(msg))
          ? "This email is already registered — use the login below."
          : "",
      });
    } finally {
      setDemoBusy(false);
    }
  };

  // Fixed 0-Error Toggle Active Handler
  const handleToggleActive = async (emp) => {
    setTogglingId(emp.id);
    setError(null);
    try {
      // Primary: Call the dedicated patch status toggle route
      const res = await axios.patch(
        `${API_URL}users/${emp.id}/toggle-status`,
        {},
        authHeaders(),
      );
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? res.data : e)));
    } catch {
      // Secondary Fallback: Use FormData on PUT if PATCH is unavailable
      try {
        const fd = new FormData();
        fd.append("is_active", String(!emp.is_active));
        const resFallback = await axios.put(
          `${API_URL}users/${emp.id}`,
          fd,
          authHeaders(),
        );
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? resFallback.data : e)),
        );
      } catch (err) {
        setError(parseErrorMessage(err, "Failed to update employee status"));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEditForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      email: emp.email || "",
      password: "",
      employee_code: emp.employee_code || "",
      company_id: emp.company_id ?? "",
      department_id: emp.department_id ?? "",
      designation_id: emp.designation_id ?? "",
      role_id: emp.role_id ?? "",
      profile_photo: emp.profile_photo || "",
    });
    setEditFormError(null);
    setShowEditModal(true);
  };

  const editPhotoPreview = useMemo(() => {
    if (editForm.profile_photo instanceof File) {
      return URL.createObjectURL(editForm.profile_photo);
    }
    return resolvePhotoUrl(editForm.profile_photo);
  }, [editForm.profile_photo]);

  useEffect(() => {
    return () => {
      if (editForm.profile_photo instanceof File && editPhotoPreview) {
        URL.revokeObjectURL(editPhotoPreview);
      }
    };
  }, [editPhotoPreview, editForm.profile_photo]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setEditFormError("First and last name are required");
      return;
    }
    setEditSubmitting(true);
    setEditFormError(null);
    try {
      const fd = new FormData();
      fd.append("first_name", editForm.first_name.trim());
      fd.append("last_name", editForm.last_name.trim());
      if (editForm.employee_code) {
        fd.append("employee_code", editForm.employee_code.trim());
      }
      if (editForm.company_id) fd.append("company_id", editForm.company_id);
      if (editForm.department_id)
        fd.append("department_id", editForm.department_id);
      if (editForm.designation_id)
        fd.append("designation_id", editForm.designation_id);
      if (editForm.role_id) fd.append("role_id", editForm.role_id);

      if (editForm.profile_photo instanceof File) {
        fd.append("profile_photo", editForm.profile_photo);
      }
      fd.append("is_active", String(Boolean(editingEmployee.is_active)));
      fd.append("is_verified", String(Boolean(editingEmployee.is_verified)));
      fd.append("is_superuser", String(Boolean(editingEmployee.is_superuser)));

      const res = await axios.put(
        `${API_URL}users/${editingEmployee.id}`,
        fd,
        authHeaders(),
      );
      setEmployees((prev) =>
        prev.map((e) => (e.id === editingEmployee.id ? res.data : e)),
      );
      setShowEditModal(false);
      setEditingEmployee(null);
    } catch (err) {
      setEditFormError(parseErrorMessage(err, "Failed to update employee"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteError(null);
    try {
      await axios.delete(`${API_URL}users/${deleteTarget.id}`, authHeaders());
      setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(parseErrorMessage(err, "Failed to delete employee"));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesQuery =
        !q ||
        (e.first_name || "").toLowerCase().includes(q) ||
        (e.last_name || "").toLowerCase().includes(q) ||
        (e.employee_code || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q);
      const matchesDesignation =
        !designationFilter ||
        String(e.designation_id) === String(designationFilter);
      const matchesDepartment =
        !departmentFilter ||
        String(e.department_id) === String(departmentFilter);
      return matchesQuery && matchesDesignation && matchesDepartment;
    });
  }, [employees, searchQuery, designationFilter, departmentFilter]);

  const activeCount = useMemo(
    () => employees.filter((e) => e.is_active).length,
    [employees],
  );
  const inactiveCount = employees.length - activeCount;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Employees</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Manage employee accounts and access
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
        <button
          onClick={createDemoFinance}
          disabled={demoBusy}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-amber-300 font-bold rounded-xl transition-colors text-sm cursor-pointer"
        >
          {demoBusy ? "Creating…" : "Add Demo Finance Employee"}
        </button>
        <button
          onClick={() => {
            setForm({
              ...emptyForm,
              role_id: filteredRoles[0]?.id || "",
            });
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm cursor-pointer"
        >
          <Plus size={18} />
          Add Employee
        </button>
        </div>
      </div>


      {demoInfo && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-slate-900">Finance demo login</p>
              {demoInfo.note && <p className="text-sm text-slate-600 mt-0.5">{demoInfo.note}</p>}
              {demoInfo.error && <p className="text-sm text-rose-600 mt-0.5">{demoInfo.error}</p>}
            </div>
            <button onClick={() => setDemoInfo(null)} className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer">×</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">User ID (email)</p>
              <p className="font-mono font-bold text-slate-900 select-all">{demoInfo.email}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Password</p>
              <p className="font-mono font-bold text-slate-900 select-all">{demoInfo.password}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative group shadow-sm rounded-2xl flex-1">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search
              className="text-slate-400 group-focus-within:text-blue-600 transition-colors"
              size={20}
            />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or email..."
            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
          />
        </div>

        <div className="relative shadow-sm rounded-2xl sm:w-64 shrink-0">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full appearance-none pl-5 pr-10 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="relative shadow-sm rounded-2xl sm:w-64 shrink-0">
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="w-full appearance-none pl-5 pr-10 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base cursor-pointer"
          >
            <option value="">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          {
            title: "Total Employees",
            value: employees.length,
            icon: <UserPlus size={24} />,
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
          {
            title: "Active",
            value: activeCount,
            icon: <CheckCircle size={24} />,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
          {
            title: "Inactive",
            value: inactiveCount,
            icon: <XCircle size={24} />,
            color: "text-rose-600",
            bg: "bg-rose-100",
          },
        ].map((card, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">
              {card.value}
            </h3>
            <p className="text-slate-500 font-semibold text-sm">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Employee List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">
            All Employees
            {(designationFilter || departmentFilter) && (
              <span className="ml-2 text-xs font-bold text-slate-400">
                ({filteredEmployees.length} of {employees.length})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-4">
            {(designationFilter || departmentFilter || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDesignationFilter("");
                  setDepartmentFilter("");
                }}
                className="text-sm font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear filters
              </button>
            )}
            <button
              onClick={fetchEmployees}
              className="text-sm font-bold text-[#DF173C] hover:text-[#B81331] cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-semibold text-sm">Loading employees...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserPlus size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">
              {designationFilter || departmentFilter || searchQuery
                ? "No employees match the current filters"
                : "No employees found"}
            </p>
            {(designationFilter || departmentFilter || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDesignationFilter("");
                  setDepartmentFilter("");
                }}
                className="mt-2 text-sm font-bold text-[#DF173C] hover:text-[#B81331] cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                    {emp.profile_photo ? (
                      <img
                        src={resolvePhotoUrl(emp.profile_photo)}
                        alt={emp.first_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span>
                        {(emp.first_name?.[0] || "") +
                          (emp.last_name?.[0] || "")}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="text-slate-800 font-bold tracking-wide">
                        {emp.first_name} {emp.last_name}
                      </h4>
                      {emp.employee_code && (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {emp.employee_code}
                        </span>
                      )}
                      {emp.is_superuser && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          <ShieldCheck size={12} /> Admin
                        </span>
                      )}
                    </div>
                    {emp.email && (
                      <div className="flex items-center gap-1 text-sm text-slate-500 font-medium mb-1.5">
                        <Mail size={12} />
                        <span>{emp.email}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium mb-1.5">
                      <div className="flex items-center gap-1">
                        <Building2 size={12} />
                        <span>
                          {departmentName(emp.department_id)} •{" "}
                          {designationName(emp.designation_id)} •{" "}
                          {roleName(emp.role_id)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                      {emp.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>Created: {formatDate(emp.created_at)}</span>
                        </div>
                      )}
                      {emp.updated_at && (
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>Updated: {formatDate(emp.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-start sm:self-auto">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      emp.is_active
                        ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                        : "border-slate-200 text-slate-700 bg-white"
                    }`}
                  >
                    {emp.is_active ? "Active" : "Inactive"}
                  </span>

                  <button
                    onClick={() => handleToggleActive(emp)}
                    disabled={togglingId === emp.id}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                      emp.is_active ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                    title={
                      emp.is_active
                        ? "Click to Deactivate"
                        : "Click to Activate"
                    }
                  >
                    <span
                      className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-300 ease-in-out flex items-center justify-center ${
                        emp.is_active ? "translate-x-6" : "translate-x-0"
                      }`}
                    >
                      {togglingId === emp.id && (
                        <Loader2
                          size={16}
                          className={`animate-spin ${
                            emp.is_active
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        />
                      )}
                    </span>
                  </button>

                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit employee"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() => {
                      setDeleteTarget(emp);
                      setDeleteError(null);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete employee"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">
                Add Employee
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, first_name: e.target.value }))
                    }
                    placeholder="e.g. Jane"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, last_name: e.target.value }))
                    }
                    placeholder="e.g. Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="e.g. jane@company.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Set a password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Department
                  </label>
                  <select
                    value={form.department_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, department_id: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm cursor-pointer"
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Designation
                  </label>
                  <select
                    value={form.designation_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, designation_id: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm cursor-pointer"
                  >
                    <option value="">Select designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Role
                </label>
                <select
                  value={form.role_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role_id: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm cursor-pointer"
                >
                  <option value="">Select role</option>
                  {filteredRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Profile Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, profile_photo: e.target.files[0] }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError(null);
                  }}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-60 cursor-pointer"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">
                Edit Employee
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEmployee(null);
                  setEditFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex flex-col items-center mb-2">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                    {editPhotoPreview ? (
                      <img
                        src={editPhotoPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={36} className="text-slate-300" />
                    )}
                  </div>
                  <label
                    htmlFor="edit-profile-photo-input"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-sm border-2 border-white transition-colors"
                    title="Change photo"
                  >
                    <Camera size={14} />
                  </label>
                  <input
                    id="edit-profile-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setEditForm((f) => ({ ...f, profile_photo: file }));
                      }
                    }}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2">
                  Click the camera icon to upload a new photo
                </p>
                {editForm.profile_photo instanceof File && (
                  <p className="text-xs text-blue-600 font-semibold mt-0.5 truncate max-w-[220px]">
                    {editForm.profile_photo.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, first_name: e.target.value }))
                    }
                    placeholder="e.g. Jane"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, last_name: e.target.value }))
                    }
                    placeholder="e.g. Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Email can't be changed here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Department
                  </label>
                  <select
                    value={editForm.department_id}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        department_id: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm cursor-pointer"
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                    {editForm.department_id &&
                      !departments.some(
                        (d) => String(d.id) === String(editForm.department_id),
                      ) && (
                        <option value={editForm.department_id}>
                          {departmentName(editForm.department_id)} (Inactive)
                        </option>
                      )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Designation
                  </label>
                  <select
                    value={editForm.designation_id}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        designation_id: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm cursor-pointer"
                  >
                    <option value="">Select designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                    {editForm.designation_id &&
                      !designations.some(
                        (d) => String(d.id) === String(editForm.designation_id),
                      ) && (
                        <option value={editForm.designation_id}>
                          {designationName(editForm.designation_id)} (Inactive)
                        </option>
                      )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Role
                </label>
                <select
                  value={editForm.role_id}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role_id: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm cursor-pointer"
                >
                  <option value="">Select role</option>
                  {filteredRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {editFormError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  {editFormError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                    setEditFormError(null);
                  }}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#DF173C] hover:bg-[#DF173C]/80 text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-60 cursor-pointer"
                >
                  {editSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-800">
                Delete Employee
              </h3>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-700">
                {deleteTarget.first_name} {deleteTarget.last_name}
              </span>
              ? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                <AlertCircle size={16} className="shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletingId === deleteTarget.id}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-60 cursor-pointer"
              >
                {deletingId === deleteTarget.id && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEmployee;
