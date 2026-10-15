import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Phone,
  ChevronRight,
  X,
  Calendar,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const FollowUpReminderModal = () => {
  const navigate = useNavigate();
  const [dueLeads, setDueLeads] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkFollowups = async () => {
      if (dismissed) return;
      try {
        const res = await axios.get(`${API_URL}crm/leads`, authHeaders());
        if (Array.isArray(res.data)) {
          const today = new Date().toISOString().split("T")[0];

          // Filter leads where next_followup_date is today or overdue
          const urgent = res.data.filter((l) => {
            if (!l.next_followup_date) return false;
            const fDate = l.next_followup_date.split("T")[0];
            return (
              fDate <= today && !["ORDER_WON", "ORDER_LOST"].includes(l.stage)
            );
          });

          if (urgent.length > 0) {
            setDueLeads(urgent);
            // Trigger automatic pop-up alert once
            setIsOpen(true);
          }
        }
      } catch {
        // Silent background fallback
      }
    };

    checkFollowups();
    // Check every 3 minutes
    const interval = setInterval(checkFollowups, 180000);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (!isOpen || dueLeads.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#DF173C] text-white flex items-center justify-center shadow-md shadow-red-950/20">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-950">
                  Follow-up Action Due Today
                </h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-[#DF173C]">
                  {dueLeads.length} Urgent
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                The following customer calls and meetings require immediate
                attention.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              setDismissed(true);
            }}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Due Leads List */}
        <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto pr-1 space-y-1">
          {dueLeads.map((l) => (
            <div
              key={l.id}
              className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-50 p-2 rounded-xl transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold text-zinc-400">
                    {l.lead_code || `LEAD-${l.id}`}
                  </span>
                  <h4 className="text-xs font-black text-zinc-950 truncate">
                    {l.lead_name || l.client_name || `Lead #${l.id}`}
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1">
                  <Phone size={11} className="text-zinc-400" />
                  <span>{l.lead_number || l.phone || "No phone"}</span>
                  <span>•</span>
                  <Calendar size={11} className="text-[#DF173C]" />
                  <span className="text-[#DF173C] font-bold">
                    Due: {l.next_followup_date?.split("T")[0]}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/admin/crm/leads?lead_id=${l.id}`);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#DF173C] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#c91435] transition cursor-pointer shrink-0"
              >
                <span>Take Action</span>
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setDismissed(true);
            }}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-700 cursor-pointer"
          >
            Snooze 3 Hours
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate("/admin/crm/leads");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition shadow-xs cursor-pointer"
          >
            <span>Open All Follow-ups</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpReminderModal;
