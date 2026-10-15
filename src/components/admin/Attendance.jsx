import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CalendarCheck, Search, LogIn, LogOut, Clock, MapPin, Calendar,
  ClipboardList, AlertCircle, Loader2, X, RefreshCw, User, Hash,
  ChevronLeft, ChevronRight, Users, Download,
} from 'lucide-react';



const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;



const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});



const statusStyle = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'present':
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    case 'late':
      return 'border-amber-200 text-amber-600 bg-amber-50';
    case 'absent':
      return 'border-rose-200 text-rose-600 bg-rose-50';
    case 'on_leave':
    case 'on leave':
      return 'border-blue-200 text-blue-600 bg-blue-50';
    case 'half_day':
    case 'half day':
      return 'border-orange-200 text-orange-600 bg-orange-50';
    case 'auto_punch_out':
    case 'auto punch out':
      return 'border-slate-300 text-slate-600 bg-slate-100';
    default:
      return 'border-slate-200 text-slate-700 bg-white';
  }
};



const Attendance = () => {
  const [, setToday] = useState(null);
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [viewRecord, setViewRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;



  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportStatus, setReportStatus] = useState('ALL'); 
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);



  const fetchToday = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}attendance/today`, authHeaders());
      setToday(res.data || null);
    } catch {
      setToday(null);
    }
  }, []);



  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
     if (dateFilter) params.append('date', dateFilter);
     if (statusFilter !== 'ALL') params.append('status', statusFilter);
     const qs = params.toString();
     const res = await axios.get(`${API_URL}attendance${qs ? `?${qs}` : ''}`, authHeaders());
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);



  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}users`, authHeaders());
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  }, []);



  const fetchTodayAttendance = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await axios.get(`${API_URL}attendance?date=${todayStr}`, authHeaders());
      setTodayAttendance(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTodayAttendance([]);
    }
  }, []);



  const fetchMonthlyReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    setReportData(null);
    try {
      const params = new URLSearchParams({ year: reportYear, month: reportMonth });
      if (reportStatus !== 'ALL') params.append('status', reportStatus);
      const res = await axios.get(
        `${API_URL}reports/attendance/monthly?${params.toString()}`,
        authHeaders()
      );
      setReportData(res.data);
    } catch (err) {
      setReportError(err.response?.data?.detail || err.message || 'Failed to load monthly report');
    } finally {
      setReportLoading(false);
    }
  }, [reportYear, reportMonth, reportStatus]);



  const refreshAll = useCallback(() => {
    fetchToday();
    fetchAttendance();
    fetchUsers();
    fetchTodayAttendance();
  }, [fetchToday, fetchAttendance, fetchUsers, fetchTodayAttendance]);



  useEffect(() => {
    refreshAll();
  }, [refreshAll]);






  const formatTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };



  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };



  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };



  const downloadReportPDF = () => {
    if (!reportData?.days?.length) return;



    const monthLabel = new Date(reportYear, reportMonth - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });



    const doc = new jsPDF({ orientation: 'landscape' });



    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Attendance Report', 14, 15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(monthLabel, 14, 21);



    doc.setFontSize(9);
    doc.text(
      `Total Days: ${reportData.total_days ?? '—'}    Holidays: ${reportData.total_holidays ?? '—'}    ` +
      `Working Days: ${reportData.total_working_days ?? '—'}    Present: ${reportData.total_present ?? '—'}    ` +
      `Absent: ${reportData.total_absent ?? '—'}`,
      14,
      27
    );



    const rows = [];
    reportData.days.forEach((d) => {
      (d.present || []).forEach((emp) =>
        rows.push([d.date, d.day, d.status, emp.employee_code, emp.name, emp.department ?? '—', emp.designation ?? '—', 'Present'])
      );
      (d.absent || []).forEach((emp) =>
        rows.push([d.date, d.day, d.status, emp.employee_code, emp.name, emp.department ?? '—', emp.designation ?? '—', 'Absent'])
      );
    });



    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Day', 'Day Status', 'Emp Code', 'Name', 'Department', 'Designation', 'Attendance']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [223, 23, 60] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          if (data.cell.raw === 'Present') data.cell.styles.textColor = [5, 150, 105];
          if (data.cell.raw === 'Absent') data.cell.styles.textColor = [225, 29, 72];
        }
      },
    });



    const statusSuffix = reportStatus !== 'ALL' ? `_${reportStatus.toLowerCase()}` : '';
    doc.save(`attendance_${reportYear}_${String(reportMonth).padStart(2, '0')}${statusSuffix}.pdf`);
  };



  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      formatDate(r.date)?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      String(r.working_hours ?? '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q);

    return matchesSearch;
  });





  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, statusFilter]);



  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );



  const totalEmployees = todayAttendance.length || users.length;
  const presentTodayCount = todayAttendance.filter((r) => (r.status || '').toLowerCase() === 'present').length;
  const absentTodayCount = todayAttendance.filter((r) => (r.status || '').toLowerCase() === 'absent').length;



  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Attendance</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Track punch-in, punch-out, and attendance history</p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-colors text-sm shrink-0"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>



   



      {/* Search + Date Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative group shadow-sm rounded-2xl flex-1">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, date, status, or working hours..."
            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
          />
        </div>



        <div className="relative group shadow-sm rounded-2xl sm:w-56 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Calendar className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-11 pr-9 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base [color-scheme:light]"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear date filter"
            >
              <X size={16} />
            </button>
          )}
        </div>



          <div className="relative group shadow-sm rounded-2xl sm:w-48 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ClipboardList className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-11 pr-9 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
      </div>



      {/* Monthly Attendance Report */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-4">Monthly Report</h3>



        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={reportMonth}
            onChange={(e) => setReportMonth(Number(e.target.value))}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
            className="w-full sm:w-32 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />



          <select
            value={reportStatus}
            onChange={(e) => setReportStatus(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shrink-0"
          >
            <option value="ALL">All</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>



          <button
            onClick={fetchMonthlyReport}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-sm shrink-0"
          >
            Generate
          </button>
        

          {reportData && !reportLoading && (
            <button
              onClick={downloadReportPDF}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm shrink-0"
            >
              <Download size={16} />
              Download PDF
            </button>
          )}
        </div>



        {reportError && (
          <div className="mb-4 flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0" />
            {reportError}
          </div>
        )}



        {reportLoading && (
          <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-semibold text-sm">Generating report...</span>
          </div>
        )}



        
      </div>



     {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          { title: 'Total Employee', value: totalEmployees, icon: <Users size={24} />, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Today Present', value: presentTodayCount, icon: <CalendarCheck size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Today Absent', value: absentTodayCount, icon: <X size={24} />, color: 'text-rose-600', bg: 'bg-rose-100' },
        ].map((card, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-xl ${card.bg} ${card.color}`}>
                {React.cloneElement(card.icon, { size: 18, className: 'sm:hidden' })}
                {React.cloneElement(card.icon, { size: 24, className: 'hidden sm:block' })}
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">{card.value}</h3>
            <p className="text-slate-500 font-semibold text-xs sm:text-sm">{card.title}</p>
          </div>
        ))}
      </div>



      {/* Attendance History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">History</h3>
          <button
            onClick={fetchAttendance}
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
            <span className="font-semibold text-sm">Loading attendance...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarCheck size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No attendance records found</p>
          </div>
        ) : (
          <>
            {/* Table view — md and up */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 sm:px-6 py-3 text-xs -bold text-slate-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Punch In</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Punch Out</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Working Hours</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((rec, idx) => (
                    <tr
                      key={rec.employee_id ? `${rec.employee_id}-${rec.date}` : idx}
                      onClick={() => setViewRecord(rec)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4 text-slate-800 font-bold whitespace-nowrap">{rec.name || '—'}</td>
                      <td className="px-4 sm:px-6 py-4 text-slate-800 font-bold whitespace-nowrap">{formatDate(rec.date)}</td>
                      <td className="px-4 sm:px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">{formatTime(rec.punch_in_time)}</td>
                      <td className="px-4 sm:px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">{formatTime(rec.punch_out_time)}</td>
                      <td className="px-4 sm:px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                        {(rec.punch_in_latitude != null && rec.punch_in_longitude != null) ? (
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            {rec.punch_in_latitude}, {rec.punch_in_longitude}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">{rec.working_hours ?? '—'}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {rec.status ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border tracking-wide ${statusStyle(rec.status)}`}>
                            {rec.status}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>



            {/* Card view — below md */}
            <div className="md:hidden space-y-3">
              {paginatedRecords.map((rec, idx) => (
                <div
                  key={rec.employee_id ? `${rec.employee_id}-${rec.date}` : idx}
                  onClick={() => setViewRecord(rec)}
                  className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 active:bg-blue-50/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <h4 className="text-slate-800 font-bold text-sm">{rec.name || '—'}</h4>
                      <p className="text-slate-400 text-[11px] font-semibold">{formatDate(rec.date)}</p>
                    </div>
                    {rec.status && (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${statusStyle(rec.status)}`}>
                        {rec.status}
                      </span>
                    )}
                  </div>



                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5 flex items-center gap-1"><LogIn size={11} /> Punch In</p>
                      <p className="text-slate-700 font-semibold">{formatTime(rec.punch_in_time)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5 flex items-center gap-1"><LogOut size={11} /> Punch Out</p>
                      <p className="text-slate-700 font-semibold">{formatTime(rec.punch_out_time)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5 flex items-center gap-1"><Clock size={11} /> Working Hrs</p>
                      <p className="text-slate-700 font-semibold">{rec.working_hours ?? '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-400 font-bold mb-0.5 flex items-center gap-1"><MapPin size={11} /> Location</p>
                      <p className="text-slate-700 font-semibold truncate">
                        {(rec.punch_in_latitude != null && rec.punch_in_longitude != null)
                          ? `${rec.punch_in_latitude}, ${rec.punch_in_longitude}`
                          : '—'}
                      </p>
                    </div>
                  </div>



                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap mt-2 pt-2 border-t border-slate-200/70">
                    <span className="flex items-center gap-1"><Hash size={11} /> #{rec.id}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1"><User size={11} /> {rec.name || '—'}</span>
                  </div>
                </div>
              ))}
            </div>



            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400">
                  Showing {(safeCurrentPage - 1) * itemsPerPage + 1}–
                  {Math.min(safeCurrentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>



                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - safeCurrentPage) <= 1
                    )
                    .reduce((acc, page, idx, arr) => {
                      if (idx > 0 && page - arr[idx - 1] > 1) acc.push('ellipsis-' + page);
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page) =>
                      typeof page === 'string' ? (
                        <span key={page} className="px-1.5 text-slate-300 text-xs font-bold select-none">…</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold transition-colors ${
                            page === safeCurrentPage
                              ? 'bg-[#DF173C] text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}



                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>



      {/* View Record Detail Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                  <CalendarCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{formatDate(viewRecord.date)}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {viewRecord.status && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusStyle(viewRecord.status)}`}>
                        {viewRecord.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>



            <div className="space-y-5">
              {/* Record Info */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Record Info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                  <DetailField icon={<User size={14} />} label="Name" value={viewRecord.name} />
               
                  <DetailField icon={<Calendar size={14} />} label="Date" value={formatDate(viewRecord.date)} />
                  <DetailField icon={<ClipboardList size={14} />} label="Status" value={viewRecord.status} />
                </div>
              </div>



              {/* Punch Details */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Punch Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
   <DetailField icon={<LogIn size={14} />} label="Punch In Time" value={formatDateTime(viewRecord.punch_in_time)} />
                  <DetailField icon={<LogOut size={14} />} label="Punch Out Time" value={formatDateTime(viewRecord.punch_out_time)} />
                  <DetailField icon={<MapPin size={14} />} label="Punch In Latitude" value={viewRecord.punch_in_latitude} />
                  <DetailField icon={<MapPin size={14} />} label="Punch In Longitude" value={viewRecord.punch_in_longitude} />
                  <DetailField icon={<MapPin size={14} />} label="Punch Out Latitude" value={viewRecord.punch_out_latitude} />
                  <DetailField icon={<MapPin size={14} />} label="Punch Out Longitude" value={viewRecord.punch_out_longitude} />
                </div>
              </div>



              {/* Summary */}
              <div>
                <p className="text-xs font-black text-[#DF173C] uppercase tracking-wider mb-3">Summary</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField icon={<Clock size={14} />} label="Working Hours" value={viewRecord.working_hours ?? '—'} />
                  <DetailField icon={<ClipboardList size={14} />} label="Status" value={viewRecord.status} />
                </div>
              </div>



             
            </div>



            <div className="pt-6">
              <button
                onClick={() => setViewRecord(null)}
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





const DetailField = ({ icon, label, value, full }) => (
  <div className={`bg-slate-50 border border-slate-100 rounded-xl p-3 ${full ? 'sm:col-span-2' : ''}`}>
    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <p className="text-sm text-slate-700 font-semibold break-words">{value === null || value === undefined || value === '' ? '—' : value}</p>
  </div>
);



export default Attendance;