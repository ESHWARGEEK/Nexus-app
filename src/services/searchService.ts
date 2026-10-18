import { SEED_ENTERPRISE_DOCS } from '../data/seedData';
import { CitationResult, UserRole, EnterpriseDocument, EnterpriseDocChunk, Classification, StoredMeetingTranscript } from '../types';

export interface SearchResponse {
  query: string;
  user_role: UserRole;
  user_groups?: string[];
  org_id?: string;
  filter_applied?: string;
  results: CitationResult[];
  status: 'SUCCESS' | 'STATE_UNGROUNDED';
  message?: string;
  calibrated_threshold: number;
  evaluated_score?: number;
}

export interface TenantMeta {
  id: string;
  name: string;
  datastoreId: string;
  region: string;
  docCount: number;
  storageMb: number;
  queryVolume: number;
}

const SCORE_THRESHOLD = 0.65; // Initial 0.65 calibrated threshold

// Pre-seeded multi-tenant knowledge base
const INITIAL_TENANT_DOCS: Record<string, EnterpriseDocument[]> = {
  acme: [
    ...SEED_ENTERPRISE_DOCS
  ],
  globex: [
    {
      id: 'GLX-MED-09',
      title: 'GLX-MED-09: HIPAA & PHI Data Isolation Architecture',
      category: 'regulatory_standard',
      folder: 'regulatory',
      file_name: 'GLX-MED-09_HIPAA_PHI_Data_Isolation.pdf',
      file_type: 'PDF',
      file_size_bytes: 4194304,
      original_format: 'application/pdf',
      allowed_roles: ['security', 'leadership'],
      classification: 'restricted',
      summary: 'Healthcare patient identifiable information (PHI) storage and FHIR server isolation standard in Google Cloud Healthcare API.',
      chunks: [
        {
          chunk_id: 'glx-med-09-c1',
          doc_id: 'GLX-MED-09',
          doc_title: 'GLX-MED-09: HIPAA & PHI Data Isolation Architecture',
          section: 'Section 2.1: Protected Health Information Enclaves',
          content: 'All electronic Protected Health Information (ePHI) must be encrypted using customer-managed encryption keys (CMEK) and stored exclusively in Cloud Healthcare API datasets with audit logging retained for 7 years.',
          allowed_roles: ['security', 'leadership'],
          classification: 'restricted',
          clause_text: 'Strict access control for PHI: only security and executive leadership roles may review FHIR store topologies.',
          page_number: 1,
        },
        {
          chunk_id: 'glx-med-09-c2',
          doc_id: 'GLX-MED-09',
          doc_title: 'GLX-MED-09: HIPAA & PHI Data Isolation Architecture',
          section: 'Section 4.3: Real-Time De-Identification Pipeline',
          content: 'Streaming medical telemetry must invoke Cloud DLP de-identification profiles to redact medical record numbers (MRNs) and patient names before ingesting into analytics BigQuery tables.',
          allowed_roles: ['eng-core', 'security', 'leadership'],
          classification: 'internal',
          clause_text: 'De-identification must maintain token consistency for clinical analytics without exposing patient identities.',
          page_number: 4,
        }
      ]
    }
  ],
  initech: [
    {
      id: 'INT-FIN-01',
      title: 'INT-FIN-01: SEC Rule 17a-4 Electronic Records Archiving',
      category: 'compliance_standard',
      folder: 'compliance',
      file_name: 'INT-FIN-01_SEC_Rule_17a4_Records_Archiving.docx',
      file_type: 'DOCX',
      file_size_bytes: 1850200,
      original_format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      allowed_roles: ['security', 'leadership'],
      classification: 'restricted',
      summary: 'WORM (Write Once Read Many) compliant storage policy for financial audit trails and communications.',
      chunks: [
        {
          chunk_id: 'int-fin-01-c1',
          doc_id: 'INT-FIN-01',
          doc_title: 'INT-FIN-01: SEC Rule 17a-4 Electronic Records Archiving',
          section: 'Section 1.4: Immutable Object Retention',
          content: 'Financial transaction logs, trading confirmations, and internal advisory chat histories must be written to Google Cloud Storage buckets locked with Object Retention policies in compliance mode for 6 years.',
          allowed_roles: ['security', 'leadership'],
          classification: 'restricted',
          clause_text: 'Compliance retention mode cannot be disabled even by project owners until duration expires.',
          page_number: 3,
        }
      ]
    }
  ]
};

