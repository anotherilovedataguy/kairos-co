import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import AdminDashboard from "./pages/admin/Dashboard";
import CampaignList from "./pages/admin/CampaignList";
import CampaignNew from "./pages/admin/CampaignNew";
import CampaignDetail from "./pages/admin/CampaignDetail";
import ApplicationDetail from "./pages/admin/ApplicationDetail";

import CampaignBrowse from "./pages/candidate/CampaignBrowse";
import CampaignApply from "./pages/candidate/CampaignApply";
import InterviewRoom from "./pages/candidate/InterviewRoom";

function RequireRole({ role, children }: { role: "admin" | "candidate"; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/campaigns"} replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin */}
          <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/admin/campaigns" element={<RequireRole role="admin"><CampaignList /></RequireRole>} />
          <Route path="/admin/campaigns/new" element={<RequireRole role="admin"><CampaignNew /></RequireRole>} />
          <Route path="/admin/campaigns/:id" element={<RequireRole role="admin"><CampaignDetail /></RequireRole>} />
          <Route path="/admin/applications/:id" element={<RequireRole role="admin"><ApplicationDetail /></RequireRole>} />

          {/* Candidate */}
          <Route path="/campaigns" element={<RequireRole role="candidate"><CampaignBrowse /></RequireRole>} />
          <Route path="/campaigns/:id" element={<RequireRole role="candidate"><CampaignApply /></RequireRole>} />
          <Route path="/interview/:appId/:roundId" element={<RequireRole role="candidate"><InterviewRoom /></RequireRole>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
