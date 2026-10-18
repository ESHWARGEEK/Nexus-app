/**
 * Cloud Sensitive Data Protection (DLP) Service
 * Sanitizes transcripts and prompt payloads using inspection rules:
 * - CREDIT_CARD_NUMBER
 * - US_SOCIAL_SECURITY_NUMBER
 * - AUTH_TOKEN
 * - GCP_API_KEY
 * 
 * Note: PERSON_NAME is explicitly excluded to preserve speaker diarization tags.
 */

export interface DLPSanitizeResult {
  originalText: string;
  sanitizedText: string;
  findingsCount: number;
  redactedInfoTypes: string[];
}

export function sanitizeWithCloudDLP(input: string): DLPSanitizeResult {
  let sanitized = input;
  const redactedTypes: string[] = [];
  let count = 0;

  // Credit Card Numbers (13-19 digits with optional hyphens/spaces)
  const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g;
  if (ccRegex.test(sanitized)) {
    sanitized = sanitized.replace(ccRegex, '[REDACTED_CREDIT_CARD]');
    redactedTypes.push('CREDIT_CARD_NUMBER');
    count++;
  }

  // Common formatted card groups (e.g. 4111-2222-3333-4444)
  const ccGroupRegex = /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g;
  if (ccGroupRegex.test(sanitized)) {
    sanitized = sanitized.replace(ccGroupRegex, '[REDACTED_CREDIT_CARD]');
    if (!redactedTypes.includes('CREDIT_CARD_NUMBER')) {
      redactedTypes.push('CREDIT_CARD_NUMBER');
    }
    count++;
  }

  // US SSN (XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  if (ssnRegex.test(sanitized)) {
    sanitized = sanitized.replace(ssnRegex, '[REDACTED_SSN]');
    redactedTypes.push('US_SOCIAL_SECURITY_NUMBER');
    count++;
  }

  // GCP API Keys (AIzaSy...)
  const gcpKeyRegex = /\bAIza[0-9A-Za-z-_]{35}\b/g;
  if (gcpKeyRegex.test(sanitized)) {
    sanitized = sanitized.replace(gcpKeyRegex, '[REDACTED_API_KEY]');
    redactedTypes.push('GCP_API_KEY');
    count++;
  }

  // Auth Bearer Tokens / JWT patterns
  const bearerRegex = /\bBearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/gi;
  if (bearerRegex.test(sanitized)) {
    sanitized = sanitized.replace(bearerRegex, '[REDACTED_AUTH_TOKEN]');
    redactedTypes.push('AUTH_TOKEN');
    count++;
  }

  return {
    originalText: input,
    sanitizedText: sanitized,
    findingsCount: count,
    redactedInfoTypes: redactedTypes,
  };
}
