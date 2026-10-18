import { IStoreAdapter, ServiceHealthCheck } from './types';
import { LivingDocument, Org, OrgMember, OrgGroup, OrgDocument } from '../types';
import { getADCAccessToken } from './authHelper';

function encodeFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[key] = { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(v => (typeof v === 'string' ? { stringValue: v } : { stringValue: JSON.stringify(v) })),
        },
      };
    } else if (typeof val === 'object' && val !== null) {
      fields[key] = { mapValue: { fields: encodeFirestoreFields(val) } };
    }
  }
  return fields;
}

function decodeFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [key, valObj] of Object.entries(fields)) {
    if (valObj.stringValue !== undefined) result[key] = valObj.stringValue;
    else if (valObj.integerValue !== undefined) result[key] = parseInt(valObj.integerValue, 10);
    else if (valObj.doubleValue !== undefined) result[key] = valObj.doubleValue;
    else if (valObj.booleanValue !== undefined) result[key] = valObj.booleanValue;
    else if (valObj.arrayValue !== undefined) {
      result[key] = (valObj.arrayValue.values || []).map((v: any) => v.stringValue ?? decodeFirestoreFields(v.mapValue?.fields || {}));
    } else if (valObj.mapValue !== undefined) {
      result[key] = decodeFirestoreFields(valObj.mapValue.fields || {});
    }
  }
  return result;
}

export class StoreAdapter implements IStoreAdapter {
  private mode: 'mock' | 'real';
  private projectId: string;
  private databaseId: string;
  private location: string;
  private inMemoryMeetings: Map<string, any> = new Map();
  private inMemoryArtifacts: Map<string, LivingDocument> = new Map();

  // Multi-tenant in-memory storage maps
  private inMemoryOrgs: Map<string, Org> = new Map();
  private inMemoryMembers: Map<string, Map<string, OrgMember>> = new Map(); // orgId -> (emailLower -> OrgMember)
  private inMemoryGroups: Map<string, Map<string, OrgGroup>> = new Map();   // orgId -> (groupId -> OrgGroup)
  private inMemoryDocuments: Map<string, Map<string, OrgDocument>> = new Map(); // orgId -> (docId -> OrgDocument)

  constructor() {
    this.mode = (process.env.STORE_MODE as 'mock' | 'real') || 'mock';
    this.projectId = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-builder-cup-511510';
    this.databaseId = process.env.FIRESTORE_DATABASE_ID || process.env.DATABASE_ID || '(default)';
    this.location = process.env.FIRESTORE_LOCATION || 'us-central1';

    this.resetToSeed();
  }

