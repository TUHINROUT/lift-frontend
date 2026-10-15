
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpDown, Plus, Search, CheckCircle, XCircle, X, Loader2, AlertCircle,
  Calendar, Building2, MapPin, User, Shield, Wrench, Hash, Upload, FileText,
  Gauge, Settings, DoorOpen, Ruler, ClipboardList, Hash as HashIcon, Check
} from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

const LIFT_TYPES = ['Passenger', 'Goods', 'Hospital', 'Panoramic', 'Home Lift'];
const MACHINE_TYPES = ['Geared', 'Gearless'];
const DOOR_TYPES = ['Automatic', 'Manual', 'Center Opening', 'Telescopic'];
const STATUS_OPTIONS = ['Operational', 'Under Maintenance', 'Breakdown', 'Decommissioned'];

const LIFT_PHASES = [
  'CONSULTATION', 'SITE_VISIT', 'MANUFACTURING', 
  'INSTALLATION', 'TESTING', 'HANDOVER'
];

const emptyForm = {
  lift_code: '',
  customer_id: '',
  building_name: '',
  address: '',
  latitude: '',
  longitude: '',
  installation_date: '',
  warranty: '',
  amc: '',
  status: 'Operational',
  capacity: '',
  lift_type: 'Passenger',
  machine_type: 'Geared',
  controller_type: '',
  door_type: 'Automatic',
  stops: '',
  floors: '',
  manufacturer: '',
  serial_number: '',
  drawing: '',
  remarks: '',
};

const isImageDataUrl = (value) => typeof value === 'string' && value.startsWith('data:image/');
const isPdfDataUrl = (value) => typeof value === 'string' && value.startsWith('data:application/pdf');