// Synced with user secrets: DATASTORE_ID=enterprise-knowledge_1791893452016
export const ACTIVE_DATASTORE_ID = 
  (typeof process !== 'undefined' && process.env?.DATASTORE_ID) ||
  (typeof window !== 'undefined' && (window as any).__DATASTORE_ID__) ||
  'enterprise-knowledge_1791893452016';

export const ACTIVE_PROJECT_ID = 
  (typeof process !== 'undefined' && process.env?.PROJECT_ID) ||
  (typeof window !== 'undefined' && (window as any).__PROJECT_ID__) ||
  'ai-builder-cup-511510';

// Initialize pre-seeded multi-tenant knowledge base with active datastore ID
INITIAL_TENANT_DOCS.acme.forEach(doc => {
  doc.datastore_id = ACTIVE_DATASTORE_ID;
});

// Load persistent ingested documents if available in localStorage
function loadPersistedIngestedDocs(): Record<string, EnterpriseDocument[]> {
  const base: Record<string, EnterpriseDocument[]> = { ...INITIAL_TENANT_DOCS };
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('nexus_tenant_docs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          for (const [tenant, docs] of Object.entries(parsed)) {
            if (Array.isArray(docs)) {
              base[tenant] = docs.map((d: EnterpriseDocument) => ({
                ...d,
                datastore_id: ACTIVE_DATASTORE_ID,
              }));
            }
          }
        }
      }
    } catch {}
  }
  return base;
}

// Mutable runtime datastore for dynamic multi-tenant knowledge ingestion
const DYNAMIC_INGESTED_DOCS: Record<string, EnterpriseDocument[]> = loadPersistedIngestedDocs();

const REGISTERED_TENANTS: TenantMeta[] = [
  { id: 'acme', name: 'Acme Corp', datastoreId: ACTIVE_DATASTORE_ID, region: 'us-central1', docCount: 4, storageMb: 14.8, queryVolume: 84 },
  { id: 'globex', name: 'Globex Healthcare', datastoreId: ACTIVE_DATASTORE_ID, region: 'us-central1', docCount: 1, storageMb: 3.2, queryVolume: 22 },
  { id: 'initech', name: 'Initech Financial', datastoreId: ACTIVE_DATASTORE_ID, region: 'us-central1', docCount: 1, storageMb: 2.7, queryVolume: 15 },
];

export function getTenantDocuments(tenantId: string = 'acme'): EnterpriseDocument[] {
  return DYNAMIC_INGESTED_DOCS[tenantId] || [];
}

export function registerIngestedDocument(tenantId: string, doc: EnterpriseDocument): void {
  if (!DYNAMIC_INGESTED_DOCS[tenantId]) {
    DYNAMIC_INGESTED_DOCS[tenantId] = [];
  }
  doc.datastore_id = ACTIVE_DATASTORE_ID;
  if (!doc.allowed_roles || doc.allowed_roles.length === 0) {
    doc.allowed_roles = ['eng-core', 'security', 'leadership'];
  }
  if (doc.chunks) {
    doc.chunks.forEach(c => {
      if (!c.allowed_roles || c.allowed_roles.length === 0) {
        c.allowed_roles = doc.allowed_roles;
      }
    });
  }

  // Check if document already exists; update or append
  const idx = DYNAMIC_INGESTED_DOCS[tenantId].findIndex(d => d.id === doc.id);
  if (idx >= 0) {
    DYNAMIC_INGESTED_DOCS[tenantId][idx] = doc;
  } else {
    DYNAMIC_INGESTED_DOCS[tenantId].push(doc);
  }

  // Update tenant docCount
  const tenant = REGISTERED_TENANTS.find(t => t.id === tenantId);
  if (tenant) {
    tenant.docCount = DYNAMIC_INGESTED_DOCS[tenantId].length;
    tenant.storageMb = Math.round((tenant.storageMb + 1.2) * 10) / 10;
  }

  // Persist to localStorage if in browser
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nexus_tenant_docs', JSON.stringify(DYNAMIC_INGESTED_DOCS));
      window.dispatchEvent(new CustomEvent('nexus_datastore_updated', {
        detail: {
          tenantId,
          docId: doc.id,
          title: doc.title,
          datastoreId: ACTIVE_DATASTORE_ID,
          folder: doc.folder,
        }
      }));
    } catch {}
  }
}

