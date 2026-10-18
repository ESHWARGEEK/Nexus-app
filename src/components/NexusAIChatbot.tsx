import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Search, 
  ShieldCheck, 
  FileCode2, 
  GitBranch, 
  Lock, 
  Users, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Terminal, 
  FileText, 
  ShieldAlert,
  Calendar,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  FolderGit2,
  Link2,
  Key
} from 'lucide-react';
import { UserAccount, CitationResult, isUserAdmin } from '../types';
import { 
  queryVertexAISearch, 
  getStoredMeetings, 
  queryMeetingTranscriptACL 
} from '../services/searchService';
import { callGeminiAgent } from '../services/geminiService';
import { runNexusResearchAgent, AgentToolInvocation } from '../services/nexusAgentService';
import { getConnectedGitHubRepo, GitHubRepoConfig, maskGitHubToken } from '../services/mcpService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string;
  content: string;
  sourceType?: 'all' | 'documents' | 'mcp_github' | 'meeting_transcript';
  toolInvocations?: AgentToolInvocation[];
  modelUsed?: string;
  mcpCall?: {
    tool: string;
    params: Record<string, any>;
    status: 'success' | 'refused';
  };
  meetingAclResult?: {
    meetingTitle: string;
    allowed: boolean;
    reason?: string;
    allowedJoinees?: string[];
  };
  citations?: CitationResult[];
  githubCodeSnippets?: {
    repo: string;
    path: string;
    branch: string;
    language: string;
    code: string;
  }[];
}

interface NexusAIChatbotProps {
  currentUser: UserAccount;
  onNavigateMeetings?: () => void;
  onNavigateAdmin?: () => void;
  isDark?: boolean;
}

