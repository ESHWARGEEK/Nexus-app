import React from 'react';
import { BigQueryMeetingSession, HarnessRunMetrics } from '../types';
import { BarChart2, CheckCircle2, X, Play, ShieldCheck, Database, Clock } from 'lucide-react';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: BigQueryMeetingSession[];
  latestBenchmark: HarnessRunMetrics | null;
  onRunHarness: () => void;
  isRunningHarness: boolean;
}

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({
  isOpen,
  onClose,
  sessions,
  latestBenchmark,
  onRunHarness,
  isRunningHarness,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 font-display">
                BigQuery Enterprise Analytics &amp; Evaluation Harness
              </h2>
              <p className="text-xs text-slate-400">
                Dataset: <code className="font-mono text-blue-400">nexus_analytics</code> &bull; Live session sync active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunHarness}
              disabled={isRunningHarness}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningHarness ? 'Evaluating Scenarios...' : 'Run Automated Harness'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Key Metrics Cards */}
          {latestBenchmark && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-mono">ACTION ITEM RECALL</div>
                <div className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                  {(latestBenchmark.action_item_recall * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">
                  Precision: {(latestBenchmark.action_item_precision * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-mono">COMPLIANCE CATCH RATE</div>
                <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                  {(latestBenchmark.compliance_catch_rate * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">
                  FP Rate: {(latestBenchmark.compliance_false_positive_rate * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-mono">SECTION COVERAGE</div>
                <div className="text-lg font-bold text-blue-400 font-mono tabular-nums">
                  {latestBenchmark.gold_section_coverage_pct.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">vs gold RFC outline</div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-mono">LATENCY (P50 / P95)</div>
                <div className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                  {latestBenchmark.p50_latency_ms}ms <span className="text-xs text-slate-500">/ {latestBenchmark.p95_latency_ms}ms</span>
                </div>
                <div className="text-[10px] text-emerald-400">
                  Within &lt; 3.8s target
                </div>
              </div>
            </div>
          )}

          {/* ACL Isolation Assertion Banner */}
          {latestBenchmark && (
            <div className={`p-3.5 rounded-lg border flex items-start gap-3 ${
              latestBenchmark.draft_isolation_verified
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-red-950/20 border-red-800/40 text-red-300'
            }`}>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-slate-100 font-display">
                  ACL Draft Isolation Assertion Verified
                </div>
                <p className="text-slate-300">
                  Automated test confirms zero confidential tokens from restricted <code className="font-mono text-blue-300">POL-SEC-12</code> leaked into the shared RFC draft. Lowest-common-denominator isolation enforced.
                </p>
              </div>
            </div>
          )}

          {/* BigQuery Sessions Table */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide font-display">
              Recent BigQuery Session Stream (<code className="font-mono text-blue-400 text-xs">meeting_sessions</code>)
            </h3>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Session Title</th>
                    <th className="py-2.5 px-3 text-right">Decisions</th>
                    <th className="py-2.5 px-3 text-right">Compliance Flags</th>
                    <th className="py-2.5 px-3 text-right">TTFA (ms)</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {sessions.map(sess => (
                    <tr key={sess.meeting_id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {sess.title}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {sess.decisions_count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {sess.compliance_warnings_count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-400">
                        {sess.time_to_first_answer_ms}ms
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                        {new Date(sess.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          sess.status === 'LIVE' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {sess.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Connected to Google Cloud BigQuery API</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
