import { IAnalyticsAdapter, ServiceHealthCheck } from './types';
import { BigQueryMeetingSession, HarnessRunMetrics } from '../types';
import { INITIAL_BIGQUERY_SESSIONS, RECENT_HARNESS_BENCHMARKS } from '../data/seedData';
import { getADCAccessToken } from './authHelper';

export class AnalyticsAdapter implements IAnalyticsAdapter {
  private mode: 'mock' | 'real';
  private projectId: string;
  private datasetId: string;
  private sessions: BigQueryMeetingSession[] = [...INITIAL_BIGQUERY_SESSIONS];
  private harnessRuns: HarnessRunMetrics[] = [...RECENT_HARNESS_BENCHMARKS];

  constructor() {
    this.mode = (process.env.ANALYTICS_MODE as 'mock' | 'real') || 'mock';
    this.projectId = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-builder-cup-511510';
    this.datasetId = process.env.BIGQUERY_DATASET || 'nexus_analytics';
  }

  async insertMeetingSession(session: BigQueryMeetingSession): Promise<void> {
    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${this.projectId}/datasets/${this.datasetId}/tables/meeting_sessions/insertAll`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            rows: [{ json: session }],
          }),
        });
      } catch (err) {
        console.warn('Real BigQuery insert failed, logging to local buffer:', err);
      }
    }
    this.sessions = [session, ...this.sessions];
  }

  async insertHarnessRun(metrics: HarnessRunMetrics): Promise<void> {
    this.harnessRuns = [metrics, ...this.harnessRuns];
  }

  async getSessions(): Promise<BigQueryMeetingSession[]> {
    return this.sessions;
  }

  async healthCheck(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();

    if (this.mode === 'real') {
      try {
        const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${this.projectId}/datasets/${this.datasetId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const headers: Record<string, string> = {};
        const token = await getADCAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        const res = await fetch(endpoint, { 
          method: 'GET',
          headers,
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const isLive = res.status >= 200 && res.status < 300;

        return {
          service: 'Google Cloud BigQuery',
          mode: 'real',
          liveStatus: isLive ? 'LIVE' : 'SIMULATED',
          isLive,
          status: isLive ? 'healthy' : 'unconfigured',
          latency_ms: latency,
          details: { 
            dataset: this.datasetId, 
            httpStatus: res.status,
            projectId: this.projectId,
            auth: isLive ? 'ADC Authenticated' : `Endpoint returned HTTP ${res.status} (Fallback active)`,
          },
          error: !isLive ? `BigQuery returned HTTP ${res.status}` : undefined,
        };
      } catch (err: any) {
        return {
          service: 'Google Cloud BigQuery',
          mode: 'real',
          liveStatus: 'SIMULATED',
          isLive: false,
          status: 'error',
          latency_ms: Date.now() - startTime,
          error: err.message || 'BigQuery ping failed',
          details: { dataset: this.datasetId },
        };
      }
    }

    return {
      service: 'Google Cloud BigQuery',
      mode: 'mock',
      liveStatus: 'SIMULATED',
      isLive: false,
      status: 'healthy',
      latency_ms: 6,
      details: {
        dataset: `${this.datasetId} (in-memory analytics buffer)`,
      },
    };
  }
}