export const NexusAIChatbot: React.FC<NexusAIChatbotProps> = ({
  currentUser,
  onNavigateMeetings,
  onNavigateAdmin,
  isDark = false,
}) => {
  const [activeSourceFilter, setActiveSourceFilter] = useState<'all' | 'documents' | 'mcp_github' | 'meetings'>('all');
  const [repoConfig, setRepoConfig] = useState<GitHubRepoConfig>(() => getConnectedGitHubRepo());
  const isAdmin = isUserAdmin(currentUser);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      timestamp: 'Just now',
      content: `Hello **${currentUser.name}**! I am **Nexus AI**, your enterprise research agent.

I am connected to three authoritative enterprise data layers:
1. 📄 **Internal Documents & Policies**: RFC specifications (RFC-104, RFC-118), POL-SEC standards, Cloud DLP, and GDPR compliance docs.
2. 🐙 **GitHub Codebase via MCP**: Model Context Protocol integration connected to \`${getConnectedGitHubRepo().repoName}\` (branch: \`${getConnectedGitHubRepo().defaultBranch}\`) for inspecting microservices, KMS HSM signatures, and implementation code.
3. 🎙️ **Meeting Transcripts (Strict Participant ACL)**: Research dialogue, architectural decisions, and action items from recorded Google Meets stored on the data store in the folder named \`meeting transcript\`. **Note: You can strictly research meetings where you were an authorized joinee/participant.**

How can I assist your technical research today?`,
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [meetingNotification, setMeetingNotification] = useState<{ title: string; folder: string; meetingId?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Listen for real-time meeting conclusion events to announce DataStore indexing
  useEffect(() => {
    const handleMeetingSaved = (e: any) => {
      if (e.detail) {
        setMeetingNotification({
          title: e.detail.title || 'Live Meeting Session',
          folder: e.detail.folder || 'meeting transcript',
          meetingId: e.detail.meetingId,
        });
      }
    };
    window.addEventListener('nexus_meeting_transcript_saved', handleMeetingSaved);
    return () => window.removeEventListener('nexus_meeting_transcript_saved', handleMeetingSaved);
  }, []);

  // Listen for real-time MCP GitHub repo link updates from Admin Console
  useEffect(() => {
    const handleRepoUpdated = (e: any) => {
      if (e.detail) {
        setRepoConfig(e.detail);
      }
    };
    window.addEventListener('nexus_mcp_repo_updated', handleRepoUpdated);
    return () => window.removeEventListener('nexus_mcp_repo_updated', handleRepoUpdated);
  }, []);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt.trim();
    if (!textToSend || isProcessing) return;

    setInputPrompt('');
    const userMsgId = `usr_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: textToSend,
        sourceType: activeSourceFilter === 'all' ? undefined : (activeSourceFilter as any),
      },
    ];

    setMessages(newMessages);
    setIsProcessing(true);

    try {
      // Execute the Nexus Enterprise Agent with DataStore tools for internal documents & meeting transcripts
      const agentResult = await runNexusResearchAgent(
        textToSend,
        currentUser,
        activeSourceFilter
      );

      // Attempt background backend logging to /api/agent/research
      try {
        fetch('/api/agent/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            sourceFilter: activeSourceFilter,
            userOverride: currentUser
          })
        }).catch(() => {});
      } catch {}

      const primaryTool = agentResult.toolInvocations?.[0]?.toolName;
      const detectedSourceType = primaryTool === 'query_meeting_transcripts'
        ? 'meeting_transcript'
        : primaryTool === 'query_codebase_mcp'
        ? 'mcp_github'
        : 'documents';

      const agentResponse: ChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: agentResult.answer,
        sourceType: detectedSourceType,
        toolInvocations: agentResult.toolInvocations,
        modelUsed: agentResult.modelUsed,
        meetingAclResult: agentResult.meetingAclResult,
        citations: agentResult.citations,
        githubCodeSnippets: agentResult.mcpSnippets,
      };

      setMessages(prev => [...prev, agentResponse]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: `An error occurred while researching: ${err?.message || 'Service temporarily unavailable'}.`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const QUICK_RESEARCH_PROMPTS = [
    {
      title: 'Internal Specs & POL-SEC-12',
      prompt: 'What are the HSM key custody and encryption requirements in POL-SEC-12?',
      badge: 'Document AI',
      color: 'blue',
    },
    {
      title: 'GitHub MCP (Admin Codebase)',
      prompt: 'Query GitHub MCP for the autonomous agent architecture in backend/agents/eka_agents.py',
      badge: 'Admin Codebase',
      color: 'purple',
    },
    {
      title: 'Meeting Research (Authorized Joinee)',
      prompt: 'What architectural decisions were agreed in the Sovereign Enclave meeting?',
      badge: 'Joinee Allowed',
      color: 'emerald',
    },
    {
      title: 'Meeting Research (ACL Refusal Test)',
      prompt: 'What was discussed in the Executive M&A & Cap Table Restructuring meeting?',
      badge: 'ACL 403 Test',
      color: 'rose',
    },
  ];

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#090D16] text-[#F1F5F9]' : 'bg-[#F7F7F5] text-[#111111]'
    }`}>
      
      {/* Top Banner / Integration Context matching Landing Page */}
      <div className={`px-6 py-4 border-b backdrop-blur-md flex flex-wrap items-center justify-between gap-4 transition-colors ${
        isDark ? 'border-slate-800 bg-[#090D16]/90' : 'border-[#E7E7E4] bg-[#F7F7F5]/85'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${
            isDark ? 'bg-indigo-600' : 'bg-black'
          }`}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#111111]'}`}>
                Nexus AI Research Agent
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 ${
                isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-zinc-500'}`}>
              Internal Docs • GitHub Codebase (MCP) • Joinee-Restricted Meeting Transcripts
            </p>
          </div>
        </div>

        {/* Source Filter Tabs matching Landing Page Segmented Controls */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 p-1 rounded-full border text-xs shadow-inner ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#ECEBE8] border-[#E7E7E4]'
          }`}>
            <button
              onClick={() => setActiveSourceFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeSourceFilter === 'all'
                  ? isDark ? 'bg-indigo-600 text-white shadow-xs' : 'bg-[#111111] text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-zinc-600 hover:text-[#111111]'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setActiveSourceFilter('documents')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                activeSourceFilter === 'documents'
                  ? isDark ? 'bg-indigo-600 text-white shadow-xs' : 'bg-[#111111] text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>
            <button
              onClick={() => setActiveSourceFilter('mcp_github')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                activeSourceFilter === 'mcp_github'
                  ? isDark ? 'bg-purple-600 text-white shadow-xs' : 'bg-[#111111] text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
              <span>GitHub (MCP)</span>
            </button>
            <button
              onClick={() => setActiveSourceFilter('meetings')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                activeSourceFilter === 'meetings'
                  ? isDark ? 'bg-emerald-600 text-white shadow-xs' : 'bg-[#111111] text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Meetings</span>
            </button>
          </div>

          <div className={`hidden lg:flex items-center gap-2 pl-3 border-l text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-[#E7E7E4] text-zinc-500'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-[11px] truncate max-w-[160px]">{currentUser.email}</span>
          </div>
        </div>
      </div>

      {/* AGENT EQUIPPED TOOLS STRIP */}
      <div className={`px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs transition-colors shrink-0 ${
        isDark ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-[#F2F1ED] border-[#E7E7E4] text-[#111111]'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-500 dark:text-slate-400">
            Agent DataStore Tools:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-mono flex items-center gap-1.5 shadow-2xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-blue-300' : 'bg-white border-[#E7E7E4] text-blue-800'
            }`} title="Queries internal specs & standards in enterprise-knowledge">
              <FileText className="w-3 h-3 text-blue-500" />
              <span>query_internal_documents</span>
            </span>

            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-mono flex items-center gap-1.5 shadow-2xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-emerald-300' : 'bg-white border-[#E7E7E4] text-emerald-800'
            }`} title="Queries meeting transcripts in folder 'meeting transcript' with attendee ACL gating">
              <Calendar className="w-3 h-3 text-emerald-500" />
              <span>query_meeting_transcripts</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Joinee ACL</span>
            </span>

            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-mono flex items-center gap-1.5 shadow-2xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-purple-300' : 'bg-white border-[#E7E7E4] text-purple-800'
            }`} title={`Queries GitHub repository ${repoConfig.repoName} via Model Context Protocol (Authenticated via permanent GitHub PAT)`}>
              <FolderGit2 className="w-3 h-3 text-purple-500" />
              <span>query_codebase_mcp</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/20 truncate max-w-[140px]">
                {repoConfig.repoName}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 flex items-center gap-1" title="Authenticated via permanent GitHub PAT">
                <Key className="w-2.5 h-2.5 text-emerald-500" />
                <span>PAT</span>
              </span>
            </span>

            {isAdmin && onNavigateAdmin && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                  isDark 
                    ? 'bg-purple-950/60 border-purple-800 text-purple-300 hover:bg-purple-900/60' 
                    : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                }`}
                title="Admin: Give link to GitHub repo in Admin Console"
              >
                <Link2 className="w-3 h-3 text-purple-500" />
                <span>Link Repo</span>
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Model: gemini-3.8-flash</span>
        </div>
      </div>

      {/* REAL-TIME MEETING TRANSCRIPT INDEXED NOTIFICATION */}
      {meetingNotification && (
        <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 text-xs transition-colors shrink-0 animate-in slide-in-from-top duration-200 ${
          isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Meeting transcript stored in DataStore folder <strong className="font-mono underline">"{meetingNotification.folder}"</strong> ({meetingNotification.title})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleSendMessage(`What decisions and architectural items were discussed in "${meetingNotification.title}"?`);
                setMeetingNotification(null);
              }}
              className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer shadow-xs transition-all"
            >
              Ask Agent About This Meeting
            </button>
            <button
              onClick={() => setMeetingNotification(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Feed */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full"
      >
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3.5 ${isAgent ? 'items-start' : 'items-start justify-end'}`}
            >
              {isAgent && (
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                  isDark 
                    ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                    : 'bg-[#ECEBE8] border-[#E7E7E4] text-[#111111]'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Selector 1: Message bubble */}
              <div className={`max-w-[85%] rounded-2xl p-4.5 border transition-all ${
                isAgent 
                  ? isDark 
                    ? 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-sm' 
                    : 'bg-white border-[#E7E7E4] text-[#111111] shadow-xs'
                  : isDark 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' 
                    : 'bg-[#111111] text-white border-[#111111] shadow-xs'
              }`}>
                {/* Header info */}
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold tracking-tight ${
                      isAgent 
                        ? isDark ? 'text-white' : 'text-[#111111]' 
                        : 'text-white'
                    }`}>
                      {isAgent ? 'Nexus AI Agent' : currentUser.name}
                    </span>
                    {msg.sourceType && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        msg.sourceType === 'mcp_github' 
                          ? isDark 
                            ? 'bg-purple-950/60 text-purple-300 border-purple-800' 
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                          : msg.sourceType === 'meeting_transcript'
                          ? isDark 
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isDark 
                            ? 'bg-blue-950/60 text-blue-300 border-blue-800' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {msg.sourceType === 'mcp_github' ? 'GitHub MCP' : msg.sourceType === 'meeting_transcript' ? 'Meeting DataStore' : 'Internal Docs'}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${
                    isAgent 
                      ? isDark ? 'text-slate-500' : 'text-zinc-400' 
                      : isDark ? 'text-indigo-200 font-mono' : 'text-zinc-400 font-mono'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Agent DataStore Tool Invocations */}
                {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {msg.toolInvocations.map((inv, iIdx) => (
                      <div 
                        key={iIdx} 
                        className={`p-3 rounded-xl border font-mono text-xs transition-all ${
                          isDark 
                            ? 'bg-slate-950/80 border-slate-700/80' 
                            : 'bg-[#F2F1ED] border-[#E7E7E4]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className={`font-bold text-[11px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-[#111111]'}`}>
                              Agent Tool Executed: <code className="text-indigo-600 dark:text-indigo-400 font-semibold">{inv.toolName}</code>
                            </span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-zinc-200 text-zinc-700'
                          }`}>
                            ⚡ {inv.latencyMs}ms • {inv.matchedCount} record{inv.matchedCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className={`text-[11px] space-y-1 ${isDark ? 'text-slate-300' : 'text-zinc-600'}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-zinc-500 dark:text-slate-400">📁 Target DataStore:</span>
                            <span className="font-bold underline text-zinc-900 dark:text-zinc-100">{inv.datastoreTarget}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-zinc-500 dark:text-slate-400">🔒 Boundary Check:</span>
                            <span className={
                              inv.aclStatus === 'VERIFIED_ALLOWED' 
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                                : inv.aclStatus === 'ACL_REFUSED_NON_PARTICIPANT'
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-indigo-600 dark:text-indigo-400 font-semibold'
                            }>
                              {inv.resultSummary}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content body */}
                <div className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                  isAgent 
                    ? isDark ? 'text-slate-200' : 'text-zinc-800' 
                    : 'text-white'
                }`}>
                  {msg.content}
                </div>

                {/* MCP Tool Call Details */}
                {msg.mcpCall && (
                  <div className={`mt-3.5 p-3 rounded-xl border font-mono text-xs ${
                    isDark 
                      ? 'bg-slate-950/80 border-purple-900/40' 
                      : 'bg-[#FAF9F6] border-purple-200/80'
                  }`}>
                    <div className={`flex items-center justify-between mb-1.5 ${
                      isDark ? 'text-purple-300' : 'text-purple-800'
                    }`}>
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Terminal className="w-3.5 h-3.5" />
                        MCP Protocol Tool: {msg.mcpCall.tool}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        isDark ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-100 text-purple-800'
                      }`}>
                        Connected: acme-corp/payment-vault
                      </span>
                    </div>
                    <div className={`text-[11px] ${
                      isDark ? 'text-slate-400' : 'text-zinc-600'
                    }`}>
                      Params: {JSON.stringify(msg.mcpCall.params)}
                    </div>
                  </div>
                )}

                {/* GitHub Code Snippets */}
                {msg.githubCodeSnippets && msg.githubCodeSnippets.map((snip, sIdx) => (
                  <div key={sIdx} className={`mt-3 rounded-xl overflow-hidden border ${
                    isDark ? 'border-slate-800 bg-slate-950' : 'border-[#E7E7E4] bg-[#F7F7F5]'
                  }`}>
                    <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-mono ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-[#ECEBE8] border-[#E7E7E4] text-[#111111]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-purple-500" />
                        <span className={`font-semibold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{snip.repo}</span>
                        <span className="opacity-50">/</span>
                        <span>{snip.path}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`snip_${sIdx}`, snip.code)}
                        className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white' : 'text-zinc-600 hover:text-black'
                        }`}
                      >
                        {copiedId === `snip_${sIdx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === `snip_${sIdx}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className={`p-3 text-[11px] font-mono overflow-x-auto leading-relaxed ${
                      isDark ? 'bg-[#0c1017] text-slate-300' : 'bg-white text-zinc-900'
                    }`}>
                      <code>{snip.code}</code>
                    </pre>
                  </div>
                ))}

                {/* Citations from internal documents or meetings */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className={`mt-3.5 pt-3 border-t space-y-2 ${
                    isDark ? 'border-slate-800/80' : 'border-[#E7E7E4]'
                  }`}>
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider font-mono ${
                      isDark ? 'text-slate-400' : 'text-zinc-500'
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Authoritative Citations ({msg.citations.length})</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.citations.map((cite, cIdx) => (
                        <div 
                          key={cIdx} 
                          className={`p-2.5 rounded-lg border text-xs font-mono transition-colors ${
                            isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-[#F7F7F5] border-[#E7E7E4]'
                          }`}
                        >
                          <div className={`flex items-center justify-between mb-1 ${
                            isDark ? 'text-blue-300' : 'text-blue-700'
                          }`}>
                            <span className="font-semibold">{cite.doc_title}</span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-zinc-500'}`}>{cite.section}</span>
                          </div>
                          <p className={`text-[11px] font-sans leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-zinc-700'
                          }`}>
                            "{cite.snippet}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isAgent && (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className={`w-8 h-8 rounded-lg object-cover border shrink-0 mt-0.5 ${
                    isDark ? 'border-indigo-400/40' : 'border-[#E7E7E4]'
                  }`} 
                />
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className={`flex items-center gap-3 text-xs font-mono animate-pulse ${
            isDark ? 'text-slate-400' : 'text-zinc-600'
          }`}>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              isDark 
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                : 'bg-[#ECEBE8] border-[#E7E7E4] text-[#111111]'
            }`}>
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span>Nexus AI searching across internal documents, GitHub MCP codebase, and checking meeting joinee ACLs...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selector 4: Quick Prompts Strip */}
      <div className={`px-6 py-2.5 border-t transition-colors ${
        isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-[#F2F1ED] border-[#E7E7E4]'
      }`}>
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className={`text-[11px] font-mono shrink-0 flex items-center gap-1 ${
            isDark ? 'text-slate-400' : 'text-zinc-600 font-medium'
          }`}>
            <Zap className="w-3 h-3 text-amber-500" />
            Quick Research:
          </span>
          {QUICK_RESEARCH_PROMPTS.map((qp, qIdx) => (
            <button
              key={qIdx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isProcessing}
              className={`shrink-0 px-2.5 py-1 rounded-full border text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ${
                isDark 
                  ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600' 
                  : 'bg-white hover:bg-[#FBFBFA] border-[#E7E7E4] text-[#111111] hover:border-zinc-300 shadow-2xs'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                qp.color === 'emerald' ? 'bg-emerald-500' : qp.color === 'rose' ? 'bg-rose-500' : qp.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
              }`} />
              <span>{qp.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selector 2: Input Composer Box Outer Container */}
      <div className={`p-4 sm:p-6 border-t transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-[#F7F7F5] border-[#E7E7E4]'
      }`}>
        {/* Selector 3: Form */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className={`max-w-5xl mx-auto flex items-center gap-2 border rounded-2xl p-2 transition-all ${
            isDark 
              ? 'bg-slate-900/90 border-slate-800 focus-within:border-indigo-500/80 shadow-lg' 
              : 'bg-white border-[#E7E7E4] focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400/10 shadow-xs'
          }`}
        >
          <div className="pl-3">
            <Search className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-zinc-400'}`} />
          </div>

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={`Ask Nexus AI (e.g. "What is the token custody policy in POL-SEC-12?", "Query GitHub MCP for vault.go", or "Research Sovereign Enclave meeting")`}
            disabled={isProcessing}
            className={`flex-1 bg-transparent border-none text-xs sm:text-sm px-2 focus:outline-none ${
              isDark 
                ? 'text-slate-100 placeholder:text-slate-500' 
                : 'text-[#111111] placeholder:text-zinc-400'
            }`}
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            className={`px-4 py-2 rounded-xl text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${
              isDark 
                ? 'bg-indigo-600 hover:bg-indigo-500' 
                : 'bg-[#111111] hover:bg-zinc-800'
            }`}
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className={`max-w-5xl mx-auto text-[11px] mt-2 flex items-center justify-between ${
          isDark ? 'text-slate-500' : 'text-zinc-500'
        }`}>
          <span>Enterprise Guardrail: Meeting transcripts can only be queried by participants on the joinee ACL.</span>
          {onNavigateMeetings && (
            <button 
              onClick={onNavigateMeetings}
              className={`underline underline-offset-2 cursor-pointer font-medium ${
                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-zinc-900 hover:text-black'
              }`}
            >
              Host or join a Google Meet →
            </button>
          )}
        </p>
      </div>

    </div>
  );
};