  /**
   * Seeds demo org "Acme" with:
   * - groups: Engineering (eng-core), Security (security), Leadership (leadership)
   * - members: Alice (Engineering, admin) and Marcus (Security, member)
   * - documents: RFC-104 (eng-core, security, leadership), POL-SEC-08 (eng-core, security, leadership), POL-SEC-12 (security, leadership)
   */
  resetToSeed(): void {
    this.inMemoryOrgs.clear();
    this.inMemoryMembers.clear();
    this.inMemoryGroups.clear();
    this.inMemoryDocuments.clear();

    const acmeOrg: Org = {
      id: 'acme',
      name: 'Acme',
      createdBy: 'alice@acme.corp',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.inMemoryOrgs.set('acme', acmeOrg);

    const acmeGroups = new Map<string, OrgGroup>();
    acmeGroups.set('eng-core', { id: 'eng-core', name: 'Engineering' });
    acmeGroups.set('security', { id: 'security', name: 'Security' });
    acmeGroups.set('leadership', { id: 'leadership', name: 'Leadership' });
    this.inMemoryGroups.set('acme', acmeGroups);

    const acmeMembers = new Map<string, OrgMember>();
    acmeMembers.set('alice@acme.corp', {
      email: 'alice@acme.corp',
      role: 'admin',
      groups: ['eng-core'],
      status: 'active',
      uid: 'user_alice',
      invitedAt: '2026-01-01T00:00:00.000Z',
    });
    acmeMembers.set('marcus@acme.corp', {
      email: 'marcus@acme.corp',
      role: 'member',
      groups: ['security'],
      status: 'active',
      uid: 'user_marcus',
      invitedAt: '2026-01-01T00:00:00.000Z',
    });
    this.inMemoryMembers.set('acme', acmeMembers);

    const acmeDocs = new Map<string, OrgDocument>();
    acmeDocs.set('RFC-104', {
      id: 'RFC-104',
      title: 'RFC-104: Payment Gateway Architecture v2.4',
      allowedGroups: ['eng-core', 'security', 'leadership'],
      status: 'active',
      category: 'architecture_rfc',
      classification: 'internal',
      summary: 'Standardized distributed payment processing specifications, idempotent retry patterns, and EU regional tokenization vault topologies.',
    });
    acmeDocs.set('POL-SEC-08', {
      id: 'POL-SEC-08',
      title: 'POL-SEC-08: Cross-Border Data Transfer Framework',
      allowedGroups: ['eng-core', 'security', 'leadership'],
      status: 'active',
      category: 'security_policy',
      classification: 'internal',
      summary: 'Corporate compliance standard governing European Union customer personal data, telemetry aggregation, and transatlantic transfer mechanisms.',
    });
    acmeDocs.set('POL-SEC-12', {
      id: 'POL-SEC-12',
      title: 'POL-SEC-12: Executive Key Custody & HSM Access Standard',
      allowedGroups: ['security', 'leadership'],
      status: 'active',
      category: 'regulatory_standard',
      classification: 'restricted',
      summary: 'Confidential corporate standard detailing multi-party threshold cryptography, cloud HSM partition access, and executive signing key rotation protocols.',
    });
    this.inMemoryDocuments.set('acme', acmeDocs);
  }

  // --- Multi-tenant Org Management Methods ---

  async getOrg(orgId: string): Promise<Org | null> {
    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}`;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        const res = await fetch(endpoint, { headers });
        if (res.ok) {
          const data = await res.json();
          const decoded = decodeFirestoreFields(data.fields);
          return { id: orgId, name: decoded.name, createdBy: decoded.createdBy, createdAt: decoded.createdAt };
        }
      } catch (err) {
        console.warn('Real Firestore getOrg error, fallback to in-memory:', err);
      }
    }
    return this.inMemoryOrgs.get(orgId) || null;
  }

  async saveOrg(orgId: string, org: Org): Promise<void> {
    this.inMemoryOrgs.set(orgId, { ...org, id: orgId });
    if (!this.inMemoryMembers.has(orgId)) this.inMemoryMembers.set(orgId, new Map());
    if (!this.inMemoryGroups.has(orgId)) this.inMemoryGroups.set(orgId, new Map());
    if (!this.inMemoryDocuments.has(orgId)) this.inMemoryDocuments.set(orgId, new Map());

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: encodeFirestoreFields({
              name: org.name,
              createdBy: org.createdBy,
              createdAt: org.createdAt || new Date().toISOString(),
            }),
          }),
        });
      } catch (err) {
        console.warn('Real Firestore saveOrg error:', err);
      }
    }
  }

  async listOrgs(): Promise<Org[]> {
    return Array.from(this.inMemoryOrgs.values());
  }

  /**
   * Look up which org a user belongs to by their lowercased email.
   * Scans all orgs on every request.
   */
  async findUserMembership(emailLower: string): Promise<{ orgId: string; member: OrgMember; org: Org } | null> {
    const cleanEmail = emailLower.toLowerCase().trim();

    if (this.mode === 'real' && this.projectId) {
      try {
        // Query or check each org in Firestore
        for (const [orgId, org] of this.inMemoryOrgs.entries()) {
          const member = await this.getMember(orgId, cleanEmail);
          if (member) return { orgId, member, org };
        }
      } catch (err) {
        console.warn('Real Firestore findUserMembership fallback to in-memory:', err);
      }
    }

    for (const [orgId, membersMap] of this.inMemoryMembers.entries()) {
      const member = membersMap.get(cleanEmail);
      if (member) {
        const org = this.inMemoryOrgs.get(orgId) || { id: orgId, name: orgId, createdBy: cleanEmail };
        return { orgId, member, org };
      }
    }

    return null;
  }

  async getMember(orgId: string, emailLower: string): Promise<OrgMember | null> {
    const cleanEmail = emailLower.toLowerCase().trim();

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}/members/${encodeURIComponent(cleanEmail)}`;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        const res = await fetch(endpoint, { headers });
        if (res.ok) {
          const data = await res.json();
          const decoded = decodeFirestoreFields(data.fields);
          return {
            email: cleanEmail,
            role: decoded.role || 'member',
            groups: decoded.groups || [],
            status: decoded.status || 'active',
            uid: decoded.uid,
            invitedAt: decoded.invitedAt,
          };
        }
      } catch (err) {
        console.warn('Real Firestore getMember error, fallback to in-memory:', err);
      }
    }

    const membersMap = this.inMemoryMembers.get(orgId);
    return membersMap?.get(cleanEmail) || null;
  }

  async listMembers(orgId: string): Promise<OrgMember[]> {
    const membersMap = this.inMemoryMembers.get(orgId);
    return membersMap ? Array.from(membersMap.values()) : [];
  }

  async saveMember(orgId: string, emailLower: string, member: OrgMember): Promise<void> {
    const cleanEmail = emailLower.toLowerCase().trim();
    if (!this.inMemoryMembers.has(orgId)) {
      this.inMemoryMembers.set(orgId, new Map());
    }
    this.inMemoryMembers.get(orgId)!.set(cleanEmail, { ...member, email: cleanEmail });

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}/members/${encodeURIComponent(cleanEmail)}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: encodeFirestoreFields({
              role: member.role,
              groups: member.groups,
              status: member.status,
              uid: member.uid || '',
              invitedAt: member.invitedAt || new Date().toISOString(),
            }),
          }),
        });
      } catch (err) {
        console.warn('Real Firestore saveMember error:', err);
      }
    }
  }

  async deleteMember(orgId: string, emailLower: string): Promise<void> {
    const cleanEmail = emailLower.toLowerCase().trim();
    const membersMap = this.inMemoryMembers.get(orgId);
    if (membersMap) {
      membersMap.delete(cleanEmail);
    }

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}/members/${encodeURIComponent(cleanEmail)}`;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, { method: 'DELETE', headers });
      } catch (err) {
        console.warn('Real Firestore deleteMember error:', err);
      }
    }
  }

  async getGroup(orgId: string, groupId: string): Promise<OrgGroup | null> {
    const groupsMap = this.inMemoryGroups.get(orgId);
    return groupsMap?.get(groupId) || null;
  }

  async listGroups(orgId: string): Promise<OrgGroup[]> {
    const groupsMap = this.inMemoryGroups.get(orgId);
    return groupsMap ? Array.from(groupsMap.values()) : [];
  }

  async saveGroup(orgId: string, groupId: string, group: OrgGroup): Promise<void> {
    if (!this.inMemoryGroups.has(orgId)) {
      this.inMemoryGroups.set(orgId, new Map());
    }
    this.inMemoryGroups.get(orgId)!.set(groupId, { ...group, id: groupId });

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}/groups/${encodeURIComponent(groupId)}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: encodeFirestoreFields({ name: group.name }),
          }),
        });
      } catch (err) {
        console.warn('Real Firestore saveGroup error:', err);
      }
    }
  }

  async deleteGroup(orgId: string, groupId: string): Promise<void> {
    const groupsMap = this.inMemoryGroups.get(orgId);
    if (groupsMap) {
      groupsMap.delete(groupId);
    }

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}/groups/${encodeURIComponent(groupId)}`;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, { method: 'DELETE', headers });
      } catch (err) {
        console.warn('Real Firestore deleteGroup error:', err);
      }
    }
  }

  async getDocument(orgId: string, docId: string): Promise<OrgDocument | null> {
    const docsMap = this.inMemoryDocuments.get(orgId);
    return docsMap?.get(docId) || null;
  }

  async listDocuments(orgId: string): Promise<OrgDocument[]> {
    const docsMap = this.inMemoryDocuments.get(orgId);
    return docsMap ? Array.from(docsMap.values()) : [];
  }

  async saveDocument(orgId: string, docId: string, doc: OrgDocument): Promise<void> {
    if (!this.inMemoryDocuments.has(orgId)) {
      this.inMemoryDocuments.set(orgId, new Map());
    }
    this.inMemoryDocuments.get(orgId)!.set(docId, { ...doc, id: docId });

    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/orgs/${orgId}/documents/${encodeURIComponent(docId)}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        await fetch(endpoint, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: encodeFirestoreFields({
              title: doc.title,
              allowedGroups: doc.allowedGroups,
              status: doc.status,
              category: doc.category || '',
              summary: doc.summary || '',
              classification: doc.classification || 'internal',
            }),
          }),
        });
      } catch (err) {
        console.warn('Real Firestore saveDocument error:', err);
      }
    }
  }

  async deleteDocument(orgId: string, docId: string): Promise<void> {
    const docsMap = this.inMemoryDocuments.get(orgId);
    if (docsMap) {
      docsMap.delete(docId);
    }
  }

  // --- Meeting Sessions & Artifacts ---

  async saveMeetingSession(session: any): Promise<void> {
    if (this.mode === 'real' && this.projectId) {
      try {
        const token = await getADCAccessToken();
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/meetings/${session.id || 'meeting_1'}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (this.projectId) headers['X-Goog-User-Project'] = this.projectId;

        const res = await fetch(endpoint, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: {
              title: { stringValue: session.title || 'Meeting' },
              status: { stringValue: session.status || 'ACTIVE' },
              updatedAt: { stringValue: new Date().toISOString() },
            },
          }),
        });
        if (res.ok) return;
      } catch (err) {
        console.warn('Real Firestore save failed, using in-memory store:', err);
      }
    }
    this.inMemoryMeetings.set(session.id || 'default', session);
  }

  async getMeetingSession(id: string): Promise<any> {
    return this.inMemoryMeetings.get(id) || null;
  }

  async saveArtifact(doc: LivingDocument): Promise<void> {
    this.inMemoryArtifacts.set(doc.id, doc);
  }

  async healthCheck(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();

    if (this.mode === 'real') {
      try {
        const endpoint = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}`;
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
          service: 'Cloud Firestore',
          mode: 'real',
          liveStatus: isLive ? 'LIVE' : 'SIMULATED',
          isLive,
          status: isLive ? 'healthy' : 'unconfigured',
          latency_ms: latency,
          details: { 
            httpStatus: res.status,
            database: this.databaseId,
            location: this.location,
            projectId: this.projectId,
            auth: isLive ? 'ADC Authenticated' : `Endpoint returned HTTP ${res.status} (Fallback active)`,
          },
          error: !isLive ? `Firestore returned HTTP ${res.status}` : undefined,
        };
      } catch (err: any) {
        return {
          service: 'Cloud Firestore',
          mode: 'real',
          liveStatus: 'SIMULATED',
          isLive: false,
          status: 'error',
          latency_ms: Date.now() - startTime,
          error: err.message || 'Firestore ping failed',
        };
      }
    }

    return {
      service: 'Cloud Firestore',
      mode: 'mock',
      liveStatus: 'SIMULATED',
      isLive: false,
      status: 'healthy',
      latency_ms: 8,
      details: {
        database: 'in-memory-firestore',
        collections: ['orgs', 'members', 'groups', 'documents', 'meetings', 'artifacts'],
      },
    };
  }
}
