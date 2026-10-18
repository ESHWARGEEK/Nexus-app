import React, { useState, useEffect, useRef } from 'react';
import { 
  UserAccount, 
  TranscriptChunk, 
  CitationResult, 
  ComplianceFinding, 
  LivingDocument 
} from '../types';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Search, 
  ShieldCheck, 
  FileEdit, 
  CornerDownLeft, 
  Check, 
  Copy, 
  AlertCircle,
  ExternalLink,
  Zap,
  RefreshCw
} from 'lucide-react';
import { callGeminiAgent } from '../services/geminiService';
import { queryVertexAISearch } from '../services/searchService';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot' | 'system';
  speakerName?: string;
  timestamp: string;
  content: string;
  citations?: CitationResult[];
  complianceWarning?: string;
  suggestedPatch?: {
    targetSection: string;
    newContent: string;
  };
  isLoading?: boolean;
}

interface MeetingCopilotProps {
  currentUser: UserAccount;
  transcripts: TranscriptChunk[];
  livingDoc: LivingDocument;
  onUpdateDoc: (updatedDoc: LivingDocument) => void;
  onTriggerSearch: (query: string) => void;
  citations: CitationResult[];
  findings: ComplianceFinding[];
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const QUICK_PROMPTS = [
  { label: 'Payment Gateway Spec', query: 'What is the tokenization and key custody strategy in RFC-104?' },
  { label: 'Summarize Decisions', query: 'Summarize the architectural decisions made in this meeting so far.' },
  { label: 'Audit Compliance', query: 'Does our current architecture comply with EU GDPR and PCI-DSS requirements?' },
  { label: 'Draft EU Ingress Fix', query: 'Draft a compliant Section 4 for RFC-118 that resolves EU data residency violations.' },
];

export const MeetingCopilot: React.FC<MeetingCopilotProps> = ({
  currentUser,
  transcripts,
  livingDoc,
  onUpdateDoc,
  onTriggerSearch,
  citations,
  findings,
  isPlaying,
  onTogglePlay,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome_1',
      sender: 'copilot',
      timestamp: 'Just now',
      content: `Hello ${currentUser.name.split(' ')[0]}! I am your real-time **Nexus Meeting Copilot**.
I am actively listening to the meeting stream, indexing dialogue with Cloud STT, checking against Vertex AI Search knowledge datastores, and monitoring compliance guardrails.

You can ask me technical questions, prompt me to search internal RFCs, or ask me to draft/patch sections in the living RFC-118 canvas.`,
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedPatchId, setAppliedPatchId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Sync latest transcript questions into copilot proactively
  useEffect(() => {
    if (transcripts.length === 0) return;
    const latest = transcripts[transcripts.length - 1];
    
    // If the transcript chunk was a detected question or decision, give a quick proactive copilot insight
    if (latest.detected_intent === 'QUESTION' && latest.speaker !== currentUser.name) {
      const alreadyHas = messages.some(m => m.content.includes(latest.text));
      if (!alreadyHas) {
        // Find matching citations
        const relevant = citations.length > 0 ? citations.slice(0, 2) : undefined;
        const autoMsg: CopilotMessage = {
          id: `auto_${Date.now()}`,
          sender: 'copilot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: `**Proactive Grounding:** ${latest.speaker} asked: *"${latest.text}"*
${relevant ? `Retrieved ${relevant.length} relevant internal specification(s) from Vertex AI Search:` : 'Searching knowledge datastores for authoritative clauses...'}`,
          citations: relevant,
        };
        setMessages(prev => [...prev, autoMsg]);
      }
    }
  }, [transcripts.length]);

  // Speech Recognition Handling
  const toggleMicrophone = () => {
    if (isListeningMic) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListeningMic(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setInputValue(transcript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListeningMic(false);
        };

        recognition.onend = () => {
          setIsListeningMic(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
        simulateVoiceInput();
      }
    } else {
      simulateVoiceInput();
    }
  };

  const simulateVoiceInput = () => {
    setIsListeningMic(true);
    const sampleQueries = [
      'What does RFC-104 require for tokenization key custody?',
      'Summarize the compliance findings on raw cardholder logs.',
      'Suggest an updated Section 4 for EU data residency.',
    ];
    const picked = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    let i = 0;
    setInputValue('');
    const timer = setInterval(() => {
      i += 3;
      setInputValue(picked.slice(0, i));
      if (i >= picked.length) {
        clearInterval(timer);
        setIsListeningMic(false);
      }
    }, 40);
  };

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery || inputValue).trim();
    if (!query || isSubmitting) return;

    setInputValue('');
    const userMsgId = `user_${Date.now()}`;
    const userMsg: CopilotMessage = {
      id: userMsgId,
      sender: 'user',
      speakerName: currentUser.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: query,
    };

    const copilotMsgId = `copilot_${Date.now()}`;
    const placeholderMsg: CopilotMessage = {
      id: copilotMsgId,
      sender: 'copilot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: 'Synthesizing response grounded in enterprise knowledge...',
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setIsSubmitting(true);

    // Step 1: Trigger Search in Vertex AI Search
    onTriggerSearch(query);

    try {
      // Step 2: Try real backend /api/search or fallback to searchService
      let searchResults: CitationResult[] = [];
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser.idToken) {
        authHeaders['Authorization'] = `Bearer ${currentUser.idToken}`;
      }

      try {
        const searchRes = await fetch('/api/search', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ query }),
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          searchResults = searchData.results || [];
        }
      } catch {
        const localSearch = queryVertexAISearch(query, currentUser.role, currentUser.orgId || 'acme', currentUser.email);
        searchResults = localSearch.results || [];
      }

      // Step 3: Call Gemini Copilot Agent
      const meetingContext = `
Meeting Title: Core Payments Live Architecture Review
Current RFC Draft (RFC-118):
${livingDoc.markdown_content}

Recent Meeting Transcripts:
${transcripts.slice(-6).map(t => `${t.speaker} (${t.timestamp_offset_ms}ms): ${t.text}`).join('\n')}

Active Compliance Risks:
${findings.filter(f => f.status === 'PENDING').map(f => `[${f.severity}] ${f.policy_id}: ${f.violation_summary}`).join('\n')}

Vertex AI Search Grounded Documents:
${searchResults.map(c => `[${c.doc_title}] ${c.section}: ${c.snippet} (Score: ${c.relevance_score})`).join('\n')}
      `.trim();

      let answer = '';
      let suggestedPatch: { targetSection: string; newContent: string } | undefined = undefined;

      try {
        const agentRes = await fetch('/api/copilot/agent', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            prompt: query,
            context: meetingContext,
          }),
        });
        if (agentRes.ok) {
          const agentData = await agentRes.json();
          answer = agentData.content || '';
        }
      } catch (err) {
        console.warn('Direct /api/copilot/agent failed, trying client SDK:', err);
      }

      if (!answer) {
        const fallbackRes = await callGeminiAgent({
          prompt: query,
          context: meetingContext,
          role: currentUser.role,
        });
        answer = fallbackRes.content;
      }

      // Check if user asked to draft or patch
      if (query.toLowerCase().includes('draft') || query.toLowerCase().includes('section 4') || query.toLowerCase().includes('patch')) {
        suggestedPatch = {
          targetSection: 'Section 4: Telemetry & Ingress Architecture',
          newContent: `## 4. Telemetry & Ingress Architecture (Compliant Pattern)
Stream aggregated, pseudonymized transaction metrics to regional EU telemetry cluster (europe-west3). Raw cardholder PANs and customer PII are strictly dropped at ingress via Cloud DLP and Regional HSM Tokenization.`,
        };
      }

      setMessages(prev => 
        prev.map(m => {
          if (m.id === copilotMsgId) {
            return {
              ...m,
              content: answer || 'I have analyzed the specifications and current dialogue.',
              citations: searchResults.length > 0 ? searchResults : undefined,
              suggestedPatch,
              isLoading: false,
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      setMessages(prev => 
        prev.map(m => {
          if (m.id === copilotMsgId) {
            return {
              ...m,
              content: `Copilot processed your request using cached policies. Query: "${query}".`,
              isLoading: false,
            };
          }
          return m;
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPatch = (patch: { targetSection: string; newContent: string }, msgId: string) => {
    let updatedContent = livingDoc.markdown_content;
    if (updatedContent.includes('## 4. Telemetry & Ingress Architecture')) {
      updatedContent = updatedContent.replace(
        /## 4\. Telemetry & Ingress Architecture[\s\S]*$/,
        patch.newContent
      );
    } else {
      updatedContent += `\n\n${patch.newContent}`;
    }

    onUpdateDoc({
      ...livingDoc,
      markdown_content: updatedContent,
      last_saved_at: new Date().toISOString(),
      version: livingDoc.version + 1,
    });

    setAppliedPatchId(msgId);
    setTimeout(() => setAppliedPatchId(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wide font-display">
                Meeting Copilot
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Live Teammate
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Role: <span className="text-blue-400 font-semibold">{currentUser.role}</span> &bull; Grounded in Vertex AI Search
            </p>
          </div>
        </div>

        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
            isPlaying
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
          }`}
          title="Toggle live meeting audio streaming"
        >
          <Zap className="w-3 h-3" />
          <span>{isPlaying ? 'Meeting Active' : 'Start Stream'}</span>
        </button>
      </div>

      {/* Quick Action Suggestion Chips */}
      <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" /> Prompts:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmit(undefined, qp.query)}
            disabled={isSubmitting}
            className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-blue-600/20 hover:border-blue-500/40 border border-slate-700 text-[11px] text-slate-300 whitespace-nowrap transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                {!isUser && <Bot className="w-3 h-3 text-blue-400" />}
                <span className="font-medium text-slate-300">
                  {isUser ? msg.speakerName || 'You' : 'Nexus Sidekick'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">&bull; {msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] rounded-xl p-3 text-xs leading-relaxed space-y-2.5 ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-xs shadow-md'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-bl-xs shadow-sm'
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span className="italic">{msg.content}</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>
                )}

                {/* Grounding Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        Grounded in Vertex AI Search ({msg.citations.length} docs)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-300 truncate max-w-[200px]">
                              {c.doc_title}
                            </span>
                            <span className="font-mono text-[10px] text-emerald-400">
                              {(c.relevance_score * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] line-clamp-2 italic">
                            &ldquo;{c.snippet}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Living Canvas Patch */}
                {msg.suggestedPatch && (
                  <div className="mt-2 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-700/40 text-[11px] space-y-2">
                    <div className="flex items-center justify-between text-indigo-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
                        Live RFC Draft Patch Available
                      </span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {msg.suggestedPatch.targetSection}
                      </span>
                    </div>

                    <pre className="p-2 rounded bg-slate-950/80 text-slate-300 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-24">
                      {msg.suggestedPatch.newContent}
                    </pre>

                    <button
                      onClick={() => handleApplyPatch(msg.suggestedPatch!, msg.id)}
                      className={`w-full py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        appliedPatchId === msg.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      }`}
                    >
                      {appliedPatchId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied to Living Canvas!</span>
                        </>
                      ) : (
                        <>
                          <CornerDownLeft className="w-3.5 h-3.5" />
                          <span>Apply Patch to RFC-118 Canvas</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Message footer buttons */}
                {!isUser && !msg.isLoading && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Copilot Input Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
        <form onSubmit={e => handleSubmit(e)} className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMicrophone}
            className={`p-2 rounded-lg border transition-colors ${
              isListeningMic
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isListeningMic ? 'Listening (Click to stop)' : 'Speak to Copilot (Voice STT)'}
          >
            {isListeningMic ? <Mic className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask Meeting Copilot (e.g., 'What is RFC-104 tokenization policy?')..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-sans"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isSubmitting}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-colors shadow-sm shrink-0"
            title="Send query to Copilot"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Protected with Cloud DLP & RBAC Gate</span>
          <span>Shift+Enter or click Send</span>
        </div>
      </div>
    </div>
  );
};