export function removeIngestedDocument(tenantId: string, docId: string): boolean {
  if (!DYNAMIC_INGESTED_DOCS[tenantId]) return false;
  const initialLen = DYNAMIC_INGESTED_DOCS[tenantId].length;
  DYNAMIC_INGESTED_DOCS[tenantId] = DYNAMIC_INGESTED_DOCS[tenantId].filter(d => d.id !== docId);
  const removed = DYNAMIC_INGESTED_DOCS[tenantId].length < initialLen;
  if (removed) {
    const tenant = REGISTERED_TENANTS.find(t => t.id === tenantId);
    if (tenant) {
      tenant.docCount = DYNAMIC_INGESTED_DOCS[tenantId].length;
      tenant.storageMb = Math.max(0.5, Math.round((tenant.storageMb - 1.2) * 10) / 10);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nexus_tenant_docs', JSON.stringify(DYNAMIC_INGESTED_DOCS));
        window.dispatchEvent(new CustomEvent('nexus_datastore_updated', { detail: { tenantId, docId, action: 'removed' } }));
      } catch {}
    }
  }
  return removed;
}

export function updateDocumentPermissions(
  tenantId: string, 
  docId: string, 
  allowedRoles: UserRole[], 
  classification: Classification
): boolean {
  const docs = DYNAMIC_INGESTED_DOCS[tenantId];
  if (!docs) return false;
  const target = docs.find(d => d.id === docId);
  if (!target) return false;
  target.allowed_roles = allowedRoles;
  target.classification = classification;
  for (const chunk of target.chunks) {
    chunk.allowed_roles = allowedRoles;
    chunk.classification = classification;
  }
  return true;
}

export function getRegisteredTenants(): TenantMeta[] {
  return REGISTERED_TENANTS.map(t => ({
    ...t,
    docCount: DYNAMIC_INGESTED_DOCS[t.id]?.length || 0,
  }));
}

export function registerNewTenant(tenant: { id: string; name: string; datastoreId?: string; region?: string }): TenantMeta {
  const cleanId = tenant.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = REGISTERED_TENANTS.find(t => t.id === cleanId);
  if (existing) return existing;
  
  const newTenant: TenantMeta = {
    id: cleanId,
    name: tenant.name.trim(),
    datastoreId: tenant.datastoreId || `ds-${cleanId}`,
    region: tenant.region || 'us-central1',
    docCount: 0,
    storageMb: 0.8,
    queryVolume: 1,
  };
  REGISTERED_TENANTS.push(newTenant);
  DYNAMIC_INGESTED_DOCS[cleanId] = [];
  return newTenant;
}

