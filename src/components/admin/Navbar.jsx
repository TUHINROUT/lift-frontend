import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Menu, User as UserIcon, LogOut, ChevronDown, X, Briefcase, Activity } from 'lucide-react';

import evioLogo from '../../assets/logo.png';

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

const resolvePhotoUrl = (photo) => {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo) || photo.startsWith('data:')) return photo;
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
  return `${base}/uploads/${photo.replace(/^\/+/, '')}`;
};

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
 const [showMenu, setShowMenu] = useState(false);
const [showProfile, setShowProfile] = useState(false);

const menuRef = useRef(null);


  const fetchMe = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}auth/me`, authHeaders());
      setUser(res.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    navigate('/login');
  };

  const displayName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.employee_code : 'Admin';
 const avatarUrl = resolvePhotoUrl(user?.profile_photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'Admin')}&background=DF173C&color=fff`;

  return (
  <header className="fixed top-0 left-0 w-full h-16 bg-black z-50 shadow-md border-b border-gray-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-8">
        
        {/* Left: Logo & Mobile Toggle */}
        <div className="flex items-center gap-4 w-1/3">
<button 
  onClick={onMenuClick}
  className="p-1.5 text-[#DF173C] hover:text-white hover:bg-white/10 rounded-lg lg:hidden transition-colors"
>
  <Menu size={24} />
</button>
<div className="flex items-center">
  <img 
    src={evioLogo} 
    alt="EVIO Elevator Logo" 
    className="h-8 sm:h-10 w-auto object-contain" 
  />
</div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-4 w-1/3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-1.5 focus:outline-none"
            >
             <div className="w-9 h-9 rounded-full border-2 border-[#DF173C] bg-black overflow-hidden shrink-0 shadow-sm">
                <img src={avatarUrl} alt={displayName || 'Admin'} className="w-full h-full object-cover" />
              </div>
              <ChevronDown size={16} className={`text-blue-200 transition-transform hidden sm:block ${showMenu ? 'rotate-180' : ''}`} />
            </button>

        {showMenu && (
  <div className="absolute right-0 mt-2 w-52 bg-[#131420] border border-gray-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
    <div className="px-4 py-3 border-b border-gray-800">
      <p className="text-sm font-bold text-[#DF173C] truncate">{displayName || 'Admin'}</p>
      {user?.email && <p className="text-xs text-gray-400 font-medium truncate">{user.email}</p>}
    </div>
    <button
      onClick={() => { setShowMenu(false); setShowProfile(true); }}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5 hover:text-[#DF173C] transition-colors"
    >
      <UserIcon size={16} />
      Profile
    </button>
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#DF173C] hover:bg-[#f4cdd4] transition-colors"
    >
      <LogOut size={16} />
      Logout
    </button>
  </div>
)}
          </div>
        </div>
      </div>

      {/* Profile Modal - Redesigned Card */}
      {showProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          
     <div className="bg-[#131420] border border-gray-800 rounded-3xl shadow-[0_0_50px_rgba(223,23,60,0.1)] w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
  
  {/* Header Banner & Avatar */}
  <div className="relative bg-gradient-to-r from-black to-[#131420] border-b border-[#DF173C]/30 px-6 pt-6 pb-16 sm:px-10 shrink-0">
              <button
                onClick={() => setShowProfile(false)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>
              
          <div className="flex flex-col sm:flex-row items-center gap-5 translate-y-12 sm:translate-y-14">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#DF173C] bg-black shadow-lg overflow-hidden shrink-0">
                  <img src={avatarUrl} alt={displayName || 'Admin'} className="w-full h-full object-cover" />
                </div>
                
                <div className="text-center sm:text-left text-white mt-2 sm:mt-0">
                  <h3 className="text-2xl font-black tracking-tight">{displayName || 'Admin'}</h3>
                  <p className="text-blue-200 font-medium text-sm mt-0.5">{user?.email || 'No email on file'}</p>
                  
                 
                </div>
              </div>
            </div>

            {/* Scrollable Details Section */}
   <div className="px-6 pb-6 pt-16 sm:px-10 sm:pt-20 overflow-y-auto bg-[#131420] flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                
                {/* Personal Info Column */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">
                    Personal Details
                  </h4>
                  <ProfileField icon={<UserIcon size={18} />} label="Employee Code" value={user?.employee_code} />
                  <ProfileField icon={<UserIcon size={18} />} label="First Name" value={user?.first_name} />
                  <ProfileField icon={<UserIcon size={18} />} label="Last Name" value={user?.last_name} />
                </div>

                {/* Work Info Column */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">
                    Work Details
                  </h4>
                  <ProfileField icon={<Briefcase size={18} />} label="Designation" value={user?.designation_name} />
                  <ProfileField icon={<Activity size={18} />} label="Department" value={user?.department_name} />
                </div>

              </div>
            </div>

            {/* Card Footer */}
           <div className="p-4 sm:p-6 bg-[#131420] border-t border-gray-800 shrink-0">
  <button
    onClick={() => setShowProfile(false)}
    className="w-full sm:w-auto sm:float-right px-8 py-3 bg-[#DF173C] hover:bg-[#B81331] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm"
  >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

// Refined ProfileField component for better aesthetics
const ProfileField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 bg-black border border-gray-800 shadow-sm rounded-xl px-4 py-3 hover:border-[#DF173C]/50 hover:shadow-md transition-all group">
    <div className="p-2 bg-gray-900 text-[#DF173C] rounded-lg shrink-0 group-hover:bg-[#DF173C]/10 transition-colors">
      {icon}
    </div>
    <div className="min-w-0 flex-1 pt-0.5">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white truncate">{value ?? '—'}</p>
    </div>
  </div>
);

export default Navbar;