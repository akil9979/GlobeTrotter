import React from "react";
import { Outlet } from "react-router-dom";
import { Globe, MapPin, Compass, Wallet, Sparkles } from "lucide-react";

export const AuthLayout: React.FC = () => {
  return (
    <main className="min-h-screen flex w-full bg-slate-50">
      {/* Left side: Feature Showcase Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative grid/glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md">
            <Globe className="h-6 w-6" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">GlobeTrotter</span>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20 mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Next-Gen Travel Planning
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Plan your dream journey with precision.
            </h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Organize day-by-day itineraries, discover curated city activities, track expenses, and share your adventures seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="space-y-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-900/50 text-sky-400 mb-2">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">Organized</h3>
              <p className="text-xs text-slate-400">Day-by-day activity timelines</p>
            </div>
            <div className="space-y-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-900/50 text-emerald-400 mb-2">
                <Wallet className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">Budget Aware</h3>
              <p className="text-xs text-slate-400">Real-time expense tracking</p>
            </div>
            <div className="space-y-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-900/50 text-amber-400 mb-2">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">Visual</h3>
              <p className="text-xs text-slate-400">Curated city guides & maps</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} GlobeTrotter Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Form container */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </main>
  );
};
