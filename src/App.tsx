import React, { useState, useEffect, useRef } from 'react';
import { 
  UserAccount, 
  MeetingScenario, 
  TranscriptChunk, 
  CitationResult, 
  ComplianceFinding, 
  LivingDocument, 
  BigQueryMeetingSession, 
  HarnessRunMetrics,
  SystemUIState,
  isUserAdmin 
} from './types';
import { 
  DEMO_ACCOUNTS, 
  MEETING_SCENARIOS, 
  INITIAL_BIGQUERY_SESSIONS, 
  RECENT_HARNESS_BENCHMARKS 
} from './data/seedData';
import { sanitizeWithCloudDLP } from './services/dlpService';
import { queryVertexAISearch, saveMeetingTranscriptToStore } from './services/searchService';
import { scanForComplianceViolations, applyRemediationFix, applySecurityOverride } from './services/complianceService';
import { runEvaluationHarness } from './services/evaluationHarness';

import { Header } from './components/Header';
import { TranscriptStream } from './components/TranscriptStream';
import { LivingCanvas } from './components/LivingCanvas';
import { GroundedResearchFeed } from './components/GroundedResearchFeed';
import { ComplianceRadar } from './components/ComplianceRadar';
import { MeetingCopilot } from './components/MeetingCopilot';
import { AnalyticsDashboardModal } from './components/AnalyticsDashboardModal';
import { ExportApprovalModal } from './components/ExportApprovalModal';
import { ServiceHealthModal } from './components/ServiceHealthModal';
import { LandingPage } from './components/LandingPage';
import { RegistrationPage } from './components/RegistrationPage';
import { LoginPage } from './components/LoginPage';
import { AuthModal } from './components/AuthModal';
import { GoogleCalendarView } from './components/GoogleCalendarView';
import { GoogleMeetExperience } from './components/GoogleMeetExperience';
import { NexusAIChatbot } from './components/NexusAIChatbot';
import { AdminDashboardView } from './components/AdminDashboardView';
import { CalendarMeetingEvent, logoutWorkspace } from './services/googleWorkspaceService';
import { Bot, Search, ShieldCheck, Columns } from 'lucide-react';

const INITIAL_RFC_DRAFT = `# RFC-118: Next-Gen Payment Tokenization Engine

## 1. Scope & Objective
This specification establishes the architectural pattern for Acme Corp's next-generation European Union payment tokenization gateway, decoupling merchant checkout services from banking settlement backends.

## 2. Cryptographic Key Topologies
Master tokenization keys must be safeguarded with hardware isolation. Signing operations occur inside regional cryptographic partitions.

## 3. Idempotent Retry Policy
For European Union settlements, payment mutations must use deterministic idempotency keys terminating strictly inside europe-west3 (Frankfurt). Downstream PSP timeouts apply exponential backoff (base 200ms, max 3 attempts).

## 4. Telemetry & Ingress Architecture
Stream raw customer card transaction logs to central US-East data lake.`;

