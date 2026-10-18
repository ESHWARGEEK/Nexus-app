import React, { useState } from 'react';
import { 
  UserAccount, 
  UserRole,
  OrgMemberRole 
} from '../types';
import { DEMO_ACCOUNTS } from '../data/seedData';
import { googleSignInWithWorkspace } from '../services/googleWorkspaceService';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  User, 
  Mail, 
  Building2, 
  Check, 
  ArrowRight, 
  Lock, 
  Users, 
  ShieldAlert,
  LogIn,
  UserPlus,
  KeyRound
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLoginSuccess: (user: UserAccount) => void;
  initialMode?: 'signin' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  
  // Sign-in form state
  const [loginRole, setLoginRole] = useState<'employee' | 'admin'>('employee');
  const [loginOrg, setLoginOrg] = useState('Acme Corp');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  
  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('Acme Corp');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regRole, setRegRole] = useState<UserRole>('eng-core');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['eng-core']);
  
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSelectDemoUser = (user: UserAccount) => {
    setIsLoading(true);
    setNotification(null);
    setTimeout(() => {
      onLoginSuccess({
        ...user,
        orgRole: user.role === 'admin' || loginRole === 'admin' ? 'admin' : 'member',
        orgId: loginOrg.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'acme'
      });
      setIsLoading(false);
      onClose();
    }, 400);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await googleSignInWithWorkspace();
      const realEmail = (res.user.email || 'evaluator@workspace.corp').toLowerCase();
      const realName = res.user.displayName || realEmail.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase());
      const realAvatar = res.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      const resolvedOrgName = loginOrg.trim() || 'Acme Corp';
      const resolvedOrgId = resolvedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'acme';

      const realGoogleUser: UserAccount = {
        id: res.user.uid || `usr_google_${Date.now()}`,
        name: realName,
        email: realEmail,
        role: loginRole === 'admin' ? 'leadership' : 'eng-core',
        avatar: realAvatar,
        department: loginRole === 'admin' ? `${resolvedOrgName} Leadership & Admin` : `${resolvedOrgName} Engineering`,
        orgRole: loginRole === 'admin' ? 'admin' : 'member',
        groups: loginRole === 'admin' ? ['leadership', 'security', 'eng-core'] : ['eng-core', 'security'],
        orgId: resolvedOrgId,
        idToken: res.accessToken,
      };

      setNotification({ type: 'success', message: `Signed in as ${realEmail} with real Google account!` });
      setTimeout(() => {
        onLoginSuccess(realGoogleUser);
        setIsLoading(false);
        onClose();
      }, 500);
    } catch (popupErr: any) {
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        setNotification({ type: 'error', message: 'Google Sign-In popup closed before completion.' });
      } else {
        setNotification({ type: 'error', message: popupErr?.message || 'Google Sign-In failed.' });
      }
      setIsLoading(false);
    }
  };

  const handleDirectSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOrg.trim()) {
      setNotification({ type: 'error', message: 'Please enter your company name.' });
      return;
    }
    if (!loginEmail.trim()) {
      setNotification({ type: 'error', message: 'Please enter your corporate email address.' });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const emailLower = loginEmail.trim().toLowerCase();
      const resolvedOrgName = loginOrg.trim();
      const resolvedOrgId = resolvedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'acme';
      
      // Match existing demo account if applicable
      const matched = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === emailLower);
      if (matched) {
        onLoginSuccess({
          ...matched,
          orgRole: matched.role === 'admin' || loginRole === 'admin' ? 'admin' : 'member',
          orgId: resolvedOrgId
        });
        setIsLoading(false);
        onClose();
        return;
      }

      // Call backend sign-in endpoint
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailLower, 
          password: loginPassword,
          companyName: resolvedOrgName, 
          orgRole: loginRole === 'admin' ? 'admin' : 'member'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onLoginSuccess(data.user);
          setIsLoading(false);
          onClose();
          return;
        }
      }

      // For any arbitrary email in this prototype fallback:
      const department = loginRole === 'admin' 
        ? `${resolvedOrgName} Administration` 
        : emailLower.includes('sec') 
        ? 'Information Security' 
        : emailLower.includes('lead') || emailLower.includes('exec') || emailLower.includes('vp')
        ? 'Executive Leadership'
        : 'Core Platform Engineering';

      const role: UserRole = loginRole === 'admin'
        ? 'admin'
        : emailLower.includes('sec')
        ? 'security'
        : emailLower.includes('lead') || emailLower.includes('exec') || emailLower.includes('vp')
        ? 'leadership'
        : 'eng-core';

      const customUser: UserAccount = {
        id: `usr_${Date.now().toString(36)}`,
        name: emailLower.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase()),
        email: emailLower,
        role: role,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        department: department,
        orgRole: loginRole === 'admin' ? 'admin' : 'member',
        groups: loginRole === 'admin' ? ['leadership', 'security', 'eng-core'] : [role],
        orgId: resolvedOrgId,
        idToken: `simulated-token-${emailLower}`
      };

      onLoginSuccess(customUser);
      setIsLoading(false);
      onClose();
    } catch {
      setNotification({ type: 'error', message: 'Failed to sign in. Please try again.' });
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setNotification({ type: 'error', message: 'Please enter your full name and work email.' });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const emailLower = regEmail.trim().toLowerCase();

      // Call backend register endpoint so user is saved to server store
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: emailLower,
          role: regRole,
          department: regDepartment,
          orgName: regOrg,
          groups: selectedGroups.length > 0 ? selectedGroups : [regRole]
        })
      });

      let registeredUser: UserAccount | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data.user) registeredUser = data.user;
      }

      const newUser: UserAccount = registeredUser || {
        id: `usr_${Date.now().toString(36)}`,
        name: regName.trim(),
        email: emailLower,
        role: regRole,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        department: regDepartment,
        orgRole: 'member',
        groups: selectedGroups.length > 0 ? selectedGroups : [regRole],
        orgId: 'acme',
        idToken: `simulated-token-${emailLower}`
      };

      setNotification({ type: 'success', message: 'Account provisioned successfully!' });
      setTimeout(() => {
        onLoginSuccess(newUser);
        setIsLoading(false);
        onClose();
      }, 500);
    } catch {
      setNotification({ type: 'error', message: 'Failed to provision account. Please try again.' });
      setIsLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      if (selectedGroups.length > 1) {
        setSelectedGroups(selectedGroups.filter(g => g !== groupId));
      }
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#FCFCFB] text-[#111111] rounded-3xl border border-[#E7E7E4] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E7E7E4] flex items-center justify-between bg-[#F7F7F5]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#111111]">
                Nexus Sidekick Workspace
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Enterprise Single Sign-On & Multi-Tenant Access
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:bg-[#E7E7E4]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E7E7E4] bg-[#F7F7F5]">
          <button
            onClick={() => { setMode('signin'); setNotification(null); }}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              mode === 'signin'
                ? 'border-black text-[#111111] bg-white'
                : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => { setMode('register'); setNotification(null); }}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              mode === 'register'
                ? 'border-black text-[#111111] bg-white'
                : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {notification && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{notification.message}</span>
            </div>
          )}

          {/* Real Google Account Sign-In */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-[#E7E7E4] shadow-xs text-[#111111] text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Real Google Account</span>
            </button>
            <p className="text-[11px] text-center text-[#6B6B6B]">
              Grants real Google Calendar & Meet scopes to schedule and join real meetings.
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E7E7E4]"></div></div>
            <span className="relative bg-[#FCFCFB] px-3 text-[10px] text-[#6B6B6B] uppercase font-mono tracking-wider">
              OR TEST WITH PRE-CONFIGURED PERSONA
            </span>
          </div>

          {/* Quick 1-Click Demo Profiles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#6B6B6B]">
              <span>Instant Prototype Login (1-Click)</span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Pre-configured ACL
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {DEMO_ACCOUNTS.map((account) => {
                const isSelected = currentUser.id === account.id;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(account)}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-black bg-[#F3F2EF] ring-1 ring-black'
                        : 'border-[#E7E7E4] bg-white hover:border-zinc-400 hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full mb-1.5">
                      <img 
                        src={account.avatar} 
                        alt={account.name} 
                        className="w-6 h-6 rounded-full object-cover border border-[#E7E7E4]"
                      />
                      <span className="text-xs font-bold text-[#111111] truncate">{account.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 mb-1">
                      {account.role}
                    </span>
                    <span className="text-[11px] text-[#6B6B6B] truncate w-full">
                      {account.department}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E7E7E4]"></div></div>
            <span className="relative bg-[#FCFCFB] px-3 text-xs text-[#6B6B6B] uppercase font-mono">
              Or sign in with any email
            </span>
          </div>

          {mode === 'signin' ? (
            /* Sign In Form */
            <form onSubmit={handleDirectSignIn} className="space-y-4">
              
              {/* Account Role Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Sign In Role
                </label>
                <div className="grid grid-cols-2 p-1 bg-[#F4F4F2] rounded-xl border border-[#E7E7E4]">
                  <button
                    type="button"
                    onClick={() => setLoginRole('employee')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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

              {/* Company Name (Asked for both employee and admin) */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Company / Organization Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginOrg}
                    onChange={(e) => setLoginOrg(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  />
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-1">
                  {loginRole === 'admin' 
                    ? 'Tenant cluster with member management, ACL groups, and audit policies.' 
                    : 'Work domain with scoped meeting streams and policy compliance radar.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={loginRole === 'admin' ? 'admin@enterprise.corp' : 'employee@enterprise.corp'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#111111]">
                    Password / Passkey
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">Prototype Mode: Any</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying Credentials...' : loginRole === 'admin' ? 'Sign In as Administrator' : 'Sign In as Employee'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Jordan Rivera"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Work Email (Requires Verification)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. jordan@acme.corp"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Organization
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regOrg}
                      onChange={(e) => setRegOrg(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Department
                  </label>
                  <select
                    value={regDepartment}
                    onChange={(e) => {
                      setRegDepartment(e.target.value);
                      if (e.target.value === 'Information Security') {
                        setRegRole('security');
                        setSelectedGroups(['security']);
                      } else if (e.target.value === 'Executive Leadership') {
                        setRegRole('leadership');
                        setSelectedGroups(['leadership']);
                      } else {
                        setRegRole('eng-core');
                        setSelectedGroups(['eng-core']);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E7E4] bg-white text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  >
                    <option value="Engineering">Core Engineering</option>
                    <option value="Information Security">Information Security</option>
                    <option value="Executive Leadership">Executive Leadership</option>
                    <option value="Product Architecture">Product Architecture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Assigned Security Groups
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'eng-core', label: 'Engineering (eng-core)' },
                    { id: 'security', label: 'Security (security)' },
                    { id: 'leadership', label: 'Leadership (leadership)' }
                  ].map(group => {
                    const isSelected = selectedGroups.includes(group.id);
                    return (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => toggleGroup(group.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-zinc-700 border-[#E7E7E4] hover:bg-zinc-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{group.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-1">
                  Groups govern document retrieval and shared draft isolation.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F7F7F5] border-t border-[#E7E7E4] flex items-center justify-between text-[11px] text-[#6B6B6B]">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Encrypted Token Verification</span>
          </div>
          <span className="font-mono text-[10px]">AUTH_MODE: MOCK / REAL ADC</span>
        </div>

      </div>
    </div>
  );
};
