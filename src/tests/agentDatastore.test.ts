import { 
  executeToolInternalDocuments, 
  executeToolMeetingTranscripts, 
  runNexusResearchAgent 
} from '../services/nexusAgentService';
import { 
  saveMeetingTranscriptToStore, 
  getStoredMeetings, 
  getTenantDocuments,
  queryMeetingTranscriptACL,
  queryVertexAISearch
} from '../services/searchService';
import { UserAccount, StoredMeetingTranscript } from '../types';

async function runAgentDatastoreVerification() {
  console.log('================================================================================');
  console.log('   VERIFYING: AGENT DATASTORE ACCESS & MEETING TRANSCRIPT PERSISTENCE           ');
  console.log('================================================================================\n');

  // Test identities
  const aliceEngineer: UserAccount = {
    id: 'user_alice',
    name: 'Alice Chen',
    email: 'alice@acme.corp',
    role: 'eng-core',
    orgRole: 'member',
    avatar: '',
    department: 'Core Payments Engineering',
    orgId: 'acme',
  };

  const marcusSecurity: UserAccount = {
    id: 'user_marcus',
    name: 'Marcus Vance',
    email: 'marcus@acme.corp',
    role: 'security',
    orgRole: 'member',
    avatar: '',
    department: 'Enterprise Information Security',
    orgId: 'acme',
  };

  const outsiderUser: UserAccount = {
    id: 'user_stranger',
    name: 'Stranger Danger',
    email: 'outsider@untrusted.com',
    role: 'eng-core',
    orgRole: 'member',
    avatar: '',
    department: 'External',
    orgId: 'acme',
  };

  // ---------------------------------------------------------------------------
  // 1. VERIFY AGENT ACCESS TO DATASTORE INTERNAL DOCUMENTS
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Agent accesses DataStore Internal Documents ---');
  const docResult = executeToolInternalDocuments(
    'What is our payment gateway architecture and idempotent retry policy?',
    aliceEngineer.role,
    'acme'
  );

  console.log(`  -> Tool Name:         ${docResult.invocations.toolName}`);
  console.log(`  -> Datastore Target:  ${docResult.invocations.datastoreTarget}`);
  console.log(`  -> Citations found:   ${docResult.citations.length}`);
  console.log(`  -> First Citation:    ${docResult.citations[0]?.doc_title || 'None'}`);

  if (docResult.citations.length === 0) {
    throw new Error('Test 1 Failed: Agent failed to retrieve internal documents from DataStore!');
  }
  if (!docResult.citations.some(c => c.doc_id === 'RFC-104')) {
    throw new Error('Test 1 Failed: Expected RFC-104 in internal document results.');
  }
  console.log('  [PASS] Test 1: Agent successfully accessed and grounded from DataStore internal documents.\n');

  // ---------------------------------------------------------------------------
  // 2. VERIFY SAVING MEETING TRANSCRIPTS TO DATASTORE (FOLDER "meeting transcript")
  // ---------------------------------------------------------------------------
  console.log('--- TEST 2: Meeting Transcripts are saved to the DataStore ---');
  const testMeetingId = `meet-test-verify-${Date.now()}`;
  const newMeetingToSave: StoredMeetingTranscript = {
    id: testMeetingId,
    meetSpaceId: 'spaces/test-space-99',
    meetLink: 'https://meet.google.com/test-space-99',
    title: 'Distributed HSM Failover & Cloud DLP Verification Sync',
    hostEmail: 'alice@acme.corp',
    hostName: 'Alice Chen',
    allowed_joinees: [
      'alice@acme.corp',
      'marcus@acme.corp',
      'eshwarreddy8382@gmail.com',
    ],
    started_at: new Date(Date.now() - 1800000).toISOString(),
    ended_at: new Date().toISOString(),
    duration_sec: 1800,
    transcript_chunks: [
      {
        id: 'chunk-t1',
        speaker: 'Alice Chen',
        speaker_email: 'alice@acme.corp',
        text: 'We are initiating live verification of DataStore persistence for meeting transcripts.',
        timestamp_ms: 5000,
        intent: 'GENERAL',
      },
      {
        id: 'chunk-t2',
        speaker: 'Marcus Vance',
        speaker_email: 'marcus@acme.corp',
        text: 'Confirmed. All transcripts must be indexed into folder "meeting transcript" with strict joinee-only ACL.',
        timestamp_ms: 15000,
        intent: 'POLICY_SENSITIVE',
      },
      {
        id: 'chunk-t3',
        speaker: 'Alice Chen',
        speaker_email: 'alice@acme.corp',
        text: 'The consensus is adopted: Frankfurt regional partition failover drill scheduled for Q4.',
        timestamp_ms: 25000,
        intent: 'ARCHITECTURAL_DECISION',
      },
    ],
    summary: 'Live verification meeting confirming meeting transcript persistence into Vertex AI DataStore folder "meeting transcript".',
    decisions: [
      'Frankfurt regional partition failover drill approved for Q4.',
      'DataStore persistence confirmed on folder "meeting transcript".',
    ],
    action_items: [
      'Alice: Verify DataStore indexing hook',
      'Marcus: Validate joinee participant ACL boundary',
    ],
    created_at: new Date().toISOString(),
  };

  saveMeetingTranscriptToStore(newMeetingToSave, 'acme');

  // Verify meeting is in stored meetings list
  const storedList = getStoredMeetings();
  const foundInStore = storedList.find(m => m.id === testMeetingId);
  if (!foundInStore) {
    throw new Error('Test 2 Failed: Meeting transcript was not persisted in StoredMeetings data store!');
  }
  console.log(`  -> Stored in meetings list:  ${foundInStore.title}`);

  // Verify meeting is indexed as an EnterpriseDocument in DataStore under folder 'meeting transcript'
  const acmeDocs = getTenantDocuments('acme');
  const docInDatastore = acmeDocs.find(d => d.id === testMeetingId);
  if (!docInDatastore) {
    throw new Error('Test 2 Failed: Meeting transcript was not registered as an EnterpriseDocument in DataStore!');
  }
  console.log(`  -> DataStore Document ID:     ${docInDatastore.id}`);
  console.log(`  -> DataStore Document Folder: ${docInDatastore.folder}`);
  console.log(`  -> DataStore Document Chunks: ${docInDatastore.chunks.length}`);

  if (docInDatastore.folder !== 'meeting transcript') {
    throw new Error(`Test 2 Failed: Expected folder "meeting transcript", got "${docInDatastore.folder}"`);
  }
  console.log('  [PASS] Test 2: Meeting transcript successfully saved and indexed on DataStore folder "meeting transcript".\n');

  // ---------------------------------------------------------------------------
  // 3. VERIFY AGENT ACCESS TO SAVED MEETING TRANSCRIPTS (AUTHORIZED JOINEE)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 3: Agent queries saved meeting transcript (Authorized Joinee) ---');
  const agentAuthorizedQuery = await runNexusResearchAgent(
    'What was agreed in the Distributed HSM Failover meeting?',
    aliceEngineer,
    'meetings'
  );

  console.log(`  -> Model Used:       ${agentAuthorizedQuery.modelUsed}`);
  console.log(`  -> Tool Invocations: ${agentAuthorizedQuery.toolInvocations.map(t => `${t.toolName} -> ${t.datastoreTarget}`).join(', ')}`);
  console.log(`  -> Meeting Allowed:  ${agentAuthorizedQuery.meetingAclResult?.allowed}`);
  console.log(`  -> Meeting Title:    ${agentAuthorizedQuery.meetingAclResult?.meetingTitle}`);
  console.log(`  -> Citations count:  ${agentAuthorizedQuery.citations.length}`);

  if (!agentAuthorizedQuery.meetingAclResult?.allowed) {
    throw new Error('Test 3 Failed: Authorized joinee (Alice) was improperly refused access to meeting transcript!');
  }
  if (!agentAuthorizedQuery.answer.includes('Meeting Research Grounding') && !agentAuthorizedQuery.answer.includes('Frankfurt')) {
    throw new Error('Test 3 Failed: Agent response did not contain grounded meeting transcript information.');
  }
  console.log('  [PASS] Test 3: Agent successfully accessed and grounded answers from saved meeting transcript for authorized joinee.\n');

  // ---------------------------------------------------------------------------
  // 4. VERIFY AGENT PARTICIPANT ACL BOUNDARY ON MEETING TRANSCRIPTS (NON-PARTICIPANT)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 4: Agent blocks non-participant from accessing meeting transcript ---');
  // Elena's closed C-Suite meeting is restricted to Elena, CEO, and Legal
  const csuiteMeetingId = 'meet-nex-csuite-closed-02';
  const strangerQuery = await runNexusResearchAgent(
    'What was discussed in the Executive M&A & Private Cap Table Restructuring meeting?',
    outsiderUser,
    'meetings'
  );

  console.log(`  -> Caller:           ${outsiderUser.email}`);
  console.log(`  -> Target Meeting:   ${strangerQuery.meetingAclResult?.meetingTitle}`);
  console.log(`  -> Access Allowed:   ${strangerQuery.meetingAclResult?.allowed}`);
  console.log(`  -> Refusal Message:  ${strangerQuery.meetingAclResult?.reason || 'Access denied'}`);

  if (strangerQuery.meetingAclResult?.allowed !== false) {
    throw new Error('Test 4 Failed: Non-participant was allowed to access confidential meeting transcript!');
  }
  if (!strangerQuery.answer.includes('403 ACL Access Refusal')) {
    throw new Error('Test 4 Failed: Expected 403 ACL Access Refusal in agent answer for non-joinee.');
  }
  console.log('  [PASS] Test 4: Confidential meeting transcript properly blocked for non-joinee with strict 403 ACL refusal.\n');

  // ---------------------------------------------------------------------------
  // 5. VERIFY DIRECT TOOL EXECUTION: query_internal_documents & query_meeting_transcripts
  // ---------------------------------------------------------------------------
  console.log('--- TEST 5: Direct Agent Tool Executions ---');
  const directDocTool = executeToolInternalDocuments('POL-SEC-12 Cloud Hardware Security Modules', 'security', 'acme');
  console.log(`  -> Internal docs tool: ${directDocTool.invocations.resultSummary}`);
  if (directDocTool.citations.length === 0) {
    throw new Error('Test 5 Failed: Direct tool execution returned 0 citations for security role.');
  }

  const directMeetingTool = executeToolMeetingTranscripts('failover drill', 'marcus@acme.corp', testMeetingId, 'acme');
  console.log(`  -> Meeting transcript tool: ${directMeetingTool.invocation.resultSummary}`);
  if (!directMeetingTool.aclResult.allowed) {
    throw new Error('Test 5 Failed: Direct meeting transcript tool refused authorized participant Marcus.');
  }
  console.log('  [PASS] Test 5: Both Agent Tools (query_internal_documents and query_meeting_transcripts) executed cleanly.\n');

  console.log('================================================================================');
  console.log('   ALL DATASTORE INTERNAL DOCUMENT & MEETING TRANSCRIPT TESTS PASSED! (5/5)     ');
  console.log('================================================================================');
}

runAgentDatastoreVerification().catch(err => {
  console.error('\n[FATAL ERROR] Agent Datastore verification failed:', err);
  process.exit(1);
});
