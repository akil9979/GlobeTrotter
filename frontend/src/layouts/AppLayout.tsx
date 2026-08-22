import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Globe,
  LayoutDashboard,
  Compass,
  User,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/Button";
import { TripOptimizerModal } from "../features/optimizer/TripOptimizerModal";
import { SearchAutocomplete } from "../components/SearchAutocomplete";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
    isActive
      ? "bg-sky-50 text-sky-700 shadow-subtle"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return "GT";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-sm">
                <Globe className="h-5 w-5" />
              </div>
              <span className="bg-gradient-to-r from-sky-700 to-indigo-700 bg-clip-text text-transparent">
                GlobeTrotter
              </span>
            </Link>

            {/* Desktop Quick Nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              <NavLink to="/dashboard" className={navItemClass}>
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/trips" className={navItemClass}>
                <Compass className="h-4 w-4 shrink-0" />
                <span>My Trips</span>
              </NavLink>
              <NavLink to="/profile" className={navItemClass}>
                <User className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </NavLink>
            </nav>
          </div>

          {/* Quick Search */}
          <div className="hidden lg:block w-64">
            <SearchAutocomplete
              placeholder="Search (e.g. tok)..."
              onSelectCity={(city) => navigate(`/cities?search=${encodeURIComponent(city.name)}`)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4 text-sky-600" />}
              onClick={() => setOptimizerOpen(true)}
              className="hidden md:inline-flex bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-sky-900 font-bold hover:bg-sky-100"
            >
              AI Optimizer
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              onClick={() => navigate("/trips/new")}
              className="hidden sm:inline-flex"
            >
              New Trip
            </Button>

            {/* User Dropdown / Profile Badge */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 font-bold text-xs text-sky-800 ring-2 ring-sky-600/20">
                  {getInitials(user?.name)}
                </div>
                <span className="hidden sm:inline-block text-sm font-semibold text-slate-700">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setOptimizerOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 px-3.5 py-2.5 text-sm font-bold text-sky-900 shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-sky-600" />
              <span>AI Trip Optimizer</span>
            </button>
            <NavLink
              to="/dashboard"
              className={navItemClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/trips"
              className={navItemClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Compass className="h-4 w-4" />
              <span>My Trips</span>
            </NavLink>
            <NavLink
              to="/profile"
              className={navItemClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              <span>Settings</span>
            </NavLink>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                leftIcon={<PlusCircle className="h-4 w-4" />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/trips/new");
                }}
                className="w-full"
              >
                Plan New Trip
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GlobeTrotter — Smart Travel Planning & Itinerary Builder</span>
          <span>Budget Aware • Visual • Organized</span>
        </div>
      </footer>

      {/* AI Trip Optimizer Modal */}
      <TripOptimizerModal
        isOpen={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
      />
    </div>
  );
};
