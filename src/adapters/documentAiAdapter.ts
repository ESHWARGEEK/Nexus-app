import { ServiceHealthCheck } from './types';
import { getADCAccessToken } from './authHelper';

export class DocumentAIAdapter {
  private mode: 'mock' | 'real';
  private projectId: string;
  private location: string;

  constructor() {
    this.mode = (process.env.DOCUMENTAI_MODE as 'mock' | 'real') || 'mock';
    this.projectId = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-builder-cup-511510';
    this.location = process.env.DOCUMENTAI_LOCATION || 'us';
  }

  async healthCheck(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();

    if (this.mode === 'real') {
      try {
        const endpoint = `https://documentai.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/processors`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const headers: Record<string, string> = {};
        const token = await getADCAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        const res = await fetch(endpoint, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const isLive = res.status >= 200 && res.status < 300;

        return {
          service: 'Google Cloud Document AI',
          mode: 'real',
          liveStatus: isLive ? 'LIVE' : 'SIMULATED',
          isLive,
          status: isLive ? 'healthy' : 'unconfigured',
          latency_ms: latency,
          details: {
            httpStatus: res.status,
            location: this.location,
            projectId: this.projectId,
            auth: isLive ? 'ADC Authenticated' : `Endpoint returned HTTP ${res.status} (Fallback active)`,
          },
          error: !isLive ? `Document AI returned HTTP ${res.status}` : undefined,
        };
      } catch (err: any) {
        return {
          service: 'Google Cloud Document AI',
          mode: 'real',
          liveStatus: 'SIMULATED',
          isLive: false,
          status: 'error',
          latency_ms: Date.now() - startTime,
          error: err.message || 'Document AI ping failed',
        };
      }
    }

    return {
      service: 'Google Cloud Document AI',
      mode: 'mock',
      liveStatus: 'SIMULATED',
      isLive: false,
      status: 'healthy',
      latency_ms: 5,
      details: {
        processor: 'Layout Parser (Pre-extracted RFC & Policy seed chunks)',
      },
    };
  }
}