const resolveDrawingUrl = (drawing) => {
  if (!drawing) return null;
  if (/^https?:\/\//i.test(drawing) || drawing.startsWith('data:')) return drawing;
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
  return `${base}/uploads/${drawing.replace(/^\/+/, '')}`;
};
const isImageUrl = (value) => isImageDataUrl(value) || (typeof value === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(value));
const isPdfUrl = (value) => isPdfDataUrl(value) || (typeof value === 'string' && /\.pdf($|\?)/i.test(value));

const Lifts = () => {
  const [lifts, setLifts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [viewLift, setViewLift] = useState(null);
  
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [drawingFile, setDrawingFile] = useState(null);
  const [drawingPreview, setDrawingPreview] = useState('');

  const fetchLifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}lifts`, authHeaders());
      setLifts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load lifts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}customers`, authHeaders());
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    fetchLifts();
    fetchCustomers();
  }, [fetchLifts, fetchCustomers]);

  const updateForm = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setDrawingFile(null);
    setDrawingPreview('');
    setFormError(null);
  };

  const handleDrawingSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
        setFormError("Please select an image or PDF file");
        return;
    }

    setFormError(null);
    setDrawingFile(file);

    if (isImage) {
        setDrawingPreview(URL.createObjectURL(file));
    } else {
        setDrawingPreview("");
    }
  };

  const removeDrawing = () => {
    setDrawingFile(null);
    setDrawingPreview('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.lift_code.trim()) {
      setFormError('Lift code is required');
      return;
    }
    if (!form.customer_id) {
      setFormError('Customer is required');
      return;
    }
    if (!form.building_name.trim()) {
      setFormError('Building name is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append("lift_code", form.lift_code);
      formData.append("customer_id", Number(form.customer_id));
      formData.append("building_name", form.building_name);
      formData.append("address", form.address);
      formData.append("latitude", form.latitude);
      formData.append("longitude", form.longitude);
      
      if (form.installation_date) formData.append("installation_date", form.installation_date);
      if (form.warranty) formData.append("warranty", form.warranty);
      if (form.amc) formData.append("amc", form.amc);
      if (form.status) formData.append("status", form.status);
      if (form.capacity) formData.append("capacity", form.capacity);
      if (form.lift_type) formData.append("lift_type", form.lift_type);
      if (form.machine_type) formData.append("machine_type", form.machine_type);
      if (form.controller_type) formData.append("controller_type", form.controller_type);
      if (form.door_type) formData.append("door_type", form.door_type);
      if (form.stops) formData.append("stops", form.stops);
      if (form.floors) formData.append("floors", form.floors);
      if (form.manufacturer) formData.append("manufacturer", form.manufacturer);
      if (form.serial_number) formData.append("serial_number", form.serial_number);
      if (form.remarks) formData.append("remarks", form.remarks);
      if (drawingFile) formData.append("drawing", drawingFile);
      
      const res = await axios.post(`${API_URL}lifts`, formData, authHeaders());
      setLifts((prev) => [res.data, ...prev]);
      resetForm();
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to create lift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (lift) => {
    setTogglingId(lift.id);
    const action = lift.is_active ? 'deactivate' : 'activate';
    try {
      const res = await axios.patch(`${API_URL}lifts/${lift.id}/${action}`, {}, authHeaders());
      setLifts((prev) => prev.map((l) => (l.id === lift.id ? res.data : l)));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to ${action} lift`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewLift = async (lift) => {
    setViewLift({ ...lift, isPhaseFetching: true });
    
    try {
      const res = await axios.get(`${API_URL}lift-phases/${lift.id}/current`, authHeaders());
      
      const updatedPhase = res.data.current_phase;
      
      // Update modal state
      setViewLift((prev) => prev && prev.id === lift.id ? { 
        ...prev, 
        current_phase: updatedPhase, 
        isPhaseFetching: false 
      } : prev);

      // Sync the fetched phase with the main list state so it shows in "All Lifts"
      setLifts((prev) => prev.map((l) => l.id === lift.id ? { ...l, current_phase: updatedPhase } : l));

    } catch (err) {
      console.error("Failed to fetch current phase:", err);
      setViewLift((prev) => prev && prev.id === lift.id ? { ...prev, isPhaseFetching: false } : prev);
    }
  };

  const handleCompletePhase = async (liftId, phase) => {
    setPhaseLoading(true);
    try {
      await axios.post(`${API_URL}lift-phases/${liftId}/complete`, { phase }, authHeaders());
      
      // Update modal state
      setViewLift((prev) => ({ ...prev, current_phase: phase }));
      
      // Sync the new phase with the main list state immediately
      setLifts((prev) => prev.map((l) => l.id === liftId ? { ...l, current_phase: phase } : l));

    } catch (err) {
      alert(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to complete phase');
    } finally {
      setPhaseLoading(false);
    }
  };

  const filteredLifts = lifts.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.lift_code?.toLowerCase().includes(q) ||
      l.building_name?.toLowerCase().includes(q) ||
      l.project_name?.toLowerCase().includes(q) ||
      l.address?.toLowerCase().includes(q) ||
      l.status?.toLowerCase().includes(q)
    );
  });

  const activeCount = lifts.filter((l) => l.is_active).length;
  const inactiveCount = lifts.length - activeCount;
  const customerCount = new Set(lifts.map((l) => l.customer_id)).size;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Lifts</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage installed lifts across customer sites</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0"
        >
          <Plus size={18} />
          New Lift
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
          placeholder="Search by lift code, building, customer, or address..."
          className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'Total Lifts', value: lifts.length, icon: <ArrowUpDown size={24} />, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Active', value: activeCount, icon: <CheckCircle size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Inactive', value: inactiveCount, icon: <XCircle size={24} />, color: 'text-rose-600', bg: 'bg-rose-100' },
          { title: 'Customers Served', value: customerCount, icon: <User size={24} />, color: 'text-amber-600', bg: 'bg-amber-100' },
        ].map((card, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>{card.icon}</div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{card.value}</h3>
            <p className="text-slate-500 font-semibold text-sm">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Lift List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">All Lifts</h3>
          <button
            onClick={fetchLifts}
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
            <span className="font-semibold text-sm">Loading lifts...</span>
          </div>
        ) : filteredLifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowUpDown size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No lifts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLifts.map((lift) => (
              <div
                key={lift.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-colors gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${lift.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                    <ArrowUpDown size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-slate-800 font-bold tracking-wide">{lift.lift_code}</h4>
                      
                      {/* Maintenance Status Chip */}
                      {lift.status && (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {lift.status}
                        </span>
                      )}

                      {/* Current Phase Chip */}
                      {lift.current_phase && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          Phase: {lift.current_phase.replace('_', ' ')}
                        </span>
                      )}

                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 font-semibold mb-0.5">
                      <Building2 size={14} className="text-slate-400" />
                      <span>{lift.building_name}</span>
                      {lift.project_name && (
                        <>
                          <span className="text-slate-300">•</span>
                          <User size={14} className="text-slate-400" />
                          <span>{lift.project_name}</span>
                        </>
                      )}
                    </div>
                    {lift.address && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium mb-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{lift.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-4 self-start sm:self-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      lift.is_active
                        ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                        : 'border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    {lift.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <button
                    onClick={() => handleViewLift(lift)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    View
                  </button>

                  <button
                    onClick={() => handleToggleActive(lift)}
                    disabled={togglingId === lift.id}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                      lift.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    title={lift.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                  >
                    <span
                      className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-300 ease-in-out flex items-center justify-center ${
                        lift.is_active ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    >
                      {togglingId === lift.id && (
                        <Loader2 size={16} className={`animate-spin ${lift.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Lift Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">New Lift</h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs font-medium text-rose-400 mb-5">
              Fields marked with <span className="text-rose-600 font-bold">*</span> are mandatory
            </p>
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Basic Info */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Basic Info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Lift Code <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.lift_code}
                      onChange={updateForm('lift_code')}
                      placeholder="e.g. LFT-0012"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Customer <span className="text-rose-600 font-bold">*</span></label>
                    {customers.length > 0 ? (
                      <select
                        value={form.customer_id}
                        onChange={updateForm('customer_id')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      >
                        <option value="">Select customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name || c.project_name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={form.customer_id}
                        onChange={updateForm('customer_id')}
                        placeholder="Customer ID"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      />
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Building Name <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.building_name}
                      onChange={updateForm('building_name')}
                      placeholder="e.g. Skyline Towers"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Address <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={updateForm('address')}
                      placeholder="Full site address"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Latitude <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={updateForm('latitude')}
                      placeholder="20.2961"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Longitude <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={updateForm('longitude')}
                      placeholder="85.8245"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Warranty & Status */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Warranty & Status</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Installation Date <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="date"
                      value={form.installation_date}
                      onChange={updateForm('installation_date')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Status <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.status}
                      onChange={updateForm('status')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Warranty <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.warranty}
                      onChange={updateForm('warranty')}
                      placeholder="e.g. 2 years"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">AMC <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.amc}
                      onChange={updateForm('amc')}
                      placeholder="e.g. Comprehensive"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Specs */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Technical Specs</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Capacity <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.capacity}
                      onChange={updateForm('capacity')}
                      placeholder="e.g. 8 persons / 544 kg"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Lift Type <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.lift_type}
                      onChange={updateForm('lift_type')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {LIFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Machine Type <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.machine_type}
                      onChange={updateForm('machine_type')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {MACHINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Controller Type <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.controller_type}
                      onChange={updateForm('controller_type')}
                      placeholder="e.g. VVVF Micro"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Door Type <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.door_type}
                      onChange={updateForm('door_type')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {DOOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Manufacturer <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.manufacturer}
                      onChange={updateForm('manufacturer')}
                      placeholder="e.g. Otis"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Stops <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="number"
                      value={form.stops}
                      onChange={updateForm('stops')}
                      placeholder="e.g. 6"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Floors <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="number"
                      value={form.floors}
                      onChange={updateForm('floors')}
                      placeholder="e.g. 7"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Serial Number <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.serial_number}
                      onChange={updateForm('serial_number')}
                      placeholder="e.g. SN-2024-0912"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  
                  {/* Drawing: click-to-select photo or PDF */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Drawing (Photo or PDF)</label>
                    <input
                      type="file"
                      id="drawing-upload"
                      accept="image/*,application/pdf"
                      onChange={handleDrawingSelect}
                      className="hidden"
                    />
                    {!drawingFile ? (
                      <label
                        htmlFor="drawing-upload"
                        className="cursor-pointer flex items-center gap-2 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all font-medium text-sm"
                      >
                        <Upload size={16} />
                        Click to select photo or PDF
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {drawingFile.type.startsWith('image/') ? (
                          <img src={drawingPreview} alt="Drawing preview" className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                        )}
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{drawingFile.name}</span>
                        <button
                          type="button"
                          onClick={removeDrawing}
                          className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={updateForm('remarks')}
                  placeholder="Any additional notes..."
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
                  onClick={() => { setShowModal(false); resetForm(); }}
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Lift Detail Modal */}
      {viewLift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${viewLift.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                  <ArrowUpDown size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{viewLift.lift_code}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        viewLift.is_active
                          ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                          : 'border-slate-200 text-slate-700 bg-white'
                      }`}
                    >
                      {viewLift.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {viewLift.status && (
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {viewLift.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewLift(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">

              {/* Lift Phases Status Bar */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-5">
                  <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider">Project Phase Progress</p>
                  {viewLift.isPhaseFetching && (
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  )}
                </div>
                
                <div className="relative flex items-center justify-between">
                  {/* Background track line */}
                  <div className="absolute left-0 top-4 w-full h-1 bg-slate-200 z-0 rounded-full"></div>
                  
                  {/* Dynamic active progress line */}
                  <div 
                    className="absolute left-0 top-4 h-1 bg-emerald-500 z-0 rounded-full transition-all duration-500"
                    style={{ width: `${(Math.max(0, LIFT_PHASES.indexOf(viewLift.current_phase)) / (LIFT_PHASES.length - 1)) * 100}%` }}
                  ></div>

                  {LIFT_PHASES.map((phase, idx) => {
                    const currentPhaseIdx = LIFT_PHASES.indexOf(viewLift.current_phase || '');
                    const isCompleted = idx <= currentPhaseIdx;
                    const isNext = idx === currentPhaseIdx + 1;
                    const isFuture = idx > currentPhaseIdx + 1;
                    
                    return (
                      <div key={phase} className={`relative z-10 flex flex-col items-center gap-2 ${isFuture ? 'opacity-40 grayscale' : ''}`}>
                        <button
                          onClick={() => {
                            if (isFuture) {
                              alert("Please complete the previous task(s) first.");
                              return;
                            }
                            if (!isCompleted && !phaseLoading && !viewLift.isPhaseFetching) {
                              handleCompletePhase(viewLift.id, phase);
                            }
                          }}
                          disabled={isCompleted || (phaseLoading && isNext) || viewLift.isPhaseFetching}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : isNext
                              ? 'border-[#DF173C] text-[#DF173C] shadow-[0_0_10px_rgba(223,23,60,0.2)] hover:bg-rose-50 cursor-pointer'
                              : 'border-slate-300 text-slate-400 cursor-not-allowed'
                          }`}
                          title={isCompleted ? 'Completed' : isNext ? 'Click to complete' : 'Locked'}
                        >
                          {phaseLoading && isNext ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isCompleted ? (
                            <Check size={16} />
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </button>
                        <span className={`text-[10px] font-bold text-center absolute top-10 whitespace-nowrap ${
                          isCompleted ? 'text-emerald-600' : isNext ? 'text-[#DF173C]' : 'text-slate-500'
                        }`}>
                          {phase.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="pb-6"></div>
              </div>
              {/* End of Lift Phases Status Bar */}

              {/* Customer & Location */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Customer & Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<User size={14} />} label="Project" value={`${viewLift.project_name || '—'}${viewLift.project_code ? ` (${viewLift.project_code})` : ''}`} />
                  <DetailField icon={<Building2 size={14} />} label="Building" value={viewLift.building_name} />
                  <DetailField icon={<MapPin size={14} />} label="Address" value={viewLift.address} full />
                  <DetailField icon={<MapPin size={14} />} label="Coordinates" value={`${viewLift.latitude ?? '—'}, ${viewLift.longitude ?? '—'}`} />
                </div>
              </div>

              {/* Warranty & Dates */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Warranty & Dates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Calendar size={14} />} label="Installation Date" value={formatDate(viewLift.installation_date)} />
                  <DetailField icon={<Shield size={14} />} label="Warranty" value={viewLift.warranty} />
                  <DetailField icon={<Wrench size={14} />} label="AMC" value={viewLift.amc} />
                  <DetailField icon={<Calendar size={14} />} label="Created" value={formatDateTime(viewLift.created_at)} />
                  <DetailField icon={<Calendar size={14} />} label="Last Updated" value={formatDateTime(viewLift.updated_at)} />
                </div>
              </div>

              {/* Technical Specs */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Technical Specs</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Gauge size={14} />} label="Capacity" value={viewLift.capacity} />
                  <DetailField icon={<Hash size={14} />} label="Lift Type" value={viewLift.lift_type} />
                  <DetailField icon={<Settings size={14} />} label="Machine Type" value={viewLift.machine_type} />
                  <DetailField icon={<Settings size={14} />} label="Controller Type" value={viewLift.controller_type} />
                  <DetailField icon={<DoorOpen size={14} />} label="Door Type" value={viewLift.door_type} />
                  <DetailField icon={<Ruler size={14} />} label="Stops / Floors" value={`${viewLift.stops ?? '—'} / ${viewLift.floors ?? '—'}`} />
                  <DetailField icon={<ClipboardList size={14} />} label="Manufacturer" value={viewLift.manufacturer} />
                  <DetailField icon={<HashIcon size={14} />} label="Serial Number" value={viewLift.serial_number} />
                </div>
              </div>

              {/* Drawing */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Drawing</p>
                {(() => {
                  const drawingUrl = resolveDrawingUrl(viewLift.drawing);
                  if (isImageUrl(viewLift.drawing)) {
                    return (
                      <a href={drawingUrl} target="_blank" rel="noreferrer" className="inline-block">
                        <img src={drawingUrl} alt="Lift drawing" className="h-32 rounded-xl border border-slate-200 object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    );
                  }
                  if (drawingUrl) {
                    return (
                      <a
                        href={drawingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#DF173C] hover:bg-blue-50 hover:border-blue-300 transition-all font-bold text-sm"
                      >
                        <FileText size={16} />
                        View {isPdfUrl(viewLift.drawing) ? 'PDF ' : ''}Drawing
                      </a>
                    );
                  }
                  return <p className="text-sm text-slate-400 font-medium">No drawing uploaded</p>;
                })()}
              </div>

              {/* Remarks */}
              {viewLift.remarks && (
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-wider mb-3">Remarks</p>
                  <p className="text-sm text-slate-600 font-medium bg-slate-50 border border-slate-100 rounded-xl p-4">{viewLift.remarks}</p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                onClick={() => setViewLift(null)}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
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

// Small label/value pair used inside the View modal
const DetailField = ({ icon, label, value, full }) => (
  <div className={`bg-slate-50 border border-slate-100 rounded-xl p-3 ${full ? 'sm:col-span-2' : ''}`}>
    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <p className="text-sm text-slate-700 font-semibold break-words">{value || '—'}</p>
  </div>
);

export default Lifts;