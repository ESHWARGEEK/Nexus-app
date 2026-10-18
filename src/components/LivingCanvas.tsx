import React, { useState } from 'react';
import { LivingDocument, SentenceProvenance } from '../types';
import { FileText, Lock, Unlock, Copy, Check, Download, History, X, Compass, ExternalLink } from 'lucide-react';

interface LivingCanvasProps {
  document: LivingDocument;
  onExportDoc: () => void;
  isExporting: boolean;
}

export const LivingCanvas: React.FC<LivingCanvasProps> = ({
  document,
  onExportDoc,
  isExporting,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeProvenance, setActiveProvenance] = useState<SentenceProvenance | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(document.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inspectParagraphProvenance = (paragraphText: string) => {
    const textLower = paragraphText.toLowerCase();

    if (textLower.includes('retry') || textLower.includes('idempotent') || textLower.includes('backoff')) {
      setActiveProvenance({
        sentence_text: paragraphText,
        section_title: 'Section 3: Idempotent Retry Policy',
        source_speaker: 'Engineering Lead',
        source_timestamp_ms: 8200,
        cited_doc_id: 'RFC-104',
        cited_doc_title: 'RFC-104: Payment Gateway Architecture v2.4',
        cited_section: 'Section 3.2 (Idempotent Tokenization & Retry Policy)',
        confidence_score: 0.94,
      });
      return;
    }

    if (textLower.includes('telemetry') || textLower.includes('proxy') || textLower.includes('anonymiz') || textLower.includes('frankfurt')) {
      setActiveProvenance({
        sentence_text: paragraphText,
        section_title: 'Section 4: Telemetry & Ingress Architecture',
        source_speaker: 'Security Architect',
        source_timestamp_ms: 48000,
        cited_doc_id: 'POL-SEC-08',
        cited_doc_title: 'POL-SEC-08: Cross-Border Data Transfer Framework',
        cited_section: 'Section 4.2 (Transatlantic Telemetry & Raw Processing Restriction)',
        confidence_score: 0.92,
      });
      return;
    }

    if (textLower.includes('key') || textLower.includes('cryptographic') || textLower.includes('hsm')) {
      setActiveProvenance({
        sentence_text: paragraphText,
        section_title: 'Section 2: Cryptographic Key Topologies',
        source_speaker: 'Dave Kerman (Senior Backend Engineer)',
        source_timestamp_ms: 18500,
        cited_doc_id: 'RFC-118 Core Standard',
        cited_doc_title: 'Regional HSM Cryptographic Standard',
        cited_section: 'Section 2.1 (Hardware Enclave Topologies)',
        confidence_score: 0.88,
      });
      return;
    }

    // Default overview provenance
    setActiveProvenance({
      sentence_text: paragraphText,
      section_title: 'Section 1: Scope & Objective',
      source_speaker: 'Engineering Lead',
      source_timestamp_ms: 2500,
      cited_doc_id: 'RFC-118 Charter',
      cited_doc_title: 'EU Payment Processor Modernization Project Charter',
      cited_section: 'Executive Summary',
      confidence_score: 0.95,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 relative">
      {/* Canvas Top Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-semibold text-slate-200 tracking-wide font-display">
            Living Deliverable Canvas
          </h2>
          <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
            v{document.version}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={onExportDoc}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              document.export_locked
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
            }`}
            title={document.export_locked ? 'Export locked: Resolve compliance risk to unlock' : 'Export document to Google Docs'}
          >
            {document.export_locked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{document.export_locked ? 'Export Locked' : 'Export to Google Docs'}</span>
          </button>
        </div>
      </div>

      {/* Lock Advisory Warning Banner if locked */}
      {document.export_locked && (
        <div className="px-3.5 py-2 bg-red-950/40 border-b border-red-800/40 text-red-300 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>
              <strong>Export Gated:</strong> Compliance violation detected in proposal. Apply remediation in right panel to unlock.
            </span>
          </div>
        </div>
      )}

      {/* Verified Notice if unlocked */}
      {!document.export_locked && document.version > 1 && (
        <div className="px-3.5 py-1.5 bg-emerald-950/30 border-b border-emerald-800/30 text-emerald-300 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Compliance Verified:</strong> All active proposals conform to sovereign data and encryption standards.
            </span>
          </div>
        </div>
      )}

      {/* Helper Banner for Provenance */}
      <div className="px-3.5 py-1 bg-slate-900/40 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Click any section below to inspect source meeting utterance &amp; citation provenance.</span>
        <Compass className="w-3 h-3 text-blue-400" />
      </div>

      {/* Document Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <div className="text-[11px] font-mono text-blue-400 tracking-wider uppercase mb-1">
            RFC Engineering Specification
          </div>
          <h1 className="text-lg font-bold text-slate-100 font-display">
            {document.title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
            <span>Author: Engineering Lead (Payments)</span>
            <span>&bull;</span>
            <span>Target Enclave: europe-west3</span>
            <span>&bull;</span>
            <span>Status: {document.status}</span>
          </div>
        </div>

        {/* Interactive Clickable Paragraphs for Provenance */}
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          {document.markdown_content.split('\n\n').map((paragraph, pIdx) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={pIdx} className="text-sm font-semibold text-slate-100 pt-2 border-t border-slate-800/60 font-display">
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={pIdx} className="text-base font-bold text-slate-100 pt-3 border-t border-slate-800 font-display">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('- ')) {
              const items = paragraph.split('\n');
              return (
                <ul key={pIdx} className="list-disc pl-4 space-y-1 text-slate-300">
                  {items.map((it, itIdx) => (
                    <li key={itIdx}>{it.replace('- ', '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p
                key={pIdx}
                onClick={() => inspectParagraphProvenance(paragraph)}
                className="text-slate-300 leading-relaxed hover:bg-slate-900 hover:text-slate-100 p-1.5 rounded cursor-pointer transition-colors border border-transparent hover:border-slate-800"
                title="Click to view sentence provenance"
              >
                {paragraph}
              </p>
            );
          })}
        </div>
      </div>

      {/* Clickable Sentence Provenance Drawer / Modal */}
      {activeProvenance && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-blue-500/40 p-4 shadow-2xl z-30 space-y-2 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-100 font-display">
                Sentence Provenance &amp; Verification Chain
              </span>
            </div>
            <button
              onClick={() => setActiveProvenance(null)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Source Utterance</div>
              <div className="font-semibold text-slate-200 text-xs">{activeProvenance.source_speaker}</div>
              <div className="text-[11px] font-mono text-blue-400">
                Timestamp: {(activeProvenance.source_timestamp_ms / 1000).toFixed(1)}s
              </div>
            </div>

            <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Precedent Document Citation</div>
              <div className="font-semibold text-emerald-300 text-xs">{activeProvenance.cited_doc_title}</div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>{activeProvenance.cited_section}</span>
                <span className="text-emerald-400 font-semibold">Score: {activeProvenance.confidence_score}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
