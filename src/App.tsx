import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AppShell from "./components/AppShell";
import PropertyForm from "./components/PropertyForm";
import { Catalog, PropertyDetail, Bookings, Payments, Agreements, Profile } from "./pages/tenant";
import { MyListings, Leads, Earnings } from "./pages/agent";
import { Analytics, AdminListings, Finance, Users } from "./pages/admin";

function DashboardRoutes() {
  const { role } = useAuth();
  if (role === "admin") return (
    <Routes>
      <Route index element={<Analytics />} />
      <Route path="listings" element={<AdminListings />} />
      <Route path="new" element={<PropertyForm />} />
      <Route path="edit/:id" element={<PropertyForm />} />
      <Route path="finance" element={<Finance />} />
      <Route path="users" element={<Users />} />
      <Route path="*" element={<Navigate to="/app" />} />
    </Routes>
  );
  if (role === "agent") return (
    <Routes>
      <Route index element={<MyListings />} />
      <Route path="new" element={<PropertyForm />} />
      <Route path="edit/:id" element={<PropertyForm />} />
      <Route path="leads" element={<Leads />} />
      <Route path="earnings" element={<Earnings />} />
      <Route path="agreements" element={<Agreements />} />
      <Route path="*" element={<Navigate to="/app" />} />
    </Routes>
  );
  return (
    <Routes>
      <Route index element={<Catalog />} />
      <Route path="property/:id" element={<PropertyDetail />} />
      <Route path="bookings" element={<Bookings />} />
      <Route path="payments" element={<Payments />} />
      <Route path="agreements" element={<Agreements />} />
      <Route path="profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/app" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/app" element={<AppShell />}>
            <Route path="*" element={<DashboardRoutes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
