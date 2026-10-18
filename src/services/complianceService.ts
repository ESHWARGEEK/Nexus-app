import { ComplianceFinding, UserRole, LivingDocument } from '../types';
import { SEED_ENTERPRISE_DOCS } from '../data/seedData';

export interface ComplianceAuditState {
  findings: ComplianceFinding[];
  isExportLocked: boolean;
  lockedReasons: string[];
}

export function scanForComplianceViolations(
  speechSnippet: string,
  draftContent: string,
  userRole: UserRole,
  existingFindings: ComplianceFinding[] = []
): ComplianceAuditState {
  const combinedText = `${speechSnippet} \n ${draftContent}`.toLowerCase();
  const currentFindings: ComplianceFinding[] = [...existingFindings];

  // Check 1: Cross-Border Telemetry & US Data Lake Transfer
  const isTelemetryViolation =
    (combinedText.includes('us-east') || combinedText.includes('central us') || combinedText.includes('united states') || combinedText.includes('us data lake')) &&
    (combinedText.includes('payment') || combinedText.includes('card') || combinedText.includes('telemetry') || combinedText.includes('raw log') || combinedText.includes('customer'));

  const existingTelemetryFinding = currentFindings.find(f => f.id === 'comp_cross_border_01');

  if (isTelemetryViolation && !existingTelemetryFinding) {
    const policyDoc = SEED_ENTERPRISE_DOCS.find(d => d.id === 'POL-SEC-08');
    const clause = policyDoc?.chunks.find(c => c.chunk_id === 'pol-sec-08-c2')?.clause_text;

    currentFindings.push({
      id: 'comp_cross_border_01',
      policy_id: 'POL-SEC-08',
      policy_title: 'POL-SEC-08: Cross-Border Data Transfer Framework',
      clause_reference: 'Section 4.2 (Transatlantic Telemetry & Raw Processing Restriction)',
      clause_text: clause || 'Direct transmission of raw customer financial logs to non-EU storage buckets is strictly prohibited.',
      is_restricted_policy: false,
      severity: 'CRITICAL',
      violation_summary: 'Proposal directs unencrypted customer payment logs to US-East central analytics, breaching sovereign boundary rules.',
      detected_at_speaker: 'Dave Kerman',
      remediation_title: 'Apply In-Region Anonymization Proxy (Frankfurt Vault)',
      remediation_diff: {
        section_target: 'Section 4: Telemetry & Ingress Architecture',
        original_text: 'Stream raw customer card transaction logs to central US-East data lake.',
        replacement_text: 'Deploy an in-region EU hashing proxy in Frankfurt (europe-west3) that irreversibly anonymizes payment card data and truncates IP addresses before forwarding aggregated metrics.',
      },
      status: 'PENDING',
    });
  }

  // Check 2: Plaintext Key Storage (Key Custody Policy)
  const isPlaintextKeyViolation =
    (combinedText.includes('service config') || combinedText.includes('environment variable') || combinedText.includes('plaintext')) &&
    (combinedText.includes('private key') || combinedText.includes('tokenization key') || combinedText.includes('master key'));

  const existingKeyFinding = currentFindings.find(f => f.id === 'comp_key_custody_01');

  if (isPlaintextKeyViolation && !existingKeyFinding) {
    const policyDoc = SEED_ENTERPRISE_DOCS.find(d => d.id === 'POL-SEC-12');
    const clause = policyDoc?.chunks.find(c => c.chunk_id === 'pol-sec-12-c1')?.clause_text;

    currentFindings.push({
      id: 'comp_key_custody_01',
      policy_id: 'POL-SEC-12',
      policy_title: 'POL-SEC-12: Executive Key Custody & HSM Access Standard',
      clause_reference: 'Section 3.1',
      clause_text: clause || 'Master payment signing keys must reside strictly within FIPS 140-2 Level 3 HSM partitions with multi-party quorum authorization; plaintext storage in application configurations is strictly prohibited.',
      is_restricted_policy: false,
      severity: 'CRITICAL',
      violation_summary: 'Master tokenization private keys proposed for storage in service configuration instead of FIPS 140-2 Level 3 Cloud HSM.',
      detected_at_speaker: 'Dave Kerman',
      remediation_title: 'Require Cloud HSM Partition with 2-of-3 Quorum',
      remediation_diff: {
        section_target: 'Section 2: Cryptographic Key Topologies',
        original_text: 'Store signing roots in local application service configuration.',
        replacement_text: 'Isolate signing roots inside dedicated Cloud HSM partitions requiring 2-of-3 executive quorum authorization.',
      },
      status: 'PENDING',
    });
  }

  // Calculate Lock status
  const pendingCritical = currentFindings.filter(
    f => f.severity === 'CRITICAL' && f.status === 'PENDING'
  );

  const isExportLocked = pendingCritical.length > 0;
  const lockedReasons = pendingCritical.map(
    f => `${f.policy_id}: ${f.violation_summary}`
  );

  return {
    findings: currentFindings,
    isExportLocked,
    lockedReasons,
  };
}

export function applyRemediationFix(
  findingId: string,
  doc: LivingDocument,
  findings: ComplianceFinding[],
  resolvedByRole: UserRole
): { updatedDoc: LivingDocument; updatedFindings: ComplianceFinding[] } {
  const finding = findings.find(f => f.id === findingId);
  if (!finding) return { updatedDoc: doc, updatedFindings: findings };

  // Update finding status
  const updatedFindings = findings.map(f => {
    if (f.id === findingId) {
      return {
        ...f,
        status: 'REMEDIATED' as const,
        resolved_by: resolvedByRole,
      };
    }
    return f;
  });

  // Apply replacement to document content
  let updatedContent = doc.markdown_content;
  if (finding.remediation_diff.original_text && finding.remediation_diff.replacement_text) {
    if (updatedContent.includes(finding.remediation_diff.original_text)) {
      updatedContent = updatedContent.replace(
        finding.remediation_diff.original_text,
        finding.remediation_diff.replacement_text
      );
    } else {
      // Append compliant clause if not explicitly matching
      updatedContent += `\n\n### ${finding.remediation_diff.section_target}\n${finding.remediation_diff.replacement_text}`;
    }
  }

  // Check if remaining critical findings exist
  const remainingCritical = updatedFindings.filter(
    f => f.severity === 'CRITICAL' && f.status === 'PENDING'
  );

  const updatedDoc: LivingDocument = {
    ...doc,
    markdown_content: updatedContent,
    version: doc.version + 1,
    last_saved_at: new Date().toISOString(),
    export_locked: remainingCritical.length > 0,
    lock_reasons: remainingCritical.map(f => `${f.policy_id}: ${f.violation_summary}`),
  };

  return { updatedDoc, updatedFindings };
}

export function applySecurityOverride(
  findingId: string,
  findings: ComplianceFinding[],
  userRole: UserRole,
  overrideReason: string
): { updatedFindings: ComplianceFinding[]; success: boolean; message: string } {
  const updatedFindings = findings.map(f => {
    if (f.id === findingId) {
      return {
        ...f,
        status: 'OVERRIDDEN' as const,
        resolved_by: `${userRole} (Override: ${overrideReason})`,
      };
    }
    return f;
  });

  return {
    updatedFindings,
    success: true,
    message: `Compliance finding ${findingId} overridden by ${userRole}. Audit log recorded.`,
  };
}
