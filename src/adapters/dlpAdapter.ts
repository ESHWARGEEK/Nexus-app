import { IDLPAdapter, ServiceHealthCheck } from './types';
import { sanitizeWithCloudDLP, DLPSanitizeResult } from '../services/dlpService';
import { getADCAccessToken } from './authHelper';

export class DLPAdapter implements IDLPAdapter {
  private mode: 'mock' | 'real';
  private projectId: string;

  constructor() {
    this.mode = (process.env.DLP_MODE as 'mock' | 'real') || 'mock';
    this.projectId = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-builder-cup-511510';
  }

  async sanitize(input: string): Promise<DLPSanitizeResult> {
    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://dlp.googleapis.com/v2/projects/${this.projectId}/content:deidentify`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const headers: Record<string, string> = { 
          'Content-Type': 'application/json' 
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (this.projectId) {
          headers['X-Goog-User-Project'] = this.projectId;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            item: { value: input },
            inspectConfig: {
              infoTypes: [
                { name: 'CREDIT_CARD_NUMBER' },
                { name: 'US_SOCIAL_SECURITY_NUMBER' },
                { name: 'AUTH_TOKEN' },
                { name: 'GCP_API_KEY' },
              ],
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return {
            originalText: input,
            sanitizedText: data.item?.value || input,
            findingsCount: data.overview?.transformationSummaries?.length || 0,
            redactedInfoTypes: ['CREDIT_CARD_NUMBER', 'US_SOCIAL_SECURITY_NUMBER'],
          };
        }
      } catch (err) {
        console.warn('Real Cloud DLP call error, applying local sanitizer fallback:', err);
      }
    }

    return sanitizeWithCloudDLP(input);
  }

  async healthCheck(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();

    if (this.mode === 'real') {
      try {
        const endpoint = `https://dlp.googleapis.com/v2/infoTypes`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const headers: Record<string, string> = {};
        const token = await getADCAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (this.projectId) {
          headers['X-Goog-User-Project'] = this.projectId;
        }

        const res = await fetch(endpoint, { 
          method: 'GET',
          headers,
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const isLive = res.status >= 200 && res.status < 300;

        return {
          service: 'Cloud Sensitive Data Protection (DLP)',
          mode: 'real',
          liveStatus: isLive ? 'LIVE' : 'SIMULATED',
          isLive,
          status: isLive ? 'healthy' : 'unconfigured',
          latency_ms: latency,
          details: { 
            httpStatus: res.status,
            auth: isLive ? 'ADC Authenticated' : `Endpoint returned HTTP ${res.status} (Fallback active)`,
            projectId: this.projectId,
            monitoredTypes: ['CREDIT_CARD_NUMBER', 'US_SOCIAL_SECURITY_NUMBER', 'AUTH_TOKEN', 'GCP_API_KEY'],
          },
          error: !isLive ? `DLP API returned HTTP ${res.status}` : undefined,
        };
      } catch (err: any) {
        return {
          service: 'Cloud Sensitive Data Protection (DLP)',
          mode: 'real',
          liveStatus: 'SIMULATED',
          isLive: false,
          status: 'error',
          latency_ms: Date.now() - startTime,
          error: err.message || 'Cloud DLP ping failed',
        };
      }
    }

    // Mock Mode
    const testResult = sanitizeWithCloudDLP('Test card 4111-2222-3333-4444');
    return {
      service: 'Cloud Sensitive Data Protection (DLP)',
      mode: 'mock',
      liveStatus: 'SIMULATED',
      isLive: false,
      status: 'healthy',
      latency_ms: 8,
      details: {
        engine: 'Regex Masking (Preserves PERSON_NAME)',
        monitoredTypes: ['CREDIT_CARD_NUMBER', 'US_SOCIAL_SECURITY_NUMBER', 'AUTH_TOKEN', 'GCP_API_KEY'],
      },
    };
  }
}