export default function App() {
  // Session & Identity State with persistence
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_is_authenticated') === 'true';
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_auth_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name !== 'Alice Chen' && parsed.name !== 'Marcus Vance' && !parsed.email?.includes('alice@') && !parsed.email?.includes('marcus@')) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return DEMO_ACCOUNTS[0];
  });
  const [currentScenario, setCurrentScenario] = useState<MeetingScenario>(MEETING_SCENARIOS[0]);
  const [hasOAuthConnected, setHasOAuthConnected] = useState<boolean>(true);

  // Audio Playback & Stopwatch State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const playbackTimerRef = useRef<any>(null);

  // Transcripts Stream State
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);

  // Multi-Agent Cockpit State
  const [cockpitTab, setCockpitTab] = useState<'copilot' | 'research' | 'compliance' | 'split'>('copilot');
  const [citations, setCitations] = useState<CitationResult[]>([]);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [isUngrounded, setIsUngrounded] = useState<boolean>(false);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);

  // Living Canvas State
  const [livingDoc, setLivingDoc] = useState<LivingDocument>({
    id: 'RFC-118',
    title: 'RFC-118: Next-Gen Payment Tokenization Engine',
    type: 'rfc',
    version: 1,
    status: 'IN_REVIEW',
    last_saved_at: new Date().toISOString(),
    markdown_content: INITIAL_RFC_DRAFT,
    sections: [],
    export_locked: false,
    lock_reasons: [],
  });

  // Analytics & Harness State
  const [sessions, setSessions] = useState<BigQueryMeetingSession[]>(INITIAL_BIGQUERY_SESSIONS);
  const [latestBenchmark, setLatestBenchmark] = useState<HarnessRunMetrics | null>(RECENT_HARNESS_BENCHMARKS[0]);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isRunningHarness, setIsRunningHarness] = useState<boolean>(false);

  // Modals & Navigation with session persistence
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'register' | 'cockpit' | 'calendar' | 'meet'>(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('nexus_is_authenticated') === 'true';
      const savedView = localStorage.getItem('nexus_current_view');
      if (isAuth && savedView && ['cockpit', 'calendar', 'meet'].includes(savedView)) {
        return savedView as any;
      }
      if (isAuth) {
        return 'cockpit';
      }
    }
    return 'landing';
  });
  const [dashboardMode, setDashboardMode] = useState<'nexus_ai' | 'google_meet' | 'admin' | 'studio'>('nexus_ai');
  const [activeMeetEvent, setActiveMeetEvent] = useState<CalendarMeetingEvent | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string>('acme');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isHealthOpen, setIsHealthOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register'>('signin');

  // Global Theme state ('dark' | 'light') synced with Landing Page & components
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_theme') === 'dark';
    }
    return false;
  });

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

  useEffect(() => {
    const handleStorage = () => {
      setIsDark(localStorage.getItem('nexus_theme') === 'dark');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Role restriction removed: all users can access admin & knowledge console
  const handleSelectDashboardMode = (mode: 'nexus_ai' | 'google_meet' | 'admin' | 'studio') => {
    setDashboardMode(mode);
  };

  // Handle Playback Loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setElapsedTimeMs(prev => prev + 100);
      }, 100);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying]);

  // Document indexing sync handler
  const handleDocumentIndexed = () => {
    if (lastQuery) {
      const searchResponse = queryVertexAISearch(lastQuery, currentUser.role, activeTenantId);
      if (searchResponse.status === 'SUCCESS') {
        setCitations(searchResponse.results);
        setIsUngrounded(false);
      } else {
        setCitations([]);
        setIsUngrounded(true);
      }
    }
  };

  // Audio / Transcript Timeline Sync
  useEffect(() => {
    if (!isPlaying) return;

    // Check which chunks have elapsed
    const availableChunks = currentScenario.transcripts.filter(
      t => t.timestamp_offset_ms <= elapsedTimeMs
    );

    if (availableChunks.length > transcripts.length) {
      const nextChunk = availableChunks[availableChunks.length - 1];
      
      // Step 1: Sanitize with Cloud DLP immediately
      const dlpResult = sanitizeWithCloudDLP(nextChunk.text);
      const sanitizedChunk: TranscriptChunk = {
        ...nextChunk,
        text: dlpResult.sanitizedText,
        pii_redacted: dlpResult.findingsCount > 0,
      };

      setTranscripts(availableChunks);
      setActiveChunkIndex(availableChunks.length - 1);

      // Step 2: Parallel Research & Compliance Agents execution
      triggerAgentPipeline(sanitizedChunk, currentUser.role);
    }

    // Auto-pause and persist transcript at end of meeting scenario
    const maxOffset = currentScenario.transcripts[currentScenario.transcripts.length - 1]?.timestamp_offset_ms || 70000;
    if (elapsedTimeMs >= maxOffset + 5000 && isPlaying) {
      setIsPlaying(false);
      // Persist meeting transcript to the data store on folder named 'meeting transcript'
      saveMeetingTranscriptToStore({
        id: `meet-${currentScenario.id}-${Date.now().toString(36).slice(-4)}`,
        meetSpaceId: `spaces/${currentScenario.id}`,
        meetLink: `https://meet.google.com/${currentScenario.id}`,
        title: currentScenario.title,
        hostEmail: currentUser.email,
        hostName: currentUser.name,
        allowed_joinees: currentScenario.invited_participants.map(p => p.email.toLowerCase()),
        started_at: new Date(Date.now() - elapsedTimeMs).toISOString(),
        ended_at: new Date().toISOString(),
        duration_sec: Math.round(elapsedTimeMs / 1000),
        transcript_chunks: transcripts.map(t => ({
          id: t.id,
          speaker: t.speaker,
          speaker_email: `${t.speaker.toLowerCase().replace(/\s+/g, '.')}@acme.corp`,
          text: t.text,
          timestamp_ms: t.timestamp_offset_ms,
          intent: t.detected_intent,
        })),
        summary: `Live studio session for "${currentScenario.title}" completed. Captured ${transcripts.length} dialogue chunks with Cloud DLP sanitization.`,
        decisions: [
          'Master tokenization keys anchored strictly inside europe-west3 (Frankfurt) Cloud HSM.',
          'Deterministic idempotency key retry policy adopted with base 200ms exponential backoff.',
        ],
        action_items: [
          'Review Cloud DLP ingress telemetry profiles',
          'Coordinate Frankfurt regional partition failover drill',
        ],
        created_at: new Date().toISOString(),
      }, activeTenantId);
      handleDocumentIndexed();
    }
  }, [elapsedTimeMs, isPlaying, currentScenario, currentUser.role, activeTenantId]);

  // Parallel Multi-Agent Execution Pipeline
  const triggerAgentPipeline = (chunk: TranscriptChunk, role: UserAccount['role']) => {
    // 1. Research Agent: Query Vertex AI Search on questions or technical decisions
    if (chunk.detected_intent === 'QUESTION' || chunk.text.includes('?')) {
      setLastQuery(chunk.text);
      const searchResponse = queryVertexAISearch(chunk.text, role, activeTenantId);
      
      if (searchResponse.status === 'SUCCESS') {
        setCitations(searchResponse.results);
        setIsUngrounded(false);
      } else {
        setCitations([]);
        setIsUngrounded(true);
      }
    }

    // 2. Compliance Guardian Agent: Inspect dialogue + last saved draft version in artifacts
    const auditState = scanForComplianceViolations(
      chunk.text,
      livingDoc.markdown_content,
      role,
      findings
    );

    setFindings(auditState.findings);

    // Synchronize server-side lock state to document canvas
    if (auditState.isExportLocked !== livingDoc.export_locked) {
      setLivingDoc(prev => ({
        ...prev,
        export_locked: auditState.isExportLocked,
        lock_reasons: auditState.lockedReasons,
      }));
    }
  };

  // Re-run search whenever user switches roles so citations update dynamically
  const handleSelectUser = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.orgId) setActiveTenantId(user.orgId);
    if (lastQuery) {
      const searchResponse = queryVertexAISearch(lastQuery, user.role, user.orgId || activeTenantId);
      if (searchResponse.status === 'SUCCESS') {
        setCitations(searchResponse.results);
        setIsUngrounded(false);
      } else {
        setCitations([]);
        setIsUngrounded(true);
      }
    }

    // Re-evaluate compliance disclosures for the new role
    const auditState = scanForComplianceViolations('', livingDoc.markdown_content, user.role, findings);
    setFindings(auditState.findings);
  };

  // 1-Click Remediation Handler
  const handleApplyRemediation = (findingId: string) => {
    const { updatedDoc, updatedFindings } = applyRemediationFix(
      findingId,
      livingDoc,
      findings,
      currentUser.role
    );
    setLivingDoc(updatedDoc);
    setFindings(updatedFindings);
  };

  // Logged Security Override Handler
  const handleApplyOverride = (findingId: string, reason: string) => {
    const { updatedFindings, success } = applySecurityOverride(
      findingId,
      findings,
      currentUser.role,
      reason
    );
    if (success) {
      setFindings(updatedFindings);
      // Re-evaluate lock
      const remainingCritical = updatedFindings.filter(
        f => f.severity === 'CRITICAL' && f.status === 'PENDING'
      );
      setLivingDoc(prev => ({
        ...prev,
        export_locked: remainingCritical.length > 0,
        lock_reasons: remainingCritical.map(f => `${f.policy_id}: ${f.violation_summary}`),
      }));
    }
  };

  // Reset Scenario Playback
  const handleReset = () => {
    setIsPlaying(false);
    setElapsedTimeMs(0);
    setActiveChunkIndex(0);
    setTranscripts([]);
    setCitations([]);
    setLastQuery('');
    setIsUngrounded(false);
    setFindings([]);
    setLivingDoc({
      id: 'RFC-118',
      title: 'RFC-118: Next-Gen Payment Tokenization Engine',
      type: 'rfc',
      version: 1,
      status: 'IN_REVIEW',
      last_saved_at: new Date().toISOString(),
      markdown_content: INITIAL_RFC_DRAFT,
      sections: [],
      export_locked: false,
      lock_reasons: [],
    });
  };

  // Run Automated Evaluation Harness
  const handleRunHarness = () => {
    setIsRunningHarness(true);
    setTimeout(() => {
      const result = runEvaluationHarness(livingDoc);
      setLatestBenchmark(result.metrics);
      setSessions(prev => [result.loggedBigQuerySession, ...prev]);
      setIsRunningHarness(false);
    }, 1200);
  };

  // Direct Copilot Search Query Handler
  const handleTriggerSearch = (query: string) => {
    setLastQuery(query);
    const searchResponse = queryVertexAISearch(query, currentUser.role);
    if (searchResponse.status === 'SUCCESS') {
      setCitations(searchResponse.results);
      setIsUngrounded(false);
    } else {
      setCitations([]);
      setIsUngrounded(true);
    }
  };

  // Direct Spoken / Typed Transcript Contribution Handler
  const handleAddTranscript = (text: string) => {
    const dlpResult = sanitizeWithCloudDLP(text);
    const newChunk: TranscriptChunk = {
      id: `user_live_${Date.now()}`,
      meeting_id: 'live_meeting_1',
      timestamp_offset_ms: elapsedTimeMs || 5000,
      speaker: currentUser.name,
      speaker_role: currentUser.role,
      text: dlpResult.sanitizedText,
      is_final: true,
      detected_intent: text.includes('?') ? 'QUESTION' : 'GENERAL',
      pii_redacted: dlpResult.findingsCount > 0,
    };
    setTranscripts(prev => [...prev, newChunk]);
    setActiveChunkIndex(transcripts.length);
    triggerAgentPipeline(newChunk, currentUser.role);
  };

  // Export Success -> Log Live Row to BigQuery
  const handleExportSuccess = (fileId: string, webLink: string) => {
    const newSession: BigQueryMeetingSession = {
      meeting_id: `sess_live_${Date.now().toString(36)}`,
      title: `${currentScenario.title} (Live Demo)`,
      duration_sec: Math.round(elapsedTimeMs / 1000) || 120,
      decisions_count: 2,
      compliance_warnings_count: findings.length,
      action_items_count: 3,
      time_to_first_answer_ms: 2380,
      timestamp: new Date().toISOString(),
      status: 'CONCLUDED',
    };
    setSessions(prev => [newSession, ...prev]);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_auth_user', JSON.stringify(user));
      localStorage.setItem('nexus_is_authenticated', 'true');
      localStorage.setItem('nexus_current_view', 'cockpit');
    }
    if (user.orgId) setActiveTenantId(user.orgId);
    setCurrentView('cockpit');
  };

  const handleLogout = async () => {
    try {
      await logoutWorkspace();
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_auth_user');
      localStorage.setItem('nexus_is_authenticated', 'false');
      localStorage.setItem('nexus_current_view', 'landing');
    }
    setCurrentUser(DEMO_ACCOUNTS[0]);
    setCurrentView('landing');
  };

  const navigateTo = (view: 'landing' | 'login' | 'register' | 'cockpit' | 'calendar' | 'meet') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_current_view', view);
    }
  };

  // Calculate Active System UI State across the four named states
  const systemState: SystemUIState = livingDoc.export_locked
    ? 'export_locked'
    : isUngrounded
    ? 'refused'
    : citations.length > 0
    ? 'grounded'
    : 'listening';

  // If currently on Landing Page, render editorial showcase
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen">
        <LandingPage
          onLaunchCockpit={() => navigateTo('cockpit')}
          onOpenAdmin={() => {
            if (isUserAdmin(currentUser)) {
              setDashboardMode('admin');
              navigateTo('cockpit');
            }
          }}
          onNavigateCalendar={() => navigateTo('calendar')}
          onLoginSuccess={handleLoginSuccess}
          onOpenAuth={(mode) => {
            if (mode === 'register') {
              navigateTo('register');
            } else {
              navigateTo('login');
            }
          }}
          currentUser={currentUser}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          initialMode={authModalMode}
        />
      </div>
    );
  }

  // If currently on Login Page, render dedicated Warm Editorial Intelligence login
  if (currentView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateLanding={() => navigateTo('landing')}
        onNavigateRegister={() => navigateTo('register')}
        onLaunchCockpit={() => navigateTo('cockpit')}
        currentUser={currentUser}
      />
    );
  }

  // If currently on Registration Page, render multi-step sovereign onboarding
  if (currentView === 'register') {
    return (
      <RegistrationPage
        onRegisterSuccess={handleLoginSuccess}
        onNavigateLanding={() => navigateTo('landing')}
        onNavigateLogin={() => navigateTo('login')}
        onLaunchCockpit={() => navigateTo('cockpit')}
        currentUser={currentUser}
      />
    );
  }

  // If currently on Calendar/Meetings Page, render Google Calendar & Scheduled Meetings view
  if (currentView === 'calendar') {
    return (
      <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#090D16] text-[#F1F5F9]' : 'bg-[#F7F7F5] text-[#111111]'
      }`}>
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigateLanding={() => setCurrentView('landing')}
          activeDashboardMode="google_meet"
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onSelectDashboardMode={(mode) => {
            if (mode === 'admin' && !isUserAdmin(currentUser)) {
              setDashboardMode('nexus_ai');
              setCurrentView('cockpit');
              return;
            }
            setCurrentView('cockpit');
            setDashboardMode(mode);
          }}
        />
        <div className="flex-1 overflow-hidden">
          <GoogleCalendarView
            currentUser={currentUser}
            isDark={isDark}
            onJoinMeetingWithNexus={(meeting) => {
              setActiveMeetEvent(meeting);
              setCurrentView('meet');
            }}
            onLaunchInstantMeet={() => {
              setActiveMeetEvent(null);
              setCurrentView('meet');
            }}
            onNavigateCockpit={() => {
              setCurrentView('cockpit');
              setDashboardMode('nexus_ai');
            }}
          />
        </div>
      </div>
    );
  }

  // If currently in Google Meet Room, render personalized Google Meet experience with Nexus Buddy
  if (currentView === 'meet') {
    return (
      <GoogleMeetExperience
        currentUser={currentUser}
        meetingEvent={activeMeetEvent}
        isDark={isDark}
        onLeaveMeeting={() => {
          setCurrentView('cockpit');
          setDashboardMode('google_meet');
        }}
        onNavigateCockpit={() => {
          setCurrentView('cockpit');
          setDashboardMode('nexus_ai');
        }}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#090D16] text-[#F1F5F9]' : 'bg-[#F7F7F5] text-[#111111]'
    }`}>
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateLanding={() => setCurrentView('landing')}
        activeDashboardMode={dashboardMode}
        onSelectDashboardMode={handleSelectDashboardMode}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* REDESIGNED DASHBOARD: OPTION 1 - NEXUS AI RESEARCH CHATBOT */}
      {dashboardMode === 'nexus_ai' && (
        <main className="flex-1 overflow-hidden">
          <NexusAIChatbot
            currentUser={currentUser}
            onNavigateMeetings={() => setDashboardMode('google_meet')}
            onNavigateAdmin={() => setDashboardMode('admin')}
          />
        </main>
      )}

      {/* REDESIGNED DASHBOARD: OPTION 2 - GOOGLE MEET (HOST & JOIN MEETINGS) */}
      {dashboardMode === 'google_meet' && (
        <main className="flex-1 overflow-hidden">
          <GoogleCalendarView
            currentUser={currentUser}
            isDark={isDark}
            onJoinMeetingWithNexus={(meeting) => {
              setActiveMeetEvent(meeting);
              setCurrentView('meet');
            }}
            onLaunchInstantMeet={() => {
              setActiveMeetEvent(null);
              setCurrentView('meet');
            }}
            onNavigateCockpit={() => setDashboardMode('nexus_ai')}
          />
        </main>
      )}

      {/* REDESIGNED DASHBOARD: OPTION 3 - ADMIN CONTROL PLANE */}
      {dashboardMode === 'admin' && (
        <main className="flex-1 overflow-hidden">
          <AdminDashboardView
            currentUser={currentUser}
            activeTenantId={activeTenantId}
            onSelectTenant={(tId) => setActiveTenantId(tId)}
            onDocumentIndexed={handleDocumentIndexed}
            onNavigateEmployeeCockpit={() => setDashboardMode('nexus_ai')}
          />
        </main>
      )}

      {/* REDESIGNED DASHBOARD: OPTION 4 - LIVE STUDIO (AUDIO STREAM & LIVING DELIVERABLES CANVAS) */}
      {dashboardMode === 'studio' && (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column (3.5 cols): Live Diarized Meeting Stream */}
          <section className="col-span-12 md:col-span-4 lg:col-span-3 h-full overflow-hidden">
            <TranscriptStream
            transcripts={transcripts}
            isPlaying={isPlaying}
            activeChunkIndex={activeChunkIndex}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onAddTranscript={handleAddTranscript}
          />
        </section>

        {/* Center Column (5 cols): Living Deliverables Canvas */}
        <section className="col-span-12 md:col-span-5 lg:col-span-5 h-full overflow-hidden">
          <LivingCanvas
            document={livingDoc}
            onExportDoc={() => setIsExportModalOpen(true)}
            isExporting={false}
          />
        </section>

        {/* Right Column (4 cols): Sidekick Multi-Agent Cockpit with Meeting Copilot */}
        <section className="col-span-12 md:col-span-3 lg:col-span-4 h-full flex flex-col overflow-hidden bg-slate-900 border-l border-slate-800">
          {/* Tab Navigation Bar */}
          <div className="flex items-center justify-between px-2 pt-2 bg-slate-950 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCockpitTab('copilot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium transition-all cursor-pointer ${
                  cockpitTab === 'copilot'
                    ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 border-x border-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Meeting Copilot</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              <button
                onClick={() => setCockpitTab('research')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t text-xs font-medium transition-all cursor-pointer ${
                  cockpitTab === 'research'
                    ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 border-x border-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Knowledge</span>
                {citations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                    {citations.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCockpitTab('compliance')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t text-xs font-medium transition-all cursor-pointer ${
                  cockpitTab === 'compliance'
                    ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 border-x border-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compliance</span>
                {findings.filter(f => f.status === 'PENDING').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300 font-mono">
                    {findings.filter(f => f.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setCockpitTab(cockpitTab === 'split' ? 'copilot' : 'split')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                cockpitTab === 'split'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={cockpitTab === 'split' ? 'Single tab view' : 'Split multi-agent view'}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Tab View */}
          <div className="flex-1 overflow-hidden">
            {cockpitTab === 'copilot' && (
              <MeetingCopilot
                currentUser={currentUser}
                transcripts={transcripts}
                livingDoc={livingDoc}
                onUpdateDoc={setLivingDoc}
                onTriggerSearch={handleTriggerSearch}
                citations={citations}
                findings={findings}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
              />
            )}

            {cockpitTab === 'research' && (
              <GroundedResearchFeed
                citations={citations}
                lastQuery={lastQuery}
                userRole={currentUser.role}
                isUngrounded={isUngrounded}
                scoreThreshold={0.65}
              />
            )}

            {cockpitTab === 'compliance' && (
              <ComplianceRadar
                findings={findings}
                userRole={currentUser.role}
                onApplyRemediation={handleApplyRemediation}
                onApplyOverride={handleApplyOverride}
                isExportLocked={livingDoc.export_locked}
              />
            )}

            {cockpitTab === 'split' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="h-1/2 overflow-hidden border-b border-slate-800">
                  <MeetingCopilot
                    currentUser={currentUser}
                    transcripts={transcripts}
                    livingDoc={livingDoc}
                    onUpdateDoc={setLivingDoc}
                    onTriggerSearch={handleTriggerSearch}
                    citations={citations}
                    findings={findings}
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                  />
                </div>
                <div className="h-1/2 overflow-hidden">
                  <ComplianceRadar
                    findings={findings}
                    userRole={currentUser.role}
                    onApplyRemediation={handleApplyRemediation}
                    onApplyOverride={handleApplyOverride}
                    isExportLocked={livingDoc.export_locked}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      )}

      {/* BigQuery Analytics Modal */}
      <AnalyticsDashboardModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        sessions={sessions}
        latestBenchmark={latestBenchmark}
        onRunHarness={handleRunHarness}
        isRunningHarness={isRunningHarness}
      />

      {/* Google Docs Human-in-the-Loop Export Approval Modal */}
      <ExportApprovalModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        document={livingDoc}
        onExportSuccess={handleExportSuccess}
      />

      {/* Real GCP Services Health & Audit Panel */}
      <ServiceHealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
      />

      {/* Employee Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.orgId) setActiveTenantId(user.orgId);
        }}
        initialMode={authModalMode}
      />
    </div>
  );
}
