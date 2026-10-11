'use client';

import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Wrench, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function MaintenancePage() {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-orange-600/15 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lpu-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Campus Connect <span className="text-orange-500 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 font-bold ml-1">LPU</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Centralized Academic Resource Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Site Paused
          </span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 relative z-10">
        <div className="w-full max-w-xl text-center">
          
          {/* Animated Maintenance Icon Badge */}
          <div className="relative inline-flex mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-orange-500/20 via-amber-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-2xl shadow-orange-500/20 mx-auto animate-pulse">
              <Wrench className="w-10 h-10 sm:w-12 sm:h-12 text-orange-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 p-2 rounded-xl shadow-lg border border-amber-300 font-bold text-xs flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Under Scheduled <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Maintenance</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto leading-relaxed mb-8">
            Campus Connect LPU is temporarily paused while we deploy critical system updates and performance upgrades. Access is restricted for all users until maintenance completes.
          </p>

          {/* Status Breakdown Box */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 sm:p-6 mb-8 text-left shadow-2xl divide-y divide-slate-800/80">
            <div className="flex items-start gap-3.5 pb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-200">Current Status</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  System maintenance & infrastructure update in progress.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 py-4">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-200">Data Safety & Security</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All student notes, files, PYQs, and bookmarks remain secure and intact.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-200">Estimated Duration</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Expected to conclude shortly. Thank you for your patience!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-lpu-600 to-amber-500 hover:from-lpu-700 hover:to-amber-600 text-white font-bold text-sm shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking Status...' : 'Check If Back Online'}</span>
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-900 text-center flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 relative z-10">
        <div>
          © {new Date().getFullYear()} Campus Connect LPU • Lovely Professional University
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Admin Access
          </Link>
        </div>
      </footer>
    </div>
  );
}