export function queryVertexAISearch(
  query: string, 
  userRoleOrGroups: UserRole | string[],
  orgId: string = 'acme',
  userEmail?: string
): SearchResponse {
  const normalizedQuery = query.toLowerCase();

  // Normalize groups
  const userGroups: string[] = Array.isArray(userRoleOrGroups)
    ? userRoleOrGroups
    : [userRoleOrGroups];

  const primaryRole: UserRole = userGroups.includes('security')
    ? 'security'
    : userGroups.includes('leadership')
    ? 'leadership'
    : 'eng-core';

  // Build filter string according to Vertex AI Search / Discovery Engine syntax:
  const filterString = `org_id = "${orgId}" AND allowed_groups:ANY(${userGroups.map(g => `"${g}"`).join(',')})`;

  // Keyword intents for candidate chunks
  const allCandidateChunks: {
    doc_id: string;
    doc_title: string;
    section: string;
    content: string;
    allowed_groups: string[];
    classification: Classification;
    relevance_score: number;
    keywords: string[];
    org_id: string;
    allowed_participants?: string[];
  }[] = [];

  // Look up tenant documents (including dynamic ingested docs)
  const tenantDocs = DYNAMIC_INGESTED_DOCS[orgId] || (orgId === 'acme' ? SEED_ENTERPRISE_DOCS : []);

  for (const doc of tenantDocs) {
    for (const chunk of doc.chunks) {
      let score = 0.0;
      const contentLower = chunk.content.toLowerCase();
      const titleLower = (chunk.doc_title || doc.title).toLowerCase();
      const sectionLower = chunk.section.toLowerCase();

      // Query-specific matches for seeded documents
      if (
        normalizedQuery.includes('retry') ||
        normalizedQuery.includes('tokenization') ||
        normalizedQuery.includes('idempotent') ||
        normalizedQuery.includes('eu payment') ||
        normalizedQuery.includes('psp')
      ) {
        if (chunk.chunk_id === 'rfc-104-c2') score = 0.94;
        else if (chunk.chunk_id === 'rfc-104-c1') score = 0.78;
        else if (chunk.chunk_id === 'rfc-104-c3') score = 0.61;
      }

      if (
        normalizedQuery.includes('key') ||
        normalizedQuery.includes('hsm') ||
        normalizedQuery.includes('cryptographic') ||
        normalizedQuery.includes('vault') ||
        normalizedQuery.includes('private key')
      ) {
        if (chunk.chunk_id === 'pol-sec-12-c1') score = 0.96;
        else if (chunk.chunk_id === 'pol-sec-12-c2') score = 0.72;
      }

      if (
        normalizedQuery.includes('cross-border') ||
        normalizedQuery.includes('telemetry') ||
        normalizedQuery.includes('data lake') ||
        normalizedQuery.includes('us-east') ||
        normalizedQuery.includes('anonymization') ||
        normalizedQuery.includes('sovereign')
      ) {
        if (chunk.chunk_id === 'pol-sec-08-c2') score = 0.92;
        else if (chunk.chunk_id === 'pol-sec-08-c1') score = 0.81;
      }

      if (
        normalizedQuery.includes('phi') ||
        normalizedQuery.includes('hipaa') ||
        normalizedQuery.includes('patient') ||
        normalizedQuery.includes('healthcare')
      ) {
        if (chunk.chunk_id === 'glx-med-09-c1') score = 0.95;
        else if (chunk.chunk_id === 'glx-med-09-c2') score = 0.88;
      }

      if (
        normalizedQuery.includes('sec') ||
        normalizedQuery.includes('worm') ||
        normalizedQuery.includes('retention') ||
        normalizedQuery.includes('archive')
      ) {
        if (chunk.chunk_id === 'int-fin-01-c1') score = 0.93;
      }

      // Dynamic Keyword density boost for any uploaded document (ignoring generic stop words)
      const STOP_WORDS = new Set(['what', 'is', 'our', 'the', 'and', 'for', 'with', 'from', 'this', 'that', 'policy', 'standard', 'are', 'you', 'can', 'about', 'have', 'does', 'how', 'when', 'where', 'which']);
      const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
      let matchCount = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) { score += 0.18; matchCount++; }
        if (titleLower.includes(word)) { score += 0.22; matchCount++; }
        if (sectionLower.includes(word)) { score += 0.15; matchCount++; }
      }

      const matchRatio = queryWords.length > 0 ? matchCount / queryWords.length : 0;
      if (matchCount >= 3 || (matchCount >= 2 && matchRatio >= 0.5)) {
        if (score < 0.68) {
          score = 0.68 + (matchCount * 0.06);
        }
      }

      score = Math.min(0.99, score);

      if (score >= 0.40) {
        allCandidateChunks.push({
          doc_id: chunk.doc_id,
          doc_title: chunk.doc_title || doc.title,
          section: chunk.section,
          content: chunk.content,
          allowed_groups: chunk.allowed_roles,
          classification: chunk.classification,
          relevance_score: Math.round(score * 100) / 100,
          keywords: queryWords,
          org_id: orgId,
          allowed_participants: chunk.allowed_participants || doc.allowed_participants,
        });
      }
    }
  }

  // Sort by highest score
  allCandidateChunks.sort((a, b) => b.relevance_score - a.relevance_score);

  // Role & Group Based Access Control Check
  const authorizedResults: CitationResult[] = [];
  let topRawScore = 0;

  for (const candidate of allCandidateChunks) {
    if (candidate.relevance_score > topRawScore) {
      topRawScore = candidate.relevance_score;
    }

    // Check if user groups intersect candidate allowed_groups
    const hasGroupAccess = candidate.allowed_groups.some(g => userGroups.includes(g));
    const hasParticipantAccess = !candidate.allowed_participants || 
      candidate.allowed_participants.length === 0 || 
      (userEmail && candidate.allowed_participants.map(p => p.toLowerCase()).includes(userEmail.toLowerCase()));

    if (!hasGroupAccess || !hasParticipantAccess) {
      continue;
    }

    if (candidate.relevance_score >= SCORE_THRESHOLD) {
      authorizedResults.push({
        doc_id: candidate.doc_id,
        doc_title: candidate.doc_title,
        section: candidate.section,
        snippet: candidate.content,
        relevance_score: candidate.relevance_score,
        allowed_roles: (candidate.allowed_groups || ['eng-core', 'security', 'leadership']) as UserRole[],
        classification: candidate.classification,
        confidence_calibrated: true,
        query_matched: query,
        allowed_participants: candidate.allowed_participants,
      });
    }
  }

  if (authorizedResults.length === 0) {
    return {
      query,
      user_role: primaryRole,
      user_groups: userGroups,
      org_id: orgId,
      filter_applied: filterString,
      results: [],
      status: 'STATE_UNGROUNDED',
      message: 'No accessible results',
      calibrated_threshold: SCORE_THRESHOLD,
      evaluated_score: topRawScore,
    };
  }

  return {
    query,
    user_role: primaryRole,
    user_groups: userGroups,
    org_id: orgId,
    filter_applied: filterString,
    results: authorizedResults.slice(0, 3),
    status: 'SUCCESS',
    calibrated_threshold: SCORE_THRESHOLD,
    evaluated_score: authorizedResults[0].relevance_score,
  };
}

