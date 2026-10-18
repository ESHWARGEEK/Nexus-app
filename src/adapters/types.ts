import { 
  UserRole, 
  CitationResult, 
  LivingDocument, 
  BigQueryMeetingSession, 
  HarnessRunMetrics,
  Org,
  OrgMember,
  OrgGroup,
  OrgDocument
} from '../types';
import { DLPSanitizeResult } from '../services/dlpService';
import { SearchResponse } from '../services/searchService';
import { WorkspaceExportResult } from '../services/workspaceService';
import { GeminiAgentRequest, GeminiAgentResponse } from '../services/geminiService';

export interface ServiceHealthCheck {
  service: string;
  mode: 'mock' | 'real';
  liveStatus: 'LIVE' | 'SIMULATED';
  isLive: boolean;
  status: 'healthy' | 'error' | 'unconfigured';
  latency_ms: number;
  details?: Record<string, any>;
  error?: string;
}

export interface ISearchAdapter {
  query(query: string, userRoleOrGroups: UserRole | string[], orgId?: string, userEmail?: string): Promise<SearchResponse>;
  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface ISTTAdapter {
  transcribeAudioChunk(audioBuffer: Buffer | ArrayBuffer): Promise<{ text: string; speaker: string; is_final: boolean }>;
  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface IDLPAdapter {
  sanitize(input: string): Promise<DLPSanitizeResult>;
  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface IStoreAdapter {
  saveMeetingSession(session: any): Promise<void>;
  getMeetingSession(id: string): Promise<any>;
  saveArtifact(doc: LivingDocument): Promise<void>;
  
  // Multi-tenant Org Management
  getOrg(orgId: string): Promise<Org | null>;
  saveOrg(orgId: string, org: Org): Promise<void>;
  listOrgs(): Promise<Org[]>;
  findUserMembership(emailLower: string): Promise<{ orgId: string; member: OrgMember; org: Org } | null>;
  getMember(orgId: string, emailLower: string): Promise<OrgMember | null>;
  listMembers(orgId: string): Promise<OrgMember[]>;
  saveMember(orgId: string, emailLower: string, member: OrgMember): Promise<void>;
  deleteMember(orgId: string, emailLower: string): Promise<void>;
  getGroup(orgId: string, groupId: string): Promise<OrgGroup | null>;
  listGroups(orgId: string): Promise<OrgGroup[]>;
  saveGroup(orgId: string, groupId: string, group: OrgGroup): Promise<void>;
  deleteGroup(orgId: string, groupId: string): Promise<void>;
  getDocument(orgId: string, docId: string): Promise<OrgDocument | null>;
  listDocuments(orgId: string): Promise<OrgDocument[]>;
  saveDocument(orgId: string, docId: string, doc: OrgDocument): Promise<void>;
  deleteDocument(orgId: string, docId: string): Promise<void>;
  resetToSeed(): void;

  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface IAnalyticsAdapter {
  insertMeetingSession(session: BigQueryMeetingSession): Promise<void>;
  insertHarnessRun(metrics: HarnessRunMetrics): Promise<void>;
  getSessions(): Promise<BigQueryMeetingSession[]>;
  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface IAuthAdapter {
  verifyToken(token: string): Promise<{ uid: string; email: string; email_verified: boolean; role: UserRole; valid: boolean }>;
  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface IExportAdapter {
  exportGoogleDoc(doc: LivingDocument, oauthToken?: string): Promise<WorkspaceExportResult>;
  healthCheck(): Promise<ServiceHealthCheck>;
}

export interface IGenAIAdapter {
  generate(request: GeminiAgentRequest): Promise<GeminiAgentResponse>;
  healthCheck(): Promise<ServiceHealthCheck>;
}
