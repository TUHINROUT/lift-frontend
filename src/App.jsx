import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/auth/Login";
import RequireAuth from "./components/auth/RequireAuth";
import ForgotPassword from "./components/auth/ForgotPassword";

// Admin Layout & Pages
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./components/admin/Dashboard";
import Department from "./components/admin/Department";
import Designations from "./components/admin/Designations";
import AddEmployee from "./components/admin/AddEmployee";
import Customers from "./components/admin/Customers";
import Lifts from "./components/admin/Lifts";
import Tasks from "./components/admin/Tasks";
import Tickets from "./components/admin/Tickets";
import Attendance from "./components/admin/Attendance";
import Tracking from "./components/admin/Tracking";
import Reports from "./components/admin/Reports";
import SalesReport from "./components/admin/SalesReport";
import FleetRadar from "./components/admin/FleetRadar";
import ServiceReports from "./components/admin/ServiceReports";
import CrmLeads from "./components/admin/CrmLeads";
import CrmDepartmentTracker from "./components/admin/CrmDepartmentTracker";
import CrmProposalEditor from "./components/admin/CrmProposalEditor";
import CrmBulkIngestion from "./components/admin/CrmBulkIngestion";

// Finance
import FinanceDashboard from "./components/finance/FinanceDashboard";
import AllEmployeesKm from "./components/common/AllEmployeesKm";

// Sales Executive Dedicated Dashboard
import SalesDashboard from "./components/sales/SalesDashboard";

// Manager Layout & Pages
import ManagerLayout from "./components/manager/ManagerLayout";
import ManagerDashboard from "./components/manager/ManagerDashboard";
import Employees from "./components/manager/Employees";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Dedicated Sales Person Protected Workspace */}
        <Route
          path="/sales/dashboard"
          element={
            <RequireAuth allowedRole="sales">
              <SalesDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/sales-dashboard"
          element={
            <RequireAuth allowedRole="sales">
              <SalesDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/sales/proposals"
          element={
            <RequireAuth allowedRole="sales">
              <CrmProposalEditor />
            </RequireAuth>
          }
        />

        {/* Finance Department */}
        <Route
          path="/finance/dashboard"
          element={
            <RequireAuth allowedRole="finance">
              <FinanceDashboard />
            </RequireAuth>
          }
        />

        {/* Admin Dashboard Suite */}
        <Route
          element={
            <RequireAuth allowedRole="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/department" element={<Department />} />
          <Route path="/admin/designations" element={<Designations />} />
          <Route path="/admin/employees" element={<AddEmployee />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/sales-report" element={<SalesReport />} />
          <Route path="/admin/fleet-radar" element={<FleetRadar />} />
          <Route path="/admin/lifts" element={<Lifts />} />
          <Route path="/admin/tasks" element={<Tasks />} />
          <Route path="/admin/tickets" element={<Tickets />} />
          <Route path="/admin/attendance" element={<Attendance />} />
          <Route path="/admin/tracking" element={<Tracking />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/km" element={<AllEmployeesKm />} />
          <Route path="/admin/service-reports" element={<ServiceReports />} />

          {/* GuideX CRM Routes for Admin & Directors (Read-only monitoring of sales progress) */}
          <Route path="/admin/crm" element={<CrmLeads />} />
          <Route path="/admin/crm/leads" element={<CrmLeads />} />
          <Route path="/admin/crm/tracker" element={<CrmDepartmentTracker />} />
          <Route path="/admin/crm/proposals" element={<CrmProposalEditor />} />
          <Route path="/admin/crm/upload" element={<CrmBulkIngestion />} />
        </Route>

        {/* Manager Suite */}
        <Route
          element={
            <RequireAuth allowedRole="manager">
              <ManagerLayout />
            </RequireAuth>
          }
        >
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/employees" element={<Employees />} />
          <Route path="/manager/customers" element={<Customers />} />
          <Route path="/manager/lifts" element={<Lifts />} />
          <Route path="/manager/tasks" element={<Tasks />} />
          <Route path="/manager/tickets" element={<Tickets />} />
          <Route path="/manager/attendance" element={<Attendance />} />
          <Route path="/manager/tracking" element={<Tracking />} />
          <Route path="/manager/reports" element={<Reports />} />
          <Route path="/manager/km" element={<AllEmployeesKm />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
