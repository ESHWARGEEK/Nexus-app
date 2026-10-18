import { LivingDocument } from '../types';

export interface WorkspaceExportResult {
  success: boolean;
  doc_id: string;
  doc_title: string;
  google_drive_file_id: string;
  web_view_link: string;
  html_payload: string;
  exported_at: string;
  error?: string;
  status_code: number;
}

/**
 * Converts Markdown text into semantic HTML with styled tables and blockquotes
 * suitable for native conversion into Google Docs (mimeType: application/vnd.google-apps.document).
 */
export function convertMarkdownToGoogleDocHTML(title: string, markdown: string): string {
  // Replace headers
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1 style="font-family: Arial, sans-serif; font-size: 22pt; color: #1e293b; margin-bottom: 12pt;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="font-family: Arial, sans-serif; font-size: 16pt; color: #334155; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="font-family: Arial, sans-serif; font-size: 13pt; color: #475569; margin-top: 12pt; margin-bottom: 6pt;">$1</h3>')
    .replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #6366f1; margin: 12pt 0; padding: 8pt 16pt; background-color: #f8fafc; color: #334155; font-style: italic;">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background-color: #f1f5f9; padding: 2px 5px; font-family: monospace; font-size: 9.5pt; border-radius: 3px;">$1</code>')
    .replace(/^\- (.*$)/gim, '<li style="margin-bottom: 4pt; font-family: Arial, sans-serif; font-size: 10.5pt; color: #334155;">$1</li>');

  // Wrap lists in <ul>
  html = html.replace(/(<li[\s\S]*?<\/li>)/gm, '<ul style="padding-left: 20pt; margin-bottom: 12pt;">$1</ul>');

  // Convert paragraphs
  const paragraphs = html.split('\n\n');
  const formattedParagraphs = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<ul') || p.startsWith('<table')) {
      return p;
    }
    return `<p style="font-family: Arial, sans-serif; font-size: 10.5pt; line-height: 1.6; color: #334155; margin-bottom: 10pt;">${p}</p>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="max-width: 800px; margin: 40px auto; font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <div style="font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Google Cloud Vertex AI Enterprise Export</div>
    <h1 style="font-size: 24pt; color: #0f172a; margin: 8px 0 4px 0;">${title}</h1>
    <div style="font-size: 10pt; color: #64748b;">Generated live by Nexus Sidekick &bull; Status: Verified &bull; ${new Date().toLocaleDateString()}</div>
  </div>
  ${formattedParagraphs.join('\n')}
</body>
</html>`;
}

export function executeGoogleDocExport(
  doc: LivingDocument,
  oauthToken?: string
): WorkspaceExportResult {
  // CRITICAL SERVER-SIDE CHECK: Enforce lock
  if (doc.export_locked) {
    return {
      success: false,
      doc_id: doc.id,
      doc_title: doc.title,
      google_drive_file_id: '',
      web_view_link: '',
      html_payload: '',
      exported_at: new Date().toISOString(),
      status_code: 403,
      error: `403 Forbidden: Document export is locked due to ${doc.lock_reasons.length} pending critical compliance violation(s). Apply remediation to unlock.`,
    };
  }

  const htmlPayload = convertMarkdownToGoogleDocHTML(doc.title, doc.markdown_content);
  const simulatedFileId = `gdoc_drive_${doc.id.toLowerCase()}_${Date.now().toString(36)}`;
  const simulatedViewLink = `https://docs.google.com/document/d/${simulatedFileId}/edit?usp=sharing`;

  return {
    success: true,
    doc_id: doc.id,
    doc_title: doc.title,
    google_drive_file_id: simulatedFileId,
    web_view_link: simulatedViewLink,
    html_payload: htmlPayload,
    exported_at: new Date().toISOString(),
    status_code: 200,
  };
}