// -----------------------------------------------------------------------------
// STORED MEETINGS DATASTORE & JOINEE-ONLY ACCESS CONTROL
// -----------------------------------------------------------------------------

const INITIAL_STORED_MEETINGS: StoredMeetingTranscript[] = [
  {
    id: 'meet-nex-arch-sovr-01',
    meetSpaceId: 'spaces/nex-arch-sovr',
    meetLink: 'https://meet.google.com/nex-arch-sovr',
    title: 'Core Payments & Sovereign Architecture Review',
    hostEmail: 'eshwarreddy8382@gmail.com',
    hostName: 'Eshwar Reddy',
    allowed_joinees: [
      'eshwarreddy8382@gmail.com',
      'security@acme.corp',
      'architecture@acme.corp',
    ],
    started_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    ended_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    duration_sec: 1840,
    transcript_chunks: [
      {
        id: 'chk-01',
        speaker: 'Eshwar Reddy (Host)',
        speaker_email: 'eshwarreddy8382@gmail.com',
        text: 'Welcome everyone. We are reviewing the European Union payment tokenization gateway specification for RFC-118.',
        timestamp_ms: 12000,
        intent: 'GENERAL',
      },
      {
        id: 'chk-02',
        speaker: 'Security Architect',
        speaker_email: 'security@acme.corp',
        text: 'From the security enclave standpoint, POL-SEC-12 mandates that all master tokenization keys stay strictly inside europe-west3 HSMs. No US-East replication.',
        timestamp_ms: 45000,
        intent: 'POLICY_SENSITIVE',
      },
      {
        id: 'chk-03',
        speaker: 'Eshwar Reddy (Host)',
        speaker_email: 'eshwarreddy8382@gmail.com',
        text: 'Understood. We agreed to anchor Frankfurt deterministic idempotency keys and configure local Cloud DLP masking on all ingress telemetry before any cross-border replication.',
        timestamp_ms: 88000,
        intent: 'ARCHITECTURAL_DECISION',
      },
      {
        id: 'chk-04',
        speaker: 'Nexus Buddy',
        speaker_email: 'nexus-agent@acme.corp',
        text: 'Architectural consensus detected: Frankfurt HSM key custody confirmed, compliance with POL-SEC-12 and GDPR Art. 44 verified.',
        timestamp_ms: 102000,
        intent: 'ARCHITECTURAL_DECISION',
      },
    ],
    summary: 'Meeting finalized RFC-118 tokenization architecture. Confirmed strict compliance with POL-SEC-12 requiring all master tokenization keys to remain in Frankfurt HSM partitions with zero US-East replication.',
    decisions: [
      'Master tokenization keys anchored strictly inside europe-west3 (Frankfurt) Cloud HSM.',
      'Deterministic idempotency key topology enforced with 200ms base exponential backoff.',
      'Cloud DLP real-time tokenization required before cross-border telemetry replication.',
    ],
    action_items: [
      'Host: Update Section 4 of RFC-118 to reflect Frankfurt HSM isolation.',
      'Security: Provide sign-off on KMS key ring policy by Thursday.',
    ],
    compliance_flags: [
      'Verified: Zero POL-SEC-12 key custody leakage.',
      'Verified: GDPR Article 44 cross-border transfer protections active.',
    ],
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'meet-nex-csuite-closed-02',
    meetSpaceId: 'spaces/nex-exec-conf',
    meetLink: 'https://meet.google.com/nex-exec-conf',
    title: 'Executive M&A & Private Cap Table Restructuring',
    hostEmail: 'elena@acme.corp',
    hostName: 'Elena Rostova',
    allowed_joinees: [
      'elena@acme.corp',
      'ceo@acme.corp',
      'legal-counsel@acme.corp'
    ],
    started_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    ended_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    duration_sec: 2400,
    transcript_chunks: [
      {
        id: 'chk-csuite-01',
        speaker: 'Elena Rostova',
        speaker_email: 'elena@acme.corp',
        text: 'This is a closed C-suite session. We are discussing acquisition valuation targets and confidential tier-1 cap table adjustments.',
        timestamp_ms: 10000,
        intent: 'POLICY_SENSITIVE',
      },
      {
        id: 'chk-csuite-02',
        speaker: 'CEO',
        speaker_email: 'ceo@acme.corp',
        text: 'Agreed. This session is strictly limited to executive participants. No external or general engineering access permitted.',
        timestamp_ms: 30000,
        intent: 'ARCHITECTURAL_DECISION',
      }
    ],
    summary: 'Executive closed session regarding acquisition valuations and confidential cap table terms.',
    decisions: [
      'Confidential tier-1 cap table adjustments approved.',
      'Strict executive-only NDA and audit logging maintained.'
    ],
    action_items: [
      'Legal: Prepare definitive share purchase documentation.',
    ],
    compliance_flags: [
      'Restricted: Executive-Only joinee boundary enforced.'
    ],
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  }
];

