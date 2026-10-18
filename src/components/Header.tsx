import React from 'react';
import { UserAccount, isUserAdmin } from '../types';
import { 
  Sparkles, 
  Bot, 
  Video,
  LogOut,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserAccount;
  onLogout?: () => void;
  onNavigateLanding?: () => void;
  activeDashboardMode?: 'nexus_ai' | 'google_meet' | 'admin' | 'studio';
  onSelectDashboardMode?: (mode: 'nexus_ai' | 'google_meet' | 'admin' | 'studio') => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onNavigateLanding,
  activeDashboardMode = 'nexus_ai',
  onSelectDashboardMode,
  isDark = false,
  onToggleTheme,
}) => {
  const isAdmin = isUserAdmin(currentUser);

  return (
    <header className={`h-[72px] border-b backdrop-blur-md px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-40 transition-colors duration-200 ${
      isDark ? 'border-slate-800 bg-[#090D16]/90 text-white' : 'border-[#E7E7E4] bg-[#F7F7F5]/85 text-[#111111]'
    }`}>
      {/* Left: Brand Logo & Wordmark matching Landing Page */}
      <div className="flex items-center gap-6 shrink-0">
        <button
          onClick={onNavigateLanding}
          className={`flex items-center gap-2.5 text-[19px] font-bold tracking-tight transition-colors cursor-pointer text-left ${
            isDark ? 'text-white hover:text-indigo-300' : 'text-[#111111] hover:text-zinc-600'
          }`}
          title="Return to Landing Page"
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
            isDark ? 'bg-indigo-600' : 'bg-black'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span>Nexus Sidekick</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-normal ${
            isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-[#EAEAE7] text-zinc-600 border-[#E7E7E4]'
          }`}>
            Home
          </span>
        </button>

        {/* Top-Level Dashboard Navigation: Nexus AI | Google Meet | Admin Console (Admin Only) */}
        <div className={`hidden md:flex items-center gap-1 p-1 rounded-full border shadow-inner ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#ECEBE8] border-[#E7E7E4]'
        }`}>
          <button
            type="button"
            onClick={() => onSelectDashboardMode?.('nexus_ai')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeDashboardMode === 'nexus_ai'
                ? isDark
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'bg-[#111111] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-zinc-600 hover:text-[#111111] hover:bg-white/70'
            }`}
            title="Nexus AI: Internal Docs, GitHub MCP & Meeting Transcripts"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Nexus AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => onSelectDashboardMode?.('google_meet')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeDashboardMode === 'google_meet'
                ? isDark
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'bg-[#111111] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-zinc-600 hover:text-[#111111] hover:bg-white/70'
            }`}
            title="Google Meet: Host or Join Meetings with Google Calendar sync"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Google Meet</span>
          </button>
          {/* Admin & Knowledge Console: Accessible to all users */}
          <button
            type="button"
            onClick={() => onSelectDashboardMode?.('admin')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeDashboardMode === 'admin'
                ? isDark
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'bg-[#111111] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-zinc-600 hover:text-[#111111] hover:bg-white/70'
            }`}
            title="Admin Console & Knowledge DataStore Ingestion"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Console</span>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold border ${
              isDark 
                ? 'bg-slate-800 text-slate-300 border-slate-700' 
                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}>
              DataStore
            </span>
          </button>
        </div>
      </div>

      {/* Right: Theme Toggle, User Profile & Sign Out */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Dark/Light Mode Toggle matching Landing Page */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'border-slate-700 bg-slate-800/90 text-amber-300 hover:bg-slate-700 hover:text-amber-200'
                : 'border-[#E7E7E4] bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-slate-200 hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[11px] font-semibold text-zinc-700 hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}

        {/* Authenticated User Profile Badge matching Landing Page */}
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs shadow-xs ${
          isDark ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white border-[#E7E7E4] text-zinc-800'
        }`}>
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full object-cover border border-emerald-500/50"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold max-w-[100px] sm:max-w-[140px] truncate leading-tight">
                {currentUser.name}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active Logged-in Session" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 max-w-[100px] sm:max-w-[140px] truncate leading-tight">
                {currentUser.email}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                isAdmin 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {isAdmin ? 'Admin' : 'Employee'}
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-rose-400 hover:border-rose-800/60'
                : 'border-[#E7E7E4] bg-white text-zinc-600 hover:text-rose-600 hover:border-rose-300'
            }`}
            title="Sign out of your account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
