import React, { useState } from 'react';
import { LivingDocument } from '../types';
import { convertMarkdownToGoogleDocHTML, executeGoogleDocExport } from '../services/workspaceService';
import { FileText, Download, CheckCircle, ExternalLink, X, ShieldAlert } from 'lucide-react';

interface ExportApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LivingDocument;
  onExportSuccess: (fileId: string, webLink: string) => void;
}

export const ExportApprovalModal: React.FC<ExportApprovalModalProps> = ({
  isOpen,
  onClose,
  document,
  onExportSuccess,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ fileId: string; webLink: string } | null>(null);

  if (!isOpen) return null;

  const htmlPreview = convertMarkdownToGoogleDocHTML(document.title, document.markdown_content);

  const handleConfirmExport = () => {
    setIsExporting(true);

    setTimeout(() => {
      const result = executeGoogleDocExport(document);
      setIsExporting(false);

      if (result.success) {
        setExportResult({
          fileId: result.google_drive_file_id,
          webLink: result.web_view_link,
        });
        onExportSuccess(result.google_drive_file_id, result.web_view_link);

        // Also offer raw HTML file download so the user can open it offline in any editor or Word/Google Docs
        const blob = new Blob([result.html_payload], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-display">
              Human-in-the-Loop Review: Google Docs Export
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {document.export_locked ? (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-red-200">
                  Export Blocked: Unresolved Policy Risk
                </div>
                <p className="mt-1">
                  The Compliance Guardian has locked Google Docs creation because this document contains un-remediated compliance findings. Please apply the recommended remediation diff in the right panel to release this lock.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Google Workspace Target MimeType: <code className="font-mono text-blue-400">application/vnd.google-apps.document</code></span>
                <span className="text-emerald-400 font-mono text-[11px]">&check; Compliance Verified</span>
              </div>

              {/* Rendered HTML Preview Sandbox */}
              <div className="border border-slate-800 rounded-lg p-4 bg-white text-slate-800 max-h-72 overflow-y-auto shadow-inner text-xs">
                <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
              </div>

              {exportResult && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Google Doc created: <code className="font-mono">{exportResult.fileId}</code></span>
                  </div>
                  <a
                    href={exportResult.webLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {document.export_locked ? 'Lock enforced by server policy' : 'Ready for Workspace ingestion'}
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmExport}
              disabled={document.export_locked || isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Confirm & Export Google Doc'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
