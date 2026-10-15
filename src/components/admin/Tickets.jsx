
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Plus,
  Search,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Phone,
  User,
  ArrowUpDown,
  Building2,
  MessageSquare,
  Tag,
  UserCheck,
  Lock,
  Unlock,
  ClipboardList,
  Pencil,
  LockKeyhole,
  Filter,
  ChevronDown,
} from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

const TICKET_TYPE_OPTIONS = ['SERVICE_REQUEST', 'BREAKDOWN', 'INSTALLATION_ISSUE', 'AMC_VISIT', 'INSPECTION', 'SPARE_PARTS', 'GENERAL_COMPLAINT'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'];

const emptyForm = {
  ticket_number: '',
  customer_id: '',
  contact_person: '',
  contact_number: '',
  lift_id: '',
  ticket_type: 'SERVICE_REQUEST',
  priority: 'LOW',
  complaint_description: '',
  status: 'OPEN',
};

const priorityStyle = (priority) => {
  switch ((priority || '').toLowerCase()) {
    case 'urgent':
      return 'border-rose-200 text-rose-600 bg-rose-50';
    case 'high':
      return 'border-orange-200 text-orange-600 bg-orange-50';
    case 'medium':
      return 'border-amber-200 text-amber-600 bg-amber-50';
    case 'low':
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    default:
      return 'border-slate-200 text-slate-600 bg-slate-50';
  }
};

const statusStyle = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'closed':
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    case 'in_progress':
    case 'in progress':
      return 'border-blue-200 text-blue-600 bg-blue-50';
    case 'cancelled':
      return 'border-rose-200 text-rose-600 bg-rose-50';
    case 'open':
      return 'border-amber-200 text-amber-600 bg-amber-50';
    default:
      return 'border-slate-200 text-slate-700 bg-white';
  }
};

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lifts, setLifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);

  // Close ticket flow
  const [closingTicket, setClosingTicket] = useState(null);
  const [closingRemarks, setClosingRemarks] = useState('');
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const [closingError, setClosingError] = useState(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}tickets`, authHeaders());
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load tickets');
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

  const fetchLifts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}lifts`, authHeaders());
      setLifts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLifts([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}users`, authHeaders());
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
    fetchLifts();
    fetchUsers();
  }, [fetchTickets, fetchCustomers, fetchLifts, fetchUsers]);

  const updateForm = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditingTicket(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (ticket) => {
    setEditingTicket(ticket);
    setForm({
      ticket_number: ticket.ticket_number || '',
      customer_id: ticket.customer_id ?? '',
      contact_person: ticket.contact_person || '',
      contact_number: ticket.contact_number || '',
      lift_id: ticket.lift_id ?? '',
      ticket_type: ticket.ticket_type || 'SERVICE_REQUEST',
      priority: ticket.priority || 'LOW',
      complaint_description: ticket.complaint_description || '',
      status: ticket.status || 'OPEN',
    });
    setFormError(null);
    setViewTicket(null);
    setShowModal(true);
  };

  const lookupCustomerLabel = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return `Customer #${customerId}`;
    return customer.name || customer.project_name || `Customer #${customerId}`;
  };

  const lookupLiftLabel = (liftId) => {
    if (!liftId) return '—';
    const lift = lifts.find((l) => l.id === liftId);
    return lift ? `${lift.lift_code}${lift.building_name ? ` — ${lift.building_name}` : ''}` : `Lift #${liftId}`;
  };

  const lookupUserName = (userId) => {
    if (!userId) return '—';
    const u = users.find((usr) => usr.id === userId);
    if (!u) return `User #${userId}`;
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return `${fullName || u.email || `User #${userId}`}${u.employee_code ? ` (${u.employee_code})` : ''}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ticket_number.trim()) {
      setFormError('Ticket number is required');
      return;
    }
    if (!form.customer_id) {
      setFormError('Customer is required');
      return;
    }
    if (!form.contact_person.trim()) {
      setFormError('Contact person is required');
      return;
    }
    if (!form.contact_number.trim()) {
      setFormError('Contact number is required');
      return;
    }
    if (!form.lift_id) {
      setFormError('Lift is required');
      return;
    }
    if (!form.complaint_description.trim()) {
      setFormError('Complaint description is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingTicket) {
        const payload = {
          customer_id: Number(form.customer_id),
          contact_person: form.contact_person,
          contact_number: form.contact_number,
          lift_id: Number(form.lift_id),
          ticket_type: form.ticket_type,
          priority: form.priority,
          complaint_description: form.complaint_description,
          status: form.status,
        };
        const res = await axios.put(`${API_URL}tickets/${editingTicket.id}`, payload, authHeaders());
        setTickets((prev) => prev.map((t) => (t.id === editingTicket.id ? res.data : t)));
      } else {
        const payload = {
          ticket_number: form.ticket_number,
          customer_id: Number(form.customer_id),
          contact_person: form.contact_person,
          contact_number: form.contact_number,
          lift_id: Number(form.lift_id),
          ticket_type: form.ticket_type,
          priority: form.priority,
          complaint_description: form.complaint_description,
        };
        const res = await axios.post(`${API_URL}tickets`, payload, authHeaders());
        setTickets((prev) => [res.data, ...prev]);
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || `Failed to ${editingTicket ? 'update' : 'create'} ticket`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (ticket) => {
    setTogglingId(ticket.id);
    const action = ticket.is_active ? 'deactivate' : 'activate';
    try {
      const res = await axios.patch(`${API_URL}tickets/${ticket.id}/${action}`, {}, authHeaders());
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? res.data : t)));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to ${action} ticket`);
    } finally {
      setTogglingId(null);
    }
  };

  const openCloseModal = (ticket) => {
    setClosingTicket(ticket);
    setClosingRemarks('');
    setClosingError(null);
  };

  const handleCloseTicket = async (e) => {
    e.preventDefault();
    if (!closingRemarks.trim()) {
      setClosingError('Closing remarks are required');
      return;
    }
    setClosingSubmitting(true);
    setClosingError(null);
    try {
      const res = await axios.patch(
        `${API_URL}tickets/${closingTicket.id}/close`,
        { closing_remarks: closingRemarks },
        authHeaders()
      );
      setTickets((prev) => prev.map((t) => (t.id === closingTicket.id ? res.data : t)));
      setClosingTicket(null);
      setClosingRemarks('');
    } catch (err) {
      setClosingError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to close ticket');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === '' ||
      t.ticket_number?.toLowerCase().includes(q) ||
      t.contact_person?.toLowerCase().includes(q) ||
      t.contact_number?.toLowerCase().includes(q) ||
      t.ticket_type?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q) ||
      t.complaint_description?.toLowerCase().includes(q) ||
      lookupCustomerLabel(t.customer_id)?.toLowerCase().includes(q) ||
      lookupLiftLabel(t.lift_id)?.toLowerCase().includes(q);

    const matchesPriority =
      priorityFilter === 'All' || (t.priority || '').toLowerCase() === priorityFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'All' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'All' || statusFilter !== 'All';

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('All');
    setStatusFilter('All');
  };

  const openCount = tickets.filter((t) => (t.status || '').toLowerCase() === 'open').length;
  const closedCount = tickets.filter((t) => (t.status || '').toLowerCase() === 'closed').length;
  const activeCount = tickets.filter((t) => t.is_active).length;

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
          <h2 className="text-2xl font-black text-slate-800">Tickets</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Track customer complaints and service requests</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0"
        >
          <Plus size={18} />
          New Ticket
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative group shadow-sm rounded-2xl flex-1">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket number, customer, lift, contact, or status..."
            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
          />
        </div>

        {/* Priority filter */}
        <div className="relative shadow-sm rounded-2xl sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Tag size={16} className="text-slate-400" />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full appearance-none pl-10 pr-9 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-sm cursor-pointer"
          >
            <option value="All">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>

        {/* Status filter */}
        <div className="relative shadow-sm rounded-2xl sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter size={16} className="text-slate-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none pl-10 pr-9 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-sm cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors text-sm shrink-0"
          >
            <X size={16} />
            Reset
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'Total Tickets', value: tickets.length, icon: <Ticket size={24} />, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Open', value: openCount, icon: <Unlock size={24} />, color: 'text-amber-600', bg: 'bg-amber-100' },
          { title: 'Closed', value: closedCount, icon: <Lock size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Active', value: activeCount, icon: <CheckCircle size={24} />, color: 'text-indigo-600', bg: 'bg-indigo-100' },
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

      {/* Ticket List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">All Tickets</h3>
          <button
            onClick={fetchTickets}
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
            <span className="font-semibold text-sm">Loading tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">
              {hasActiveFilters ? 'No tickets match your search/filters' : 'No tickets found'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-bold text-[#DF173C] hover:text-[#B81331]"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const isClosed = (ticket.status || '').toLowerCase() === 'closed';
              return (
                <div
                  key={ticket.id}
                  onClick={() => setViewTicket(ticket)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg shrink-0 ${ticket.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                      <Ticket size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {/* Ticket Number */}
                        <h4 className="text-slate-800 font-bold tracking-wide">{ticket.ticket_number}</h4>
                        {/* Priority Chip */}
                        {ticket.priority && (
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${priorityStyle(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        )}
                        {/* Status Chip */}
                        {ticket.status && (
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${statusStyle(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        )}
                      </div>

                      {/* Customer / Lift */}
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 font-semibold mb-0.5 flex-wrap">
                        <Building2 size={14} className="text-slate-400" />
                        <span>{lookupCustomerLabel(ticket.customer_id)}</span>
                        <span className="text-slate-300">•</span>
                        <ArrowUpDown size={14} className="text-slate-400" />
                        <span>{lookupLiftLabel(ticket.lift_id)}</span>
                      </div>

                      {/* Contact */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap mb-1">
                        {ticket.contact_person && <span className="flex items-center gap-1"><User size={12} /> {ticket.contact_person}</span>}
                        {ticket.contact_number && <span className="flex items-center gap-1"><Phone size={12} /> {ticket.contact_number}</span>}
                        {ticket.ticket_type && <span className="flex items-center gap-1"><Tag size={12} /> {ticket.ticket_type}</span>}
                      </div>

                      {/* Complaint description preview */}
                      {ticket.complaint_description && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-400 font-medium mb-1">
                          <MessageSquare size={12} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{ticket.complaint_description}</span>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap">
                        {ticket.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>Created: {formatDateTime(ticket.created_at)}</span>
                          </div>
                        )}
                        {isClosed && ticket.closed_at && (
                          <div className="flex items-center gap-1">
                            <span>•</span>
                            <span>Closed: {formatDateTime(ticket.closed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div
                    className="flex items-center gap-4 self-start sm:self-auto flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openEditModal(ticket)}
                      className="p-2 rounded-lg text-[#DF173C] hover:bg-blue-50 hover:text-[#B81331] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>

                    {!isClosed && (
                      <button
                        onClick={() => openCloseModal(ticket)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Close"
                      >
                        <LockKeyhole size={16} />
                      </button>
                    )}

                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        ticket.is_active
                          ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                          : 'border-slate-200 text-slate-700 bg-white'
                      }`}
                    >
                      {ticket.is_active ? 'Active' : 'Inactive'}
                    </span>

                    <button
                      onClick={() => handleToggleActive(ticket)}
                      disabled={togglingId === ticket.id}
                      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                        ticket.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      title={ticket.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                    >
                      <span
                        className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-300 ease-in-out flex items-center justify-center ${
                          ticket.is_active ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      >
                        {togglingId === ticket.id && (
                          <Loader2 size={16} className={`animate-spin ${ticket.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">{editingTicket ? 'Edit Ticket' : 'New Ticket'}</h3>
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic Info */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Basic Info</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Ticket Number <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.ticket_number}
                      onChange={updateForm('ticket_number')}
                      placeholder="e.g. TKT-0012"
                      disabled={!!editingTicket}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Lift <span className="text-rose-600 font-bold">*</span></label>
                    {lifts.length > 0 ? (
                      <select
                        value={form.lift_id}
                        onChange={updateForm('lift_id')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      >
                        <option value="">Select lift</option>
                        {lifts.map((l) => (
                          <option key={l.id} value={l.id}>{l.lift_code}{l.building_name ? ` — ${l.building_name}` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={form.lift_id}
                        onChange={updateForm('lift_id')}
                        placeholder="Lift ID"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Ticket Type <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.ticket_type}
                      onChange={updateForm('ticket_type')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {TICKET_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Priority <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.priority}
                      onChange={updateForm('priority')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {editingTicket && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Status</label>
                      <select
                        value={form.status}
                        onChange={updateForm('status')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Contact Info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Contact Person <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.contact_person}
                      onChange={updateForm('contact_person')}
                      placeholder="e.g. Rakesh Sharma"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Contact Number <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.contact_number}
                      onChange={updateForm('contact_number')}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Complaint Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Complaint Description</label>
                <textarea
                  value={form.complaint_description}
                  onChange={updateForm('complaint_description')}
                  placeholder="Describe the issue reported by the customer..."
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
                {editingTicket && (form.status || '').toLowerCase() !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => {
                      const ticketToClose = editingTicket;
                      setShowModal(false);
                      resetForm();
                      openCloseModal(ticketToClose);
                    }}
                    className="flex-1 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-sm"
                  >
                    Close Ticket
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-60"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingTicket ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Ticket Modal */}
      {closingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">Close Ticket {closingTicket.ticket_number}</h3>
              <button
                onClick={() => setClosingTicket(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCloseTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Closing Remarks</label>
                <textarea
                  value={closingRemarks}
                  onChange={(e) => setClosingRemarks(e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm resize-none"
                />
              </div>

              {closingError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  {closingError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingTicket(null)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closingSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-60"
                >
                  {closingSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Close Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ticket Detail Modal */}
      {viewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${viewTicket.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                  <Ticket size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{viewTicket.ticket_number}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        viewTicket.is_active
                          ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                          : 'border-slate-200 text-slate-700 bg-white'
                      }`}
                    >
                      {viewTicket.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {viewTicket.status && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusStyle(viewTicket.status)}`}>
                        {viewTicket.status}
                      </span>
                    )}
                    {viewTicket.priority && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${priorityStyle(viewTicket.priority)}`}>
                        {viewTicket.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewTicket(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Customer & Lift */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Customer & Lift</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Building2 size={14} />} label="Customer" value={lookupCustomerLabel(viewTicket.customer_id)} />
                  <DetailField icon={<ArrowUpDown size={14} />} label="Lift" value={lookupLiftLabel(viewTicket.lift_id)} />
                  <DetailField icon={<User size={14} />} label="Contact Person" value={viewTicket.contact_person} />
                  <DetailField icon={<Phone size={14} />} label="Contact Number" value={viewTicket.contact_number} />
                </div>
              </div>

              {/* Classification */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Classification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Tag size={14} />} label="Ticket Type" value={viewTicket.ticket_type?.replace(/_/g, ' ')} />
                  <DetailField icon={<ClipboardList size={14} />} label="Created By" value={lookupUserName(viewTicket.created_by)} />
                </div>
              </div>

              {/* Complaint Description */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Complaint Description</p>
                <p className="text-sm text-slate-600 font-medium bg-slate-50 border border-slate-100 rounded-xl p-4">{viewTicket.complaint_description || '—'}</p>
              </div>

              {/* Closing Info */}
              {(viewTicket.status || '').toLowerCase() === 'closed' && (
                <div>
                  <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Closing Info</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <DetailField icon={<UserCheck size={14} />} label="Closed By" value={lookupUserName(viewTicket.closed_by)} />
                    <DetailField icon={<Calendar size={14} />} label="Closed At" value={formatDateTime(viewTicket.closed_at)} />
                  </div>
                  {viewTicket.closing_remarks && (
                    <p className="text-sm text-slate-600 font-medium bg-slate-50 border border-slate-100 rounded-xl p-4">{viewTicket.closing_remarks}</p>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Timestamps</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Calendar size={14} />} label="Created" value={formatDateTime(viewTicket.created_at)} />
                  <DetailField icon={<Calendar size={14} />} label="Last Updated" value={formatDateTime(viewTicket.updated_at)} />
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <button
                onClick={() => setViewTicket(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={() => openEditModal(viewTicket)}
                className="flex-1 px-4 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm"
              >
                Edit Ticket
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

export default Tickets;