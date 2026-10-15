import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, Search, CheckCircle, XCircle, X, Loader2, AlertCircle,
  Calendar, MapPin, User, ArrowUpDown, Flag, Tag, Layers, Paperclip, FileText,
  Clock, Hash, UserCheck, Navigation, Upload, Pencil, HelpCircle, PlayCircle,
  PenTool, Image as ImageIcon, Filter, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const CATEGORY_OPTIONS = ['Maintenance', 'Repair', 'Inspection', 'Installation', 'Breakdown', 'AMC Service', 'Safety Check', 'Other'];
const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const emptyForm = {
  lift_id: '',
  assigned_to: '',
  category: 'Maintenance',
  sub_category: '',
  ticket_id: '',
  priority: 'Medium',
  due_date: '',
  latitude: '',
  longitude: '',
  allowed_radius: 100,
  location_name: '',
  instructions: '',
  attachment: '',
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
    case 'completed':
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    case 'in_progress':
    case 'in progress':
      return 'border-blue-200 text-blue-600 bg-blue-50';
    case 'cancelled':
      return 'border-rose-200 text-rose-600 bg-rose-50';
    case 'pending':
      return 'border-amber-200 text-amber-600 bg-amber-50';
    default:
      return 'border-slate-200 text-slate-700 bg-white';
  }
};

const isImageUrl = (value) => typeof value === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(value);


const resolveFileUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
  return `${base}/uploads/${value.replace(/^\/+/, '')}`;
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [lifts, setLifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [liftLocationLoading, setLiftLocationLoading] = useState(false);

  const [viewDetails, setViewDetails] = useState(null);
  const [viewDetailsLoading, setViewDetailsLoading] = useState(false);
  const [viewDetailsError, setViewDetailsError] = useState(null);

  
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');


  const [questions, setQuestions] = useState([]);
  const [questionInput, setQuestionInput] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}tasks`, authHeaders());
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
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

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}users`, authHeaders());
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEmployees([]);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}tickets`, authHeaders());
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchLifts();
    fetchEmployees();
    fetchTickets();
  }, [fetchTasks, fetchLifts, fetchEmployees, fetchTickets]);

  const fetchTaskDetails = useCallback(async (taskId) => {
    setViewDetailsLoading(true);
    setViewDetailsError(null);
    try {
      const res = await axios.get(`${API_URL}tasks/${taskId}/details`, authHeaders());
      setViewDetails(res.data);
    } catch (err) {
      setViewDetails(null);
      setViewDetailsError(err.response?.data?.detail || err.message || 'Failed to load task details');
    } finally {
      setViewDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewTask?.id) {
      fetchTaskDetails(viewTask.id);
    } else {
      setViewDetails(null);
      setViewDetailsError(null);
    }
  }, [viewTask, fetchTaskDetails]);

  // Jump back to page 1 whenever the search/filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter, statusFilter]);

  const updateForm = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };


  const applyLiftLocation = (lift) => {
    setForm((f) => ({
      ...f,
      latitude: lift.latitude != null ? String(lift.latitude) : f.latitude,
      longitude: lift.longitude != null ? String(lift.longitude) : f.longitude,
      location_name: lift.building_name || f.location_name,
    }));
  };


  const handleLiftChange = async (e) => {
    const liftId = e.target.value;
    setForm((f) => ({ ...f, lift_id: liftId }));
    if (!liftId) return;

    const cached = lifts.find((l) => String(l.id) === String(liftId));
    if (cached && (cached.latitude != null || cached.longitude != null || cached.building_name)) {
      applyLiftLocation(cached);
      return;
    }

    setLiftLocationLoading(true);
    try {
      const res = await axios.get(`${API_URL}lifts/${liftId}`, authHeaders());
      applyLiftLocation(res.data);
    } catch (err) {
      console.error('Failed to fetch lift location:', err.response?.data || err);
    } finally {
      setLiftLocationLoading(false);
    }
  };


  const handleLiftIdBlur = async (e) => {
    const liftId = e.target.value;
    if (!liftId) return;
    setLiftLocationLoading(true);
    try {
      const res = await axios.get(`${API_URL}lifts/${liftId}`, authHeaders());
      applyLiftLocation(res.data);
    } catch (err) {
      console.error('Failed to fetch lift location:', err.response?.data || err);
    } finally {
      setLiftLocationLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditingTask(null);
    setAttachmentFile(null);
    setAttachmentPreview('');
    setQuestions([]);
    setQuestionInput('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      lift_id: task.lift_id ?? '',
      assigned_to: task.assigned_to ?? '',
      category: task.category || 'Maintenance',
      sub_category: task.sub_category || '',
      ticket_id: task.ticket_id ?? '',
      priority: task.priority || 'Medium',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      latitude: task.latitude ?? '',
      longitude: task.longitude ?? '',
      allowed_radius: task.allowed_radius ?? '',
      location_name: task.location_name || '',
      instructions: task.instructions || '',
      attachment: task.attachment || '',
    });
    setAttachmentFile(null);
    setAttachmentPreview('');
    setFormError(null);
    setViewTask(null);
    setShowModal(true);
  };

  const handleAttachmentSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setFormError('Please select an image or PDF file');
      return;
    }

    setFormError(null);
    setAttachmentFile(file);

    if (isImage) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview('');
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview('');
  };

  const addQuestion = () => {
    const q = questionInput.trim();
    if (!q) return;
    setQuestions((prev) => [...prev, q]);
    setQuestionInput('');
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // POST /api/tasks/{task_id}/questions for each question added in the form
  const submitTaskQuestions = async (taskId) => {
    if (questions.length === 0) return;
    try {
      await Promise.all(
        questions.map((q) =>
          axios.post(
            `${API_URL}tasks/${taskId}/questions`,
            { question: q },
            authHeaders()
          )
        )
      );
    } catch (err) {
      console.error('Failed to save one or more task questions:', err.response?.data || err);
      setFormError('Task saved, but some questions failed to save. You can add them again from the edit screen.');
    }
  };

  const lookupLiftLabel = (liftId) => {
    const lift = lifts.find((l) => l.id === liftId);
    return lift ? `${lift.lift_code}${lift.building_name ? ` — ${lift.building_name}` : ''}` : `Lift #${liftId}`;
  };

  const lookupTicketLabel = (ticketId) => {
    if (!ticketId) return '—';
    const ticket = tickets.find((t) => t.id === ticketId);
    return ticket ? ticket.ticket_number : `Ticket #${ticketId}`;
  };

  const lookupEmployeeName = (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return `Employee #${empId}`;
    const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ');
    return `${fullName || emp.email || `Employee #${empId}`}${emp.employee_code ? ` (${emp.employee_code})` : ''}`;
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.lift_id) {
    setFormError('Lift is required');
    return;
  }

  if (!form.assigned_to) {
    setFormError('Assigned To is required');
    return;
  }

  if (!form.category.trim()) {
    setFormError('Category is required');
    return;
  }

  if (!form.due_date) {
    setFormError('Due date is required');
    return;
  }

  setSubmitting(true);
  setFormError(null);

  try {
    if (editingTask) {
  
      const payload = {
        assigned_to: Number(form.assigned_to),
        category: form.category,
        sub_category: form.sub_category,
        ticket_id: form.ticket_id !== '' ? Number(form.ticket_id) : null,
        priority: form.priority,
        due_date: form.due_date,
        latitude: form.latitude !== '' ? Number(form.latitude) : 0,
        longitude: form.longitude !== '' ? Number(form.longitude) : 0,
        allowed_radius:
          form.allowed_radius !== '' ? Number(form.allowed_radius) : 0,
        location_name: form.location_name,
        instructions: form.instructions,
        attachment: form.attachment || null,
      };

      const res = await axios.put(
        `${API_URL}tasks/${editingTask.id}`,
        payload,
        authHeaders()
      );

      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? res.data : t))
      );

      await submitTaskQuestions(editingTask.id);
    } else {
      // Create task using multipart/form-data
      const formData = new FormData();

      formData.append('lift_id', String(Number(form.lift_id)));
      formData.append('assigned_to', String(Number(form.assigned_to)));
      formData.append('category', form.category);
      formData.append('sub_category', form.sub_category);
      formData.append('priority', form.priority);
      formData.append('due_date', form.due_date);
      formData.append(
        'latitude',
        String(form.latitude !== '' ? Number(form.latitude) : 0)
      );
      formData.append(
        'longitude',
        String(form.longitude !== '' ? Number(form.longitude) : 0)
      );
      formData.append(
        'allowed_radius',
        String(
          form.allowed_radius !== '' ? Number(form.allowed_radius) : 0
        )
      );
      formData.append('location_name', form.location_name);
      formData.append('instructions', form.instructions);

      if (form.ticket_id !== '') {
        formData.append('ticket_id', String(Number(form.ticket_id)));
      }

      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const res = await axios.post(
        `${API_URL}tasks`,
        formData,
        authHeaders()
      );

      setTasks((prev) => [res.data, ...prev]);

      await submitTaskQuestions(res.data.id);
    }

    resetForm();
    setShowModal(false);
  } catch (err) {
    console.error('Task submit error:', err.response?.data || err);

    setFormError(
      err.response?.data?.detail?.[0]?.msg ||
      err.response?.data?.detail ||
      `Failed to ${editingTask ? 'update' : 'create'} task`
    );
  } finally {
    setSubmitting(false);
  }
};
  const handleToggleActive = async (task) => {
    setTogglingId(task.id);
    const action = task.is_active ? 'deactivate' : 'activate';
    try {
      const res = await axios.patch(`${API_URL}tasks/${task.id}/${action}`, {}, authHeaders());
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to ${action} task`);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === '' ||
      t.task_number?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.sub_category?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q) ||
      t.instructions?.toLowerCase().includes(q) ||
      lookupLiftLabel(t.lift_id)?.toLowerCase().includes(q);

    const matchesPriority =
      priorityFilter === 'All' || (t.priority || '').toLowerCase() === priorityFilter.toLowerCase();

    // Normalize away underscores/spacing so "In Progress" matches both
    // "In Progress" and "in_progress" style values from the backend.
    const normalizedStatus = (t.status || '').toLowerCase().replace(/_/g, ' ').trim();
    const matchesStatus =
      statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Most recently assigned task first (newest created_at first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return (b.id || 0) - (a.id || 0); // tie-break: higher id = more recent
  });

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / tasksPerPage));
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * tasksPerPage,
    currentPage * tasksPerPage
  );

  // Builds a compact page-number list, e.g. [1, 2, 3, '...', 9] for large page counts
  const getPageNumbers = () => {
    const delta = 1;
    const pages = [1];
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'All' || statusFilter !== 'All';

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('All');
    setStatusFilter('All');
  };

  const activeCount = tasks.filter((t) => t.is_active).length;
  const inactiveCount = tasks.length - activeCount;
  const completedCount = tasks.filter((t) => (t.status || '').toLowerCase() === 'completed').length;

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
          <h2 className="text-2xl font-black text-slate-800">Tasks</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Assign and track maintenance tasks across lifts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0"
        >
          <Plus size={18} />
          New Task
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
            placeholder="Search by task number, lift, category, priority, or status..."
            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
          />
        </div>

        {/* Priority filter */}
        <div className="relative shadow-sm rounded-2xl sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Flag size={16} className="text-slate-400" />
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
              <option key={s} value={s}>{s}</option>
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
          { title: 'Total Tasks', value: tasks.length, icon: <ClipboardList size={24} />, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Active', value: activeCount, icon: <CheckCircle size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Inactive', value: inactiveCount, icon: <XCircle size={24} />, color: 'text-rose-600', bg: 'bg-rose-100' },
          { title: 'Completed', value: completedCount, icon: <Flag size={24} />, color: 'text-amber-600', bg: 'bg-amber-100' },
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

      {/* Task List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">All Tasks</h3>
          <button
            onClick={fetchTasks}
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
            <span className="font-semibold text-sm">Loading tasks...</span>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">
              {hasActiveFilters ? 'No tasks match your search/filters' : 'No tasks found'}
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
            {paginatedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setViewTask(task)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${task.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {/* Task Number */}
                      <h4 className="text-slate-800 font-bold tracking-wide">{task.task_number}</h4>
                      {/* Priority Chip */}
                      {task.priority && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${priorityStyle(task.priority)}`}>
                          {task.priority}
                        </span>
                      )}
                      {/* Status Chip */}
                      {task.status && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${statusStyle(task.status)}`}>
                          {task.status}
                        </span>
                      )}
                    </div>

                    {/* Lift / Assigned To */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 font-semibold mb-0.5 flex-wrap">
                      <ArrowUpDown size={14} className="text-slate-400" />
                      <span>{lookupLiftLabel(task.lift_id)}</span>
                      <span className="text-slate-300">•</span>
                      <UserCheck size={14} className="text-slate-400" />
                      <span>{lookupEmployeeName(task.assigned_to)}</span>
                    </div>

                    {/* Category / Sub-category */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap mb-1">
                      {task.category && <span className="flex items-center gap-1"><Tag size={12} /> {task.category}</span>}
                      {task.sub_category && <span className="flex items-center gap-1"><Layers size={12} /> {task.sub_category}</span>}
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap">
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>Due: {formatDate(task.due_date)}</span>
                        </div>
                      )}
                      {task.updated_at && (
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>Updated: {formatDate(task.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div
                  className="flex items-center gap-4 self-start sm:self-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                <button
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-[#DF173C] hover:text-[#B81331] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Task"
                  >
                    <Pencil size={18} strokeWidth={2.5} />
                  </button>

                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      task.is_active
                        ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                        : 'border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    {task.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <button
                    onClick={() => handleToggleActive(task)}
                    disabled={togglingId === task.id}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                      task.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    title={task.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                  >
                    <span
                      className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-300 ease-in-out flex items-center justify-center ${
                        task.is_active ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    >
                      {togglingId === task.id && (
                        <Loader2 size={16} className={`animate-spin ${task.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && sortedTasks.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Showing {(currentPage - 1) * tasksPerPage + 1}–
              {Math.min(currentPage * tasksPerPage, sortedTasks.length)} of {sortedTasks.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="h-9 w-9 flex items-center justify-center text-slate-400 text-sm font-bold">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-bold border transition-colors ${
                      page === currentPage
                        ? 'bg-[#DF173C] border-[#DF173C] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">{editingTask ? 'Edit Task' : 'New Task'}</h3>
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
              {/* Assignment */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Lift <span className="text-rose-600 font-bold">*</span></label>
                    {lifts.length > 0 ? (
                      <select
                        value={form.lift_id}
                        onChange={handleLiftChange}
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
                        onBlur={handleLiftIdBlur}
                        placeholder="Lift ID"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Assigned To <span className="text-rose-600 font-bold">*</span></label>
                    {employees.length > 0 ? (
                      <select
                        value={form.assigned_to}
                        onChange={updateForm('assigned_to')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      >
                        <option value="">Select employee</option>
                      {employees.map((e) => (
  <option key={e.id} value={e.id}>
    {[e.first_name, e.last_name].filter(Boolean).join(' ') || e.email}
    {e.employee_code ? ` (${e.employee_code})` : ''}
    {e.designation_name ? ` — ${e.designation_name}` : ''}
  </option>
))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={form.assigned_to}
                        onChange={updateForm('assigned_to')}
                        placeholder="Employee ID"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Classification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Category <span className="text-rose-600 font-bold">*</span></label>
                    <select
                      value={form.category}
                      onChange={updateForm('category')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    >
                      {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Sub Category <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.sub_category}
                      onChange={updateForm('sub_category')}
                      placeholder="e.g. Door Sensor"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
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
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Due Date <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={updateForm('due_date')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Linked Ticket (optional)</label>
                    {tickets.length > 0 ? (
                      <select
                        value={form.ticket_id}
                        onChange={updateForm('ticket_id')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      >
                        <option value="">No linked ticket</option>
                        {tickets.map((t) => (
                          <option key={t.id} value={t.id}>{t.ticket_number}{t.complaint_description ? ` — ${t.complaint_description.slice(0, 40)}` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={form.ticket_id}
                        onChange={updateForm('ticket_id')}
                        placeholder="Ticket ID (optional)"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3 flex items-center gap-2">
                  Geo-fence Location
                  {liftLocationLoading && (
                    <span className="inline-flex items-center gap-1 text-slate-400 normal-case font-semibold">
                      <Loader2 size={12} className="animate-spin" />
                      Fetching from lift...
                    </span>
                  )}
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Location Name</label>
                  <input
                    type="text"
                    value={form.location_name}
                    onChange={updateForm('location_name')}
                    placeholder="e.g. Main Lobby, Block A"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Allowed Radius (m) <span className="text-rose-600 font-bold">*</span></label>
                    <input
                      type="number"
                      value={form.allowed_radius}
                      onChange={updateForm('allowed_radius')}
                      placeholder="e.g. 100"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Attachment: click-to-select photo or PDF */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Attachment (Photo or PDF)</label>
                <input
                  type="file"
                  id="task-attachment-upload"
                  accept="image/*,application/pdf"
                  onChange={handleAttachmentSelect}
                  className="hidden"
                />
                {!attachmentFile ? (
                  <label
                    htmlFor="task-attachment-upload"
                    className="cursor-pointer flex items-center gap-2 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all font-medium text-sm"
                  >
                    <Upload size={16} />
                    {editingTask && form.attachment ? 'Click to replace existing attachment' : 'Click to select photo or PDF'}
                  </label>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {attachmentFile.type.startsWith('image/') ? (
                      <img src={attachmentPreview} alt="Attachment preview" className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">{attachmentFile.name}</span>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {editingTask && form.attachment && !attachmentFile && (
                  <p className="mt-1.5 text-xs text-slate-400 font-medium">
                    Current file: <span className="text-slate-500 font-semibold">{form.attachment}</span>
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={updateForm('instructions')}
                  placeholder="Describe what needs to be done..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm resize-none"
                />
              </div>

              {/* Task Questions */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Add Questions</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addQuestion();
                      }
                    }}
                    placeholder="e.g. Was the emergency brake tested?"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm shrink-0"
                  >
                    Add
                  </button>
                </div>

                {questions.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {questions.map((q, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <span className="text-sm font-medium text-slate-700 break-words">{q}</span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                          title="Remove question"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
                  {editingTask ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Detail Modal */}
      {viewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${viewTask.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                  <ClipboardList size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{viewTask.task_number}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        viewTask.is_active
                          ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
                          : 'border-slate-200 text-slate-700 bg-white'
                      }`}
                    >
                      {viewTask.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {viewTask.status && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusStyle(viewTask.status)}`}>
                        {viewTask.status}
                      </span>
                    )}
                    {viewTask.priority && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${priorityStyle(viewTask.priority)}`}>
                        {viewTask.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewTask(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Assignment */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<ArrowUpDown size={14} />} label="Lift" value={lookupLiftLabel(viewTask.lift_id)} />
                  <DetailField icon={<UserCheck size={14} />} label="Assigned To" value={lookupEmployeeName(viewTask.assigned_to)} />
                  <DetailField icon={<User size={14} />} label="Assigned By" value={viewTask.assigned_by_name || (viewTask.assigned_by ? lookupEmployeeName(viewTask.assigned_by) : '—')} />
                  <DetailField icon={<Clock size={14} />} label="Due Date" value={formatDate(viewTask.due_date)} />
                </div>
              </div>

              {/* Classification */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Classification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Tag size={14} />} label="Category" value={viewTask.category} />
                  <DetailField icon={<Layers size={14} />} label="Sub Category" value={viewTask.sub_category} />
                  <DetailField icon={<Hash size={14} />} label="Linked Ticket" value={lookupTicketLabel(viewTask.ticket_id)} />
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Geo-fence Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<MapPin size={14} />} label="Location Name" value={viewTask.location_name} />
                  <DetailField icon={<MapPin size={14} />} label="Coordinates" value={`${viewTask.latitude ?? '—'}, ${viewTask.longitude ?? '—'}`} />
                  <DetailField icon={<Navigation size={14} />} label="Allowed Radius" value={viewTask.allowed_radius ? `${viewTask.allowed_radius} m` : '—'} />
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Timestamps</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Calendar size={14} />} label="Created" value={formatDateTime(viewTask.created_at)} />
                  <DetailField icon={<Calendar size={14} />} label="Last Updated" value={formatDateTime(viewTask.updated_at)} />
                </div>
              </div>

              {/* Attachment */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Attachment</p>
                {(() => {
                  const fileUrl = resolveFileUrl(viewTask.attachment);
                  if (!fileUrl) return <p className="text-sm text-slate-400 font-medium">No attachment</p>;
                  if (isImageUrl(viewTask.attachment)) {
                    return (
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-block">
                        <img src={fileUrl} alt="Task attachment" className="h-32 rounded-xl border border-slate-200 object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    );
                  }
                  return (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#DF173C] hover:bg-blue-50 hover:border-blue-300 transition-all font-bold text-sm"
                    >
                      <Paperclip size={16} />
                      View Attachment
                    </a>
                  );
                })()}
              </div>

              {/* Instructions */}
              {viewTask.instructions && (
                <div>
                  <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Instructions</p>
                  <p className="text-sm text-slate-600 font-medium bg-slate-50 border border-slate-100 rounded-xl p-4">{viewTask.instructions}</p>
                </div>
              )}

              {/* Details loading / error state */}
              {viewDetailsLoading && (
                <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="font-semibold text-sm">Loading execution & questions...</span>
                </div>
              )}

              {!viewDetailsLoading && viewDetailsError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  {viewDetailsError}
                </div>
              )}

              {/* Execution */}
              {!viewDetailsLoading && viewDetails && (
                <div>
                  <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Execution</p>
                  {viewDetails.execution ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailField icon={<Flag size={14} />} label="Execution Status" value={viewDetails.execution.status} />
                        <DetailField icon={<UserCheck size={14} />} label="Executed By" value={lookupEmployeeName(viewDetails.execution.employee_id)} />
                        <DetailField icon={<PlayCircle size={14} />} label="Started" value={formatDateTime(viewDetails.execution.start_time)} />
                        <DetailField icon={<CheckCircle size={14} />} label="Completed" value={formatDateTime(viewDetails.execution.completed_time)} />
                        <DetailField
                          icon={<MapPin size={14} />}
                          label="Start Location"
                          value={
                            viewDetails.execution.start_latitude != null && viewDetails.execution.start_longitude != null
                              ? `${viewDetails.execution.start_latitude}, ${viewDetails.execution.start_longitude}`
                              : null
                          }
                        />
                        <DetailField
                          icon={<MapPin size={14} />}
                          label="Completed Location"
                          value={
                            viewDetails.execution.completed_latitude != null && viewDetails.execution.completed_longitude != null
                              ? `${viewDetails.execution.completed_latitude}, ${viewDetails.execution.completed_longitude}`
                              : null
                          }
                        />
                      </div>

                      {(viewDetails.execution.client_signature || viewDetails.execution.client_photo) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {viewDetails.execution.client_signature && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-2">
                                <PenTool size={14} />
                                <span>Client Signature</span>
                              </div>
                              <a href={resolveFileUrl(viewDetails.execution.client_signature)} target="_blank" rel="noreferrer">
                                <img
                                  src={resolveFileUrl(viewDetails.execution.client_signature)}
                                  alt="Client signature"
                                  className="h-20 rounded-lg border border-slate-200 bg-white object-contain hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}
                          {viewDetails.execution.client_photo && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-2">
                                <ImageIcon size={14} />
                                <span>Client Photo</span>
                              </div>
                              <a href={resolveFileUrl(viewDetails.execution.client_photo)} target="_blank" rel="noreferrer">
                                <img
                                  src={resolveFileUrl(viewDetails.execution.client_photo)}
                                  alt="Client photo"
                                  className="h-20 rounded-lg border border-slate-200 object-cover hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-sm font-medium">
                      <PlayCircle size={16} className="shrink-0" />
                      Not started yet
                    </div>
                  )}
                </div>
              )}

              {/* Questions & Answers */}
              {!viewDetailsLoading && viewDetails && (
                <div>
                  <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Questions & Answers</p>
                  {viewDetails.questions?.length > 0 ? (
                    <div className="space-y-2">
                      {viewDetails.questions.map((q) => (
                        <div key={q.question_id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <div className="flex items-start gap-2">
                            <HelpCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-slate-700 font-semibold">{q.question}</p>
                          </div>
                          <p className={`mt-1.5 pl-6 text-sm font-medium ${q.answer ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                            {q.answer || 'Not answered yet'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-sm font-medium">
                      <HelpCircle size={16} className="shrink-0" />
                      No questions added
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 flex gap-3">
              <button
                onClick={() => setViewTask(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={() => openEditModal(viewTask)}
                className="flex-1 px-4 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm"
              >
                Edit Task
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

export default Tasks;