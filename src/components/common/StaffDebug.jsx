// Hidden helper: open any CRM page with ?debug=staff to see why each person is
// (or is not) in the Sales dropdown. It never shows in normal use.
const StaffDebug = ({ people, staff }) => {
  const listed = new Set(staff.map((p) => Number(p.id)));
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] overflow-x-auto">
      <p className="font-black text-amber-800 mb-2">
        Staff diagnostics - {people.length} users loaded, {staff.length} listed in Sales dropdown
      </p>
      <table className="w-full text-left">
        <thead>
          <tr className="text-amber-900">
            <th className="pr-3">ID</th>
            <th className="pr-3">Name</th>
            <th className="pr-3">Department</th>
            <th className="pr-3">Designation</th>
            <th className="pr-3">Role</th>
            <th className="pr-3">Active</th>
            <th className="pr-3">Sales?</th>
            <th>Listed?</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id} className="border-t border-amber-200">
              <td className="pr-3">{p.id}</td>
              <td className="pr-3">{p.displayName}</td>
              <td className="pr-3">{p.deptStr || "-"}</td>
              <td className="pr-3">{p.desigStr || "-"}</td>
              <td className="pr-3">{p.roleStr || "-"}</td>
              <td className="pr-3">{p.active ? "yes" : "no"}</td>
              <td className="pr-3">{p.isSales ? "yes" : "no"}</td>
              <td>{listed.has(Number(p.id)) ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffDebug;
