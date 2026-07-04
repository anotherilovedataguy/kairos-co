import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { LogOut, BriefcaseBusiness } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to={user?.role === "admin" ? "/admin" : "/campaigns"} className="flex items-center gap-2 font-bold text-xl text-indigo-600">
        <BriefcaseBusiness size={22} />
        Kairos
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.full_name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">{user.role}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-700 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}
