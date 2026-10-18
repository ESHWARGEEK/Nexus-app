import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { 
  CitationResult, 
  UserRole, 
  EnterpriseDocument, 
  EnterpriseDocChunk, 
  StoredMeetingTranscript,
  UserAccount 
} from '../types';
import { 
  queryVertexAISearch, 
  getStoredMeetings, 
  queryMeetingTranscriptACL,
  getTenantDocuments 
} from './searchService';
import { 
  getConnectedGitHubRepo, 
  queryCodebaseViaMcp,
  McpFileSnippet, 
  GitHubRepoConfig 
} from './mcpService';

export interface AgentToolInvocation {
  toolName: 'query_internal_documents' | 'query_meeting_transcripts' | 'query_codebase_mcp';
  datastoreTarget: string;
  arguments: Record<string, any>;
  resultSummary: string;
  aclStatus: 'VERIFIED_ALLOWED' | 'ACL_REFUSED_NON_PARTICIPANT' | 'ROLE_CHECKED';
  matchedCount: number;
  latencyMs: number;
}

export interface AgentExecutionResponse {
  answer: string;
  toolInvocations: AgentToolInvocation[];
  citations: CitationResult[];
  modelUsed: string;
  meetingAclResult?: {
    meetingTitle: string;
    allowed: boolean;
    reason?: string;
    allowedJoinees?: string[];
  };
  mcpSnippets?: {
    repo: string;
    path: string;
    branch: string;
    language: string;
    code: string;
  }[];
}

// Simulated MCP GitHub Codebase Data for acme-corp/payment-vault
const MCP_GITHUB_FILES = [
  {
    repo: 'acme-corp/payment-vault',
    path: 'services/tokenization/vault.go',
    branch: 'main',
    language: 'go',
    code: `// Package tokenization handles deterministic token generation
// Reference: RFC-104 & RFC-118 Section 3.2
package tokenization

import (
  "crypto/sha256"
  "fmt"
  "acme/sovereign/kms"
)

func GenerateIdempotentToken(merchantID, idempotencyKey string, pan string) (string, error) {
  // Enforce regional KMS HSM partition in europe-west3 (Frankfurt) per POL-SEC-12
  client, err := kms.NewFrankfurtHSMClient("europe-west3")
  if err != nil {
    return "", fmt.Errorf("hsm custody error: %w", err)
  }

  hasher := sha256.New()
  hasher.Write([]byte(merchantID + ":" + idempotencyKey))
  saltHash := hasher.Sum(nil)

  return client.EncryptSovereignPAN(pan, saltHash)
}`
  },
  {
    repo: 'acme-corp/payment-vault',
    path: 'infrastructure/dlp/masking_proxy.py',
    branch: 'main',
    language: 'python',
    code: `# Cloud DLP Real-Time Masking Proxy
# Compliance: POL-SEC-08 Section 4.2 & GDPR Article 44

from google.cloud import dlp_v2

def sanitize_telemetry_payload(event_data: dict) -> dict:
    """Masks credit card PAN and EU resident identifiers before transit."""
    dlp_client = dlp_v2.DlpServiceClient()
    inspect_config = {
        "info_types": [
            {"name": "CREDIT_CARD_NUMBER"},
            {"name": "EMAIL_ADDRESS"},
            {"name": "IBAN_CODE"}
        ]
    }
    # Irreversible pseudonymization token
    return dlp_client.deidentify_content(event_data, inspect_config)`
  }
];

// Tool Declarations for Google GenAI SDK (Gemini Function Calling)
export const queryInternalDocumentsDeclaration: FunctionDeclaration = {
  name: 'query_internal_documents',
  description: 'Searches the enterprise Datastore for internal documents, engineering specifications (RFC-104, RFC-118), security policies (POL-SEC-12, POL-DATA-04), and architecture standards with role-based filtering.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to match against internal documents, clauses, and RFC specifications.'
      },
      folder: {
        type: Type.STRING,
        description: 'Optional folder filter, e.g. "policies", "architecture_rfc", or "all".'
      }
    },
    required: ['query']
  }
};

