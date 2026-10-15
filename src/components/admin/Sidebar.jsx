import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  Activity,
  Briefcase,
  Users,
  UserPlus,
  ArrowUpDown,
  ClipboardList,
  Ticket,
  CalendarCheck,
  MapPin,
  FileBarChart,
  TrendingUp,
  Wrench,
  LogOut,
  X,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  UploadCloud,
  GitFork,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const LOGIN_TIME_KEY = "login_time";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type");
  localStorage.removeItem(LOGIN_TIME_KEY);
};

const Sidebar = ({ isOpen, closeSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkIntervalRef = useRef(null);

  const isCrmActive = location.pathname.startsWith("/admin/crm");
  const [isCrmOpen, setIsCrmOpen] = useState(isCrmActive);

  useEffect(() => {
    if (isCrmActive) {
      setIsCrmOpen(true);
    }
  }, [isCrmActive]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}auth/logout`, {}, authHeaders());
    } catch (err) {
      console.error(
        "Logout API call failed:",
        err.response?.data?.detail || err.message,
      );
    } finally {
      clearSession();
      navigate("/login");
    }
  };

  useEffect(() => {
    if (!localStorage.getItem(LOGIN_TIME_KEY)) {
      localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
    }

    const checkSessionExpiry = () => {
      const loginTime = Number(localStorage.getItem(LOGIN_TIME_KEY));
      if (!loginTime || Date.now() - loginTime >= SESSION_DURATION_MS) {
        clearSession();
        navigate("/login");
      }
    };

    checkSessionExpiry();
    checkIntervalRef.current = setInterval(checkSessionExpiry, 60 * 1000);

    return () => clearInterval(checkIntervalRef.current);
  }, [navigate]);

  // Admin CRM Menu Items (Admin manages master pipeline, tracker, proposals, and ingestion)
  const crmSubItems = [
    { path: "/admin/crm/leads", icon: Filter, label: "Leads & Pipeline" },
    { path: "/admin/crm/tracker", icon: GitFork, label: "Department Tracker" },
    {
      path: "/admin/crm/proposals",
      icon: FileText,
      label: "Proposals & Share",
    },
    { path: "/admin/crm/upload", icon: UploadCloud, label: "Bulk Ingestion" },
  ];

  const standardNavItems = [
    { path: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
    { path: "/admin/department", icon: Activity, label: "Departments" },
    { path: "/admin/designations", icon: Briefcase, label: "Designations" },
    { path: "/admin/employees", icon: UserPlus, label: "Employees" },
    { path: "/admin/customers", icon: Users, label: "Customers" },
    { path: "/admin/lifts", icon: ArrowUpDown, label: "Lifts" },
    { path: "/admin/tasks", icon: ClipboardList, label: "Tasks" },
    { path: "/admin/tickets", icon: Ticket, label: "Tickets" },
    { path: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
    { path: "/admin/km", icon: MapPin, label: "Employee KM" },
    { path: "/admin/tracking", icon: MapPin, label: "Tracking" },
    { path: "/admin/reports", icon: FileBarChart, label: "Reports" },
    { path: "/admin/sales-report", icon: TrendingUp, label: "Sales Report" },
    { path: "/admin/service-reports", icon: Wrench, label: "Service Reports" },
  ];

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-60 lg:w-64 bg-black border-r border-neutral-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full px-3 py-2 justify-between">
        <div className="flex justify-end lg:hidden mb-1">
          <button
            onClick={closeSidebar}
            className="p-1 text-gray-400 hover:text-[#DF173C] hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col flex-1 min-h-0 py-0.5 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
          <NavLink
            to="/admin/dashboard"
            onClick={() => {
              if (window.innerWidth < 1024) closeSidebar();
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-[#DF173C] to-black text-white font-semibold shadow-md shadow-red-950/20"
                  : "text-neutral-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <BarChart3
                  size={18}
                  className={`shrink-0 ${isActive ? "text-white" : "text-neutral-400"}`}
                />
                <span className="truncate">Dashboard</span>
              </>
            )}
          </NavLink>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsCrmOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none ${
                isCrmActive
                  ? "bg-white/10 text-white font-semibold border-l-2 border-[#DF173C]"
                  : "text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Layers
                  size={18}
                  className={`shrink-0 ${isCrmActive ? "text-[#DF173C]" : "text-neutral-400"}`}
                />
                <span className="truncate">GuideX CRM</span>
              </div>
              {isCrmOpen ? (
                <ChevronDown
                  size={16}
                  className="text-neutral-400 transition-transform"
                />
              ) : (
                <ChevronRight
                  size={16}
                  className="text-neutral-400 transition-transform"
                />
              )}
            </button>

            {isCrmOpen && (
              <div className="pl-6 space-y-1 pt-0.5 border-l border-neutral-800 ml-3">
                {crmSubItems.map((subItem) => (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) closeSidebar();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 select-none shrink-0 ${
                        isActive
                          ? "bg-gradient-to-r from-[#DF173C] to-neutral-900 text-white font-semibold shadow-sm"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <subItem.icon
                          size={14}
                          className={`shrink-0 ${isActive ? "text-white" : "text-neutral-500"}`}
                        />
                        <span className="truncate">{subItem.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {standardNavItems.slice(1).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) closeSidebar();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none shrink-0 ${
                  isActive
                    ? "bg-gradient-to-r from-[#DF173C] to-black text-white font-semibold shadow-md shadow-red-950/20"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={`shrink-0 ${isActive ? "text-white" : "text-neutral-400"}`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pt-2 border-t border-neutral-800/80 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-neutral-400 hover:text-[#DF173C] hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="truncate">System Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
