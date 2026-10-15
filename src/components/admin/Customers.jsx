import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, CheckCircle, XCircle, X, Loader2, AlertCircle, Calendar, Phone, Mail, MapPin, Hash, FileText, Pencil, Trash2 } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+61', label: 'AU +61' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+966', label: 'SA +966' },
  { code: '+974', label: 'QA +974' },
];

const emptyForm = {
  project_name: '',
  contact_person: '',
  mobile_country_code: '+91',
  mobile: '',
  alternate_mobile_country_code: '+91',
  alternate_mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gst_number: '',
  description: '',
};

const RequiredMark = () => <span className="text-rose-500 ml-0.5">*</span>;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}customers`, authHeaders());
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const parseMobile = (value) => {
    if (!value) return { code: '+91', number: '' };
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    const match = sorted.find((c) => value.startsWith(c.code));
    if (match) {
      return { code: match.code, number: value.slice(match.code.length).replace(/\D/g, '').slice(0, 10) };
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length > 10) {
      return { code: `+${digits.slice(0, digits.length - 10)}`, number: digits.slice(-10) };
    }
    return { code: '+91', number: digits.slice(0, 10) };
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (cust) => {
    const mobileParsed = parseMobile(cust.mobile);
    const altParsed = parseMobile(cust.alternate_mobile);
    setForm({
      project_name: cust.project_name || '',
      contact_person: cust.contact_person || '',
      mobile_country_code: mobileParsed.code,
      mobile: mobileParsed.number,
      alternate_mobile_country_code: cust.alternate_mobile ? altParsed.code : '+91',
      alternate_mobile: cust.alternate_mobile ? altParsed.number : '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      pincode: cust.pincode || '',
      gst_number: cust.gst_number || '',
      description: cust.description || '',
    });
    setEditingId(cust.id);
    setFormError(null);
    setShowModal(true);
  };

  const closeFormModal = () => {
    setShowModal(false);
    setFormError(null);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_name.trim()) {
      setFormError('Project name is required');
      return;
    }
    if (!/^\d{10}$/.test(form.mobile.trim())) {
      setFormError('Mobile number must be exactly 10 digits');
      return;
    }
    if (form.alternate_mobile.trim() && !/^\d{10}$/.test(form.alternate_mobile.trim())) {
      setFormError('Alternate mobile number must be exactly 10 digits');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { mobile_country_code, alternate_mobile_country_code, ...rest } = form;
      const payload = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      );
      payload.mobile = `${mobile_country_code}${payload.mobile}`;
      payload.alternate_mobile = payload.alternate_mobile
        ? `${alternate_mobile_country_code}${payload.alternate_mobile}`
        : '';

      if (editingId) {
        const res = await axios.patch(`${API_URL}customers/${editingId}`, payload, authHeaders());
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? res.data : c)));
        setViewCustomer((prev) => (prev?.id === editingId ? res.data : prev));
      } else {
        const res = await axios.post(`${API_URL}customers`, payload, authHeaders());
        setCustomers((prev) => [res.data, ...prev]);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || `Failed to ${editingId ? 'update' : 'create'} customer`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cust) => {
    if (!window.confirm(`Delete "${cust.project_name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(cust.id);
    setError(null);
    try {
      await axios.delete(`${API_URL}customers/${cust.id}`, authHeaders());
      setCustomers((prev) => prev.filter((c) => c.id !== cust.id));
      setViewCustomer((prev) => (prev?.id === cust.id ? null : prev));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete customer');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (cust) => {
    setTogglingId(cust.id);
    const action = cust.is_active ? 'deactivate' : 'activate';
    try {
      const res = await axios.patch(`${API_URL}customers/${cust.id}/${action}`, {}, authHeaders());
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? res.data : c)));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to ${action} customer`);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.project_name?.toLowerCase().includes(q) ||
      c.customer_code?.toLowerCase().includes(q) ||
      c.contact_person?.toLowerCase().includes(q) ||
      c.mobile?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const activeCount = customers.filter((c) => c.is_active).length;
  const inactiveCount = customers.length - activeCount;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Customers</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage customer accounts and contacts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0"
        >
          <Plus size={18} />
          New Customer
        </button>
      </div>

      <div className="relative group shadow-sm rounded-2xl">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, code, contact, mobile, or city..."
          className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          { title: 'Total Customers', value: customers.length, icon: <Users size={24} />, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Active', value: activeCount, icon: <CheckCircle size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Inactive', value: inactiveCount, icon: <XCircle size={24} />, color: 'text-rose-600', bg: 'bg-rose-100' },
        ].map((card, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>{card.icon}</div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{card.value}</h3>
            <p className="text-slate-500 font-semibold text-sm">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Customer List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">All Customers</h3>
          <button
            onClick={fetchCustomers}
            className="text-sm font-bold text-[#DF173C] hover:text-[#B81331]"
          >
            Refresh
          </button>
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
            <span className="font-semibold text-sm">Loading customers...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No customers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                onClick={() => setViewCustomer(cust)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-white hover:shadow-sm transition-colors gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div className={`p-2.5 rounded-lg shrink-0 ${cust.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                    <Users size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {/* Project Name Output */}
                      <h4 className="text-slate-800 font-bold tracking-wide">{cust.project_name}</h4>
                      {/* Project Code Output */}
                      {cust.project_code && (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {cust.project_code}
                        </span>
                      )}
                    </div>
                    {/* Contact Person + Description Output */}
                    {cust.contact_person && (
                      <p className="text-sm text-slate-500 font-medium mb-1 break-words">Contact: {cust.contact_person}</p>
                    )}
                    {cust.description && (
                      <p className="text-sm text-slate-500 font-medium mb-1.5 break-words">{cust.description}</p>
                    )}
                    {/* Contact + Location Chips */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium mb-1.5">
                      {cust.mobile && (
                        <div className="flex items-center gap-1">
                          <Phone size={12} />
                          <span>{cust.mobile}</span>
                        </div>
                      )}
                      {cust.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} />
                          <span>{cust.email}</span>
                        </div>
                      )}
                      {(cust.city || cust.state) && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{[cust.city, cust.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    {/* Timestamps Output (Created / Updated) */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                      {cust.created_at && (
                         <div className="flex items-center gap-1">
                           <Calendar size={12} />
                           <span>Created: {formatDate(cust.created_at)}</span>
                         </div>
                      )}
                      {cust.updated_at && (
                         <div className="flex items-center gap-1">
                           <span>•</span>
                           <span>Updated: {formatDate(cust.updated_at)}</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Actions Output */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto self-stretch sm:self-auto">
                  {/* Status Label */}
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      cust.is_active
                        ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                        : 'border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    {cust.is_active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(cust); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                    title="Edit customer"
                    aria-label="Edit customer"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(cust); }}
                    disabled={deletingId === cust.id}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete customer"
                    aria-label="Delete customer"
                  >
                    {deletingId === cust.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>

                  {/* Custom Pill Toggle (Blue) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(cust); }}
                    disabled={togglingId === cust.id}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                      cust.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    title={cust.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                  >
                    {/* Toggle Thumb */}
                    <span
                      className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-300 ease-in-out flex items-center justify-center ${
                        cust.is_active ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    >
                      {/* Loading Spinner inside thumb */}
                      {togglingId === cust.id && (
                        <Loader2 size={16} className={`animate-spin ${cust.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">{editingId ? 'Edit Project' : 'New Project'}</h3>
              <button
                onClick={closeFormModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
<p className="text-xs font-medium text-rose-400 mb-5">
  Fields marked with <span className="text-rose-600 font-bold">*</span> are mandatory
</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Project Name<RequiredMark /></label>
                <input
                  type="text"
                  value={form.project_name}
                  onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                  placeholder="e.g. Acme Elevators Pvt Ltd"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Contact Person<RequiredMark /></label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Email<RequiredMark /></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. john@acme.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Mobile<RequiredMark /></label>
                  <div className="flex gap-2">
                    <select
                      value={form.mobile_country_code}
                      onChange={(e) => setForm((f) => ({ ...f, mobile_country_code: e.target.value }))}
                      className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.mobile}
                      onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      className="w-full min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Alternate Mobile</label>
                  <div className="flex gap-2">
                    <select
                      value={form.alternate_mobile_country_code}
                      onChange={(e) => setForm((f) => ({ ...f, alternate_mobile_country_code: e.target.value }))}
                      className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.alternate_mobile}
                      onChange={(e) => setForm((f) => ({ ...f, alternate_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="Optional"
                      maxLength={10}
                      className="w-full min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Address<RequiredMark /></label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">State<RequiredMark /></label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="State"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">City<RequiredMark /></label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Pincode<RequiredMark /></label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                    placeholder="Pincode"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">GST Number</label>
                <input
                  type="text"
                  value={form.gst_number}
                  onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm resize-none"
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
                  onClick={closeFormModal}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-60"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    
    {/* Customer Details Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Sticky Header */}
            <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3 sticky top-0 bg-white z-10 pb-2">
              <div className="flex items-center gap-3 min-w-0 w-full">
                <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${viewCustomer.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                  <Users size={22} className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-800 break-words leading-tight">{viewCustomer.project_name}</h3>
                  {viewCustomer.project_code && (
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1 inline-block">
                      {viewCustomer.project_code}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewCustomer(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <span
                  className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    viewCustomer.is_active
                      ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                      : 'border-slate-200 text-slate-700 bg-white'
                  }`}
                >
                  {viewCustomer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3">
                <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Contact Person</p>
                    <p className="text-sm text-slate-800 font-semibold break-words">
                      {viewCustomer.contact_person || '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Email</p>
                    <div className="flex items-start gap-1.5 min-w-0 w-full">
                      <Mail size={13} className="text-slate-400 shrink-0 mt-1" />
                      <p className="text-sm text-slate-800 font-semibold break-words min-w-0 flex-1">
                        {viewCustomer.email || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Mobile</p>
                    <div className="flex items-start gap-1.5 min-w-0 w-full">
                      <Phone size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-800 font-semibold break-words min-w-0 flex-1">
                        {viewCustomer.mobile || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Alternate Mobile</p>
                    <div className="flex items-start gap-1.5 min-w-0 w-full">
                      <Phone size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-800 font-semibold break-words min-w-0 flex-1">
                        {viewCustomer.alternate_mobile || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3">
                <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Location</h4>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Address</p>
                  <div className="flex items-start gap-1.5 min-w-0 w-full">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-1" />
                    <p className="text-sm text-slate-800 font-semibold break-words min-w-0 flex-1">
                      {viewCustomer.address || '—'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">City</p>
                    <p className="text-sm text-slate-800 font-semibold break-words">{viewCustomer.city || '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">State</p>
                    <p className="text-sm text-slate-800 font-semibold break-words">{viewCustomer.state || '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Pincode</p>
                    <p className="text-sm text-slate-800 font-semibold break-words">{viewCustomer.pincode || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3">
                <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Business Info</h4>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">GST Number</p>
                  <div className="flex items-start gap-1.5 min-w-0 w-full">
                    <Hash size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-800 font-semibold break-all min-w-0 flex-1">
                      {viewCustomer.gst_number || '—'}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Description</p>
                  <div className="flex items-start gap-1.5 min-w-0 w-full">
                    <FileText size={13} className="text-slate-400 shrink-0 mt-1" />
                    <p className="text-sm text-slate-800 font-semibold break-all min-w-0 flex-1 whitespace-pre-wrap">
                      {viewCustomer.description || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3">
                <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Timeline</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Created</p>
                    <div className="flex items-start gap-1.5 min-w-0 w-full">
                      <Calendar size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-800 font-semibold break-words min-w-0 flex-1">
                        {formatDate(viewCustomer.created_at) || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-0.5">Updated</p>
                    <div className="flex items-start gap-1.5 min-w-0 w-full">
                      <Calendar size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-800 font-semibold break-words min-w-0 flex-1">
                        {formatDate(viewCustomer.updated_at) || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-5 sm:pt-6 mt-auto">
              <button
                type="button"
                onClick={() => handleDelete(viewCustomer)}
                disabled={deletingId === viewCustomer.id}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === viewCustomer.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => openEditModal(viewCustomer)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="flex-1 px-4 py-3 bg-slate-900 border border-transparent text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;