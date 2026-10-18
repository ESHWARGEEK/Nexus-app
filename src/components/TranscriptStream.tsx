import React, { useState } from 'react';
import { TranscriptChunk } from '../types';
import { Radio, ShieldCheck, HelpCircle, CheckCircle, AlertTriangle, Play, Mic, Send } from 'lucide-react';

interface TranscriptStreamProps {
  transcripts: TranscriptChunk[];
  isPlaying: boolean;
  activeChunkIndex: number;
  onTogglePlay?: () => void;
  onAddTranscript?: (text: string) => void;
}

export const TranscriptStream: React.FC<TranscriptStreamProps> = ({
  transcripts,
  isPlaying,
  activeChunkIndex,
  onTogglePlay,
  onAddTranscript,
}) => {
  const getIntentBadge = (intent?: string) => {
    switch (intent) {
      case 'QUESTION':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
            <HelpCircle className="w-3 h-3" /> Question
          </span>
        );
      case 'ARCHITECTURAL_DECISION':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <CheckCircle className="w-3 h-3" /> Architecture Decision
          </span>
        );
      case 'POLICY_SENSITIVE':
        return (
          <span className="flex items-center gap-1 text-[11px] text-red-400 font-mono">
            <AlertTriangle className="w-3 h-3" /> Policy Risk Detected
          </span>
        );
      default:
        return null;
    }
  };

  const formatOffset = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-semibold text-slate-200 tracking-wide uppercase font-display">
            Live Meeting Stream
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Cloud DLP Active</span>
        </div>
      </div>

      {/* Transcript Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 divide-y divide-slate-800/40">
        {transcripts.map((chunk, idx) => {
          const isCurrent = idx === activeChunkIndex;
          const isFuture = idx > activeChunkIndex;

          if (isFuture) return null;

          return (
            <div
              key={chunk.id}
              className={`pt-3 first:pt-0 transition-opacity ${
                isCurrent ? 'opacity-100' : 'opacity-85'
              }`}
            >
              {/* Speaker Metadata & Intent */}
              <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200 text-xs">
                    {chunk.speaker}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    &bull; {chunk.speaker_role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getIntentBadge(chunk.detected_intent)}
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {formatOffset(chunk.timestamp_offset_ms)}
                  </span>
                </div>
              </div>

              {/* Spoken Text */}
              <p className="text-xs text-slate-300 leading-relaxed pl-2 border-l border-slate-800">
                {chunk.text}
              </p>
            </div>
          );
        })}

        {transcripts.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">Meeting Stream Ready</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Start the live payment architecture review or speak live.
              </p>
            </div>
            {onTogglePlay && (
              <button
                onClick={onTogglePlay}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Meeting</span>
              </button>
            )}
            <p className="text-[10px] text-slate-500 font-mono">
              The Meeting Copilot on the right panel listens and grounds in real-time.
            </p>
          </div>
        )}
      </div>

      {/* Spoken input contribution bar */}
      {onAddTranscript && (
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              const target = e.currentTarget.elements.namedItem('directSpeech') as HTMLInputElement;
              if (target && target.value.trim()) {
                onAddTranscript(target.value.trim());
                target.value = '';
              }
            }}
            className="flex items-center gap-1.5"
          >
            <input
              name="directSpeech"
              type="text"
              placeholder="Speak or type a meeting point..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={e => {
                const input = (e.currentTarget.form?.elements.namedItem('directSpeech') as HTMLInputElement);
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                  try {
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'en-US';
                    recognition.onresult = (ev: any) => {
                      const text = ev.results[0][0].transcript;
                      if (input) input.value = text;
                    };
                    recognition.start();
                  } catch {}
                } else if (input) {
                  input.value = 'What are the retry requirements for EU tokenization in RFC-104?';
                }
              }}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Speak via Speech-to-Text"
            >
              <Mic className="w-3.5 h-3.5 text-blue-400" />
            </button>
            <button
              type="submit"
              className="p-1.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
              title="Add to meeting transcript"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
