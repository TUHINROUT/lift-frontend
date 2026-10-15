import { Navigate } from "react-router-dom";

const RequireAuth = ({ allowedRole, children }) => {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role"); // "admin" | "manager" | "sales"

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRole && role !== allowedRole) {
    const redirectPath =
      role === "admin"
        ? "/admin/dashboard"
        : role === "finance"
          ? "/finance/dashboard"
          : role === "manager"
            ? "/manager/dashboard"
            : "/sales/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default RequireAuth;