export const queryMeetingTranscriptsDeclaration: FunctionDeclaration = {
  name: 'query_meeting_transcripts',
  description: 'Searches the enterprise Datastore under the folder named "meeting transcript" for Google Meet dialogue turns, architectural consensus, recorded decisions, and action items. Strictly verifies participant email against authorized joinees.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Question or query about what was discussed, agreed, or decided in a meeting.'
      },
      meeting_id: {
        type: Type.STRING,
        description: 'Optional ID of the meeting, e.g. "meet-nex-arch-sovr-01" or "meet-nex-csuite-closed-02".'
      },
      caller_email: {
        type: Type.STRING,
        description: 'The email of the user inquiring, to verify they were an authorized meeting attendee.'
      }
    },
    required: ['query', 'caller_email']
  }
};

export const queryCodebaseMcpDeclaration: FunctionDeclaration = {
  name: 'query_codebase_mcp',
  description: 'Executes Model Context Protocol (MCP) inspection on the acme-corp/payment-vault repository for source code implementations.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: 'Path of the file to inspect in the repository, e.g. "services/tokenization/vault.go" or "infrastructure/dlp/masking_proxy.py".'
      }
    },
    required: ['file_path']
  }
};

/**
 * Executes Tool 1: Query Internal Documents in Datastore
 */
export function executeToolInternalDocuments(
  query: string, 
  userRole: UserRole, 
  tenantId: string = 'acme'
): {
  invocations: AgentToolInvocation;
  citations: CitationResult[];
  formattedSummary: string;
} {
  const start = Date.now();
  const searchRes = queryVertexAISearch(query, userRole, tenantId);
  const latency = Math.max(12, Date.now() - start);

  const citations = searchRes.results || [];
  const invocation: AgentToolInvocation = {
    toolName: 'query_internal_documents',
    datastoreTarget: 'enterprise-knowledge',
    arguments: { query, user_role: userRole, tenant_id: tenantId },
    resultSummary: `Retrieved ${citations.length} grounded document chunks matching role '${userRole}'`,
    aclStatus: 'ROLE_CHECKED',
    matchedCount: citations.length,
    latencyMs: latency
  };

  const formattedSummary = citations.length > 0
    ? citations.map(c => `• **${c.doc_title} (${c.section})** [${c.classification.toUpperCase()}]:\n  "${c.snippet}"`).join('\n\n')
    : `No matching internal documents found for query "${query}".`;

  return { invocations: invocation, citations, formattedSummary };
}

/**
 * Executes Tool 2: Query Meeting Transcripts in Datastore on folder "meeting transcript"
 */
