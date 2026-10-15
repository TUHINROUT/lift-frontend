import { useState } from 'react';
import { Users, AlertCircle, Clock, Search, CheckCircle, Activity, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ManagerDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Tailored for Manager Dashboard metrics based on SRS
  const summaryCards = [
    { title: "Assigned Employees", value: "24", active: "18 Punched In", icon: <Users size={24} />, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Active Tasks", value: "32", active: "In Progress", icon: <Activity size={24} />, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "Pending Tasks", value: "14", active: "Action Needed", icon: <Clock size={24} />, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Ticket Status", value: "8", active: "3 High Priority Open", icon: <AlertCircle size={24} />, color: "text-rose-600", bg: "bg-rose-100" }
  ];

  const assignedTasks = [
    { id: "TASK-4091", lift: "LIFT-OD-BBS-00125", type: "Installation - COB", status: "In Progress", engineer: "Rahul D." },
    { id: "TASK-4092", lift: "LIFT-OD-CTC-00442", type: "Maintenance - Breakdown", status: "Pending", engineer: "Amit S." },
    { id: "TASK-4088", lift: "LIFT-OD-PURI-0091", type: "Sales - Site Survey", status: "Completed", engineer: "Sanjay K." },
    { id: "TASK-4095", lift: "LIFT-OD-BBS-00130", type: "Maintenance - Service", status: "In Progress", engineer: "Vikash M." },
  ];

  // Mock data for multiple employee live locations
  const employeeLocations = [
    { id: 1, name: "Rahul D.", role: "Installation", lat: 20.2961, lng: 85.8245, status: "On Site (LIFT-OD-BBS-00125)" },
    { id: 2, name: "Vikash M.", role: "Maintenance", lat: 20.3012, lng: 85.8190, status: "Moving" }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 p-6">
      
      {/* Search Bar - Lift Code focus */}
      <div className="relative group shadow-sm rounded-2xl">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Lookup Lift Code to view complete history (e.g., LIFT-OD-BBS-00125)..."
          className="w-full pl-14 pr-32 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
        />
        <button className="absolute inset-y-2 right-2 px-4 sm:px-8 bg-[#DF173C] hover:bg-[#C1122F] text-white font-bold rounded-xl transition-colors text-sm">
          Track Lift
        </button>
      </div>

      {/* Metrics Grid - Manager Specific */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {summaryCards.map((card, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-800 mb-1">{card.value}</h3>
              <p className="text-slate-500 font-semibold text-sm">{card.title}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${card.bg} ${card.color}`}>{card.active}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Task Monitoring List */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">Team Task Progress</h3>
              <p className="text-sm text-slate-500 mt-1">Monitor daily operations and assigned tasks</p>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg">Assign New Task</button>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2">
            {assignedTasks.map((task, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    task.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {task.status === 'Completed' ? <CheckCircle size={20} /> : 
                     task.status === 'In Progress' ? <Activity size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-bold tracking-wide">{task.lift}</h4>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">{task.type} • Assigned to: {task.engineer}</p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border self-start sm:self-auto ${
                    task.status === 'Completed' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                    task.status === 'In Progress' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                    'border-amber-200 text-amber-700 bg-amber-50'
                }`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* GPS Tracking Widget - Employee Live Location */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800">Employee Live Location</h3>
              <MapPin className="text-blue-500" size={20} />
            </div>
            <div className="flex-1 min-h-[400px] bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex flex-col">
              <MapContainer 
                center={[20.2961, 85.8245]} 
                zoom={13} 
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%', minHeight: '400px', borderRadius: '0.75rem' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {employeeLocations.map((emp) => (
                  <Marker key={emp.id} position={[emp.lat, emp.lng]}>
                    <Popup>
                      <div className="font-sans">
                        <p className="font-bold text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.role}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded">
                          {emp.status}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;