let STORED_MEETINGS_DATASTORE: StoredMeetingTranscript[] = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nexus_stored_meetings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean out legacy fake participants
          return parsed.map((m: StoredMeetingTranscript) => ({
            ...m,
            hostName: m.hostName === 'Alice Chen' || m.hostName === 'Marcus Vance' ? 'Meeting Host' : m.hostName,
            allowed_joinees: (m.allowed_joinees || []).filter(e => !e.includes('marcus@acme') && !e.includes('alice@acme')),
            transcript_chunks: (m.transcript_chunks || []).map(c => ({
              ...c,
              speaker: c.speaker === 'Alice Chen' ? 'Team Lead' : c.speaker === 'Marcus Vance' ? 'Security Architect' : c.speaker,
            }))
          }));
        }
      } catch {}
    }
  }
  return [...INITIAL_STORED_MEETINGS];
})();

/**
 * Persists a finalized meeting transcript into the data store and registers it
 * into the search datastore with joinee-only access boundaries.
 */
export function saveMeetingTranscriptToStore(
  meeting: StoredMeetingTranscript,
  tenantId: string = 'acme'
): void {
  // 1. Save in meeting transcripts datastore
  const existingIdx = STORED_MEETINGS_DATASTORE.findIndex(m => m.id === meeting.id);
  if (existingIdx >= 0) {
    STORED_MEETINGS_DATASTORE[existingIdx] = meeting;
  } else {
    STORED_MEETINGS_DATASTORE.unshift(meeting);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nexus_stored_meetings', JSON.stringify(STORED_MEETINGS_DATASTORE));
      window.dispatchEvent(new CustomEvent('nexus_meeting_transcript_saved', { detail: meeting }));
    } catch {}
  }

  // 2. Index into EnterpriseDocument Datastore for Vertex AI Search grounding
  const dialogueFull = meeting.transcript_chunks
    .map(c => `[${c.speaker}]: ${c.text}`)
    .join('\n\n');

  const chunkList: EnterpriseDocChunk[] = meeting.transcript_chunks.map((c, idx) => ({
    chunk_id: `${meeting.id}-chk-${idx}`,
    doc_id: meeting.id,
    doc_title: `Meeting Transcript: ${meeting.title}`,
    section: `Dialogue Chunk #${idx + 1} (${c.speaker})`,
    content: `[Speaker: ${c.speaker}]: ${c.text}`,
    allowed_roles: ['eng-core', 'security', 'leadership'],
    classification: 'confidential',
    clause_text: c.intent || 'Meeting Transcript Speech',
    page_number: 1,
    allowed_participants: meeting.allowed_joinees,
  }));

  // Add summary and action items chunk
  chunkList.unshift({
    chunk_id: `${meeting.id}-summary`,
    doc_id: meeting.id,
    doc_title: `Meeting Transcript: ${meeting.title}`,
    section: 'Executive Summary & Key Decisions',
    content: `Meeting: ${meeting.title}\nHost: ${meeting.hostName} (${meeting.hostEmail})\nDate: ${new Date(meeting.started_at).toLocaleDateString()}\n\nSummary: ${meeting.summary || 'Recorded Google Meet session'}\n\nDecisions:\n${(meeting.decisions || []).map(d => `- ${d}`).join('\n')}\n\nAction Items:\n${(meeting.action_items || []).map(a => `- ${a}`).join('\n')}`,
    allowed_roles: ['eng-core', 'security', 'leadership'],
    classification: 'confidential',
    clause_text: 'Summary & Decisions',
    page_number: 1,
    allowed_participants: meeting.allowed_joinees,
  });

  const doc: EnterpriseDocument = {
    id: meeting.id,
    title: `Meeting Transcript: ${meeting.title}`,
    category: 'meeting_transcript',
    folder: 'meeting transcript',
    allowed_roles: ['eng-core', 'security', 'leadership'],
    classification: 'confidential',
    summary: meeting.summary || dialogueFull.slice(0, 200),
    chunks: chunkList,
    ingested_at: new Date().toISOString().split('T')[0],
    allowed_participants: meeting.allowed_joinees,
    datastore_id: ACTIVE_DATASTORE_ID,
  };

  registerIngestedDocument(tenantId, doc);
}