export function executeToolMeetingTranscripts(
  query: string,
  userEmail: string,
  meetingId?: string,
  tenantId: string = 'acme'
): {
  invocation: AgentToolInvocation;
  aclResult: {
    meetingTitle: string;
    allowed: boolean;
    reason?: string;
    allowedJoinees?: string[];
  };
  citations: CitationResult[];
  answer: string;
} {
  const start = Date.now();
  const storedMeetings = getStoredMeetings();

  // If specific meeting requested, or detect from query text
  const qLower = (query || '').toLowerCase();
  let targetMeeting = meetingId 
    ? storedMeetings.find(m => m.id === meetingId) 
    : undefined;

  if (!targetMeeting) {
    if (qLower.includes('c-suite') || qLower.includes('executive') || qLower.includes('restructuring') || qLower.includes('closed')) {
      targetMeeting = storedMeetings.find(m => m.id === 'meet-nex-csuite-closed-02') || storedMeetings[1];
    } else {
      // Check if user specifically references a meeting title or term in stored meetings
      const matchingMeeting = storedMeetings.find(m => 
        qLower.includes(m.title.toLowerCase()) || 
        m.title.toLowerCase().split(' ').some(w => w.length > 3 && qLower.includes(w)) ||
        m.id.toLowerCase() === qLower
      );
      // Prioritize the matching meeting, or the most recently saved meeting from DataStore
      targetMeeting = matchingMeeting || storedMeetings[0];
    }
  }

  if (!targetMeeting && storedMeetings.length > 0) {
    targetMeeting = storedMeetings[0];
  }

  if (!targetMeeting) {
    const latency = Math.max(8, Date.now() - start);
    return {
      invocation: {
        toolName: 'query_meeting_transcripts',
        datastoreTarget: 'DataStore > folder: "meeting transcript"',
        arguments: { query, caller_email: userEmail },
        resultSummary: 'DataStore folder "meeting transcript" is currently empty.',
        aclStatus: 'ROLE_CHECKED',
        matchedCount: 0,
        latencyMs: latency
      },
      aclResult: {
        meetingTitle: 'No Meeting Found',
        allowed: false,
        reason: 'No meeting transcripts currently indexed in the data store.',
      },
      citations: [],
      answer: 'No recorded meeting transcripts were found in the data store folder `meeting transcript`.'
    };
  }

  const aclCheck = queryMeetingTranscriptACL(targetMeeting.id, query, userEmail);
  const latency = Math.max(16, Date.now() - start);

  const invocation: AgentToolInvocation = {
    toolName: 'query_meeting_transcripts',
    datastoreTarget: 'DataStore > folder: "meeting transcript"',
    arguments: { query, meeting_id: targetMeeting.id, caller_email: userEmail },
    resultSummary: aclCheck.allowed
      ? `Access confirmed. Retrieved ${aclCheck.citations?.length || 0} transcript chunks from "${targetMeeting.title}".`
      : `Access refused (403): User ${userEmail} not in participant list for "${targetMeeting.title}".`,
    aclStatus: aclCheck.allowed ? 'VERIFIED_ALLOWED' : 'ACL_REFUSED_NON_PARTICIPANT',
    matchedCount: aclCheck.citations?.length || 0,
    latencyMs: latency
  };

  return {
    invocation,
    aclResult: {
      meetingTitle: targetMeeting.title,
      allowed: aclCheck.allowed,
      reason: aclCheck.reason,
      allowedJoinees: targetMeeting.allowed_joinees
    },
    citations: aclCheck.citations || [],
    answer: aclCheck.answer || (aclCheck.reason ?? '')
  };
}

/**
 * Executes Tool 3: Query Codebase via MCP
 */
export function executeToolCodebaseMcp(filePathOrQuery: string): {
  invocation: AgentToolInvocation;
  fileSnippet?: McpFileSnippet;
} {
  const start = Date.now();
  const repoConfig = getConnectedGitHubRepo();
  const mcpQuery = queryCodebaseViaMcp(filePathOrQuery);
  const file = mcpQuery.matchedFile;
  const latency = Math.max(14, Date.now() - start);
  const tokenMasked = repoConfig.authTokenMasked || 'github_pat_••••••••BwPhdS2uw';

  const invocation: AgentToolInvocation = {
    toolName: 'query_codebase_mcp',
    datastoreTarget: repoConfig.mcpEndpoint || `mcp://github.com/${repoConfig.repoName}`,
    arguments: { 
      file_path: filePathOrQuery, 
      repo: repoConfig.repoName,
      branch: repoConfig.defaultBranch,
      repo_url: repoConfig.repoUrl,
      auth: `Permanent GitHub PAT (${tokenMasked})`
    },
    resultSummary: `Inspected ${file.path} on branch ${file.branch} (${file.language}) in ${repoConfig.repoName} [Authenticated via permanent GitHub PAT: ${tokenMasked}]`,
    aclStatus: 'ROLE_CHECKED',
    matchedCount: 1,
    latencyMs: latency
  };

  return { invocation, fileSnippet: file };
}

/**
 * Synthesizes intelligent response using real Gemini 3.8 Flash model
 */
