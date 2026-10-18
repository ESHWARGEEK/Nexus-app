export type UserRole = 'eng-core' | 'security' | 'leadership' | 'admin';

export function isUserAdmin(_user?: { role?: string; orgRole?: string; email?: string } | null): boolean {
  // Role-based restrictions removed: all authenticated users have full administrative and data access
  return true;
}

export type SystemUIState = 'listening' | 'grounded' | 'refused' | 'export_locked';

export interface SentenceProvenance {
  sentence_text: string;
  section_title: string;
  source_speaker: string;
  source_timestamp_ms: number;
  cited_doc_id?: string;
  cited_doc_title?: string;
  cited_section?: string;
  confidence_score?: number;
}
export interface Org {
  id: string;
  name: string;
  createdBy: string;
  createdAt?: string;
}

export type OrgMemberRole = 'admin' | 'member';
export type OrgMemberStatus = 'invited' | 'active';

export interface OrgMember {
  email: string;
  role: OrgMemberRole;
  groups: string[]; // array of groupIds
  status: OrgMemberStatus;
  uid?: string; // set on first sign-in
  invitedAt?: string;
}

export interface OrgGroup {
  id: string;
  name: string;
}

export interface OrgDocument {
  id: string;
  title: string;
  allowedGroups: string[]; // array of groupIds
  status: 'active' | 'archived' | 'draft';
  category?: 'architecture_rfc' | 'security_policy' | 'compliance_standard' | 'regulatory_standard' | 'operational_runbook' | 'meeting_transcript';
  summary?: string;
  classification?: Classification;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
  idToken?: string;
  orgId?: string;
  orgRole?: OrgMemberRole;
  groups?: string[];
}

export type Classification = 'internal' | 'confidential' | 'restricted';

export interface EnterpriseDocChunk {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  section: string;
  content: string;
  allowed_roles: UserRole[];
  classification: Classification;
  clause_text?: string;
  page_number?: number;
  token_count?: number;
  embedding_id?: string;
  allowed_participants?: string[];
}

export interface EnterpriseDocument {
  id: string;
  title: string;
  category: 'architecture_rfc' | 'security_policy' | 'compliance_standard' | 'regulatory_standard' | 'operational_runbook' | 'meeting_transcript';
  allowed_roles: UserRole[];
  classification: Classification;
  summary: string;
  chunks: EnterpriseDocChunk[];
  allowed_participants?: string[];
  folder?: string;
  file_name?: string;
  file_size_bytes?: number;
  file_type?: string;
  original_format?: string;
  raw_content?: string;
  datastore_id?: string;
  ingested_at?: string;
}

export interface TranscriptChunk {
  id: string;
  meeting_id: string;
  timestamp_offset_ms: number;
  speaker: string;
  speaker_role: string;
  text: string;
  is_final: boolean;
  detected_intent?: 'QUESTION' | 'ARCHITECTURAL_DECISION' | 'ACTION_ITEM' | 'POLICY_SENSITIVE' | 'GENERAL';
  pii_redacted?: boolean;
}

export interface MeetingScenario {
  id: string;
  title: string;
  category: string;
  description: string;
  duration_sec: number;
  invited_participants: {
    name: string;
    email: string;
    role: UserRole;
  }[];
  transcripts: TranscriptChunk[];
  expected_decisions_count: number;
  expected_compliance_flags: number;
}

export interface CitationResult {
  doc_id: string;
  doc_title: string;
  section: string;
  snippet: string;
  relevance_score: number;
  allowed_roles: UserRole[];
  classification: Classification;
  confidence_calibrated: boolean;
  query_matched: string;
  allowed_participants?: string[];
}

export type ComplianceSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY_INFO';

export interface ComplianceFinding {
  id: string;
  policy_id: string;
  policy_title: string;
  clause_reference: string;
  clause_text?: string; // Withheld if user lacks role
  is_restricted_policy: boolean;
  severity: ComplianceSeverity;
  violation_summary: string;
  detected_at_speaker: string;
  remediation_title: string;
  remediation_diff: {
    section_target: string;
    original_text: string;
    replacement_text: string;
  };
  status: 'PENDING' | 'REMEDIATED' | 'OVERRIDDEN';
  resolved_by?: string;
}

export interface LivingDocument {
  id: string;
  title: string;
  type: 'rfc' | 'prd' | 'postmortem';
  version: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
  last_saved_at: string;
  markdown_content: string;
  sections: {
    id: string;
    title: string;
    content: string;
  }[];
  export_locked: boolean;
  lock_reasons: string[];
}

export interface BigQueryMeetingSession {
  meeting_id: string;
  title: string;
  duration_sec: number;
  decisions_count: number;
  compliance_warnings_count: number;
  action_items_count: number;
  time_to_first_answer_ms: number;
  timestamp: string;
  status: 'LIVE' | 'CONCLUDED';
}

export interface HarnessRunMetrics {
  run_id: string;
  timestamp: string;
  evaluated_meetings: number;
  action_item_recall: number; // e.g. 0.92
  action_item_precision: number; // e.g. 0.90
  compliance_catch_rate: number; // e.g. 0.88
  compliance_false_positive_rate: number; // e.g. 0.07
  gold_section_coverage_pct: number; // e.g. 94.2
  p50_latency_ms: number; // e.g. 2350
  p95_latency_ms: number; // e.g. 3420
  draft_isolation_verified: boolean; // Must be true (zero POL-SEC-12 leakage)
  mode: 'audio_stt_live' | 'transcript_direct';
}

export interface WebSocketMessage {
  type: 
    | 'AUTH' 
    | 'AUTH_SUCCESS' 
    | 'TRANSCRIPT_CHUNK' 
    | 'RESEARCH_CITATIONS' 
    | 'COMPLIANCE_FINDING' 
    | 'DRAFT_UPDATE' 
    | 'EXPORT_LOCK_STATUS' 
    | 'SESSION_METRICS' 
    | 'RESET_SESSION';
  payload: any;
}

export interface StoredMeetingTranscript {
  id: string;
  meetSpaceId?: string;
  meetLink?: string;
  title: string;
  hostEmail: string;
  hostName: string;
  allowed_joinees: string[]; // only these emails can query this meeting!
  started_at: string;
  ended_at: string;
  duration_sec: number;
  transcript_chunks: {
    id: string;
    speaker: string;
    speaker_email?: string;
    text: string;
    timestamp_ms: number;
    intent?: string;
  }[];
  summary?: string;
  decisions?: string[];
  action_items?: string[];
  compliance_flags?: string[];
  created_at: string;
}
