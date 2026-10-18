import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Video, 
  Clock, 
  Users, 
  Trash2, 
  ExternalLink, 
  Check, 
  RefreshCw, 
  CalendarCheck, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  Mail,
  UserCheck,
  FileText,
  Bot
} from 'lucide-react';
import { UserAccount, StoredMeetingTranscript } from '../types';
import { 
  CalendarMeetingEvent, 
  listCalendarEvents, 
  createCalendarMeeting, 
  deleteCalendarMeeting,
  googleSignInWithWorkspace,
  isWorkspaceTokenActive,
  getWorkspaceAccessToken
} from '../services/googleWorkspaceService';
import { getStoredMeetings, queryMeetingTranscriptACL } from '../services/searchService';

interface GoogleCalendarViewProps {
  currentUser: UserAccount;
  onJoinMeetingWithNexus: (meeting: CalendarMeetingEvent) => void;
  onNavigateCockpit: () => void;
  onLaunchInstantMeet?: () => void;
  isDark?: boolean;
}

export const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({
  currentUser,
  onJoinMeetingWithNexus,
  onNavigateCockpit,
  onLaunchInstantMeet,
  isDark: isDarkProp,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof isDarkProp === 'boolean') return isDarkProp;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const handleStorage = () => {
      if (typeof isDarkProp !== 'boolean') {
        setIsDark(localStorage.getItem('nexus_theme') === 'dark');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isDarkProp]);

  const [events, setEvents] = useState<CalendarMeetingEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // New Meeting Form State
  const [summary, setSummary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [attendeesInput, setAttendeesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Stored Meetings from DataStore & Joinee ACL Testing
  const [storedMeetings, setStoredMeetings] = useState<StoredMeetingTranscript[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('meet-nex-arch-sovr-01');
  const [testUserEmail, setTestUserEmail] = useState<string>(currentUser.email);
  const [testQueryPrompt, setTestQueryPrompt] = useState<string>('What was agreed regarding Frankfurt HSM key custody?');
  const [testResult, setTestResult] = useState<any>(null);

  // Load calendar events & stored meetings on mount
  useEffect(() => {
    loadEvents();
    loadStoredMeetings();
  }, []);

  const loadStoredMeetings = () => {
    try {
      const stored = getStoredMeetings();
      setStoredMeetings(stored);
      if (stored.length > 0 && !selectedMeetingId) {
        setSelectedMeetingId(stored[0].id);
      }
    } catch {}
  };

  const handleRunJoineeQueryTest = () => {
    const res = queryMeetingTranscriptACL(selectedMeetingId, testQueryPrompt, testUserEmail);
    setTestResult(res);
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await listCalendarEvents();
      setEvents(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await googleSignInWithWorkspace();
      showToast(`Connected as ${res.user.email} with Google Calendar and Meet scopes!`, 'success');
      await loadEvents();
    } catch (err: any) {
      showToast(err.message || 'Google Workspace sign-in cancelled or failed.', 'error');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      showToast('Please enter a meeting title.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();
      
      const attendeesList = attendeesInput
        .split(',')
        .map(email => email.trim())
        .filter(email => email.includes('@'));

      // Always include host email
      if (!attendeesList.includes(currentUser.email)) {
        attendeesList.unshift(currentUser.email);
      }

      const token = getWorkspaceAccessToken();
      const newEvent = await createCalendarMeeting(token, {
        summary: summary.trim(),
        description: description.trim() || 'Nexus Sidekick AI Meeting with autonomous Meeting Buddy sidebar.',
        startTime: startDateTime,
        endTime: endDateTime,
        attendees: attendeesList,
        hostEmail: currentUser.email,
        hostName: currentUser.name,
      });

      showToast(`Created Google Calendar meeting "${newEvent.summary}" with Google Meet link!`, 'success');
      setIsCreateModalOpen(false);
      setSummary('');
      setDescription('');
      await loadEvents();
    } catch (err: any) {
      showToast(`Meeting creation error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (eventId: string, title: string) => {
    // Mandatory user confirmation per workspace skill guidelines
    if (!confirm(`Are you sure you want to remove "${title}" from Google Calendar? This action will cancel the meeting.`)) {
      return;
    }

    setIsDeletingId(eventId);
    try {
      const token = getWorkspaceAccessToken();
      await deleteCalendarMeeting(token, eventId);
      showToast(`Meeting "${title}" cancelled and removed from Google Calendar.`, 'info');
      await loadEvents();
    } catch {
      showToast('Failed to delete meeting.', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const isConnected = isWorkspaceTokenActive();

  return (
    <div className={`flex flex-col h-full font-sans overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#090D16] text-[#F1F5F9]' : 'bg-[#F7F7F5] text-[#111111]'
    }`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2.5 shadow-xl border animate-in slide-in-from-top duration-200 ${
          toastMessage.type === 'success' 
            ? isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-[#111111] border-[#E7E7E4]' 
            : toastMessage.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-800'
            : isDark ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-white text-[#111111] border-[#E7E7E4]'
        }`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className={`px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 transition-colors ${
        isDark ? 'border-slate-800 bg-[#090D16]' : 'border-[#E7E7E4] bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#F3F2EF] border-[#E7E7E4] text-[#111111]'
          }`}>
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-bold tracking-tight font-display flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-[#111111]'
            }`}>
              <span>Google Calendar & Scheduled Meetings</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold uppercase ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#F3F2EF] text-[#111111] border-[#E7E7E4]'
              }`}>
                Google Workspace
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
              Host meetings, invite colleagues, and launch personalized Google Meet spaces with Nexus Meeting Buddy
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Google Workspace Connection Pill */}
          <button
            type="button"
            onClick={handleGoogleConnect}
            disabled={isConnectingGoogle}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
              isConnected
                ? isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-[#F3F2EF] text-[#111111] border-[#E7E7E4]'
                : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800' : 'bg-white text-zinc-600 border-[#E7E7E4] hover:bg-[#F3F2EF]'
            }`}
          >
            {isConnectingGoogle ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
            )}
            <span>{isConnected ? 'Calendar Connected' : 'Connect Google Calendar'}</span>
          </button>

          {onLaunchInstantMeet && (
            <button
              type="button"
              onClick={onLaunchInstantMeet}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' 
                  : 'border-[#E7E7E4] bg-white hover:bg-zinc-100 hover:border-zinc-300 text-[#111111]'
              }`}
              title="Spawn an instant personalized Google Meet with Nexus Buddy"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Instant Google Meet</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 ${
              isDark ? 'bg-white hover:bg-zinc-200 text-[#111111]' : 'bg-[#111111] hover:bg-zinc-800 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Host / Schedule Meeting</span>
          </button>

          <button
            type="button"
            onClick={onNavigateCockpit}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
              isDark 
                ? 'border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'border-[#E7E7E4] bg-white text-[#111111] hover:bg-[#F3F2EF]'
            }`}
            title="Go to Multi-Agent Cockpit"
          >
            <span>Cockpit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Google Workspace Integration Banner */}
        <div className={`rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-[#E7E7E4]'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarCheck className={`w-4 h-4 ${isDark ? 'text-white' : 'text-[#111111]'}`} />
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                isDark ? 'text-white' : 'text-[#111111]'
              }`}>
                Enterprise Calendar & Conference Enclave
              </span>
            </div>
            <p className={`text-xs max-w-2xl leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#6B6B6B]'}`}>
              Meetings created in this tab synchronize with Google Calendar and provision a personalized Google Meet room. During the call, the <strong>Nexus Meeting Buddy</strong> on the sidebar indexes dialogue in real time and automatically stores the transcript in the Vertex AI DataStore with participant-only access.
            </p>
          </div>

          <div className={`flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-[#F7F7F5] border-[#E7E7E4] text-[#6B6B6B]'
          }`}>
            <span>Logged in as:</span>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#111111]'}`}>{currentUser.email}</span>
          </div>
        </div>

        {/* Scheduled Meetings List */}
        <div className={`rounded-2xl border overflow-hidden shadow-xs transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-[#E7E7E4]'
        }`}>
          <div className={`p-4 border-b flex justify-between items-center ${
            isDark ? 'border-slate-800' : 'border-[#E7E7E4]'
          }`}>
            <div>
              <h2 className={`text-sm font-bold flex items-center gap-2 font-display ${
                isDark ? 'text-white' : 'text-[#111111]'
              }`}>
                <Video className="w-4 h-4" />
                <span>Upcoming Scheduled Meetings ({events.length})</span>
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                Click &ldquo;Join with Nexus Buddy&rdquo; to launch the personalized Google Meet with live sidebar AI.
              </p>
            </div>
            <button
              onClick={loadEvents}
              disabled={loading}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
              title="Refresh Calendar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-400' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className={`p-12 text-center text-xs font-mono space-y-2 ${isDark ? 'text-slate-500' : 'text-zinc-400'}`}>
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400" />
              <span>Fetching calendar events from Google Calendar API...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CalendarIcon className={`w-8 h-8 mx-auto ${isDark ? 'text-slate-700' : 'text-zinc-300'}`} />
              <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>No scheduled meetings found</div>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-500' : 'text-[#6B6B6B]'}`}>
                Click &ldquo;Host / Schedule Meeting&rdquo; above to create a new Google Meet event and invite attendees.
              </p>
            </div>
          ) : (
            <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-[#E7E7E4]'}`}>
              {events.map((event) => {
                const startDate = new Date(event.start.dateTime);
                const endDate = new Date(event.end.dateTime);
                const isHost = event.organizer.email.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <div key={event.id} className={`p-5 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-[#FBFBFA]'
                  }`}>
                    {/* Meeting Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`text-sm font-bold font-display ${isDark ? 'text-white' : 'text-[#111111]'}`}>
                          {event.summary}
                        </span>
                        {isHost && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-bold uppercase ${
                            isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-[#F3F2EF] text-[#111111] border-[#E7E7E4]'
                          }`}>
                            You are Host
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#F3F2EF] text-[#111111] border-[#E7E7E4]'
                        }`}>
                          Google Meet
                        </span>
                      </div>

                      <p className={`text-xs line-clamp-1 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                        {event.description}
                      </p>

                      <div className={`flex items-center gap-4 text-xs font-mono flex-wrap pt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-[#6B6B6B]'
                      }`}>
                        <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="tabular-nums">
                            {startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{event.attendees.length} Attendees</span>
                        </span>

                        <span>
                          Host: <span className={isDark ? 'text-slate-300' : 'text-[#111111]'}>{event.organizer.displayName || event.organizer.email}</span>
                        </span>
                      </div>

                      {/* Attendees Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-zinc-500'}`}>Invited:</span>
                        {event.attendees.map(att => (
                          <span key={att.email} className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-[#F3F2EF] border-[#E7E7E4] text-[#111111]'
                          }`}>
                            {att.email}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => onJoinMeetingWithNexus(event)}
                        className={`px-4 py-2 rounded-full text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                          isDark ? 'bg-white hover:bg-zinc-200 text-[#111111]' : 'bg-[#111111] hover:bg-zinc-800 text-white'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join with Nexus Buddy</span>
                      </button>

                      {event.meetLink && (
                        <a
                          href={event.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-full border transition-colors cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                              : 'bg-[#F3F2EF] hover:bg-[#E7E7E4] text-[#111111] border-[#E7E7E4]'
                          }`}
                          title="Open native Google Meet in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        disabled={isDeletingId === event.id}
                        onClick={() => handleDeleteMeeting(event.id, event.summary)}
                        className={`p-2 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                          isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-zinc-400 hover:text-rose-600 hover:bg-zinc-100'
                        }`}
                        title="Cancel Meeting (Google Calendar)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STORED MEETING TRANSCRIPTS & JOINEE-ONLY ACL SANDBOX */}
        <div className={`rounded-2xl border overflow-hidden shadow-xs space-y-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-[#E7E7E4]'
        }`}>
          <div className={`p-4 border-b flex justify-between items-start flex-wrap gap-3 ${
            isDark ? 'border-slate-800' : 'border-[#E7E7E4]'
          }`}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h2 className={`text-sm font-bold font-display ${isDark ? 'text-white' : 'text-[#111111]'}`}>
                  Stored Meeting Transcripts (DataStore) & Joinee-Only Query Sandbox
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold uppercase flex items-center gap-1 ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#F3F2EF] text-[#111111] border-[#E7E7E4]'
                }`}>
                  <span>📁 folder:</span>
                  <span className="underline">meeting transcript</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold uppercase ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#F3F2EF] text-[#111111] border-[#E7E7E4]'
                }`}>
                  Participant ACL Enforced
                </span>
              </div>
              <p className={`text-xs mt-1 max-w-3xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                At the conclusion of each Google Meet session, the full transcript is permanently stored in the DataStore on the folder named <strong className="font-mono underline">"meeting transcript"</strong>. As requested, <strong>only verified meeting joinees</strong> can query the session transcript from the Nexus agent. Uninvited employees are strictly gated with HTTP 403 ACL Refusals.
              </p>
            </div>

            <button
              onClick={loadStoredMeetings}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
              title="Refresh Stored Transcripts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Stored Meetings List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-slate-300' : 'text-[#111111]'
              }`}>
                <FileText className="w-3.5 h-3.5" />
                <span>Archived Sessions in DataStore ({storedMeetings.length})</span>
              </h3>

              <div className="space-y-2.5">
                {storedMeetings.map((m) => {
                  const isSelected = m.id === selectedMeetingId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMeetingId(m.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? isDark 
                            ? 'bg-slate-800/90 border-white text-white shadow-sm ring-1 ring-white/20' 
                            : 'bg-[#F7F7F5] border-black text-[#111111] shadow-xs ring-1 ring-black/10'
                          : isDark 
                            ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200' 
                            : 'bg-[#FAFAF9] border-[#E7E7E4] hover:border-zinc-300 text-[#111111]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold line-clamp-1">{m.title}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border shrink-0 ${
                          isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-zinc-700 border-[#E7E7E4]'
                        }`}>
                          {m.transcript_chunks.length} chunks
                        </span>
                      </div>

                      <p className={`text-[11px] mt-1 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                        {m.summary}
                      </p>

                      <div className={`mt-2.5 pt-2 border-t flex flex-col gap-1 text-[10px] font-mono ${
                        isDark ? 'border-slate-800 text-slate-400' : 'border-[#E7E7E4] text-[#6B6B6B]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span>Host: {m.hostName}</span>
                          <span>{new Date(m.started_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-emerald-500 font-semibold">Joinees:</span>
                          {m.allowed_joinees.map(email => (
                            <span key={email} className={`px-1.5 py-0.2 rounded-full border ${
                              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-[#E7E7E4] text-zinc-700'
                            }`}>
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Interactive Joinee Query Verification Sandbox (7 cols) */}
            <div className={`lg:col-span-7 rounded-2xl border p-4 space-y-4 transition-colors ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-[#FAFAF9] border-[#E7E7E4]'
            }`}>
              <div className={`flex items-center justify-between border-b pb-2 ${
                isDark ? 'border-slate-800' : 'border-[#E7E7E4]'
              }`}>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-500" />
                  <span className={`text-xs font-bold font-display ${isDark ? 'text-white' : 'text-[#111111]'}`}>
                    Nexus Agent Query Verification Console
                  </span>
                </div>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#6B6B6B]'}`}>
                  Target: <strong className={isDark ? 'text-white' : 'text-black'}>{selectedMeetingId}</strong>
                </span>
              </div>

              {/* Persona Selector */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold flex items-center justify-between ${
                  isDark ? 'text-slate-300' : 'text-[#111111]'
                }`}>
                  <span>1. Simulate Querying As (Actor Email):</span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-zinc-400'}`}>Test Joinee vs Non-Joinee</span>
                </label>
                <select
                  value={testUserEmail}
                  onChange={(e) => setTestUserEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-colors focus:outline-none ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-white' 
                      : 'bg-white border-[#E7E7E4] text-[#111111] focus:border-black'
                  }`}
                >
                  <option value={currentUser.email}>{currentUser.name} ({currentUser.email}) - [CURRENT AUTHENTICATED USER]</option>
                  <option value="security@acme.corp">Security Team (security@acme.corp) - [AUTHORIZED JOINEE • SECURITY]</option>
                  <option value="architecture@acme.corp">Architecture Lead (architecture@acme.corp) - [AUTHORIZED JOINEE • HOST]</option>
                  <option value="uninvited@acme.corp">Uninvited Employee (uninvited@acme.corp) - [UNINVITED EMPLOYEE • NON-JOINEE]</option>
                  <option value="stranger@outsider.com">External Actor (stranger@outsider.com) - [EXTERNAL UNINVITED ACTOR]</option>
                </select>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                  2. Prompt Query to Nexus Agent:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQueryPrompt}
                    onChange={(e) => setTestQueryPrompt(e.target.value)}
                    placeholder="e.g. What was agreed regarding Frankfurt HSM key custody?"
                    className={`flex-1 px-3 py-2 rounded-xl text-xs border transition-colors focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-white' 
                        : 'bg-white border-[#E7E7E4] text-[#111111] placeholder-zinc-400 focus:border-black'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleRunJoineeQueryTest}
                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                      isDark ? 'bg-white hover:bg-zinc-200 text-[#111111]' : 'bg-[#111111] hover:bg-zinc-800 text-white'
                    }`}
                  >
                    <span>Query Agent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Test Result Display */}
              {testResult ? (
                <div className={`p-4 rounded-2xl border text-xs space-y-2.5 animate-in fade-in duration-200 ${
                  testResult.allowed
                    ? isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-[#E7E7E4] text-[#111111] shadow-xs'
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.allowed ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>Result: {testResult.status}</span>
                    </span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                      testResult.allowed 
                        ? isDark ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-zinc-100 text-zinc-900 border-zinc-200' 
                        : 'bg-rose-900/40 text-rose-300 border-rose-700'
                    }`}>
                      {testResult.allowed ? '200 OK • ACCESS AUTHORIZED' : '403 FORBIDDEN • JOINEE ACL BLOCKED'}
                    </span>
                  </div>

                  {testResult.allowed ? (
                    <div className="space-y-2">
                      <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-[#6B6B6B]'}`}>
                        Verified Joinee! User <strong className={isDark ? 'text-white' : 'text-black'}>{testUserEmail}</strong> attended this session. Transcript retrieved and synthesized:
                      </p>
                      <div className={`p-3 rounded-xl text-xs whitespace-pre-wrap leading-relaxed font-sans border ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-[#F7F7F5] border-[#E7E7E4] text-[#111111]'
                      }`}>
                        {testResult.answer}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-rose-200 leading-relaxed font-sans">
                        {testResult.reason}
                      </p>
                      <div className="p-2.5 rounded-xl bg-black/40 text-[10px] font-mono text-rose-300/80 border border-rose-900/40">
                        Access Policy: Only [{(testResult.allowedJoinees || []).join(', ')}] can query this meeting transcript.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-6 rounded-2xl border border-dashed text-center text-xs ${
                  isDark ? 'border-slate-800 text-slate-500' : 'border-[#E7E7E4] text-zinc-400'
                }`}>
                  Click &ldquo;Query Agent&rdquo; above to run the access control test.
                </div>
              )}

            </div>

          </div>
        </div>

      </main>

      {/* SCHEDULE MEETING MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg border rounded-3xl p-6 shadow-2xl space-y-4 transition-colors ${
            isDark ? 'bg-[#090D16] border-slate-800 text-white' : 'bg-[#F7F7F5] border-[#E7E7E4] text-[#111111]'
          }`}>
            <div className={`flex justify-between items-center pb-2 border-b ${
              isDark ? 'border-slate-800' : 'border-[#E7E7E4]'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 font-display ${
                isDark ? 'text-white' : 'text-[#111111]'
              }`}>
                <CalendarIcon className="w-4 h-4" />
                <span>Host / Schedule Google Calendar Meeting</span>
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className={`cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-zinc-400 hover:text-black'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                  Meeting Title
                </label>
                <input
                  type="text"
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Payment Gateway Architecture Review"
                  className={`w-full px-3 py-2 rounded-xl text-xs border transition-colors focus:outline-none ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-white' 
                      : 'bg-white border-[#E7E7E4] text-[#111111] placeholder-zinc-400 focus:border-black'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                  Agenda / Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Review RFC-118 tokenization keys, EU residency, and assign action items..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border transition-colors focus:outline-none ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-white' 
                      : 'bg-white border-[#E7E7E4] text-[#111111] placeholder-zinc-400 focus:border-black'
                  }`}
                />
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-colors focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-white' 
                        : 'bg-white border-[#E7E7E4] text-[#111111] focus:border-black'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-colors focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-white' 
                        : 'bg-white border-[#E7E7E4] text-[#111111] focus:border-black'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-colors focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-white' 
                        : 'bg-white border-[#E7E7E4] text-[#111111] focus:border-black'
                    }`}
                  />
                </div>
              </div>

              {/* Attendees */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-[#111111]'}`}>
                    Invite Attendees (Comma separated)
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-zinc-500'}`}>
                    Host: {currentUser.email}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={attendeesInput}
                  onChange={(e) => setAttendeesInput(e.target.value)}
                  placeholder="teammate@company.com, security@company.com"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition-colors focus:outline-none ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-white' 
                      : 'bg-white border-[#E7E7E4] text-[#111111] placeholder-zinc-400 focus:border-black'
                  }`}
                />
              </div>

              {/* Notice */}
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isDark ? 'bg-slate-900/70 border-slate-800 text-slate-300' : 'bg-white border-[#E7E7E4] text-[#6B6B6B]'
              }`}>
                <Video className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <p>
                  A personalized Google Meet room will be attached to this Google Calendar invitation automatically. At the end of the meeting, dialogue will be archived in the DataStore with participant-only query permissions.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                    isDark 
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300' 
                      : 'border-[#E7E7E4] bg-white hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 rounded-full text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                    isDark ? 'bg-white hover:bg-zinc-200 text-[#111111]' : 'bg-[#111111] hover:bg-zinc-800 text-white'
                  }`}
                >
                  {isSubmitting ? 'Creating Event...' : 'Schedule & Create Meet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
