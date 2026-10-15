import { useEffect, useRef } from 'react';
import axios from 'axios';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardList, Ticket, LogOut, X, Users, ArrowUpDown,  IdCard ,  CalendarCheck, MapPin, FileBarChart} from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOGIN_TIME_KEY = 'login_time';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

const clearSession = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token_type');
  localStorage.removeItem('role');
  localStorage.removeItem(LOGIN_TIME_KEY);
};

const ManagerSidebar = ({ isOpen, closeSidebar }) => {
  const navigate = useNavigate();
  const checkIntervalRef = useRef(null);

 
  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}auth/logout`, {}, authHeaders());
    } catch (err) {
     
      console.error('Logout API call failed:', err.response?.data?.detail || err.message);
    } finally {
      clearSession();
      navigate('/login');
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
        navigate('/login');
      }
    };

    checkSessionExpiry();
  
    checkIntervalRef.current = setInterval(checkSessionExpiry, 60 * 1000);

    return () => clearInterval(checkIntervalRef.current);
  }, [navigate]);

const navItems = [
  { path: '/manager/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/manager/employees', icon: IdCard, label: 'Employees' }, 
  { path: '/manager/customers', icon: Users, label: 'Customers' },
  { path: '/manager/lifts', icon: ArrowUpDown, label: 'Lifts' },
  { path: '/manager/tasks', icon: ClipboardList, label: 'Tasks' },
  { path: '/manager/tickets', icon: Ticket, label: 'Tickets' },
   { path: '/manager/attendance', icon: CalendarCheck, label: 'Attendance' },
   { path: '/manager/km', icon: MapPin, label: 'Employee KM' },
   { path: '/manager/tracking', icon: MapPin, label: 'Tracking' },
   { path: '/manager/reports', icon: FileBarChart, label: 'Reports' },
];

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-black border-t border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex flex-col h-full p-4 justify-between">
        <div className="flex justify-end mb-4 lg:hidden">
          <button onClick={closeSidebar} className="p-1.5 text-gray-400 hover:text-[#DF173C] hover:bg-white/10 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#DF173C] to-black text-white font-bold shadow-md'
                    : 'text-white hover:bg-white/5 hover:text-white font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-white' : ''} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 border-t border-gray-800/50 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-[#DF173C] hover:bg-white/5 rounded-xl font-medium transition-all">
            <LogOut size={20} /> System Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ManagerSidebar;