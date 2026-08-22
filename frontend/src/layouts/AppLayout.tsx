import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm ${isActive ? "bg-sky-50 font-medium text-sky-700" : "text-slate-600 hover:bg-slate-100"}`;

export const AppLayout = () => {
  const { user, logout } = useAuth();
  return <div className="min-h-screen">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="text-lg font-bold text-sky-700">GlobeTrotter</Link>
        <div className="flex items-center gap-3 text-sm"><span className="text-slate-600">{user?.name}</span><button onClick={logout} className="text-slate-600 hover:text-slate-900">Log out</button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[190px_1fr]">
      <nav className="flex gap-1 md:flex-col"><NavLink to="/dashboard" className={navItemClass}>Dashboard</NavLink><NavLink to="/trips" className={navItemClass}>My Trips</NavLink><NavLink to="/profile" className={navItemClass}>Settings</NavLink></nav>
      <main><Outlet /></main>
    </div>
  </div>;
};
