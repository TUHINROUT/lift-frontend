// Decides whether a user belongs to the Finance / Accounts team, whatever shape
// the backend returns role / designation / department in (string, object, flat
// *_name field, or only an id that can be looked up).
const FINANCE_RE = /financ|accountant|\baccounts\b|\bcashier\b|\bbilling\b/;

const text = (v) => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(text).join(" ");
  if (typeof v === "object") return text(v.name ?? v.title ?? v.label ?? "");
  return String(v);
};

export const isFinanceUser = (u, { departments = [], designations = [] } = {}) => {
  if (!u) return false;
  const deptById = departments.find((d) => String(d.id) === String(u.department_id));
  const desigById = designations.find((d) => String(d.id) === String(u.designation_id));
  const hay = [
    u.role, u.role_name, u.roles,
    u.designation, u.designation_name, u.job_title, u.position,
    u.department, u.department_name,
    deptById?.name, desigById?.name,
    u.first_name, u.last_name, u.full_name, u.email,
  ]
    .map(text)
    .join(" | ")
    .toLowerCase();
  return FINANCE_RE.test(hay);
};
