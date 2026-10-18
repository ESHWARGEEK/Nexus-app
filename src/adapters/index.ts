import { GenAIAdapter } from './genaiAdapter';
import { SearchAdapter } from './searchAdapter';
import { STTAdapter } from './sttAdapter';
import { DLPAdapter } from './dlpAdapter';
import { StoreAdapter } from './storeAdapter';
import { AnalyticsAdapter } from './analyticsAdapter';
import { AuthAdapter } from './authAdapter';
import { ExportAdapter } from './exportAdapter';
import { DocumentAIAdapter } from './documentAiAdapter';
import { ServiceHealthCheck } from './types';

export const genAIAdapter = new GenAIAdapter();
export const searchAdapter = new SearchAdapter();
export const sttAdapter = new STTAdapter();
export const dlpAdapter = new DLPAdapter();
export const storeAdapter = new StoreAdapter();
export const analyticsAdapter = new AnalyticsAdapter();
export const authAdapter = new AuthAdapter();
export const exportAdapter = new ExportAdapter();
export const documentAIAdapter = new DocumentAIAdapter();

export async function checkAllServicesHealth(): Promise<{
  timestamp: string;
  all_healthy: boolean;
  services: ServiceHealthCheck[];
}> {
  const checks = await Promise.all([
    genAIAdapter.healthCheck(),
    searchAdapter.healthCheck(),
    sttAdapter.healthCheck(),
    dlpAdapter.healthCheck(),
    storeAdapter.healthCheck(),
    analyticsAdapter.healthCheck(),
    authAdapter.healthCheck(),
    exportAdapter.healthCheck(),
    documentAIAdapter.healthCheck(),
  ]);

  const allHealthy = checks.every(c => c.status === 'healthy');

  return {
    timestamp: new Date().toISOString(),
    all_healthy: allHealthy,
    services: checks,
  };
}

export * from './types';
export * from './authHelper';
export { 
  GenAIAdapter, 
  SearchAdapter, 
  STTAdapter, 
  DLPAdapter, 
  StoreAdapter, 
  AnalyticsAdapter, 
  AuthAdapter, 
  ExportAdapter,
  DocumentAIAdapter 
};
