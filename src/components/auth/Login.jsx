import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  EyeOff,
  Eye,
  ArrowUp,
  ArrowDown,
  Fingerprint,
} from "lucide-react";

import { resetApiAccess } from "../../utils/apiAccess";
import { isFinanceUser } from "../../utils/roleDetect";
import wallBg from "../../assets/wall2.png";
import evioLogo from "../../assets/image.png";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("noreply@somniatetech.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);

  const [floor, setFloor] = useState(1);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let currentFloor = 1;
    const targetFloor = 3;

    const interval = setInterval(() => {
      if (currentFloor < targetFloor) {
        currentFloor++;
        setFloor(currentFloor);
      } else {
        clearInterval(interval);
        setArrived(true);
        setTimeout(() => setDoorsOpen(true), 500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsAuthenticating(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}auth/login`,
        { email, password },
      );
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("token_type", res.data.token_type);

      const meRes = await axios.get(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}auth/me`,
        { headers: { Authorization: `Bearer ${res.data.access_token}` } },
      );

      const userData = meRes.data || {};

      // Robustly extract role text across strings, objects, and numbers
      const roleField =
        userData.role?.name || userData.role || userData.role_name || "";
      const desigField =
        userData.designation?.name || userData.designation || userData.designation_name || "";
      const deptField = userData.department?.name || userData.department || userData.department_name || "";

      const roleStr = String(roleField).trim().toLowerCase();
      const desigStr = String(desigField).trim().toLowerCase();
      const deptStr = String(deptField).trim().toLowerCase();
      const userEmail = String(userData.email || "")
        .trim()
        .toLowerCase();

      const isAdmin =
        userData.is_superuser ||
        roleStr.includes("admin") ||
        roleStr.includes("director") ||
        userEmail.includes("admin");

      // Lookups are only needed when /auth/me returns ids instead of names.
      let lookups = {};
      if (userData.department_id || userData.designation_id) {
        const [dRes, gRes] = await Promise.allSettled([
          axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}departments`, { headers: { Authorization: `Bearer ${res.data.access_token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}designations`, { headers: { Authorization: `Bearer ${res.data.access_token}` } }),
        ]);
        lookups = {
          departments: dRes.status === "fulfilled" && Array.isArray(dRes.value.data) ? dRes.value.data : [],
          designations: gRes.status === "fulfilled" && Array.isArray(gRes.value.data) ? gRes.value.data : [],
        };
      }
      const isFinance = isFinanceUser(userData, lookups);

      const isManager =
        roleStr.includes("manager") ||
        desigStr.includes("manager") ||
        deptStr.includes("manager");

      const isSales =
        roleStr.includes("sale") ||
        desigStr.includes("sale") ||
        deptStr.includes("sale") ||
        roleStr.includes("executive") ||
        desigStr.includes("executive") ||
        userEmail.includes("sales");

      // Default fallback: if not explicitly admin/manager, treat active employee logins as sales/staff workspace
      let assignedRole = "sales";
      if (isAdmin) assignedRole = "admin";
      else if (isFinance) assignedRole = "finance";
      else if (isManager) assignedRole = "manager";
      else if (isSales) assignedRole = "sales";
      else {
        // Fallback for general active users
        assignedRole = "sales";
      }

      resetApiAccess();
      localStorage.setItem("role", assignedRole);
      localStorage.setItem("user_id", String(userData.id ?? ""));
      localStorage.setItem(
        "user_name",
        [userData.first_name, userData.last_name].filter(Boolean).join(" ").trim() ||
          userData.full_name ||
          userData.name ||
          userData.email ||
          "",
      );

      setDoorsOpen(false);
      setTimeout(() => {
        setIsAuthenticating(false);
        if (assignedRole === "admin") navigate("/admin/dashboard");
        else if (assignedRole === "finance") navigate("/finance/dashboard");
        else if (assignedRole === "manager") navigate("/manager/dashboard");
        else navigate("/sales/dashboard");
      }, 1500);
    } catch (err) {
      setIsAuthenticating(false);
      setError(
        err.response?.data?.detail || "Login failed. Check your credentials.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden relative perspective-[1000px]">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${wallBg})` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative w-full max-w-2xl h-[600px] sm:h-[800px] max-h-[90vh] bg-neutral-950 border-[6px] sm:border-[12px] border-slate-800 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.9)] z-10 flex flex-col overflow-hidden">
        <div className="h-16 sm:h-20 bg-slate-900 border-b-4 border-slate-950 flex items-center justify-center relative z-30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 opacity-50"></div>
          <div className="bg-black border-2 border-slate-700 rounded p-1.5 sm:p-2 px-4 sm:px-6 flex items-center gap-3 sm:gap-4 relative">
            <ArrowUp
              size={20}
              className={`sm:w-6 sm:h-6 ${arrived ? "text-slate-700" : "text-[#DF173C] animate-pulse"}`}
            />
            <span
              className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-[#DF173C]"
              style={{ textShadow: "0 0 10px rgba(59, 130, 246, 0.8)" }}
            >
              {floor < 10 ? `0${floor}` : floor}
            </span>
            <ArrowDown size={20} className="sm:w-6 sm:h-6 text-slate-700" />
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-slate-100 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-300 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(0,0,0,0.05)_50%,transparent_51%)] bg-[length:40px_100%] opacity-30"></div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: doorsOpen ? 1 : 0,
                scale: doorsOpen ? 1 : 0.95,
              }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative w-full max-w-md bg-white backdrop-blur-xl border border-white rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] p-6 sm:p-8 z-10"
            >
              <div className="text-center mb-6 sm:mb-8">
                <img
                  src={evioLogo}
                  alt="EVIO Elevator Logo"
                  className="h-12 sm:h-16 w-auto mx-auto object-contain mb-3 sm:mb-4"
                />
                <p className="text-slate-500 mt-1 sm:mt-2 text-xs sm:text-sm font-medium uppercase tracking-widest">
                  Authentication Required
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail
                        size={18}
                        className="text-slate-400 group-focus-within:text-[#DF173C] transition-colors"
                      />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium backdrop-blur-sm"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock
                        size={18}
                        className="text-slate-400 group-focus-within:text-[#DF173C] transition-colors"
                      />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="block w-full pl-11 pr-11 py-3 sm:py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium backdrop-blur-sm tracking-widest"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs sm:text-sm font-semibold text-red-500 text-center">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DF173C] border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs sm:text-sm font-semibold text-slate-600">
                      Remember credentials
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs sm:text-sm font-bold text-[#d81362] hover:text-[#B81331]"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full relative flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl bg-[#d81362] text-white font-bold text-base sm:text-lg shadow-[0_10px_20px_rgba(223,23,60,0.3)] hover:bg-[#B81331] active:scale-[0.98] transition-all overflow-hidden group cursor-pointer"
                >
                  {isAuthenticating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    >
                      <Fingerprint size={20} className="sm:w-6 sm:h-6" />
                    </motion.div>
                  ) : (
                    <>
                      <span>Engage Lift</span>
                      <ArrowUp
                        size={18}
                        className="sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          <motion.div
            initial={{ x: 0 }}
            animate={{ x: doorsOpen ? "-100%" : 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 left-0 w-1/2 h-full z-20 shadow-[5px_0_15px_rgba(0,0,0,0.5)] border-r border-slate-400/50 flex"
          >
            <div className="w-full h-full bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 relative">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(0,0,0,0.03)_50%,transparent_51%)] bg-[length:10px_100%]"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 sm:w-2 bg-gradient-to-l from-slate-200 to-slate-400"></div>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 0 }}
            animate={{ x: doorsOpen ? "100%" : 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 right-0 w-1/2 h-full z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.5)] border-l border-slate-500 flex"
          >
            <div className="w-full h-full bg-gradient-to-l from-slate-400 via-slate-300 to-slate-400 relative">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(0,0,0,0.03)_50%,transparent_51%)] bg-[length:10px_100%]"></div>
              <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-2 bg-gradient-to-r from-slate-200 to-slate-400"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
