import React from 'react';
import { CitationResult, UserRole } from '../types';
import { Search, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

interface GroundedResearchFeedProps {
  citations: CitationResult[];
  lastQuery: string;
  userRole: UserRole;
  isUngrounded: boolean;
  scoreThreshold: number;
}

export const GroundedResearchFeed: React.FC<GroundedResearchFeedProps> = ({
  citations,
  lastQuery,
  userRole,
  isUngrounded,
  scoreThreshold,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-b border-slate-800">
      {/* Feed Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide font-display">
            Grounded Research Feed
          </h3>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Role: <span className="text-blue-400">{userRole}</span> &bull; Gate: &ge; {scoreThreshold}
        </div>
      </div>

      {/* Query Banner */}
      {lastQuery && (
        <div className="px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800/60 text-[11px] text-slate-400 font-mono truncate shrink-0">
          Query: &ldquo;<span className="text-slate-200">{lastQuery}</span>&rdquo;
        </div>
      )}

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isUngrounded && (
          <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold font-display">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Refusal State: No accessible results</span>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed">
              Query fell below the <code className="font-mono text-amber-300">{scoreThreshold}</code> relevance score threshold, or document classification is restricted from role <span className="font-mono text-blue-300 font-semibold">[{userRole}]</span>.
            </p>

            <div className="text-[11px] text-slate-400 font-mono bg-slate-950/60 p-2 rounded border border-slate-800">
              &bull; Zero confidential metadata or document titles leaked to unauthorized role.
            </div>
          </div>
        )}

        {citations.map((cite, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2 text-xs"
          >
            {/* Citation Meta */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-300 font-mono text-[11px]">
                {cite.doc_title}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 tabular-nums">
                <CheckCircle2 className="w-3 h-3" />
                Score: {cite.relevance_score}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              {cite.section}
            </div>

            {/* Verbatim Snippet */}
            <p className="text-slate-300 text-xs leading-relaxed border-l-2 border-blue-500/60 pl-2 bg-blue-950/20 py-1">
              &ldquo;{cite.snippet}&rdquo;
            </p>

            {/* Permitted Roles Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-900">
              <span>ACL: {cite.allowed_roles.join(', ')}</span>
              <span className="uppercase text-slate-400">{cite.classification}</span>
            </div>
          </div>
        ))}

        {!isUngrounded && citations.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs">
            <span>Awaiting technical inquiry from meeting dialogue...</span>
          </div>
        )}
      </div>
    </div>
  );
};