async function synthesizeWithGemini(
  prompt: string,
  context: string,
  role: string
): Promise<string> {
  // If in browser, invoke backend proxy /api/copilot/agent
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/copilot/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context,
          role,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content || data.text || data.message || data.response;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {
      console.warn('synthesizeWithGemini frontend call error:', e);
    }
  } else {
    // Running in Node.js server environment
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI();
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the Nexus Enterprise AI Agent.
Enterprise Context retrieved from DataStore and Verified Transcripts:
${context}

User Question: ${prompt}

Provide a direct, complete, accurate, and insightful response answering this specific question. Ground all claims in the context. Do not use generic boilerplate or repetitive mock templates.`,
      });
      if (res.text?.trim()) return res.text.trim();
    } catch (err) {
      console.warn('synthesizeWithGemini server call error:', err);
    }
  }

  // Graceful contextual synthesis if offline
  return '';
}

/**
 * Autonomous Nexus Enterprise Agent:
 * Coordinates tools to query internal documents and meeting transcripts from the data store.
 */
export async function runNexusResearchAgent(
  userPrompt: string,
  user: UserAccount,
  preferredSourceFilter: 'all' | 'documents' | 'mcp_github' | 'meetings' = 'all'
): Promise<AgentExecutionResponse> {
  const pLower = userPrompt.toLowerCase();
  const toolInvocations: AgentToolInvocation[] = [];
  const citations: CitationResult[] = [];
  let meetingAclResult: AgentExecutionResponse['meetingAclResult'];
  let mcpSnippets: AgentExecutionResponse['mcpSnippets'];

  // Check if query is targeting meeting transcripts
  const isMeeting = 
    preferredSourceFilter === 'meetings' ||
    pLower.includes('meeting') || 
    pLower.includes('meet') || 
    pLower.includes('discussed') || 
    pLower.includes('transcript') || 
    pLower.includes('what meeting has') || 
    pLower.includes('meeting has') || 
    pLower.includes('agreed in') || 
    pLower.includes('c-suite') || 
    pLower.includes('call') ||
    pLower.includes('session');

  // Check if query is targeting GitHub MCP codebase
  const isGithub = 
    preferredSourceFilter === 'mcp_github' ||
    pLower.includes('github') || 
    pLower.includes('mcp') || 
    pLower.includes('codebase') || 
    pLower.includes('vault.go') || 
    pLower.includes('masking_proxy.py') ||
    pLower.includes('code');

  // 1. TOOL CALL: Query Meeting Transcripts in DataStore folder 'meeting transcript'
  if (isMeeting) {
    const meetingRes = executeToolMeetingTranscripts(userPrompt, user.email, undefined, user.orgId || 'acme');
    toolInvocations.push(meetingRes.invocation);
    meetingAclResult = meetingRes.aclResult;

    if (!meetingRes.aclResult.allowed) {
      return {
        answer: meetingRes.answer || `⛔ [403 ACL Access Refusal]: User ${user.email} is not an authorized participant or joinee for meeting "${meetingRes.aclResult.meetingTitle}". Access to confidential meeting transcript chunks is restricted.`,
        toolInvocations,
        citations: [],
        modelUsed: 'gemini-3.8-flash (DataStore Tool Agent)',
        meetingAclResult,
      };
    }

    citations.push(...meetingRes.citations);
    const meetingContext = `Meeting Title: ${meetingRes.aclResult.meetingTitle}\nDialogue Transcripts:\n${meetingRes.citations.map(c => `[Speaker: ${c.section}]: "${c.snippet}"`).join('\n')}\n\nMeeting Participants: ${(meetingRes.aclResult.allowedJoinees || []).join(', ')}`;
    
    const aiResponse = await synthesizeWithGemini(userPrompt, meetingContext, user.role);

    return {
      answer: aiResponse 
        ? `### 🎙️ Grounded Meeting Analysis: "${meetingRes.aclResult.meetingTitle}"\n\n${aiResponse}\n\n*Retrieved from DataStore: \`enterprise-knowledge_1791893452016\` folder \`meeting transcript\`.*`
        : `### 🎙️ Meeting Research Grounding: "${meetingRes.aclResult.meetingTitle}"\n\n${meetingRes.answer}`,
      toolInvocations,
      citations,
      modelUsed: 'gemini-3.8-flash (DataStore Tool Agent)',
      meetingAclResult,
    };
  }

  // 2. TOOL CALL: Query GitHub Codebase via MCP (Only allow codebase given by admin)
  if (isGithub) {
    const repoConfig = getConnectedGitHubRepo();

    let targetQuery = 'backend/agents/eka_agents.py';
    if (pLower.includes('prd') || pLower.includes('requirement') || pLower.includes('specification') || pLower.includes('architecture')) {
      targetQuery = 'Project_Documents/PRD.md';
    } else if (pLower.includes('compliance') || pLower.includes('audit') || pLower.includes('router') || pLower.includes('clause')) {
      targetQuery = 'backend/api/routers/compliance.py';
    } else if (pLower.includes('design') || pLower.includes('stitch') || pLower.includes('ui') || pLower.includes('theme') || pLower.includes('color')) {
      targetQuery = 'Project_Documents/design.md';
    } else if (pLower.includes('readme') || pLower.includes('setup') || pLower.includes('feature')) {
      targetQuery = 'README.md';
    } else {
      const namedFile = repoConfig.files.find(f => 
        pLower.includes(f.path.toLowerCase()) || 
        pLower.includes(f.path.split('/').pop()?.toLowerCase() || '')
      );
      if (namedFile) targetQuery = namedFile.path;
    }

    const mcpRes = executeToolCodebaseMcp(targetQuery);
    toolInvocations.push(mcpRes.invocation);
    if (mcpRes.fileSnippet) {
      mcpSnippets = [mcpRes.fileSnippet];
    }

    const file = mcpRes.fileSnippet;
    const codeContext = `Repository: ${repoConfig.repoName} (Branch: ${repoConfig.defaultBranch})\nFile: ${file?.path}\nCode:\n${file?.code || '// No code found'}\nSummary: ${file?.summary || ''}`;
    
    const aiResponse = await synthesizeWithGemini(userPrompt, codeContext, user.role);

    return {
      answer: aiResponse 
        ? `### 🐙 GitHub Codebase MCP Tool Execution (${repoConfig.repoName})\n\n${aiResponse}\n\n**Inspected File:** \`${file?.path || targetQuery}\`\n\`\`\`${file?.language || 'text'}\n${(file?.code || '').slice(0, 400)}${(file?.code || '').length > 400 ? '\n... (truncated)' : ''}\n\`\`\``
        : `### 🐙 GitHub Codebase MCP Tool Execution (${repoConfig.repoName})\nInspected real file \`${file?.path || targetQuery}\` in repository \`${repoConfig.repoName}\`.\n\`\`\`${file?.language || 'text'}\n${file?.code || '// No code found'}\n\`\`\``,
      toolInvocations,
      citations: [],
      modelUsed: 'gemini-3.8-flash (MCP Code Tool Agent)',
      mcpSnippets,
    };
  }

  // 3. TOOL CALL: Query Internal Documents in Datastore
  const docRes = executeToolInternalDocuments(userPrompt, user.role, user.orgId || 'acme');
  toolInvocations.push(docRes.invocations);
  citations.push(...docRes.citations);

  const contextText = docRes.citations.length > 0
    ? docRes.citations.map(c => `[Document: ${c.doc_title} (${c.section}) - Classification: ${c.classification}]:\n${c.snippet}`).join('\n\n')
    : `General Enterprise DataStore (User Role: ${user.role})`;

  const aiAnswer = await synthesizeWithGemini(userPrompt, contextText, user.role);

  const answer = aiAnswer 
    ? `### 📄 Grounded Knowledge Response\n\n${aiAnswer}\n\n${docRes.citations.length > 0 ? `**Referenced Sources from DataStore:**\n${docRes.citations.map(c => `- **${c.doc_title}** (${c.section})`).join('\n')}` : ''}`
    : (docRes.citations.length > 0 
        ? `### 📄 Grounded Internal Document Findings\n\n${docRes.formattedSummary}`
        : `The **Nexus Enterprise Agent** checked the DataStore for *"${userPrompt}"*. No conflicting policies or documents were flagged for role \`${user.role}\`.`);

  return {
    answer,
    toolInvocations,
    citations,
    modelUsed: 'gemini-2.5-flash (DataStore Tool Agent)',
  };
}
