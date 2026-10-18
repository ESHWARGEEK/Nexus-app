import React, { useState } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  ArrowRight, 
  Play, 
  Calendar, 
  FileText, 
  Activity, 
  Check, 
  Sparkles, 
  ExternalLink,
  Code2,
  Lock,
  Zap,
  User,
  Radio,
  FileCode2,
  GitBranch,
  ShieldAlert,
  LogIn,
  UserCheck,
  UserPlus,
  Sun,
  Moon,
  Bot
} from 'lucide-react';
import { UserAccount, isUserAdmin } from '../types';
import { googleSignInWithWorkspace } from '../services/googleWorkspaceService';

interface LandingPageProps {
  onLaunchCockpit: () => void;
  onOpenAdmin?: () => void;
  onOpenAuth?: (mode: 'signin' | 'register') => void;
  onNavigateCalendar?: () => void;
  currentUser?: UserAccount;
  onLoginSuccess?: (user: UserAccount) => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onLaunchCockpit,
  onOpenAdmin,
  onOpenAuth,
  onNavigateCalendar,
  currentUser,
  onLoginSuccess,
  isAuthenticated = false,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'mcp' | 'docai'>('copilot');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_theme') === 'dark';
    }
    return false;
  });

  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState<boolean>(false);
  const [googleAuthNotice, setGoogleAuthNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setGoogleAuthNotice(null);
    try {
      const res = await googleSignInWithWorkspace();
      const realEmail = (res.user.email || 'evaluator@workspace.corp').toLowerCase();
      const realName = res.user.displayName || realEmail.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase());
      const realAvatar = res.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      const realGoogleUser: UserAccount = {
        id: res.user.uid || `usr_google_${Date.now()}`,
        name: realName,
        email: realEmail,
        role: 'leadership',
        avatar: realAvatar,
        department: 'Enterprise Workspace',
        orgRole: 'admin',
        groups: ['leadership', 'security', 'eng-core'],
        orgId: 'acme',
        idToken: res.accessToken,
      };

      setGoogleAuthNotice({ type: 'success', text: `Signed in as ${realEmail}!` });
      if (onLoginSuccess) {
        onLoginSuccess(realGoogleUser);
      } else {
        onLaunchCockpit();
      }
    } catch (err: any) {
      console.warn('Google sign-in popup notice:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setGoogleAuthNotice({ type: 'error', text: 'Google sign-in popup was closed before completion.' });
      } else {
        setGoogleAuthNotice({ type: 'error', text: err?.message || 'Google sign-in failed. Please try again.' });
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_theme', next ? 'dark' : 'light');
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
      isDark ? 'bg-[#090D16] text-[#F1F5F9] selection:bg-indigo-900/60' : 'bg-[#F7F7F5] text-[#111111] selection:bg-zinc-200'
    }`}>
      
      {/* TOP NAVIGATION */}
      <nav className={`fixed top-0 w-full z-50 border-b backdrop-blur-md transition-all duration-200 ${
        isDark ? 'border-slate-800 bg-[#090D16]/90' : 'border-[#E7E7E4] bg-[#F7F7F5]/85'
      }`}>
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 flex justify-between items-center h-[72px]">
          <div className="flex items-center gap-8 lg:gap-10">
            {/* Brand Logo */}
            <a href="#" className={`flex items-center gap-2.5 text-[19px] font-bold tracking-tight transition-colors ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                isDark ? 'bg-indigo-600' : 'bg-black'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Nexus Sidekick</span>
            </a>


          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs shadow-xs ${
                  isDark ? 'border-slate-700 bg-slate-900/90 text-slate-200' : 'border-[#E7E7E4] bg-white text-zinc-800'
                }`}>
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-5 h-5 rounded-full object-cover border border-emerald-500/50"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium max-w-[110px] sm:max-w-[160px] truncate">{currentUser.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active Logged-in Session" />
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-rose-400 hover:border-rose-800/60'
                        : 'border-[#E7E7E4] bg-white text-zinc-600 hover:text-rose-600 hover:border-rose-300'
                    }`}
                    title="Sign out of current account"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              onOpenAuth && (
                <>
                  <button 
                    onClick={() => onOpenAuth('register')}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                      isDark 
                        ? 'border-slate-700 text-slate-200 hover:bg-slate-800' 
                        : 'border-[#E7E7E4] text-[#111111] hover:bg-[#F3F2EF]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                  <button 
                    onClick={() => onOpenAuth('signin')}
                    className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer shadow-xs ${
                      isDark 
                        ? 'border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600' 
                        : 'border-[#E7E7E4] bg-white text-[#111111] hover:bg-[#F3F2EF] hover:border-zinc-300'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </>
              )
            )}

            {/* Admin Console: Available ONLY for Administrator, never for Employee */}
            {onOpenAdmin && isUserAdmin(currentUser) && (
              <button 
                onClick={onOpenAdmin}
                className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                  isDark 
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800' 
                    : 'border-[#E7E7E4] text-[#111111] hover:bg-[#F3F2EF]'
                }`}
                title="Admin Console (Administrator Access)"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Console</span>
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}>
                  Admin
                </span>
              </button>
            )}

            {onNavigateCalendar && (
              <button 
                onClick={onNavigateCalendar}
                className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer shadow-xs ${
                  isDark 
                    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' 
                    : 'border-[#E7E7E4] bg-white text-[#111111] hover:bg-[#F3F2EF]'
                }`}
                title="Google Meet: Host or Join Meetings"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Google Meet</span>
              </button>
            )}

            <button
              onClick={onLaunchCockpit}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/30' 
                  : 'bg-[#111111] text-[#FCFCFB] hover:bg-zinc-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current text-white" />
              <span>Get Started</span>
            </button>

            {/* Dark Mode to Light Mode Toggle (Button 5) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                isDark
                  ? 'border-slate-700 bg-slate-800/90 text-amber-300 hover:bg-slate-700 hover:text-amber-200 hover:border-slate-600'
                  : 'border-[#E7E7E4] bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-slate-200">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px] font-semibold text-zinc-700">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-[140px] sm:pt-[160px] pb-[70px] max-w-[1280px] mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Status Pill Badge */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-semibold tracking-wider uppercase w-fit ${
              isDark ? 'bg-slate-850 bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-[#F3F2EF] border-[#E7E7E4] text-zinc-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>Autonomous Workspace Agent</span>
            </div>

            {/* Display Headline */}
            <h1 className={`text-[52px] sm:text-[74px] lg:text-[82px] leading-[1.04] font-normal tracking-[-0.04em] transition-colors ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>
              Meetings that draft, verify, and code.
            </h1>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={onLaunchCockpit}
                    className={`px-7 py-3.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2.5 shadow-md active:scale-95 cursor-pointer ${
                      isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/40' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    <span>Enter Nexus AI Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs shadow-xs ${
                    isDark ? 'border-slate-700 bg-slate-900/90 text-slate-300' : 'border-[#E7E7E4] bg-white text-zinc-700'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-400">Logged in as</span>
                    <span className="font-semibold text-slate-200">{currentUser?.email}</span>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleSigningIn}
                    className={`px-7 py-3.5 rounded-full text-sm font-medium transition-all flex items-center gap-2.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-wait ${
                      isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/30' : 'bg-[#111111] text-white hover:bg-zinc-800'
                    }`}
                  >
                    {isGoogleSigningIn ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                    <span>{isGoogleSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                    {!isGoogleSigningIn && <ArrowRight className="w-4 h-4" />}
                  </button>
                  {onOpenAuth && (
                    <button
                      onClick={() => onOpenAuth('register')}
                      className={`px-6 py-3.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-800' 
                          : 'bg-[#FCFCFB] border-[#E7E7E4] text-[#111111] hover:bg-[#F3F2EF]'
                      }`}
                    >
                      Create Prototype Account
                    </button>
                  )}
                </>
              )}
            </div>

            {googleAuthNotice && (
              <div className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                googleAuthNotice.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                <span>{googleAuthNotice.text}</span>
              </div>
            )}
          </div>

          {/* Right Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full pt-4 lg:pt-14">
            <p className={`text-[16px] sm:text-[17px] leading-[1.65] max-w-md transition-colors ${
              isDark ? 'text-slate-400' : 'text-[#6B6B6B]'
            }`}>
              Nexus Sidekick listens to architecture reviews, queries GitHub repos via Model Context Protocol, searches company policies with Document AI, and auto-drafts deliverables with zero compliance leaks.
            </p>

            {/* Telemetry Numbers Strip */}
            <div className={`grid grid-cols-2 gap-8 pt-10 border-t mt-8 transition-colors ${
              isDark ? 'border-slate-800' : 'border-[#E7E7E4]'
            }`}>
              <div>
                <div className={`text-[32px] sm:text-[36px] font-normal tracking-tight font-mono transition-colors ${
                  isDark ? 'text-white' : 'text-[#111111]'
                }`}>
                  &lt; 150ms
                </div>
                <div className={`text-xs font-medium tracking-wide uppercase mt-1 ${
                  isDark ? 'text-slate-400' : 'text-[#6B6B6B]'
                }`}>
                  Diarization Telemetry
                </div>
              </div>
              <div>
                <div className={`text-[32px] sm:text-[36px] font-normal tracking-tight font-mono transition-colors ${
                  isDark ? 'text-white' : 'text-[#111111]'
                }`}>
                  0-Leak
                </div>
                <div className={`text-xs font-medium tracking-wide uppercase mt-1 ${
                  isDark ? 'text-slate-400' : 'text-[#6B6B6B]'
                }`}>
                  Sovereign Boundary
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* HERO PRODUCT PANEL WITH 3 INTERACTIVE HIGH-FIDELITY SCREENS */}
      <section id="cockpit" className="max-w-[1280px] mx-auto px-6 sm:px-8 mb-[120px]">
        <div className={`rounded-3xl p-5 sm:p-7 border flex flex-col justify-between min-h-[640px] relative overflow-hidden shadow-sm transition-colors duration-200 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-[#F3F2EF] border-[#E7E7E4]'
        }`}>
          
          {/* Top Tabs Bar */}
          <div className="flex justify-between items-center z-20 flex-wrap gap-4 mb-5">
            <div className={`flex p-1 rounded-full border shadow-sm text-xs font-semibold transition-colors ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-[#FCFCFB] border-[#E7E7E4]'
            }`}>
              <button 
                onClick={() => setActiveTab('copilot')}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'copilot' 
                    ? (isDark ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#111111] text-white shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-[#6B6B6B] hover:text-black')
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Screen 1: Meeting Copilot</span>
              </button>
              <button 
                onClick={() => setActiveTab('mcp')}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'mcp' 
                    ? (isDark ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#111111] text-white shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-[#6B6B6B] hover:text-black')
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Screen 2: Codebase MCP</span>
              </button>
              <button 
                onClick={() => setActiveTab('docai')}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'docai' 
                    ? (isDark ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#111111] text-white shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-[#6B6B6B] hover:text-black')
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Screen 3: Document AI</span>
              </button>
            </div>

            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              isDark ? 'bg-slate-800/90 border-slate-700 text-slate-200' : 'bg-[#FCFCFB] border-[#E7E7E4]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Live RFC-118 Architecture Review</span>
              <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                ACTIVE PIPELINE
              </span>
            </div>
          </div>

          {/* SCREEN CONTENT CONTAINER */}
          <div className={`relative z-10 w-full flex-1 rounded-2xl border overflow-hidden flex flex-col shadow-sm transition-colors ${
            isDark ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-[#E7E7E4] bg-[#FCFCFB]'
          }`}>
            
            {/* SCREEN 1: LIVE MEETING COPILOT & LIVING CANVAS */}
            {activeTab === 'copilot' && (
              <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden animate-in fade-in duration-300">
                {/* Left: Meeting Transcript Stream */}
                <div className="lg:col-span-5 border-r border-[#E7E7E4] p-5 flex flex-col justify-between bg-zinc-50/50">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E7E4]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                          Cloud STT Diarization Stream
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded">
                        16kHz FLAC • 00:02:18
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Alice Utterance */}
                      <div className="p-3 rounded-xl bg-white border border-[#E7E7E4] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-900">Alice (Tech Lead)</span>
                          <span className="text-[10px] font-mono text-zinc-500">eng-core</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed">
                          "For the EU tokenization gateway, all settlement mutations must use deterministic idempotency keys terminating strictly inside <span className="bg-amber-100 text-amber-900 px-1 rounded font-mono font-semibold">europe-west3 (Frankfurt)</span>."
                        </p>
                      </div>

                      {/* Marcus Utterance */}
                      <div className="p-3 rounded-xl bg-white border border-[#E7E7E4] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-900">SecOps Officer</span>
                          <span className="text-[10px] font-mono text-emerald-700 font-semibold">security</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed">
                          "Agreed. Master tokenization keys must be safeguarded with regional HSM isolation per <span className="text-blue-700 font-mono font-semibold">POL-SEC-12</span>."
                        </p>
                      </div>

                      {/* Cloud DLP Scrub notice */}
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-[11px] font-mono">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cloud DLP Redacted 16-Digit PAN</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">0 EXPOSURE</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E7E7E4] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Audio latency: 112ms</span>
                    </div>
                    <button 
                      onClick={onLaunchCockpit}
                      className="px-3.5 py-1.5 rounded-lg bg-black text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current text-white" />
                      <span>Join Live Meeting</span>
                    </button>
                  </div>
                </div>

                {/* Right: Living Canvas Draft View */}
                <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E7E4]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-700" />
                        <span className="text-xs font-bold text-zinc-900">RFC-118: Next-Gen Payment Tokenization Engine</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                        STATUS: IN REVIEW (v1.2)
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs text-zinc-800">
                      <div className="text-zinc-500 text-[11px] font-sans"># Living Deliverables Canvas (Shared Draft Isolation Active)</div>
                      <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                        <span className="font-bold text-zinc-900">## 3. Idempotent Retry Policy</span>
                        <p className="text-zinc-700 mt-1 font-sans text-xs leading-relaxed">
                          For European Union settlements, payment mutations must use deterministic idempotency keys terminating strictly inside <code className="bg-zinc-200 text-black px-1 rounded">europe-west3 (Frankfurt)</code>. Downstream PSP timeouts apply exponential backoff (base 200ms, max 3 attempts).
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                        <div className="flex items-center justify-between text-blue-900 font-sans text-[11px] font-semibold mb-1">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>Gemini Agent Real-Time Draft Patch</span>
                          </span>
                          <span className="font-mono text-[10px] text-blue-700">Ref: RFC-104</span>
                        </div>
                        <p className="text-xs text-zinc-800 font-sans leading-relaxed">
                          + Added: Master tokenization keys safeguarded with hardware isolation. Signing operations occur inside regional cryptographic partitions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E7E7E4] flex items-center justify-between text-xs text-zinc-600">
                    <span className="font-mono text-[11px]">EXPORT GUARD: STAGED FOR HUMAN SIGN-OFF</span>
                    <button 
                      onClick={onLaunchCockpit}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open in Full Cockpit</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: MODEL CONTEXT PROTOCOL (MCP) GITHUB AST INSPECTOR */}
            {activeTab === 'mcp' && (
              <div className="w-full flex-1 flex flex-col bg-zinc-900 text-zinc-200 font-mono text-xs overflow-hidden animate-in fade-in duration-300">
                {/* MCP Header */}
                <div className="px-5 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="text-zinc-400">|</span>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                      <span>acme-corp/payment-gateway</span>
                      <span className="text-zinc-500">@</span>
                      <span className="text-emerald-400 font-semibold">feat/eu-tokenization</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                    MCP AST RESOLVER v1.4
                  </span>
                </div>

                {/* Editor & Tool Dispatch */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                  {/* File Sidebar */}
                  <div className="md:col-span-4 bg-zinc-950/60 p-4 border-r border-zinc-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">
                      Repository Tree
                    </span>
                    <div className="p-2 rounded bg-zinc-800/80 text-white flex items-center justify-between text-xs border border-zinc-700">
                      <span className="flex items-center gap-2">
                        <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>eu-retry-policy.ts</span>
                      </span>
                      <span className="text-[10px] text-emerald-400">98% AST</span>
                    </div>
                    <div className="p-2 rounded text-zinc-400 hover:bg-zinc-900 flex items-center gap-2 text-xs">
                      <FileCode2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>hsm-vault-partition.ts</span>
                    </div>
                    <div className="p-2 rounded text-zinc-400 hover:bg-zinc-900 flex items-center gap-2 text-xs">
                      <FileCode2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>dlp-redaction-filter.ts</span>
                    </div>
                  </div>

                  {/* Code View */}
                  <div className="md:col-span-8 p-5 bg-zinc-900 flex flex-col justify-between overflow-x-auto">
                    <div>
                      <div className="text-[11px] text-zinc-400 mb-2">
                        // Resolved from AST symbol: TokenizationRetryPolicy (Commit a8f93d)
                      </div>
                      <pre className="text-zinc-200 text-xs leading-relaxed font-mono">
{`export interface EURetryPolicyConfig {
  region: 'europe-west3'; // Frankfurt data boundary
  maxRetries: 3;
  baseBackoffMs: 200;
  idempotencyScope: 'per-merchant-uuid';
}

export async function executeEURetrySettlement(
  tx: PaymentTransaction
): Promise<SettlementResult> {
  // Guaranteed zero sovereign boundary escape
  return await partitionClient.dispatchWithBackoff(tx);
}`}
                      </pre>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between mt-4">
                      <span className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>MCP Semantic Search Executed (42ms)</span>
                      </span>
                      <span className="text-zinc-500">AST Tokens: 412 cached</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SCREEN 3: DOCUMENT AI & COMPLIANCE GOVERNANCE */}
            {activeTab === 'docai' && (
              <div className="w-full flex-1 p-6 bg-[#FCFCFB] flex flex-col justify-between animate-in fade-in duration-300">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#E7E7E4]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                        Vertex AI Search & Proactive Policy Radar
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-semibold">
                      Multi-Tenant Group ACL Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Policy Card 1 */}
                    <div className="p-4 rounded-xl border border-[#E7E7E4] bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-zinc-900">RFC-104</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ALL GROUPS
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-800 mb-1">Payment Gateway Architecture</h4>
                      <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                        Allowed: eng-core, security, leadership. Grounded score: 94.2%.
                      </p>
                    </div>

                    {/* Policy Card 2 */}
                    <div className="p-4 rounded-xl border border-[#E7E7E4] bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-zinc-900">POL-SEC-08</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ALL GROUPS
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-800 mb-1">Cross-Border Transfer Standard</h4>
                      <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                        Restricts EU cardholder transaction logs from US data egress without tokenization.
                      </p>
                    </div>

                    {/* Policy Card 3 */}
                    <div className="p-4 rounded-xl border border-[#E7E7E4] bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-zinc-900">POL-SEC-12</span>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          RESTRICTED
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-800 mb-1">Executive Key Custody</h4>
                      <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                        Restricted to security & leadership. Excluded from shared draft automatically.
                      </p>
                    </div>
                  </div>

                  {/* Status Gauges */}
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600">SHARED DRAFT ISOLATION STATUS:</span>
                      <span className="font-bold text-emerald-700">100% SECURE (NO POL-SEC-12 LEAK)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600">PII SANITIZATION (CLOUD DLP):</span>
                      <span className="font-bold text-zinc-900">0 API KEYS / 0 PAN LEAKS</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E7E7E4] flex items-center justify-between text-xs text-zinc-600">
                  <span className="font-mono text-[11px]">REFUSAL GATE: ACTIVE (&lt;0.65 SCORES REFUSED)</span>
                  <button 
                    onClick={onLaunchCockpit}
                    className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    Test Knowledge Radar
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Bottom Floating Control Bar */}
          <div className="flex justify-between items-center z-10 bg-[#FCFCFB]/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#E7E7E4] flex-wrap gap-3 mt-4">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto text-[12px] font-medium text-[#6B6B6B] no-scrollbar">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F2EF] border border-[#E7E7E4] text-[#111111]">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span>Cloud Speech-to-Text</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F2EF] border border-[#E7E7E4]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud DLP PII Scrub</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F2EF] border border-[#E7E7E4]">
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>MCP GitHub Search</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F2EF] border border-[#E7E7E4]">
                <FileText className="w-3.5 h-3.5 text-zinc-600" />
                <span>Living Canvas RFC</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F2EF] border border-[#E7E7E4]">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Shared Draft Isolation</span>
              </span>
            </div>

            <button
              onClick={onLaunchCockpit}
              className="bg-[#111111] text-white px-5 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-zinc-800 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
            >
              <span>Enter Cockpit</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* TRUST STRIP WITH MONOCHROME LOGOS */}
      <section className="max-w-[1280px] mx-auto px-6 sm:px-8 mb-[120px] text-center">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] mb-10">
          Trusted by leading engineering & architecture teams
        </h3>
        <div className="flex justify-center items-center gap-10 sm:gap-16 flex-wrap opacity-65 font-mono text-[13px] tracking-widest text-[#111111]">
          <span className="flex items-center gap-2">△ LUMINA</span>
          <span className="flex items-center gap-2">⊕ QUANTUM ARCH</span>
          <span className="flex items-center gap-2">☷ STACK</span>
          <span className="flex items-center gap-2">⦵ ORBITAL</span>
          <span className="flex items-center gap-2">▲ MERIDIAN</span>
          <span className="flex items-center gap-2">▷ NEXUS LABS</span>
        </div>
      </section>

      {/* DUAL COCKPIT ARCHITECTURE SECTION */}
      <section id="mcp" className="max-w-[1280px] mx-auto px-6 sm:px-8 mb-[120px]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] mb-3">
            Dual Cockpit Architecture
          </div>
          <h2 className="text-[44px] sm:text-[60px] font-normal tracking-[-0.03em] leading-tight text-[#111111] mb-4">
            One Intelligence Engine. Two Specialized Cockpits.
          </h2>
          <p className="text-[17px] text-[#6B6B6B]">
            Seamless transition from spoken meeting consensus to verifiable codebase commits.
          </p>
        </div>

        {/* 2-Column Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* Card 1: MCP */}
          <div className="bg-[#FCFCFB] rounded-2xl p-7 border border-[#E7E7E4] min-h-[280px] flex flex-col justify-between shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#F3F2EF] border border-[#E7E7E4] flex items-center justify-center text-blue-600">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[20px] font-semibold tracking-tight text-[#111111] mb-2">
                Model Context Protocol (MCP)
              </h4>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
                Direct semantic queries across your organization's entire GitHub codebase and commit history. Nexus Sidekick parses abstract syntax trees, pulls relevant interface types, and references active pull requests mid-conversation.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#E7E7E4]/80 text-[#6B6B6B]">
              <span className="font-mono text-[11px]">CONNECTOR PROTOCOL 1.4</span>
              <a href="#cockpit" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                <span>Read AST</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Card 2: Compliance Radar */}
          <div className="bg-[#FCFCFB] rounded-2xl p-7 border border-[#E7E7E4] min-h-[280px] flex flex-col justify-between shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#F3F2EF] border border-[#E7E7E4] flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[20px] font-semibold tracking-tight text-[#111111] mb-2">
                Proactive Compliance Radar
              </h4>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
                Real-time inspection of dialogue and drafts preventing sovereign boundary and key custody violations. Sensitive API secrets, GDPR PII, and unreleased architecture tokens are stripped before leaving your private Google Cloud VPC perimeter.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#E7E7E4]/80 text-[#6B6B6B]">
              <span className="font-mono text-[11px]">CLOUD DLP HARDENED</span>
              <a href="#compliance" className="text-emerald-700 font-medium hover:underline flex items-center gap-1">
                <span>VPC Service Controls</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* HIGH-RES STUDIO MONITOR PREVIEW (HOTLINKED EXACT ASSET) */}
        <div className="w-full aspect-[16/9] bg-[#F3F2EF] rounded-3xl border border-[#E7E7E4] flex items-center justify-center overflow-hidden relative shadow-sm group">
          <img 
            alt="Nexus Sidekick Enterprise Workspace Dashboard" 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4h27m9NHk2jjeFsNMaf-fMslFizA6a-t8X4pfYTbZ6tcZi37BtlKy_SNcizGzozMtVK5OX3-uJTjQhS1zEeb0f35UDY2-LlusNAzi1qaOm-GNi7TEjv4QEacOTrpuP-v3ZTDWRPutxlnwbFYt4mWmGvyR6kAO0gXYHVwhNfokp1DKXxjLg6LgwhaaJUQc3DTEYxrvH9_gqvlkiZAqeutPR9f-JbY7VuJ70IRvs9msigSw1tiQmgBkVeXhlfomA93RTP8v02vDwDU" 
          />
          <div className="absolute bottom-4 left-6 right-6 px-5 py-3 rounded-xl bg-black/80 backdrop-blur-md text-white flex justify-between items-center text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE STREAM COCKPIT: RFC-118 MIGRATION</span>
            </div>
            <span className="text-zinc-400">Gemini 1.5 Pro • Cloud Speech API • MCP Host</span>
          </div>
        </div>

      </section>

      {/* NEXUS CORE ENGINE: 4 TILES */}
      <section id="documents" className="max-w-[1280px] mx-auto px-6 sm:px-8 mb-[120px]">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] bg-[#E2E3E1] text-[#111111] px-3 py-1 rounded-full">
            Nexus Core Engine
          </span>
          <div className="h-px bg-[#E7E7E4] flex-grow"></div>
        </div>

        <div className="mb-10">
          <h2 className="text-[38px] sm:text-[48px] font-normal tracking-[-0.03em] text-[#111111] leading-tight">
            Autonomous Knowledge Retrieval
          </h2>
          <p className="text-[16px] text-[#6B6B6B] mt-2">
            Query past transcripts, company governance, and repos simultaneously.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#FCFCFB] rounded-2xl p-6 border border-[#E7E7E4] shadow-sm flex flex-col justify-between h-[210px]">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[18px] font-semibold text-[#111111] mb-1">GitHub MCP</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Semantic AST search and diff indexing across 100k+ repositories.
              </p>
            </div>
          </div>

          <div className="bg-[#FCFCFB] rounded-2xl p-6 border border-[#E7E7E4] shadow-sm flex flex-col justify-between h-[210px]">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[18px] font-semibold text-[#111111] mb-1">Google Calendar</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Context-aware agenda priming and auto-scheduling review loops.
              </p>
            </div>
          </div>

          <div className="bg-[#FCFCFB] rounded-2xl p-6 border border-[#E7E7E4] shadow-sm flex flex-col justify-between h-[210px]">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[18px] font-semibold text-[#111111] mb-1">Document AI</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Extract diagrams, RFC specifications, and audit logs with OCR.
              </p>
            </div>
          </div>

          <div className="bg-[#FCFCFB] rounded-2xl p-6 border border-[#E7E7E4] shadow-sm flex flex-col justify-between h-[210px]">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[18px] font-semibold text-[#111111] mb-1">Cloud STT</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Sub-150ms diarization with multi-speaker acoustic fingerprinting.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* NEXUS AGENTS MODULE: INTERACTIVE CHAT & TELEMETRY */}
      <section id="compliance" className="max-w-[1280px] mx-auto px-6 sm:px-8 mb-[120px]">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] bg-[#E2E3E1] text-[#111111] px-3 py-1 rounded-full">
            Nexus Agents
          </span>
          <div className="h-px bg-[#E7E7E4] flex-grow"></div>
        </div>

        <div className="mb-10">
          <h2 className="text-[38px] sm:text-[48px] font-normal tracking-[-0.03em] text-[#111111] leading-tight">
            Deploy agents that listen, research, and guard
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Omnichannel Copilot */}
          <div className="bg-[#FCFCFB] rounded-3xl p-7 border border-[#E7E7E4] shadow-sm flex flex-col justify-between min-h-[460px]">
            <div className="flex justify-between items-center pb-4 border-b border-[#E7E7E4]">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>OMNICHANNEL COPILOT</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                MCP Connected
              </span>
            </div>

            <div className="space-y-4 my-6">
              {/* Bot greeting */}
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-xs">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#F3F2EF] px-4 py-2.5 rounded-2xl rounded-tl-sm text-xs text-[#111111] leading-relaxed max-w-[85%]">
                  Welcome to Acme Architecture Review. What technical specification are we drafting today?
                </div>
              </div>

              {/* User question */}
              <div className="flex gap-3 items-start flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-zinc-300 text-zinc-700 flex items-center justify-center shrink-0 text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="bg-[#111111] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed max-w-[85%]">
                  Search our payment-gateway repo via MCP for the tokenization retry backoff.
                </div>
              </div>

              {/* Tool Execution Box */}
              <div className="p-4 rounded-xl bg-[#F3F2EF] border border-[#E7E7E4] text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>MCP GitHub Search Executed</span>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Querying GitHub commit <code className="text-black bg-white px-1 py-0.5 rounded">a8f93d</code> • Tokenization retry policy extracted: exponential jitter backoff (max 5 retries).
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-[#6B6B6B] pt-4 border-t border-[#E7E7E4]">
              <span>LATENCY: 86MS OVER REST V1</span>
              <span className="text-emerald-700 font-semibold">Ready for Commit Draft</span>
            </div>
          </div>

          {/* Card 2: Zero Leakage Draft Isolation */}
          <div className="bg-[#FCFCFB] rounded-3xl p-7 border border-[#E7E7E4] shadow-sm flex flex-col justify-between min-h-[460px]">
            <div className="flex justify-between items-center pb-4 border-b border-[#E7E7E4]">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <span>ZERO LEAKAGE DRAFT ISOLATION</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Perimeter
              </span>
            </div>

            <div className="space-y-6 my-4">
              {/* Stat grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F3F2EF] border border-[#E7E7E4]">
                  <span className="text-[10px] uppercase font-mono text-[#6B6B6B] block">P50 LATENCY</span>
                  <span className="text-[20px] font-normal font-mono text-[#111111]">2,180ms</span>
                  <span className="text-[10px] text-[#6B6B6B] block mt-0.5">Full AST pipeline</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F3F2EF] border border-[#E7E7E4]">
                  <span className="text-[10px] uppercase font-mono text-[#6B6B6B] block">KEY LEAKS</span>
                  <span className="text-[20px] font-normal font-mono text-emerald-700">0/3</span>
                  <span className="text-[10px] text-[#6B6B6B] block mt-0.5">DLP Redacted</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F3F2EF] border border-[#E7E7E4]">
                  <span className="text-[10px] uppercase font-mono text-[#6B6B6B] block">ISOLATION</span>
                  <span className="text-[20px] font-normal font-mono text-[#111111]">100%</span>
                  <span className="text-[10px] text-[#6B6B6B] block mt-0.5">Group verified</span>
                </div>
              </div>

              {/* Progress Gauges */}
              <div className="space-y-3 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-600">SOVEREIGN BOUNDARY (VPC ESCAPE PREVENTED)</span>
                    <span className="font-semibold text-emerald-700">100% SECURE</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E7E7E4] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full w-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-600">CLOUD DLP SENSITIVE ENTITY SCRUB</span>
                    <span className="font-semibold text-black">99.98% ACCURACY</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E7E7E4] rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full w-[99.98%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-600">TELEMETRY EGRESS TO 3RD PARTY LLM</span>
                    <span className="font-semibold text-emerald-700">0 BYTES (RESTRICTED)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E7E7E4] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full w-0"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-[#6B6B6B] pt-4 border-t border-[#E7E7E4]">
              <span>ENCLAVE: VERTEX AI VPC-SC</span>
              <span className="text-zinc-800 font-semibold">SOC2 Type II Certified</span>
            </div>
          </div>

        </div>
      </section>

      {/* FINAL CALL TO ACTION MODULE */}
      <section className="max-w-[1280px] mx-auto px-6 sm:px-8 mb-[120px]">
        <div className={`rounded-3xl p-10 sm:p-16 border text-center flex flex-col items-center transition-colors duration-200 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-[#F3F2EF] border-[#E7E7E4]'
        }`}>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] mb-4 ${
            isDark ? 'text-indigo-400' : 'text-[#6B6B6B]'
          }`}>
            Autonomous Velocity
          </div>
          <h2 className={`text-[40px] sm:text-[56px] font-normal tracking-[-0.03em] leading-tight max-w-2xl mb-4 transition-colors ${
            isDark ? 'text-white' : 'text-[#111111]'
          }`}>
            Ready to upgrade your meetings to autonomous execution engines?
          </h2>
          <p className={`text-[16px] max-w-lg mb-8 transition-colors ${
            isDark ? 'text-slate-400' : 'text-[#6B6B6B]'
          }`}>
            Bring codebase intelligence and enterprise-grade policy compliance directly into your daily technical discussions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onLaunchCockpit}
              className={`px-7 py-3.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/30' : 'bg-[#111111] text-white hover:bg-zinc-800'
              }`}
            >
              <span>Deploy Nexus Sidekick</span>
              <Zap className="w-4 h-4 fill-current text-white" />
            </button>
            {onOpenAuth && (
              <button
                onClick={() => onOpenAuth('signin')}
                className={`px-6 py-3.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-[#FCFCFB] border-[#E7E7E4] text-[#111111] hover:bg-white'
                }`}
              >
                Sign In with Work Account
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`w-full border-t py-16 transition-colors duration-200 ${
        isDark ? 'border-slate-800 bg-[#090D16]' : 'border-[#E7E7E4] bg-[#F7F7F5]'
      }`}>
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 grid grid-cols-2 md:grid-cols-6 gap-10 text-[13px]">
          
          <div className="col-span-2 flex flex-col gap-4">
            <div className={`flex items-center gap-2 text-[17px] font-bold ${
              isDark ? 'text-white' : 'text-black'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${
                isDark ? 'bg-indigo-600' : 'bg-black'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Nexus Sidekick</span>
            </div>
            <p className={`text-xs leading-relaxed max-w-xs ${
              isDark ? 'text-slate-400' : 'text-[#6B6B6B]'
            }`}>
              Autonomous enterprise AI meeting teammate and workspace intelligence agent engineered for executive velocity.
            </p>
            <span className={`text-[11px] font-mono mt-2 ${
              isDark ? 'text-slate-500' : 'text-[#6B6B6B]'
            }`}>
              NEXUS SIDEKICK © 2026<br />Built on Google Cloud Vertex AI & Gemini.
            </span>
          </div>

          <div className={`flex flex-col gap-3 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
            <h5 className={`text-[11px] uppercase font-semibold tracking-wider mb-1 ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>Products</h5>
            <a href="#cockpit" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Live Copilot</a>
            <a href="#mcp" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>MCP Connectors</a>
            <a href="#calendar" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Calendar Sync</a>
            <a href="#documents" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Document AI</a>
          </div>

          <div className={`flex flex-col gap-3 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
            <h5 className={`text-[11px] uppercase font-semibold tracking-wider mb-1 ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>Developers</h5>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Documentation</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>GitHub</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>System Status</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>API Keys</a>
          </div>

          <div className={`flex flex-col gap-3 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
            <h5 className={`text-[11px] uppercase font-semibold tracking-wider mb-1 ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>Company</h5>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>About</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Careers</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Security Architecture</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Privacy Policy</a>
          </div>

          <div className={`flex flex-col gap-3 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
            <h5 className={`text-[11px] uppercase font-semibold tracking-wider mb-1 ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>Legal</h5>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Terms of Service</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>Compliance</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>GDPR Compliance</a>
            <a href="#" className={isDark ? 'hover:text-white' : 'hover:text-[#111111]'}>SOC2 Type II</a>
          </div>

        </div>
      </footer>

    </div>
  );
};
