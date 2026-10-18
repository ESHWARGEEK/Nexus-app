import React, { useState } from 'react';
import { 
  UserAccount, 
  UserRole 
} from '../types';
import { DEMO_ACCOUNTS } from '../data/seedData';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Building2, 
  GitBranch, 
  Calendar, 
  FileText, 
  Cpu, 
  ChevronRight,
  Shield,
  Layers
} from 'lucide-react';

interface RegistrationPageProps {
  onRegisterSuccess: (user: UserAccount) => void;
  onNavigateLanding: () => void;
  onNavigateLogin?: () => void;
  onLaunchCockpit: () => void;
  currentUser?: UserAccount;
  initialStep?: 1 | 2 | 3;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  onRegisterSuccess,
  onNavigateLanding,
  onNavigateLogin,
  onLaunchCockpit,
  currentUser,
  initialStep = 1,
}) => {
  // Navigation / Mode state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);
  const [isSignInMode, setIsSignInMode] = useState<boolean>(false);

  // Form State - Step 1: Account
  const [fullName, setFullName] = useState('Alex Rivera');
  const [workEmail, setWorkEmail] = useState('alex.rivera@synthetix.corp');
  const [password, setPassword] = useState('••••••••••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState('Synthetix Corp');

  // Form State - Step 2: Role & Groups
  const [selectedRole, setSelectedRole] = useState<UserRole>('eng-core');
  const [selectedDepartment, setSelectedDepartment] = useState('Core Platform Engineering');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['eng-core']);

  // Form State - Step 3: Integrations & Consents
  const [enableWorkspace, setEnableWorkspace] = useState(true);
  const [enableMCP, setEnableMCP] = useState(true);
  const [enableDLP, setEnableDLP] = useState(true);
  const [enableCalendar, setEnableCalendar] = useState(true);

  // Sign In Form State
  const [signInRole, setSignInRole] = useState<'employee' | 'admin'>('employee');
  const [signInOrg, setSignInOrg] = useState('Acme Corp');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick 1-Click demo account select
  const handleSelectDemoAccount = (account: UserAccount) => {
    setIsSubmitting(true);
    setStatusMessage({ type: 'success', text: `Authenticating as ${account.name}...` });
    setTimeout(() => {
      onRegisterSuccess(account);
      setIsSubmitting(false);
    }, 400);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !workEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill in your full name and corporate email.' });
      return;
    }
    setStatusMessage(null);
    setCurrentStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroups.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one security group.' });
      return;
    }
    setStatusMessage(null);
    setCurrentStep(3);
  };

  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const emailLower = workEmail.trim().toLowerCase();

      // Call backend register endpoint so user is immediately active in Acme store
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: emailLower,
          role: selectedRole,
          department: selectedDepartment,
          orgName,
          groups: selectedGroups
        })
      });

      let registeredUser: UserAccount | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data.user) registeredUser = data.user;
      }

      const newUser: UserAccount = registeredUser || {
        id: `usr_${Date.now().toString(36)}`,
        name: fullName.trim(),
        email: emailLower,
        role: selectedRole,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        department: selectedDepartment,
        orgRole: 'member',
        groups: selectedGroups,
        orgId: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || 'acme',
        idToken: `simulated-token-${emailLower}`
      };

      setStatusMessage({ type: 'success', text: 'Workspace provisioned! Launching cockpit...' });
      setTimeout(() => {
        onRegisterSuccess(newUser);
        setIsSubmitting(false);
      }, 500);
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to provision workspace. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInOrg.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your company name.' });
      return;
    }
    if (!signInEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your corporate email address.' });
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const emailLower = signInEmail.trim().toLowerCase();
      const resolvedOrgName = signInOrg.trim();
      const resolvedOrgId = resolvedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'acme';

      const matched = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === emailLower);
      if (matched) {
        onRegisterSuccess({
          ...matched,
          orgRole: signInRole === 'admin' ? 'admin' : 'member',
          orgId: resolvedOrgId
        });
        setIsSubmitting(false);
        return;
      }

      // Call backend sign in to provision or authenticate any prototype account
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailLower, 
          password: signInPassword,
          companyName: resolvedOrgName,
          orgRole: signInRole === 'admin' ? 'admin' : 'member'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onRegisterSuccess(data.user);
          setIsSubmitting(false);
          return;
        }
      }

      // Any arbitrary email in prototype fallback
      const role: UserRole = signInRole === 'admin'
        ? 'leadership'
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
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        department: signInRole === 'admin' 
          ? `${resolvedOrgName} Administration` 
          : role === 'security' ? 'Security & Compliance' : role === 'leadership' ? 'Executive Staff' : 'Core Engineering',
        orgRole: signInRole === 'admin' ? 'admin' : 'member',
        groups: signInRole === 'admin' ? ['leadership', 'security', 'eng-core'] : [role],
        orgId: resolvedOrgId,
        idToken: `simulated-token-${emailLower}`
      };

      onRegisterSuccess(user);
      setIsSubmitting(false);
    } catch {
      setStatusMessage({ type: 'error', text: 'Authentication failed. Please verify credentials.' });
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-[#F9F9F7] text-[#1A1C1B] font-sans antialiased selection:bg-zinc-200 flex flex-col justify-between">
      
      {/* TOP NAVIGATION (Matching the image) */}
      <nav className="w-full border-b border-[#E7E7E4] bg-[#F9F9F7]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 flex justify-between items-center h-[72px]">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-8 lg:gap-10">
            <button 
              onClick={onNavigateLanding}
              className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight text-[#111111] hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5v14M7 9v6M22 10v4M2 10v4" />
                </svg>
              </div>
              <span className="font-semibold text-[17px] text-zinc-950">Nexus Sidekick</span>
            </button>

            {/* Nav Links */}
            <div className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-[#6B6B6B]">
              <button onClick={onLaunchCockpit} className="hover:text-[#111111] transition-colors cursor-pointer">
                Live Copilot
              </button>
              <a href="#buddy" onClick={onLaunchCockpit} className="hover:text-[#111111] transition-colors cursor-pointer">
                Nexus Buddy
              </a>
              <a href="#meeting" onClick={onLaunchCockpit} className="hover:text-[#111111] transition-colors cursor-pointer">
                Meeting Buddy
              </a>
              <a href="#docai" onClick={onLaunchCockpit} className="hover:text-[#111111] transition-colors cursor-pointer">
                Document AI
              </a>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onLaunchCockpit}
              className="bg-[#111111] text-[#FCFCFB] px-5 py-2 rounded-full text-xs sm:text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <span>Launch Cockpit</span>
            </button>

            <button
              onClick={() => setIsSignInMode(!isSignInMode)}
              className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title={currentUser ? `Signed in as ${currentUser.name}` : "User Profile / Sign In"}
            >
              <User className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN REGISTRATION CONTAINER */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex items-center justify-center">
        
        {/* ELEVATED EDITORIAL CARD (Matching image specifications) */}
        <div className="w-full max-w-[620px] bg-[#FCFCFB] rounded-[32px] border border-[#E7E7E4] shadow-[0_2px_24px_rgba(17,17,17,0.035)] p-8 sm:p-12 relative overflow-hidden transition-all duration-300">
          
          {/* Status Message Banner */}
          {statusMessage && (
            <div className={`mb-6 p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {!isSignInMode ? (
            /* ========================================================================= */
            /* MULTI-STEP REGISTRATION FLOW                                              */
            /* ========================================================================= */
            <div>
              {/* Card Header Top Row */}
              <div className="flex justify-between items-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F4F2] text-[11px] font-semibold tracking-wider text-zinc-700 uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                  <span>PROTOTYPE SANDBOX • ZERO ESCAPE BOUNDARY</span>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] font-mono">
                  STEP {currentStep} OF 3
                </div>
              </div>

              {/* Step Navigation Pill Segmented Bar */}
              <div className="flex bg-[#F4F4F2] p-1 rounded-full mb-8 text-xs font-medium border border-[#E7E7E4]/70">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                    currentStep === 1 
                      ? 'bg-black text-white font-semibold shadow-xs' 
                      : 'text-[#6B6B6B] hover:text-black'
                  }`}
                >
                  1. Account
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                    currentStep === 2 
                      ? 'bg-black text-white font-semibold shadow-xs' 
                      : 'text-[#6B6B6B] hover:text-black'
                  }`}
                >
                  2. Role & Groups
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                    currentStep === 3 
                      ? 'bg-black text-white font-semibold shadow-xs' 
                      : 'text-[#6B6B6B] hover:text-black'
                  }`}
                >
                  3. Integrations
                </button>
              </div>

              {/* Title & Description */}
              <div className="mb-8">
                <h1 className="text-[34px] sm:text-[40px] leading-[1.1] font-normal tracking-[-0.035em] text-[#111111] mb-3">
                  {currentStep === 1 && "Join Your Organization"}
                  {currentStep === 2 && "Configure Roles & Security Groups"}
                  {currentStep === 3 && "Activate Enclave Integrations"}
                </h1>
                <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#6B6B6B]">
                  {currentStep === 1 && "Any employee can register for this prototype sandbox. New accounts are automatically provisioned with Sovereign VPC isolation."}
                  {currentStep === 2 && "Group-based ACL partitions document citations and isolates the shared meeting draft against policy leakage."}
                  {currentStep === 3 && "Connect authorized Google Workspace accounts and GitHub MCP tokens with human-in-the-loop audit gates."}
                </p>
              </div>

              {/* ----------------- STEP 1: ACCOUNT DETAILS ----------------- */}
              {currentStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-5 animate-in fade-in duration-200">
                  {/* Google Workspace SSO Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemoAccount(DEMO_ACCOUNTS[0])}
                    className="w-full py-3.5 px-4 rounded-full border border-[#E7E7E4] bg-white hover:bg-[#F4F4F2] text-[#111111] text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs active:scale-98"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign up with Google Workspace</span>
                  </button>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-6">
                    <div className="w-full border-t border-[#E7E7E4]"></div>
                    <span className="relative bg-[#FCFCFB] px-3 text-[11px] font-semibold tracking-wider text-[#6B6B6B] uppercase font-mono">
                      OR ENTER CORPORATE CREDENTIALS
                    </span>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        placeholder="alex.rivera@synthetix.corp"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono"
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

                  {/* Security Complexity Gauge */}
                  <div className="pt-1">
                    <div className="flex justify-between items-center text-[11px] mb-2 font-mono">
                      <span className="font-semibold uppercase tracking-wider text-[#6B6B6B]">
                        SECURITY COMPLEXITY
                      </span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Strong • HSM Enclave Compatible</span>
                      </span>
                    </div>
                    {/* 3 Green Progress Bars */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-1.5 rounded-full bg-emerald-600"></div>
                      <div className="h-1.5 rounded-full bg-emerald-600"></div>
                      <div className="h-1.5 rounded-full bg-emerald-600"></div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    className="w-full mt-6 py-4 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                  >
                    <span>Continue to Role & Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* ----------------- STEP 2: ROLE & GROUPS ----------------- */}
              {currentStep === 2 && (
                <form onSubmit={handleStep2Submit} className="space-y-6 animate-in fade-in duration-200">
                  {/* Organization Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Target Organization
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-2">
                      Primary Department Role
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'eng-core', label: 'Engineering', desc: 'RFC-104, Codebase AST' },
                        { id: 'security', label: 'Security', desc: 'POL-SEC-12, HSM Keys' },
                        { id: 'leadership', label: 'Leadership', desc: 'All Policies, Executive' }
                      ].map((item) => {
                        const isSelected = selectedRole === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              setSelectedRole(item.id as UserRole);
                              if (!selectedGroups.includes(item.id)) {
                                setSelectedGroups([...selectedGroups, item.id]);
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-black bg-[#F4F4F2] ring-1 ring-black'
                                : 'border-[#E7E7E4] bg-white hover:bg-[#F9F9F7]'
                            }`}
                          >
                            <span className="text-xs font-bold text-zinc-950 block">{item.label}</span>
                            <span className="text-[11px] text-[#6B6B6B] block mt-0.5">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-Group Checkboxes */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-[#111111]">
                        Security Groups (Group-Based ACL)
                      </label>
                      <span className="text-[11px] font-mono text-[#6B6B6B]">Multiple allowed</span>
                    </div>
                    
                    <div className="space-y-2">
                      {[
                        { id: 'eng-core', name: 'Engineering Core (eng-core)', badge: 'Access: RFC-104, POL-SEC-08' },
                        { id: 'security', name: 'Information Security (security)', badge: 'Access: POL-SEC-12, HSM Audit' },
                        { id: 'leadership', name: 'Executive Leadership (leadership)', badge: 'Access: Full Org Scope' }
                      ].map((grp) => {
                        const isChecked = selectedGroups.includes(grp.id);
                        return (
                          <div
                            key={grp.id}
                            onClick={() => toggleGroup(grp.id)}
                            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                              isChecked ? 'bg-white border-black' : 'bg-[#FCFCFB] border-[#E7E7E4] opacity-80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-black border-black text-white' : 'border-[#E7E7E4] bg-white'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-xs font-semibold text-zinc-900">{grp.name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              {grp.badge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Draft Isolation Notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                    <Shield className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">Shared Draft Isolation Governance</span>
                      <span>The shared living document canvas only synthesizes documents readable by <em>every invited participant</em> of the meeting, protecting late joiners from confidential policy leaks.</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3.5 rounded-full border border-[#E7E7E4] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                    >
                      <span>Continue to Integrations</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ----------------- STEP 3: INTEGRATIONS ----------------- */}
              {currentStep === 3 && (
                <form onSubmit={handleFinalRegister} className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-3">
                    {/* Google Workspace */}
                    <div 
                      onClick={() => setEnableWorkspace(!enableWorkspace)}
                      className="p-3.5 rounded-2xl border border-[#E7E7E4] bg-white flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">Google Docs & Drive Export</span>
                          <span className="text-[11px] text-[#6B6B6B] block">Human-in-the-loop export gates and OAuth 2.0 token routing</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={enableWorkspace} 
                        onChange={() => setEnableWorkspace(!enableWorkspace)}
                        className="w-4 h-4 rounded text-black accent-black cursor-pointer" 
                      />
                    </div>

                    {/* GitHub MCP */}
                    <div 
                      onClick={() => setEnableMCP(!enableMCP)}
                      className="p-3.5 rounded-2xl border border-[#E7E7E4] bg-white flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">Model Context Protocol (GitHub MCP)</span>
                          <span className="text-[11px] text-[#6B6B6B] block">Semantic AST queries over organization repositories and PR diffs</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={enableMCP} 
                        onChange={() => setEnableMCP(!enableMCP)}
                        className="w-4 h-4 rounded text-black accent-black cursor-pointer" 
                      />
                    </div>

                    {/* Cloud DLP */}
                    <div 
                      onClick={() => setEnableDLP(!enableDLP)}
                      className="p-3.5 rounded-2xl border border-[#E7E7E4] bg-white flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">Cloud DLP Sensitive Data Redaction</span>
                          <span className="text-[11px] text-[#6B6B6B] block">Automatic stripping of credit card PANs, SSNs, and API keys</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={enableDLP} 
                        onChange={() => setEnableDLP(!enableDLP)}
                        className="w-4 h-4 rounded text-black accent-black cursor-pointer" 
                      />
                    </div>

                    {/* Google Calendar */}
                    <div 
                      onClick={() => setEnableCalendar(!enableCalendar)}
                      className="p-3.5 rounded-2xl border border-[#E7E7E4] bg-white flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">Google Calendar Context Priming</span>
                          <span className="text-[11px] text-[#6B6B6B] block">Meeting agenda alignment and attendee invitation resolution</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={enableCalendar} 
                        onChange={() => setEnableCalendar(!enableCalendar)}
                        className="w-4 h-4 rounded text-black accent-black cursor-pointer" 
                      />
                    </div>
                  </div>

                  {/* Summary Enclave Card */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-mono space-y-1">
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>VERIFIED USER:</span>
                      <span className="font-bold text-zinc-950">{workEmail}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>ACCESS GROUPS:</span>
                      <span className="font-bold text-indigo-700">[{selectedGroups.join(', ')}]</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>ENCLAVE PERIMETER:</span>
                      <span className="font-bold text-emerald-700">VPC-SC COMPLIANT</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-3.5 rounded-full border border-[#E7E7E4] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>{isSubmitting ? 'Provisioning Enclave...' : 'Complete Registration & Launch'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom Security Trust Strip */}
              <div className="flex justify-center items-center gap-4 sm:gap-6 mt-8 pt-6 border-t border-[#E7E7E4]/80 text-[10px] sm:text-[11px] font-mono text-[#6B6B6B] uppercase tracking-wider flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-zinc-500" />
                  <span>SOVEREIGN BOUNDARY</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>ZERO PII RETENTION</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-indigo-600" />
                  <span>DLP-AUDITED</span>
                </span>
              </div>

              {/* Toggle to Sign In Link */}
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateLogin) {
                      onNavigateLogin();
                    } else {
                      setIsSignInMode(true);
                    }
                  }}
                  className="text-xs text-[#6B6B6B] hover:text-black transition-colors font-medium cursor-pointer"
                >
                  Already provisioned? <span className="text-zinc-950 font-semibold underline underline-offset-2">Sign in to existing workspace →</span>
                </button>
              </div>

            </div>
          ) : (
            /* ========================================================================= */
            /* SIGN IN TO EXISTING WORKSPACE MODE                                        */
            /* ========================================================================= */
            <div className="animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F4F2] text-[11px] font-semibold tracking-wider text-zinc-700 uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                  <span>ENTERPRISE GATEWAY</span>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] font-mono">
                  MEMBER LOGIN
                </div>
              </div>

              <div className="mb-6">
                <h1 className="text-[34px] sm:text-[40px] leading-[1.1] font-normal tracking-[-0.035em] text-[#111111] mb-2">
                  Sign In to Workspace
                </h1>
                <p className="text-[14px] leading-relaxed text-[#6B6B6B]">
                  Access your organization's verified meeting streams, grounded RFC deliverables, and private audit radar.
                </p>
              </div>

              {/* 1-Click Fast Sandbox Accounts */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 mb-2.5">
                  <span>Instant 1-Click Sandbox Login</span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active Demo ACL
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectDemoAccount(acc)}
                      className="p-3 rounded-2xl border border-[#E7E7E4] bg-white hover:border-black hover:bg-[#F9F9F7] text-left transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <img src={acc.avatar} alt={acc.name} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-xs font-bold text-zinc-950 truncate">{acc.name.split(' ')[0]}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 w-fit">
                        {acc.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Or Standard Credentials */}
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                
                {/* Account Role Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Sign In Role
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-[#F4F4F2] rounded-xl border border-[#E7E7E4]">
                    <button
                      type="button"
                      onClick={() => setSignInRole('employee')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        signInRole === 'employee'
                          ? 'bg-white text-[#111111] shadow-xs'
                          : 'text-[#6B6B6B] hover:text-[#111111]'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Employee</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignInRole('admin')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        signInRole === 'admin'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-[#6B6B6B] hover:text-[#111111]'
                      }`}
                    >
                      <ShieldCheck className={`w-3.5 h-3.5 ${signInRole === 'admin' ? 'text-white' : 'text-zinc-600'}`} />
                      <span>Administrator</span>
                    </button>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Company / Organization Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={signInOrg}
                      onChange={(e) => setSignInOrg(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#6B6B6B] mt-1">
                    {signInRole === 'admin' 
                      ? 'Cluster workspace with tenant admin privileges.' 
                      : 'Corporate domain with scoped meeting notes and compliance radar.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder={signInRole === 'admin' ? 'admin@enterprise.corp' : 'employee@enterprise.corp'}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E7E7E4] bg-white text-xs sm:text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 py-4 rounded-full bg-black text-white text-xs sm:text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Authenticating...' : signInRole === 'admin' ? 'Sign In as Administrator' : 'Sign In as Employee'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Toggle to Register */}
              <div className="text-center mt-6 pt-5 border-t border-[#E7E7E4]/80">
                <button
                  type="button"
                  onClick={() => setIsSignInMode(false)}
                  className="text-xs text-[#6B6B6B] hover:text-black transition-colors font-medium cursor-pointer"
                >
                  New to Nexus? <span className="text-zinc-950 font-semibold underline underline-offset-2">Register new employee sandbox →</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER (Matching image layout) */}
      <footer className="w-full border-t border-[#E7E7E4] bg-[#F9F9F7] py-14">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 grid grid-cols-2 md:grid-cols-6 gap-10 text-[13px]">
          
          <div className="col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[17px] font-bold text-black">
              <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5v14M7 9v6M22 10v4M2 10v4" />
                </svg>
              </div>
              <span>Nexus Sidekick</span>
            </div>
            <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-xs">
              Autonomous enterprise AI meeting teammate and workspace intelligence agent engineered for executive velocity.
            </p>
            <span className="text-[11px] font-mono text-[#6B6B6B] mt-2">
              NEXUS SIDEKICK © 2026<br />Built on Google Cloud Vertex AI & Gemini.
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-[#6B6B6B]">
            <h5 className="text-[11px] uppercase font-semibold text-[#111111] tracking-wider mb-1">PRODUCTS</h5>
            <button onClick={onLaunchCockpit} className="text-left hover:text-[#111111] transition-colors cursor-pointer">Live Copilot</button>
            <button onClick={onLaunchCockpit} className="text-left hover:text-[#111111] transition-colors cursor-pointer">MCP Connectors</button>
            <button onClick={onLaunchCockpit} className="text-left hover:text-[#111111] transition-colors cursor-pointer">Calendar Sync</button>
            <button onClick={onLaunchCockpit} className="text-left hover:text-[#111111] transition-colors cursor-pointer">Document AI</button>
          </div>

          <div className="flex flex-col gap-2.5 text-[#6B6B6B]">
            <h5 className="text-[11px] uppercase font-semibold text-[#111111] tracking-wider mb-1">DEVELOPERS</h5>
            <a href="#" className="hover:text-[#111111] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#111111] transition-colors">GitHub</a>
            <a href="#" className="hover:text-[#111111] transition-colors">System Status</a>
            <a href="#" className="hover:text-[#111111] transition-colors">API Keys</a>
          </div>

          <div className="flex flex-col gap-2.5 text-[#6B6B6B]">
            <h5 className="text-[11px] uppercase font-semibold text-[#111111] tracking-wider mb-1">COMPANY</h5>
            <a href="#" className="hover:text-[#111111] transition-colors">About</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Careers</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Security Architecture</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Privacy Policy</a>
          </div>

          <div className="flex flex-col gap-2.5 text-[#6B6B6B]">
            <h5 className="text-[11px] uppercase font-semibold text-[#111111] tracking-wider mb-1">LEGAL</h5>
            <a href="#" className="hover:text-[#111111] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Compliance</a>
            <a href="#" className="hover:text-[#111111] transition-colors">GDPR Compliance</a>
            <a href="#" className="hover:text-[#111111] transition-colors">SOC2 Type II</a>
          </div>

        </div>
      </footer>

    </div>
  );
};
