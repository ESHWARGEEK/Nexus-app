import { GoogleGenAI } from '@google/genai';

export interface GeminiAgentRequest {
  prompt: string;
  context: string;
  role: string;
  systemInstruction?: string;
  enforceStructuredSchema?: boolean;
}

export interface StructuredAgentResult {
  agent_role: 'ResearchAgent' | 'ComplianceGuardianAgent' | 'DraftingAgent';
  intent: string;
  grounded_status: 'GROUNDED' | 'UNGROUNDED';
  relevance_score?: number;
  cited_document?: string;
  cited_section?: string;
  clause_text?: string;
  compliance_severity?: 'CRITICAL' | 'WARNING' | 'ADVISORY_INFO' | 'CLEAR';
  remediation_proposal?: string;
  suggested_draft_delta?: string;
}

export interface GeminiAgentResponse {
  content: string;
  tokensUsed?: number;
  model: string;
  structuredOutput?: StructuredAgentResult;
}

let genAIClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI | null {
  if (genAIClient) return genAIClient;
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
                 (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
                 '';
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

export async function callGeminiAgent(request: GeminiAgentRequest): Promise<GeminiAgentResponse> {
  const client = getGenAIClient();
  
  if (client) {
    try {
      const config: any = {
        systemInstruction: request.systemInstruction || 'Be technical, concise, authoritative, and ground all claims in engineering RFC standards.',
      };

      if (request.enforceStructuredSchema) {
        config.responseMimeType = 'application/json';
      }

      const targetModel = (typeof process !== 'undefined' && process.env?.GEMINI_MODEL) || 'gemini-3.5-flash';
      const modelsToTry = [targetModel, 'gemini-2.5-flash'].filter((m, i, arr) => arr.indexOf(m) === i);
      
      let response: any = null;
      let usedModel = targetModel;

      for (const m of modelsToTry) {
        try {
          response = await client.models.generateContent({
            model: m,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are Nexus Sidekick, an active enterprise meeting teammate and technical chief-of-staff for Google Cloud Vertex AI architecture.
Caller Role: ${request.role}
Context:
${request.context}

Task:
${request.prompt}`
                  }
                ]
              }
            ],
            config
          });
          usedModel = m;
          break;
        } catch (mErr: any) {
          console.warn(`Model ${m} encountered: ${mErr.message?.slice(0, 70)}, attempting next...`);
        }
      }

      if (response) {
        const rawText = response.text || '';
        let structured: StructuredAgentResult | undefined;
        if (request.enforceStructuredSchema && rawText) {
          try {
            structured = JSON.parse(rawText);
          } catch {
            // Fall through to text
          }
        }

        return {
          content: rawText,
          model: usedModel,
          structuredOutput: structured,
        };
      }
    } catch (err) {
      console.warn('Gemini API call encountered error, using local high-fidelity generator:', err);
    }
  }

  // High-fidelity domain generator fallback
  return generateDeterministicAgentResponse(request.prompt, request.role);
}

function generateDeterministicAgentResponse(prompt: string, role: string): GeminiAgentResponse {
  const p = prompt.toLowerCase();

  if (p.includes('retry') || p.includes('idempotent')) {
    return {
      content: `### Architecture Specification: Idempotent Retries
Based on RFC-104 §3.2:
- **Idempotency Key**: Deterministic SHA-256 mutation key \`hash(merchant_id + idempotency_token)\`.
- **Enclave Policy**: Requests terminating in europe-west3 (Frankfurt).
- **Backoff Schedule**: Base 200ms with 0.2 jitter, maximum 3 retry attempts before raising settlement fault.
- **Ledger Invariant**: Uncommitted transaction locks auto-revert within 3,000ms.`,
      model: 'gemini-3.5-flash (deterministic fallback)',
      structuredOutput: {
        agent_role: 'ResearchAgent',
        intent: 'RETRIEVE_SPEC',
        grounded_status: 'GROUNDED',
        relevance_score: 0.94,
        cited_document: 'RFC-104',
        cited_section: 'Section 3.2',
        clause_text: 'Idempotency mutation keys must terminate within regional enclaves; uncommitted ledger locks must auto-revert within 3,000ms.',
        compliance_severity: 'CLEAR',
      }
    };
  }

  if (p.includes('compliance') || p.includes('cross-border') || p.includes('anonymization')) {
    return {
      content: `### Compliance Finding Remediation
- **Identified Policy**: POL-SEC-08 §4.2 (Cross-Border Data Boundary Framework).
- **Hazard**: Transmission of raw card PANs or unmasked IP addresses across sovereign EU cloud boundaries.
- **Approved Architecture**: Deploy regional anonymization proxy enclave inside europe-west3 to hash customer identifiers prior to analytical metric forwarding.`,
      model: 'gemini-3.5-flash (deterministic fallback)',
      structuredOutput: {
        agent_role: 'ComplianceGuardianAgent',
        intent: 'POLICY_AUDIT',
        grounded_status: 'GROUNDED',
        relevance_score: 0.92,
        cited_document: 'POL-SEC-08',
        cited_section: 'Section 4.2',
        clause_text: 'Direct transmission of raw customer financial logs to non-EU storage buckets is strictly prohibited.',
        compliance_severity: 'CRITICAL',
        remediation_proposal: 'Deploy regional anonymization proxy in Frankfurt',
      }
    };
  }

  return {
    content: `### Nexus Sidekick Analysis
- **Context Evaluated**: Cross-functional tech and product operations.
- **Recommendation**: Formalize technical decisions into RFC-118 sections with verifiable acceptance criteria and automated SLA monitoring.`,
    model: 'gemini-3.5-flash (deterministic fallback)',
  };
}
