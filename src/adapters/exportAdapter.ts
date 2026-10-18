import { IExportAdapter, ServiceHealthCheck } from './types';
import { LivingDocument } from '../types';
import { executeGoogleDocExport, WorkspaceExportResult } from '../services/workspaceService';
import { getADCAccessToken } from './authHelper';

export class ExportAdapter implements IExportAdapter {
  private mode: 'mock' | 'real';

  constructor() {
    this.mode = (process.env.EXPORT_MODE as 'mock' | 'real') || 'mock';
  }

  async exportGoogleDoc(doc: LivingDocument, oauthToken?: string): Promise<WorkspaceExportResult> {
    if (this.mode === 'real' && oauthToken) {
      try {
        const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: doc.title,
          }),
        });

        if (createRes.ok) {
          const createdDoc = await createRes.json();
          const documentId = createdDoc.documentId;

          await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${oauthToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: `${doc.title}\n\n${doc.markdown_content}`,
                  },
                },
              ],
            }),
          });

          return {
            success: true,
            doc_id: documentId,
            doc_title: doc.title,
            google_drive_file_id: documentId,
            web_view_link: `https://docs.google.com/document/d/${documentId}/edit`,
            exported_at: new Date().toISOString(),
            status_code: 200,
            html_payload: `<h1>${doc.title}</h1><p>Exported directly to Google Docs</p>`,
          };
        }
      } catch (err) {
        console.warn('Real Google Workspace export failed, using preview exporter:', err);
      }
    }

    // Default & Mock mode: generates standalone HTML deliverable
    return executeGoogleDocExport(doc, oauthToken);
  }

  async healthCheck(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();

    if (this.mode === 'real') {
      try {
        const endpoint = 'https://www.googleapis.com/drive/v3/about?fields=user';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const headers: Record<string, string> = {};
        const token = await getADCAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(endpoint, { 
          method: 'GET',
          headers,
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const isLive = res.status >= 200 && res.status < 300;

        return {
          service: 'Google Workspace (Drive & Docs)',
          mode: 'real',
          liveStatus: isLive ? 'LIVE' : 'SIMULATED',
          isLive,
          status: isLive ? 'healthy' : 'unconfigured',
          latency_ms: latency,
          details: { 
            httpStatus: res.status, 
            mimeType: 'application/vnd.google-apps.document',
            auth: isLive ? 'OAuth Authenticated' : `Endpoint returned HTTP ${res.status} (Workspace Sign-in Required)`,
          },
          error: !isLive ? `Drive API returned HTTP ${res.status}` : undefined,
        };
      } catch (err: any) {
        return {
          service: 'Google Workspace (Drive & Docs)',
          mode: 'real',
          liveStatus: 'SIMULATED',
          isLive: false,
          status: 'error',
          latency_ms: Date.now() - startTime,
          error: err.message || 'Drive API ping failed',
        };
      }
    }

    return {
      service: 'Google Workspace (Drive & Docs)',
      mode: 'mock',
      liveStatus: 'SIMULATED',
      isLive: false,
      status: 'healthy',
      latency_ms: 10,
      details: {
        exportTarget: 'HTML Preview Deliverable & Staged Google Docs Download',
      },
    };
  }
}
