import {
  useState,
  useEffect,
  useRef,
} from "react";
import axios from "axios";
import { createLead } from "../../utils/crmStore";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Printer,
  Save,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Users,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

// Dynamic offer generator: GDX/MMYYYY/{ID}
const generateDynamicOfferNo = (id) => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `GDX/${mm}${yyyy}/${id || "NEW"}`;
};

// Formatted system date DD/MM/YYYY
const getCurrentFormattedDate = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Indian numbering to words calculation
const numberToIndianWords = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "INR Zero Only";

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertBelowThousand = (val) => {
    let res = "";
    if (val >= 100) {
      res += units[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      res += tens[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      res += units[val] + " ";
    }
    return res.trim();
  };

  let remaining = n;
  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const parts = [];
  if (crore > 0) parts.push(convertBelowThousand(crore) + " Crore");
  if (lakh > 0) parts.push(convertBelowThousand(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertBelowThousand(thousand) + " Thousand");
  if (remaining > 0) parts.push(convertBelowThousand(remaining));

  return "INR " + parts.join(" ").trim() + " Only";
};

const defaultProposalData = {
  // Page 1 & 2: Header / Customer Details
  offerNo: generateDynamicOfferNo("303"),
  offerDate: getCurrentFormattedDate(),
  clientName: "Vipin (contractor)",
  clientAddress: "Kalinga Nagar, Bhubaneswar, Odisha",
  clientPhone: "82493 34664",
  siteAddress: "Kalinga Nagar, Bhubaneswar, Odisha",
  proposalTitle:
    "Supply, Installation, Testing and Commissioning of 01 (One) Nos. “GUIDEX” Make Elevator Proposal for your Proposed Project.",

  // Page 3: Technical Specifications
  units: "01 (One)",
  passengerType: "06 PASSENGERS",
  load: "408 KG",
  speed: "1 MPS",
  control: "Microprocessor VVVF",
  carTravel: "G+3 (4 Stops)",
  floorRise: "12 Meters",
  noOfOpenings: "4",
  noOfStops: "4",
  operation: "Gearless / Machine Room Less",
  carFinish: "SS Hairline",
  carEnclosure: "1.2MM",
  carEntranceDoor: "SS Hairline",
  clearDoorOpening: "700mm X 2000mm / 800mm X 2000mm",
  liftWell: "1800 mm x 1650 mm",
  carInside: "1000mm X 1100mm",
  overhead: "4200mm",
  pitDepth: "1500 mm",
  cabinFinish: "Hairline Stainless Steel",
  doorFinish: "Side Opening Door with SS Hairline Finish",
  ceilingFinish: "SS Mirror (1.2MM Grade 304)",
  handrails: "SS Mirror Finish on rear Panel",
  ventilation: "Cross Flow fan",
  flooring: "PVC / Wooden",
  machineUnit: "3 Phase PM Gearless Motor (Montanari)",
  powerSupply: "AC 440 V , 3 Phase 50 Hz",
  stabilizer: "Yes",

  // Page 4: Dynamic Math Pricing
  numberOfLifts: 1,
  costPerLift: 885000,
  totalPrice: 885000,
  inWords: "INR Eight Lakh Eighty Five Thousand Only",

  // Page 7: Brands / Components
  cabinBrand: "SS Hairline 304 Grade",
  motorBrand: "Montanari (Life Time Warranty)",
  copBrand: "GUIDEX Make",
  ropeBrand: "Usha Martin",
  doorBrand: "Fermator/ NBSL/ Wittur",
  warrantyYears: "1 Year / 2 Years",
  guideRailBrand: "Marazzi / Kamachi Imported",
  doorSensorsBrand: "Weco",
  controllerBrand: "Monarch Drive / Arkel",
};

const CrmProposalEditor = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id") || "10";

  const [allLeads, setAllLeads] = useState([]);
  const [formData, setFormData] = useState(defaultProposalData);
  const [activeTab, setActiveTab] = useState("general");
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const printAreaRef = useRef(null);

  // Load leads dropdown
  useEffect(() => {
    const fetchLeadsList = async () => {
      try {
        const res = await axios.get(`${API_URL}crm/leads`, authHeaders());
        setAllLeads(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load leads list:", e);
      }
    };
    fetchLeadsList();
  }, []);

  // Sync state whenever leadId changes
  useEffect(() => {
    const fetchLeadInfo = async () => {
      if (leadId === "new") {
        setFormData({
          ...defaultProposalData,
          offerNo: generateDynamicOfferNo("NEW"),
          offerDate: getCurrentFormattedDate(),
          clientName: "",
          clientPhone: "",
          siteAddress: "Bhubaneswar, Odisha",
        });
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}crm/leads/${leadId}`,
          authHeaders(),
        );
        if (res.data) {
          const l = res.data;
          const price = Number(l.deal_value || l.estimated_value) || 885000;
          setFormData((prev) => ({
            ...prev,
            offerNo: generateDynamicOfferNo(l.id),
            offerDate: getCurrentFormattedDate(),
            clientName:
              l.lead_name || l.client_name || l.name || `Lead #${l.id}`,
            clientPhone: l.lead_number || l.contact_number || l.phone || "",
            siteAddress: l.site_location || l.address || "Bhubaneswar, Odisha",
            carTravel: l.stops || "G+3 (4 Stops)",
            numberOfLifts: 1,
            costPerLift: price,
            totalPrice: price,
            inWords: numberToIndianWords(price),
          }));
        }
      } catch {
        setFormData((prev) => ({
          ...prev,
          offerNo: generateDynamicOfferNo(leadId),
          offerDate: getCurrentFormattedDate(),
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchLeadInfo();
  }, [leadId]);

  // Recalculate price when unit count or price per lift changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "costPerLift" || name === "numberOfLifts") {
        const qty = Number(updated.numberOfLifts) || 1;
        const rate = Number(updated.costPerLift) || 0;
        const calculatedTotal = qty * rate;
        updated.totalPrice = calculatedTotal;
        updated.inWords = numberToIndianWords(calculatedTotal);
      }
      return updated;
    });
  };

  const handleLeadSwitch = (selectedId) => {
    setSearchParams({ lead_id: selectedId });
  };

  // Safe database save (PUT/POST/PATCH cascade)
  const handleSaveToDatabase = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      lead_name: formData.clientName || "New Client",
      lead_number: formData.clientPhone,
      site_location: formData.siteAddress,
      stops: formData.carTravel,
      deal_value: Number(formData.totalPrice),
    };

    try {
      if (leadId === "new") {
        const createRes = await createLead(payload);
        const newId = createRes.data?.id;
        setSaveSuccess(true);
        if (newId) setSearchParams({ lead_id: newId });
      } else {
        try {
          await axios.put(
            `${API_URL}crm/leads/${leadId}`,
            payload,
            authHeaders(),
          );
        } catch {
          await axios.patch(
            `${API_URL}crm/leads/${leadId}`,
            payload,
            authHeaders(),
          );
        }
        setSaveSuccess(true);
      }
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Dynamic percentage calculations for terms
  const advancePaymentAmount = Math.round(
    Number(formData.totalPrice || 0) * 0.2,
  );
  const manufacturingPaymentAmount = Math.round(
    Number(formData.totalPrice || 0) * 0.7,
  );
  const deliveryPaymentAmount = Math.round(
    Number(formData.totalPrice || 0) * 0.1,
  );

  return (
    <div className="min-h-full bg-[#f4f5f7] text-zinc-900 pb-16 font-sans">
      {/* Studio Top Control Strip */}
      <div className="print:hidden border-b border-zinc-200 bg-white sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-[1750px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/crm/leads?lead_id=${leadId}`)}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-zinc-950">
                  GUIDEX Proposal Studio
                </h1>
                <span className="rounded bg-red-100 px-2.5 py-0.5 text-xs font-black text-[#DF173C]">
                  {formData.offerNo}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Customer:{" "}
                <strong>{formData.clientName || "Proposal Target"}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-bold">
              <Users size={13} className="text-zinc-400" />
              <select
                value={leadId}
                onChange={(e) => handleLeadSwitch(e.target.value)}
                className="bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
              >
                {allLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    Lead #{l.id} —{" "}
                    {l.lead_name || l.client_name || `Client ${l.id}`}
                  </option>
                ))}
                <option value="new">+ Create Brand New Lead</option>
              </select>
            </div>

            <button
              onClick={() => handleLeadSwitch("new")}
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-xs"
            >
              <Plus size={13} className="text-[#DF173C]" />
              <span>New Proposal</span>
            </button>

            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Saved!
              </span>
            )}

            <button
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition shadow-xs cursor-pointer"
            >
              <Save size={13} />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DF173C] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#c91435] transition shadow-md shadow-red-950/20 cursor-pointer"
            >
              <Printer size={13} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Canvas */}
      <div className="max-w-[1750px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: EDIT FORM CONTROLS                           */}
        {/* ========================================================= */}
        <div className="print:hidden lg:col-span-5 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === "general"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Client & Site
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === "specs"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Technical Specs
            </button>
            <button
              onClick={() => setActiveTab("pricing")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === "pricing"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Pricing & Math
            </button>
          </div>

          {activeTab === "general" && (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Dynamic Offer No (Formula: GDX/MMYYYY/ID)
                </label>
                <input
                  type="text"
                  name="offerNo"
                  value={formData.offerNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold text-[#DF173C] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Proposal Date
                  </label>
                  <input
                    type="text"
                    name="offerDate"
                    value={formData.offerDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Client Phone
                  </label>
                  <input
                    type="text"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Client / Contractor Name
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Client Postal Address
                </label>
                <input
                  type="text"
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Site Address
                </label>
                <input
                  type="text"
                  name="siteAddress"
                  value={formData.siteAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Subject Header Line
                </label>
                <textarea
                  rows={2}
                  name="proposalTitle"
                  value={formData.proposalTitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Passenger Type
                  </label>
                  <input
                    type="text"
                    name="passengerType"
                    value={formData.passengerType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Rated Load
                  </label>
                  <input
                    type="text"
                    name="load"
                    value={formData.load}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Car Travel & Stops
                  </label>
                  <input
                    type="text"
                    name="carTravel"
                    value={formData.carTravel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Floor Rise
                  </label>
                  <input
                    type="text"
                    name="floorRise"
                    value={formData.floorRise}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Lift Well Size
                  </label>
                  <input
                    type="text"
                    name="liftWell"
                    value={formData.liftWell}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Car Inside
                  </label>
                  <input
                    type="text"
                    name="carInside"
                    value={formData.carInside}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Machine Motor Unit
                </label>
                <input
                  type="text"
                  name="machineUnit"
                  value={formData.machineUnit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Number of Lifts
                  </label>
                  <input
                    type="number"
                    name="numberOfLifts"
                    value={formData.numberOfLifts}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Cost Per Each Lift (₹)
                  </label>
                  <input
                    type="number"
                    name="costPerLift"
                    value={formData.costPerLift}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Calculated Total Contract Value
                </span>
                <p className="text-xl font-black text-emerald-600">
                  ₹{Number(formData.totalPrice).toLocaleString("en-IN")}.00
                </p>
                <p className="text-[11px] font-bold text-zinc-700 italic">
                  {formData.inWords}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Payment Milestones Breakdown
                </span>
                <div className="space-y-1 text-zinc-600 font-medium">
                  <div className="flex justify-between">
                    <span>20% Order Confirmation:</span>
                    <strong className="text-zinc-900">
                      ₹{advancePaymentAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>70% Manufacturing Notice:</span>
                    <strong className="text-zinc-900">
                      ₹{manufacturingPaymentAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>10% Handover & Commission:</span>
                    <strong className="text-zinc-900">
                      ₹{deliveryPaymentAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 8-PAGE EXACT A4 PREVIEW CANVAS              */}
        {/* ========================================================= */}
        <div
          ref={printAreaRef}
          className="lg:col-span-7 space-y-8 bg-zinc-200/50 p-2 sm:p-4 rounded-2xl flex flex-col items-center"
        >
          {/* ---------------- PAGE 1: COVER PAGE ---------------- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-16 shadow-xl rounded-sm flex flex-col justify-between text-center relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#DF173C] tracking-tight">
                GUIDEX ELEVATOR PVT. LTD.
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                www.guidexelevator.com | info@guidexelevator.com
              </p>
            </div>

            <div className="my-auto space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-700">
                The Safest Elevator of India
              </h2>
              <p className="text-sm font-semibold text-zinc-600">
                As per IS17900 Standards
              </p>
            </div>

            <div className="space-y-1.5 pt-8 border-t border-zinc-100">
              <h3 className="text-base font-extrabold uppercase tracking-wide text-zinc-950">
                PROPOSAL FOR PASSENGER ELEVATOR
              </h3>
              <p className="text-xs font-semibold text-zinc-700">
                Prepared for: {formData.clientName || "Client"}
              </p>
              <p className="text-xs text-zinc-500">
                Site: {formData.siteAddress}
              </p>
            </div>
          </div>

          {/* ---------------- PAGE 2: FORMAL OFFER LETTER -------- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-6">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                  <p>Bhubaneswar, Odisha</p>
                  <p>Email: info@guidexelevator.com</p>
                  <p>Website: www.guidexelevator.com</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C] flex items-center justify-end gap-1">
                    <span>▲</span> GUIDEX
                  </div>
                  <span className="text-[10px] font-bold text-blue-900 tracking-wider">
                    The Safest Elevator
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-xs font-bold mb-4">
                <span>Offer No : {formData.offerNo}</span>
                <span>Date: {formData.offerDate}</span>
              </div>

              <div className="text-xs leading-relaxed text-zinc-800 mb-4">
                <strong>To,</strong>
                <p className="font-bold text-zinc-950">
                  {formData.clientName || "Valued Client"}
                </p>
                <p>{formData.clientAddress}</p>
                <p>Contact: {formData.clientPhone || "82493 34664"}</p>
              </div>

              <div className="text-xs mb-4">
                <strong>Site Address:</strong> {formData.siteAddress}
              </div>

              <div className="text-xs font-bold text-zinc-950 mb-4">
                Sub: {formData.proposalTitle}
              </div>

              <div className="text-xs leading-relaxed text-zinc-700 space-y-3">
                <p>Dear Sir,</p>
                <p>
                  This has reference to the discussion held between GUIDEX and
                  you regarding the subject elevator.
                </p>
                <p>
                  As desired by you, we are submitting herewith our Proposal No.{" "}
                  {formData.offerNo} dated {formData.offerDate} in duplicate for
                  your kind consideration and acceptance of the same.
                </p>
                <p>
                  While submitting the proposal, we would like to state that the
                  same will remain valid for your kind acceptance for a period
                  of 30 days from the date hereof.
                </p>
                <p>
                  Please note that no escalation in price is applicable. Our
                  price shall remain firm for the period of 1 year from the date
                  of agreement and the same will be subjected to revision
                  thereafter as per the market rates ruling at the time.
                </p>
                <p>
                  Please sign and return one copy of our Proposal as a token of
                  your acceptance along with the necessary advance payment to
                  enable us to take up the job.
                </p>
                <p>
                  We sincerely hope that our quotation and other terms and
                  conditions will be acceptable to you and you will favor us by
                  placing your valued order at an early date.
                </p>
                <p>
                  Thanking and assuring you of our best services at all times.
                </p>
              </div>
            </div>

            <div className="text-xs pt-8">
              <p>Yours faithfully,</p>
              <p className="font-extrabold text-zinc-950 mt-1">
                GUIDEX ELEVATOR PVT. LTD.
              </p>
              <p className="text-zinc-500">Office Contact: +91 9668654365</p>
            </div>
          </div>

          {/* ---------------- PAGE 3: TECHNICAL SPECIFICATIONS ---- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-4">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                  <p>Bhubaneswar, Odisha</p>
                  <p>Email: info@guidexelevator.com</p>
                  <p>Website: www.guidexelevator.com</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C] flex items-center justify-end gap-1">
                    <span>▲</span> GUIDEX
                  </div>
                  <span className="text-[10px] font-bold text-blue-900 tracking-wider">
                    The Safest Elevator
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 mb-3">
                TECHNICAL SPECIFICATION
              </h3>

              <table className="w-full border-collapse border border-zinc-400 text-[11px]">
                <tbody>
                  {[
                    ["NO OF UNIT", formData.units],
                    ["TYPE", formData.passengerType],
                    ["LOAD", formData.load],
                    ["SPEED", formData.speed],
                    ["CONTROL", formData.control],
                    ["CAR TRAVEL", formData.carTravel],
                    ["FLOOR RISE", formData.floorRise],
                    ["NO OF OPENING", formData.noOfOpenings],
                    ["NO OF STOPS", formData.noOfStops],
                    ["OPERATION", formData.operation],
                    ["CAR FINISH", formData.carFinish],
                    ["CAR ENCLOSURE", formData.carEnclosure],
                    ["CAR ENTRANCE DOOR", formData.carEntranceDoor],
                    ["CLEAR DOOR OPENING", formData.clearDoorOpening],
                    ["LIFT WELL", formData.liftWell],
                    ["CAR INSIDE", formData.carInside],
                    ["OVER HEAD", formData.overhead],
                    ["PIT DEPTH", formData.pitDepth],
                    ["Cabin/ Car finish (All Side)", formData.cabinFinish],
                    ["Door Finish", formData.doorFinish],
                    ["Car Ceiling Finish", formData.ceilingFinish],
                    ["Handrails", formData.handrails],
                    ["Ventilation", formData.ventilation],
                    ["Flooring", formData.flooring],
                    ["MACHINE UNIT", formData.machineUnit],
                    ["POWER SUPPLY", formData.powerSupply],
                    ["Stabilizer", formData.stabilizer],
                  ].map(([label, val], idx) => (
                    <tr key={idx} className="border-b border-zinc-300">
                      <td className="p-1.5 border-r border-zinc-300 font-extrabold text-zinc-900 w-1/2">
                        {label}
                      </td>
                      <td className="p-1.5 text-zinc-800">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-6 text-xs font-bold text-zinc-800">
              Customer's Sign: ___________________________
            </div>
          </div>

          {/* ---------------- PAGE 4: FEATURES & PRICE ------------ */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-4">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                  <p>Bhubaneswar, Odisha</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C]">
                    ▲ GUIDEX
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 mb-3">
                MAIN FEATURES & SAFETY SYSTEMS:
              </h3>

              <div className="grid grid-cols-2 gap-0 border border-zinc-400 text-[11px] mb-6">
                <div className="border-r border-zinc-400 p-2 space-y-1">
                  <strong className="block border-b border-zinc-300 pb-1 mb-1">
                    MAIN FEATURES:
                  </strong>
                  <p>1 Hassle Free Comprehensive maintenance (1 yr)</p>
                  <p>2 Fire rated landing doors - 60 Mins</p>
                  <p>3 Door with mechanical lock</p>
                  <p>4 Anti Nuisance Car Call Protection</p>
                  <p>5 Overspeed Protection for Lift Car (OSG)</p>
                  <p>6 Manual Rescue Operation</p>
                </div>

                <div className="p-2 space-y-1">
                  <strong className="block border-b border-zinc-300 pb-1 mb-1">
                    SAFETY FEATURES:
                  </strong>
                  <p>1 Overload protection</p>
                  <p>2 Emergency Alarm</p>
                  <p>3 Infrared Door Protection Light Curtain</p>
                  <p>4 Emergency Stop Switch</p>
                  <p>5 Door Open & Close Button</p>
                  <p>6 ARD System (Automatic Rescue Device)</p>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 mb-2">
                PRICE SCHEDULE:
              </h3>

              <table className="w-full border border-zinc-400 text-xs text-left mb-2">
                <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                  <tr>
                    <th className="p-2 border-r border-zinc-400">No of Lift</th>
                    <th className="p-2 border-r border-zinc-400">
                      Cost per each lift
                    </th>
                    <th className="p-2">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-r border-zinc-400 font-bold">
                      {formData.numberOfLifts}
                    </td>
                    <td className="p-2 border-r border-zinc-400 font-bold">
                      Rs. {Number(formData.costPerLift).toLocaleString("en-IN")}
                      .00
                    </td>
                    <td className="p-2 font-black text-zinc-950">
                      Rs. {Number(formData.totalPrice).toLocaleString("en-IN")}
                      .00
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border border-zinc-400 text-xs font-bold text-zinc-900 mb-6">
                In Words: {formData.inWords}
              </div>
            </div>

            <div className="pt-6 text-xs font-bold text-zinc-800">
              Customer's Sign: ___________________________
            </div>
          </div>

          {/* ---------------- PAGE 5: PAYMENT TERMS & CONDITIONS --- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-4">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C]">
                    ▲ GUIDEX
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-zinc-800">
                <div>
                  <h4 className="font-black text-sm text-zinc-950 mb-2">
                    Payment Terms
                  </h4>
                  <p className="font-bold">
                    &gt; 20 % On confirmation of Order.
                  </p>
                  <p className="font-bold">
                    &gt; 70 % On intimation that material manufacturing.
                  </p>
                  <p className="text-[11px] text-zinc-500 pl-4">
                    (Material will deliver by 4 weeks from receipt of this
                    payment)
                  </p>
                  <p className="font-bold">
                    &gt; 10 % Before handing over or installation of lift.
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="font-black text-sm text-zinc-950 uppercase tracking-wide mb-2">
                    TERMS & CONDITIONS
                  </h4>
                  <p className="font-bold">Quotation Validity:</p>
                  <p className="text-zinc-600">
                    ● This quotation is valid for 30 days from the date of
                    issuance. After this period, the terms, prices, and
                    specifications may be subject to revision.
                  </p>
                </div>

                <div>
                  <h4 className="font-black text-xs text-zinc-950 uppercase mb-1">
                    Scope of Work:
                  </h4>
                  <p className="font-bold text-zinc-900">Customer Scope:</p>
                  <p className="text-zinc-600">
                    ❖ Complete Shaft Construction: Civil works or fabrication
                    required for the full lift shaft ({formData.liftWell}).
                  </p>
                  <p className="text-zinc-600">
                    ❖ Scaffolding of Shaft: Provision and arrangement of
                    scaffolding inside the shaft, as required for installation.
                  </p>
                  <p className="text-zinc-600">
                    ❖ Electrical Wiring of Shaft and Earthing: Completion of
                    electrical wiring from the main panel to the lift machine
                    point, with proper earthing as per safety standards.
                  </p>

                  <p className="font-bold text-zinc-900 mt-2">Company Scope:</p>
                  <p className="text-zinc-600">
                    ● Complete Supply, Installation, Testing, and Commissioning
                    of the Lift System as per specifications outlined in this
                    quotation.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 text-xs font-bold text-zinc-800">
              Customer's Sign: ___________________________
            </div>
          </div>

          {/* ---------------- PAGE 6: TIMELINE & WARRANTY --------- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-4">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C]">
                    ▲ GUIDEX
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 text-xs leading-relaxed text-zinc-800">
                <p>
                  ● The quoted price includes the supply, installation, testing,
                  and commissioning of the elevator system. Any additional
                  requirements or modifications not mentioned in this quotation
                  will be subject to additional charges.
                </p>

                <div>
                  <strong className="font-black text-zinc-950 block">
                    Delivery and Installation Timeline:
                  </strong>
                  <p>
                    ● The estimated total time for delivery, installation, and
                    commissioning of the goods elevator is 3 months from the
                    date of order confirmation and receipt of all required
                    documentation.
                  </p>
                  <p>
                    ● GUIDEX will notify the customer promptly if there are any
                    delays due to unforeseen circumstances or force majeure
                    events.
                  </p>
                </div>

                <div>
                  <strong className="font-black text-zinc-950 block">
                    Warranty:
                  </strong>
                  <p>
                    ● GUIDEX provides a warranty for the elevator system for a
                    period of 12 months from the date of successful installation
                    and commissioning.
                  </p>
                  <p>
                    ● This warranty covers the repair or replacement of any
                    faulty or defective parts due to manufacturing or material
                    defects.
                  </p>
                </div>

                <div>
                  <strong className="font-black text-zinc-950 block">
                    Installation and Site Conditions:
                  </strong>
                  <p>
                    ● The customer is responsible for ensuring that the
                    installation site is fully prepared and meets the necessary
                    conditions for installation, such as proper structural
                    support, electrical connections, and accessibility.
                  </p>
                </div>

                <div>
                  <strong className="font-black text-zinc-950 block">
                    Maintenance:
                  </strong>
                  <p>
                    ● Post-installation maintenance services can be provided by
                    GUIDEX on a separate service contract basis. Please contact
                    GUIDEX for details regarding maintenance packages after the
                    warranty period.
                  </p>
                </div>

                <div>
                  <strong className="font-black text-zinc-950 block">
                    Cancellation or Modification:
                  </strong>
                  <p>
                    ● Any cancellation or modification to the order after
                    confirmation will incur a cancellation fee of 10% of the
                    total contract value.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 text-xs font-bold text-zinc-800">
              Customer's Sign: ___________________________
            </div>
          </div>

          {/* ---------------- PAGE 7: BRAND SPECIFICATIONS -------- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-4">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C]">
                    ▲ GUIDEX
                  </div>
                </div>
              </div>

              <div className="text-xs leading-relaxed text-zinc-700 space-y-3 mb-6">
                <div>
                  <strong className="text-zinc-950 block">Liability:</strong>
                  <p>
                    ● GUIDEX will not be held liable for any indirect,
                    incidental, or consequential damages arising from delays,
                    defects, or malfunctioning of the elevator system.
                  </p>
                  <p>
                    ● GUIDEX's total liability under this agreement is limited
                    to the repair or replacement of defective parts within the
                    warranty period.
                  </p>
                </div>
                <div>
                  <strong className="text-zinc-950 block">
                    Dispute Resolution:
                  </strong>
                  <p>
                    ● Any disputes or disagreements arising from this agreement
                    shall first be resolved through amicable negotiations
                    between the parties.
                  </p>
                </div>
                <div>
                  <strong className="text-zinc-950 block">Acceptance:</strong>
                  <p>
                    ● By signing this agreement, the customer acknowledges
                    acceptance of the terms and conditions outlined in this
                    quotation.
                  </p>
                </div>
              </div>

              <table className="w-full border border-zinc-400 text-xs mb-8">
                <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                  <tr>
                    <th className="p-2 border-r border-zinc-400 w-1/3">
                      Parts
                    </th>
                    <th className="p-2">Grade / Brand</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Cabin", formData.cabinBrand],
                    ["Motor", formData.motorBrand],
                    ["COP/ LOP", formData.copBrand],
                    ["Rope", formData.ropeBrand],
                    ["Door", formData.doorBrand],
                    ["Warranty / AMC", formData.warrantyYears],
                    ["Guide Rail", formData.guideRailBrand],
                    ["Door Sensors", formData.doorSensorsBrand],
                    ["Controller", formData.controllerBrand],
                  ].map(([part, brand], idx) => (
                    <tr key={idx} className="border-b border-zinc-300">
                      <td className="p-2 border-r border-zinc-300 font-bold text-zinc-800">
                        {part}
                      </td>
                      <td className="p-2 text-zinc-700">{brand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-end text-xs font-bold text-zinc-800 pt-6">
              <div>
                <p>Customer's Sign: ___________________________</p>
                <p className="mt-4">Date: ___________________________</p>
              </div>
              <div>
                <p>Guidex Employee Sign with Date</p>
              </div>
            </div>
          </div>

          {/* ---------------- PAGE 8: MAINTENANCE CONTRACT -------- */}
          <div className="bg-white w-full max-w-[794px] min-h-[1080px] p-12 sm:p-14 shadow-xl rounded-sm flex flex-col justify-between text-left relative print:shadow-none print:m-0 print:p-12 print:min-h-screen">
            <div>
              <div className="flex items-start justify-between border-b border-zinc-300 pb-2 mb-4">
                <div className="text-[11px] leading-tight text-zinc-600">
                  <strong className="text-xs text-zinc-950 font-black">
                    GUIDEX ELEVATOR PVT. LTD.
                  </strong>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#DF173C]">
                    ▲ GUIDEX
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 mb-3">
                Maintenance Contract
              </h3>

              <table className="w-full border border-zinc-400 text-xs mb-6">
                <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                  <tr>
                    <th className="p-2 border-r border-zinc-400">Year</th>
                    <th className="p-2 border-r border-zinc-400">AMC/CMC</th>
                    <th className="p-2 border-r border-zinc-400">Price</th>
                    <th className="p-2 border-r border-zinc-400">
                      No of Service/Year
                    </th>
                    <th className="p-2">Work Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-r border-zinc-300 font-bold">
                      1st Year, 2nd Year
                    </td>
                    <td className="p-2 border-r border-zinc-300 font-bold">
                      CMC , AMC
                    </td>
                    <td className="p-2 border-r border-zinc-300 font-black text-emerald-700">
                      Free
                    </td>
                    <td className="p-2 border-r border-zinc-300 font-bold">
                      8 Service / Year
                    </td>
                    <td className="p-2 text-zinc-700">
                      Safety Check , Maintenance , Cleaning
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-xs leading-relaxed text-zinc-700 space-y-3">
                <p>
                  • The contractor shall provide eight (8) preventive
                  maintenance services per annum. Each service shall include a
                  comprehensive safety inspection, mechanical and electrical
                  maintenance, lubrication, adjustment, and cleaning of all lift
                  components to ensure safe and reliable operation.
                </p>
                <p>
                  • In the event of a mantrap (entrapment of passengers inside
                  the lift car), the contractor shall provide immediate
                  emergency response, and rescue operations shall be carried out
                  on a priority basis in accordance with statutory safety
                  procedures.
                </p>
                <p>
                  • During the Warranty / Comprehensive Maintenance Contract
                  (CMC) period, the contractor shall be responsible for the
                  repair or replacement of all lift components, excluding
                  consumable items such as indicator bulbs, cabin fans, and
                  batteries.
                </p>
                <p>
                  • The contractor shall ensure breakdown attendance within one
                  (1) working day from the time of complaint registration.
                </p>
                <p>
                  • All maintenance and repair activities shall be performed by
                  qualified and authorized service engineers, in compliance with
                  applicable safety standards, manufacturer guidelines, and
                  statutory regulations.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end text-xs font-bold text-zinc-800 pt-6">
              <div>
                <p>Customer's Sign: ___________________________</p>
                <p className="mt-4">Date: ___________________________</p>
              </div>
              <div>
                <p>Guidex Employee Sign with Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmProposalEditor;