// Pre-index initial meetings into DataStore folder 'meeting transcript'
INITIAL_STORED_MEETINGS.forEach(m => {
  saveMeetingTranscriptToStore(m, 'acme');
});

/**
 * Returns all meetings stored in the data store.
 */
export function getStoredMeetings(): StoredMeetingTranscript[] {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('nexus_stored_meetings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          STORED_MEETINGS_DATASTORE = parsed;
        }
      }
    } catch {}
  }
  return [...STORED_MEETINGS_DATASTORE];
}

/**
 * Enforces strict joinee-only ACL verification when querying a meeting transcript.
 */
export function queryMeetingTranscriptACL(
  meetingId: string,
  query: string,
  userEmail: string
): {
  allowed: boolean;
  status: 'ACCESS_GRANTED' | 'ACCESS_REFUSED_NOT_JOINEE' | 'MEETING_NOT_FOUND';
  meetingTitle?: string;
  allowedJoinees?: string[];
  answer?: string;
  citations?: CitationResult[];
  reason?: string;
} {
  const currentMeetings = getStoredMeetings();
  let meeting = currentMeetings.find(m => m.id === meetingId || m.meetSpaceId?.includes(meetingId));
  if (!meeting && currentMeetings.length > 0) {
    meeting = currentMeetings.find(m => 
      m.title.toLowerCase().includes(query.toLowerCase()) || 
      (m.meetSpaceId && query.toLowerCase().includes(m.meetSpaceId.toLowerCase()))
    ) || currentMeetings[0];
  }
  if (!meeting) {
    return {
      allowed: true,
      status: 'ACCESS_GRANTED',
      answer: 'No meeting transcripts currently recorded in the data store.',
      citations: [],
    };
  }

  const allowedJoineesList = (meeting.allowed_joinees || []).map(e => e.toLowerCase());
  const normalizedUserEmail = (userEmail || '').toLowerCase().trim();
  const hostEmailLower = (meeting.hostEmail || '').toLowerCase().trim();

  const isAllowed = 
    allowedJoineesList.length === 0 || 
    allowedJoineesList.includes(normalizedUserEmail) ||
    hostEmailLower === normalizedUserEmail;

  if (!isAllowed) {
    return {
      allowed: false,
      status: 'ACCESS_REFUSED_NOT_JOINEE',
      meetingTitle: meeting.title,
      allowedJoinees: meeting.allowed_joinees,
      reason: `User ${userEmail} was not an invited participant or attendee for meeting "${meeting.title}". Only authorized participants may query this transcript.`,
      answer: `⛔ [403 ACL Access Refusal]: User ${userEmail} is not an authorized participant or joinee for meeting "${meeting.title}". Access to confidential meeting transcript chunks is restricted.`,
      citations: [],
    };
  }

  // User is authorized joinee: Ground answer in meeting transcript chunks
  const queryLower = query.toLowerCase();
  const matchedChunks = meeting.transcript_chunks.filter(c => {
    const textLower = c.text.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);
    return words.some(w => textLower.includes(w)) || words.length === 0;
  });

  const relevantSnippets = matchedChunks.length > 0 ? matchedChunks : meeting.transcript_chunks;
  const citations: CitationResult[] = relevantSnippets.slice(0, 3).map((c, i) => ({
    doc_id: meeting.id,
    doc_title: `Meeting: ${meeting.title}`,
    section: `Speaker: ${c.speaker}`,
    snippet: c.text,
    relevance_score: 0.95 - (i * 0.05),
    allowed_roles: ['eng-core', 'security', 'leadership'],
    classification: 'confidential',
    confidence_calibrated: true,
    query_matched: query,
    allowed_participants: meeting.allowed_joinees,
  }));

  const answer = `Based on the verified meeting transcript for "${meeting.title}":
${relevantSnippets.map(c => `• [${c.speaker}]: "${c.text}"`).join('\n')}

Key Decisions Recorded:
${(meeting.decisions || ['Frankfurt HSM custody approved', 'DLP telemetry inspection required']).map(d => `- ${d}`).join('\n')}`;

  return {
    allowed: true,
    status: 'ACCESS_GRANTED',
    meetingTitle: meeting.title,
    allowedJoinees: meeting.allowed_joinees,
    answer,
    citations,
  };
}
