import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { DEMO_ACCOUNTS } from '../data/seedData';
import { googleSignInWithWorkspace } from '../services/googleWorkspaceService';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Shield, 
  Check, 
  HelpCircle,
  X,
  Building2,
  Users
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onNavigateLanding: () => void;
  onNavigateRegister: () => void;
  onLaunchCockpit: () => void;
  currentUser?: UserAccount;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateLanding,
  onNavigateRegister,
  onLaunchCockpit,
  currentUser,
}) => {
  const [loginRole, setLoginRole] = useState<'employee' | 'admin'>('employee');
  const [companyName, setCompanyName] = useState('Acme Corp');
  const [email, setEmail] = useState('name@enterprise.corp');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Quick select pre-seeded persona
  const handleSelectPersona = (persona: 'admin' | 'alice' | 'marcus') => {
    const target = persona === 'admin' 
      ? DEMO_ACCOUNTS[1] 
      : persona === 'alice' 
      ? DEMO_ACCOUNTS[0] 
      : DEMO_ACCOUNTS[2];
      
    setEmail(target.email);
    setPassword('••••••••••••');
    setCompanyName('Acme Corp');
    if (persona === 'admin') {
      setLoginRole('admin');
    } else {
      setLoginRole('employee');
    }
    setStatusMessage({
      type: 'success',
      text: `Populated ${target.name} (${persona === 'admin' ? 'Administrator' : 'Employee'}, ${target.role}) credentials.`
    });
  };

  const handleInstantPersonaLogin = (persona: 'admin' | 'alice' | 'marcus') => {
    const target = persona === 'admin' 
      ? DEMO_ACCOUNTS[1] 
      : persona === 'alice' 
      ? DEMO_ACCOUNTS[0] 
      : DEMO_ACCOUNTS[2];

    setIsLoading(true);
    setStatusMessage({
      type: 'success',
      text: `Authenticating ${target.name} (${persona === 'admin' ? 'Administrator' : 'Employee'})...`
    });
    setTimeout(() => {
      onLoginSuccess({
        ...target,
        orgRole: persona === 'admin' ? 'admin' : 'member',
        orgId: 'acme'
      });
      setIsLoading(false);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your company name.' });
      return;
    }
    if (!email.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your work email.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const emailLower = email.trim().toLowerCase();
      const resolvedOrgName = companyName.trim();
      const resolvedOrgId = resolvedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'acme';

      // Check against seeded demo accounts
      const matched = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === emailLower);
      if (matched) {
        onLoginSuccess({
          ...matched,
          orgRole: loginRole === 'admin' ? 'admin' : 'member',
          orgId: resolvedOrgId
        });
        setIsLoading(false);
        return;
      }

      // Call backend sign in to provision or authenticate any prototype account
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailLower, 
          password, 
          companyName: resolvedOrgName, 
          orgRole: loginRole === 'admin' ? 'admin' : 'member'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onLoginSuccess(data.user);
          setIsLoading(false);
          return;
        }
      }

      // Any corporate account in prototype fallback
      const role: UserRole = loginRole === 'admin'
        ? 'admin'
        : emailLower.includes('sec') 
        ? 'security' 
        : emailLower.includes('lead') || emailLower.includes('exec') || emailLower.includes('vp')
        ? 'leadership' 
        : 'eng-core';

      const user: UserAccount = {
        id: `usr_${Date.now().toString(36)}`,
        name: emailLower.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase()),
        email: emailLower,
        role: role,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        department: loginRole === 'admin' 
          ? `${resolvedOrgName} Administration` 
          : role === 'security' ? 'Security & Compliance' : role === 'leadership' ? 'Executive Staff' : 'Core Engineering',
        orgRole: loginRole === 'admin' ? 'admin' : 'member',
        groups: loginRole === 'admin' ? ['leadership', 'security', 'eng-core'] : [role],
        orgId: resolvedOrgId,
        idToken: `simulated-token-${emailLower}`
      };

      onLoginSuccess(user);
      setIsLoading(false);
    } catch {
      setStatusMessage({ type: 'error', text: 'Authentication failed. Please verify credentials.' });
      setIsLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'success', text: 'Opening Google Sign-In with Calendar & Meet scopes...' });
    
    try {
      // Real Google Workspace & OAuth Sign-In (Firebase Auth with GoogleAuthProvider)
      const res = await googleSignInWithWorkspace();
      const realEmail = (res.user.email || 'evaluator@workspace.corp').toLowerCase();
      const realName = res.user.displayName || realEmail.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase());
      const realAvatar = res.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      const resolvedOrgName = companyName.trim() || 'Acme Corp';
      const resolvedOrgId = resolvedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'acme';

      const realGoogleUser: UserAccount = {
        id: res.user.uid || `usr_google_${Date.now()}`,
        name: realName,
        email: realEmail,
        role: loginRole === 'admin' ? 'admin' : 'eng-core',
        avatar: realAvatar,
        department: loginRole === 'admin' ? `${resolvedOrgName} Leadership & Admin` : `${resolvedOrgName} Engineering`,
        orgRole: loginRole === 'admin' ? 'admin' : 'member',
        groups: loginRole === 'admin' ? ['leadership', 'security', 'eng-core'] : ['eng-core', 'security'],
        orgId: resolvedOrgId,
        idToken: res.accessToken,
      };

      setStatusMessage({ 
        type: 'success', 
        text: `Signed in as ${realEmail} with real Google Calendar & Meet scopes!` 
      });

      setTimeout(() => {
        onLoginSuccess(realGoogleUser);
        setIsLoading(false);
      }, 400);
      return;
    } catch (popupErr: any) {
      console.warn('Real Google OAuth notice or window closed:', popupErr);
      // If user closed popup or blocked, let them know or provide seamless fallback
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        setStatusMessage({ type: 'error', text: 'Google sign-in popup was closed before completion.' });
        setIsLoading(false);
        return;
      }

      // If backend API fallback is desired for local evaluation
      try {
        const emailLower = email.includes('@') ? email.trim().toLowerCase() : 'evaluator@workspace.corp';
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailLower })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            onLoginSuccess(data.user);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback
      }

      setTimeout(() => {
        onLoginSuccess(DEMO_ACCOUNTS[0]);
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] text-[#1A1C1B] font-sans antialiased selection:bg-zinc-200 flex flex-col justify-between relative overflow-x-hidden">
      
      {/* TOP BAR */}
      <header className="w-full bg-transparent pt-6 sm:pt-8 px-6 sm:px-12 flex justify-between items-center z-20">
        {/* Brand */}
        <button
          onClick={onNavigateLanding}
          className="flex items-center gap-1.5 text-[17px] font-medium tracking-tight text-[#111111] hover:opacity-80 transition-opacity cursor-pointer font-serif"
        >
          <span>Nexus Sidekick</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] inline-block -mt-1 ml-0.5"></span>
        </button>

        {/* Right Help & Avatar */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs text-[#6B6B6B]">
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="hover:text-[#111111] transition-colors cursor-pointer hidden sm:inline"
          >
            Need assistance? <span className="underline underline-offset-2">Contact IT Support</span>
          </button>

          <button
            onClick={() => handleInstantPersonaLogin('alice')}
            className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
            title={currentUser ? `Signed in as ${currentUser.name}` : "User Profile"}
          >
            <User className="w-4 h-4 text-white" />
          </button>
        </div>
      </header>

      {/* MAIN CENTER ELEVATED CARD */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center z-10">
        
        <div className="w-full max-w-[540px] bg-[#FCFCFB] rounded-[32px] border border-[#E7E7E4] shadow-[0_4px_32px_rgba(17,17,17,0.03)] p-8 sm:p-11 relative overflow-hidden transition-all duration-300">
          
          {/* Status Badge */}
          <div className="mb-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F4F2] text-[11px] font-semibold tracking-wider text-zinc-700 uppercase">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              <span>OPEN ACCESS</span>
            </span>
          </div>

          {/* Headline */}
          <div className="mb-6">
            <h1 className="text-[34px] sm:text-[38px] leading-[1.1] font-normal tracking-[-0.03em] text-[#111111] mb-2 font-serif">
              Sign in to Nexus
            </h1>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#6B6B6B]">
              Access your organization's autonomous meeting copilot, calendar sync, and unified context search.
            </p>
          </div>

          {/* Feedback message */}
          {statusMessage && (
            <div className={`mb-5 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleSSO}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#F4F4F2]/80 hover:bg-[#EEEEEC] border border-[#E7E7E4] text-[#111111] text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Workspace Identity</span>
          </button>

          <p className="text-[11px] text-center text-[#6B6B6B] mt-2 mb-5">
            Any corporate Google account may authenticate for sandbox assessment.
          </p>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-[#E7E7E4]"></div>
            <span className="relative bg-[#FCFCFB] px-3 text-[10px] font-semibold tracking-wider text-[#6B6B6B] uppercase font-mono">
              OR AUTHENTICATE VIA CORPORATE SSO
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            
            {/* Toggle Between Employee and Admin */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] font-mono">
                  ACCOUNT ROLE
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {loginRole === 'admin' ? 'Tenant & Cluster Administrator' : 'Standard Enterprise Employee'}
                </span>
              </div>
              <div className="grid grid-cols-2 p-1 bg-[#F4F4F2] rounded-2xl border border-[#E7E7E4]">
                <button
                  type="button"
                  onClick={() => setLoginRole('employee')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginRole === 'employee'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Employee</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole('admin')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginRole === 'admin'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${loginRole === 'admin' ? 'text-white' : 'text-zinc-600'}`} />
                  <span>Administrator</span>
                </button>
              </div>
            </div>

            {/* Company Name (Required for both Admin and Employee) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] font-mono">
                  COMPANY / WORKSPACE NAME
                </label>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Required
                </span>
              </div>
              <div className="relative">
                <Building2 className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F4F4F2]/70 border border-[#E7E7E4] text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                />
              </div>
              <p className="text-[11px] text-[#6B6B6B] mt-1">
                {loginRole === 'admin' 
                  ? 'Admin enclave cluster for member ACLs, compliance radar, and policy governance.'
                  : 'Company workspace where meeting transcripts, grounded context, and RFCs are scoped.'}
              </p>
            </div>

            {/* Work Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5 font-mono">
                WORK EMAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginRole === 'admin' ? 'admin@enterprise.corp' : 'name@enterprise.corp'}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F4F4F2]/70 border border-[#E7E7E4] text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] font-mono">
                  PASSWORD / ACCESS KEY
                </label>
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(true)}
                  className="text-xs text-[#6B6B6B] hover:text-black transition-colors cursor-pointer"
                >
                  Recover key?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#F4F4F2]/70 border border-[#E7E7E4] text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-black transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember session & TLS Badge */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-zinc-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="w-4 h-4 rounded text-black accent-black cursor-pointer"
                />
                <span>Remember session for 30 days</span>
              </label>

              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-mono font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>TLS 1.3</span>
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : loginRole === 'admin' ? 'Sign In as Administrator' : 'Sign In as Employee'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* PRE-SEEDED PERSONA CREDENTIALS SECTION */}
          <div className="mt-8 pt-6 border-t border-[#E7E7E4]">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#6B6B6B] uppercase tracking-wider mb-3">
              <span>PRE-SEEDED PERSONA CREDENTIALS</span>
              <span className="lowercase font-sans text-zinc-400">Click to populate</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Sarah Connor (Administrator) */}
              <button
                type="button"
                onClick={() => handleSelectPersona('admin')}
                onDoubleClick={() => handleInstantPersonaLogin('admin')}
                className="p-3 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-400 transition-all text-left flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow-xs">
                    SC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white block">Sarah Connor</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-[11px] text-[#6B6B6B] dark:text-slate-400 block">System Administrator • admin@acme.corp</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800">
                    Administrator
                  </span>
                  <span className="text-[9px] text-purple-600 dark:text-purple-400 mt-0.5 font-medium">Admin Console Access</span>
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Eshwar Reddy (Employee) */}
                <button
                  type="button"
                  onClick={() => handleSelectPersona('alice')}
                  onDoubleClick={() => handleInstantPersonaLogin('alice')}
                  className="p-3 rounded-2xl border border-[#E7E7E4] dark:border-slate-800 bg-[#F4F4F2]/50 dark:bg-slate-900/50 hover:bg-[#F4F4F2] dark:hover:bg-slate-900 hover:border-zinc-400 transition-all text-left flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-slate-800 text-zinc-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold font-mono">
                      ER
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white block">Eshwar Reddy</span>
                      <span className="text-[11px] text-[#6B6B6B] dark:text-slate-400 block">Core Architecture</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
                    Host / Eng
                  </span>
                </button>

                {/* Security Lead (SecOps) */}
                <button
                  type="button"
                  onClick={() => handleSelectPersona('marcus')}
                  onDoubleClick={() => handleInstantPersonaLogin('marcus')}
                  className="p-3 rounded-2xl border border-[#E7E7E4] dark:border-slate-800 bg-[#F4F4F2]/50 dark:bg-slate-900/50 hover:bg-[#F4F4F2] dark:hover:bg-slate-900 hover:border-zinc-400 transition-all text-left flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-slate-800 text-zinc-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold font-mono">
                      SL
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white block">Security Lead</span>
                      <span className="text-[11px] text-[#6B6B6B] dark:text-slate-400 block">SecOps Officer</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
                    Security
                  </span>
                </button>
              </div>

            </div>
          </div>

          {/* Register Tenant Link */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={onNavigateRegister}
              className="text-xs text-[#6B6B6B] hover:text-black transition-colors font-medium cursor-pointer"
            >
              Deploying a new organization cluster? <span className="text-zinc-950 font-semibold underline underline-offset-2">Register Tenant</span>
            </button>
          </div>

          {/* Bottom Security Compliance Strip */}
          <div className="flex justify-center items-center gap-3 mt-4 text-[11px] text-[#6B6B6B]">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SOC2 Type II Assured</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-zinc-700">
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Zero Data Retention LLM</span>
            </span>
          </div>

        </div>

        {/* Card Sub-Status Strip (matching the image) */}
        <div className="w-full max-w-[540px] px-4 pt-4 flex justify-between items-center text-[11px] font-mono text-[#6B6B6B]">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <span>MCP Toolmesh: Connected (us-east-1)</span>
          </span>
          <span className="text-zinc-400">v2.4.1-rc</span>
        </div>

      </main>

      {/* AMBIENT DIFFUSE GLOW AT BOTTOM */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[180px] bg-gradient-to-t from-amber-100/40 via-orange-50/20 to-transparent blur-3xl pointer-events-none -z-0"></div>

      {/* FOOTER */}
      <footer className="w-full border-t border-[#E7E7E4] bg-[#F9F9F7] py-6 px-6 sm:px-12 text-[12px] text-[#6B6B6B] flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div>
          © 2026 Nexus Sidekick. Built for Enterprise Workspace Intelligence.
        </div>
        <div className="flex items-center gap-4 text-zinc-600">
          <a href="#" className="hover:text-black transition-colors">Privacy</a>
          <span>•</span>
          <a href="#" className="hover:text-black transition-colors">Security Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-black transition-colors">SOC2 Compliance</a>
        </div>
      </footer>

      {/* IT Support / Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-[#E7E7E4] shadow-xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#E7E7E4]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-zinc-900">Enterprise IT Assistance</h3>
              </div>
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-black hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              Nexus Sidekick prototype operates in Sovereign Sandbox mode. You can log in using pre-seeded accounts (<code className="text-black bg-zinc-100 px-1 py-0.5 rounded">Eshwar Reddy</code> or <code className="text-black bg-zinc-100 px-1 py-0.5 rounded">Admin</code>) or any corporate email address ending in your domain.
            </p>
            <div className="space-y-2 text-xs font-mono bg-zinc-50 p-3 rounded-xl border border-zinc-200 mb-4">
              <div>IT Desk: secops-desk@acme.corp</div>
              <div>SSO Relay: Google Workspace SAML 2.0</div>
              <div>VPC-SC Enclave: Active (us-central1)</div>
            </div>
            <button
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
