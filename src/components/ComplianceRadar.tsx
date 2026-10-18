import React, { useState } from 'react';
import { ComplianceFinding, UserRole } from '../types';
import { AlertOctagon, CheckCircle, Shield, ArrowRight, Lock, Unlock } from 'lucide-react';

interface ComplianceRadarProps {
  findings: ComplianceFinding[];
  userRole: UserRole;
  onApplyRemediation: (findingId: string) => void;
  onApplyOverride: (findingId: string, reason: string) => void;
  isExportLocked: boolean;
}

export const ComplianceRadar: React.FC<ComplianceRadarProps> = ({
  findings,
  userRole,
  onApplyRemediation,
  onApplyOverride,
  isExportLocked,
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInputFor, setShowOverrideInputFor] = useState<string | null>(null);

  const canOverride = true;

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Radar Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-red-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide font-display">
            Compliance Radar
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {isExportLocked ? (
            <span className="flex items-center gap-1 text-red-400">
              <Lock className="w-3 h-3" /> Gated (Critical Risk)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3 h-3" /> Clear
            </span>
          )}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {findings.map(finding => {
          const isRemediated = finding.status === 'REMEDIATED';
          const isOverridden = finding.status === 'OVERRIDDEN';

          return (
            <div
              key={finding.id}
              className={`p-3 rounded-lg border transition-colors space-y-2.5 text-xs ${
                isRemediated
                  ? 'bg-emerald-950/20 border-emerald-800/40'
                  : isOverridden
                  ? 'bg-amber-950/20 border-amber-800/40'
                  : 'bg-slate-950 border-red-500/40 shadow-sm'
              }`}
            >
              {/* Finding Header */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-red-300 font-mono text-[11px]">
                  {finding.policy_title}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                    isRemediated
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isOverridden
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {isRemediated ? 'Remediated' : isOverridden ? 'Overridden' : `${finding.severity} (Advisory)`}
                </span>
              </div>

              {/* Clause Reference */}
              <div className="text-[11px] font-mono text-slate-400">
                {finding.clause_reference}
              </div>

              {/* Violation Description */}
              <p className="text-slate-300 text-xs leading-relaxed">
                {finding.violation_summary}
              </p>

              {/* Verbatim Clause Text if user is authorized */}
              {finding.clause_text && (
                <div className="bg-slate-900/80 border border-slate-800 p-2 rounded text-[11px] text-slate-300 italic font-serif">
                  &ldquo;{finding.clause_text}&rdquo;
                </div>
              )}

              {/* Status or Remediation Action */}
              {!isRemediated && !isOverridden && (
                <div className="pt-2 border-t border-slate-900 space-y-2">
                  <button
                    onClick={() => onApplyRemediation(finding.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    <span>Apply Remediation Diff</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {canOverride && (
                    <div>
                      {showOverrideInputFor === finding.id ? (
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={e => setOverrideReason(e.target.value)}
                            placeholder="Enter justification for security override..."
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                onApplyOverride(finding.id, overrideReason || 'Approved for staging preview');
                                setShowOverrideInputFor(null);
                                setOverrideReason('');
                              }}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] rounded font-medium"
                            >
                              Confirm Override
                            </button>
                            <button
                              onClick={() => setShowOverrideInputFor(null)}
                              className="px-2 py-1 text-slate-400 text-[11px] hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowOverrideInputFor(finding.id)}
                          className="w-full text-center text-[11px] text-amber-400 hover:text-amber-300 hover:underline pt-0.5"
                        >
                          Logged Security Override ({userRole})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isRemediated && (
                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                  <CheckCircle className="w-3 h-3" />
                  Resolved by [{finding.resolved_by}] &bull; Export Unlocked
                </div>
              )}

              {isOverridden && (
                <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1 pt-1">
                  <Unlock className="w-3 h-3" />
                  {finding.resolved_by}
                </div>
              )}
            </div>
          );
        })}

        {findings.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs">
            <span>No active compliance violations detected.</span>
          </div>
        )}
      </div>
    </div>
  );
};
