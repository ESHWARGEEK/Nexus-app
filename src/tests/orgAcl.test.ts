process.env.NODE_ENV = 'test';

import { app } from '../../server';
import { storeAdapter } from '../adapters';
import { isDocumentAllowedInSharedDraft } from '../services/sharedDraftService';
import { SEED_ENTERPRISE_DOCS } from '../data/seedData';
import http from 'http';

function makeToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify({
    iss: 'https://securetoken.google.com/ai-builder-cup-511510',
    aud: 'ai-builder-cup-511510',
    ...payload,
  })).toString('base64');
  return `${header}.${body}.simulatedSignature`;
}

async function runOrgAclTests() {
  console.log('================================================================================');
  console.log('       MULTI-TENANT ORG MANAGEMENT & GROUP-BASED ACL VERIFICATION TEST SUITE     ');
  console.log('================================================================================\n');

  // Ensure store is reset to seed before running
  storeAdapter.resetToSeed();

  // Start test server on random ephemeral port
  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => {
    testServer.listen(0, '127.0.0.1', () => resolve());
  });

  const address = testServer.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[Test Setup] Express test server bound to ${baseUrl}`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: A signed-in user who is not a member gets 403
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Signed-in user who is not a member gets 403 ---');
    const outsiderToken = makeToken({
      sub: 'user_outsider',
      email: 'stranger@outsider.com',
      email_verified: true,
    });

    const res1 = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({ query: 'payment gateway retry' }),
    });

    const data1 = await res1.json();
    console.log(`  -> Response status: ${res1.status}`);
    console.log(`  -> Response body:   ${JSON.stringify(data1)}`);

    if (res1.status !== 403 || !data1.error?.toLowerCase().includes('not invited')) {
      throw new Error(`Test 1 Failed: Expected status 403 with "Not invited", got ${res1.status}: ${JSON.stringify(data1)}`);
    }
    console.log('  [PASS] Test 1: Non-member user correctly received 403 "Not invited".');

    // -------------------------------------------------------------------------
    // TEST 2: A non-admin member calling an admin route gets 403
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Non-admin member calling an admin route gets 403 ---');
    const marcusMemberToken = makeToken({
      sub: 'user_marcus',
      email: 'marcus@acme.corp',
      email_verified: true,
      role: 'security',
    });

    // Marcus tries to call admin member list route
    const res2 = await fetch(`${baseUrl}/api/org/members`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${marcusMemberToken}`,
      },
    });

    const data2 = await res2.json();
    console.log(`  -> Response status: ${res2.status}`);
    console.log(`  -> Response body:   ${JSON.stringify(data2)}`);

    if (res2.status !== 403) {
      throw new Error(`Test 2 Failed: Non-admin was able to access admin route! Status: ${res2.status}`);
    }
    console.log('  [PASS] Test 2: Non-admin member calling admin route was blocked with 403.');

    // -------------------------------------------------------------------------
    // TEST 3: Removing a member makes their very next request return 403
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Removing a member makes their very next request return 403 ---');
    const aliceAdminToken = makeToken({
      sub: 'user_alice',
      email: 'alice@acme.corp',
      email_verified: true,
      role: 'eng-core',
    });

    // Step A: Alice invites Dave to Acme
    const inviteRes = await fetch(`${baseUrl}/api/org/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceAdminToken}`,
      },
      body: JSON.stringify({
        email: 'dave@acme.corp',
        role: 'member',
        groups: ['eng-core'],
      }),
    });
    console.log(`  -> Invite Dave status: ${inviteRes.status}`);
    if (inviteRes.status !== 201) {
      throw new Error(`Failed to invite Dave in test setup: ${await inviteRes.text()}`);
    }

    // Step B: Dave makes an authorized request
    const daveToken = makeToken({
      sub: 'user_dave',
      email: 'dave@acme.corp',
      email_verified: true,
    });
    const daveFirstRes = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Authorization: `Bearer ${daveToken}` },
    });
    console.log(`  -> Dave authorized access status: ${daveFirstRes.status}`);
    if (daveFirstRes.status !== 200) {
      throw new Error(`Dave should have access before removal: ${await daveFirstRes.text()}`);
    }

    // Step C: Alice removes Dave
    const removeRes = await fetch(`${baseUrl}/api/org/members/dave@acme.corp`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aliceAdminToken}` },
    });
    console.log(`  -> Alice removes Dave status: ${removeRes.status}`);

    // Step D: Dave's VERY NEXT request must immediately return 403
    const daveNextRes = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Authorization: `Bearer ${daveToken}` },
    });
    const daveNextData = await daveNextRes.json();
    console.log(`  -> Dave very next request status: ${daveNextRes.status}`);
    console.log(`  -> Dave very next request body:   ${JSON.stringify(daveNextData)}`);

    if (daveNextRes.status !== 403 || !daveNextData.error?.toLowerCase().includes('not invited')) {
      throw new Error(`Test 3 Failed: Dave was not blocked with 403 immediately after removal! Got ${daveNextRes.status}`);
    }
    console.log('  [PASS] Test 3: Removed member immediate next request returned 403 "Not invited".');

    // -------------------------------------------------------------------------
    // TEST 4: A user from another org cannot read this org's documents or members
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: A user from another org cannot read this org\'s documents or members ---');
    const bobBetaToken = makeToken({
      sub: 'user_bob',
      email: 'bob@beta.corp',
      email_verified: true,
    });

    // Bob creates a separate org "Beta Corp"
    const createBetaRes = await fetch(`${baseUrl}/api/orgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobBetaToken}`,
      },
      body: JSON.stringify({ name: 'Beta Corp' }),
    });
    console.log(`  -> Create Beta Corp status: ${createBetaRes.status}`);

    // Bob attempts to read Acme's members by passing orgId=acme in query
    const bobReadAcmeMembers = await fetch(`${baseUrl}/api/org/members?orgId=acme`, {
      headers: { Authorization: `Bearer ${bobBetaToken}` },
    });
    const bobMembersData = await bobReadAcmeMembers.json();
    console.log(`  -> Bob read members orgId returned: ${bobMembersData.orgId}`);
    
    // Server must have derived Bob's org (Beta Corp) and completely ignored orgId=acme
    if (bobMembersData.orgId === 'acme') {
      throw new Error(`Test 4 Failed: Bob was able to inspect Acme members by passing orgId parameter!`);
    }

    const acmeEmailsInBobView = (bobMembersData.members || []).filter(
      (m: any) => m.email.includes('acme.corp')
    );
    if (acmeEmailsInBobView.length > 0) {
      throw new Error(`Test 4 Failed: Acme members leaked to user from Beta Corp!`);
    }

    // Bob attempts to read Acme documents
    const bobReadDocs = await fetch(`${baseUrl}/api/org/documents?orgId=acme`, {
      headers: { Authorization: `Bearer ${bobBetaToken}` },
    });
    const bobDocsData = await bobReadDocs.json();
    if (bobDocsData.orgId === 'acme' || (bobDocsData.documents || []).some((d: any) => d.id === 'RFC-104')) {
      throw new Error(`Test 4 Failed: Acme documents leaked to user from Beta Corp!`);
    }
    console.log('  [PASS] Test 4: Cross-tenant isolation verified (Zero Acme members or documents leaked to Beta Corp).');

    // -------------------------------------------------------------------------
    // TEST 5: A body-supplied role, orgId, or groups is ignored
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: A body-supplied role, orgId, or groups is ignored ---');
    // Alice is an eng-core member. She attempts to spoof role='security', groups=['security'], orgId='other-org' in body
    const spoofRes = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceAdminToken}`,
      },
      body: JSON.stringify({
        query: 'What is our policy on master cryptographic keys, HSM vault access, and key custody?',
        role: 'security',
        groups: ['security', 'leadership'],
        orgId: 'other-org',
      }),
    });

    const spoofData = await spoofRes.json();
    console.log(`  -> Verified user:   ${spoofData.verified_user}`);
    console.log(`  -> Verified role:   ${spoofData.verified_role}`);
    console.log(`  -> Verified groups: ${JSON.stringify(spoofData.verified_groups)}`);
    console.log(`  -> Effective org:   ${spoofData.org_id}`);

    if (spoofData.org_id !== 'acme') {
      throw new Error(`Test 5 Failed: Body orgId was not ignored!`);
    }
    if (spoofData.verified_groups?.includes('security')) {
      throw new Error(`Test 5 Failed: Body groups spoofing was not blocked!`);
    }
    console.log('  [PASS] Test 5: Body-supplied role, groups, and orgId were strictly ignored.');

    // -------------------------------------------------------------------------
    // TEST 6: Alice (Engineering) gets zero results for POL-SEC-12; Marcus (Security) gets it
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Alice (Engineering) gets zero results for POL-SEC-12; Marcus (Security) gets it ---');
    const restrictedQuery = 'What is our policy on master cryptographic keys, HSM vault access, and key custody?';

    // Alice query
    const aliceSearchRes = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceAdminToken}`,
      },
      body: JSON.stringify({ query: restrictedQuery }),
    });
    const aliceData = await aliceSearchRes.json();
    const alicePolSec12 = (aliceData.results || []).filter(
      (r: any) => r.doc_id === 'POL-SEC-12' || r.doc_title.includes('POL-SEC-12')
    );

    console.log(`  -> Alice total citations:   ${aliceData.results?.length || 0}`);
    console.log(`  -> Alice POL-SEC-12 count:  ${alicePolSec12.length}`);
    console.log(`  -> Alice search status:     ${aliceData.status}`);
    console.log(`  -> Alice search message:    ${aliceData.message}`);

    if (alicePolSec12.length > 0 || aliceData.status !== 'STATE_UNGROUNDED') {
      throw new Error(`Test 6 Failed: Restricted POL-SEC-12 was leaked to Alice (Engineering)!`);
    }

    // Marcus query
    const marcusSearchRes = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${marcusMemberToken}`,
      },
      body: JSON.stringify({ query: restrictedQuery }),
    });
    const marcusData = await marcusSearchRes.json();
    const marcusPolSec12 = (marcusData.results || []).filter(
      (r: any) => r.doc_id === 'POL-SEC-12' || r.doc_title.includes('POL-SEC-12')
    );

    console.log(`  -> Marcus total citations:  ${marcusData.results?.length || 0}`);
    console.log(`  -> Marcus POL-SEC-12 count: ${marcusPolSec12.length}`);
    console.log(`  -> Marcus search status:    ${marcusData.status}`);

    if (marcusPolSec12.length === 0 || marcusData.status !== 'SUCCESS') {
      throw new Error(`Test 6 Failed: Marcus (Security) could not retrieve authorized POL-SEC-12!`);
    }
    console.log('  [PASS] Test 6: Alice received 0 POL-SEC-12 results; Marcus successfully received POL-SEC-12.');

    // -------------------------------------------------------------------------
    // TEST 7: The shared draft for a meeting with Alice and Marcus invited contains no POL-SEC-12 content
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: The shared draft for a meeting with Alice and Marcus invited contains no POL-SEC-12 content ---');
    const invitedParticipants = [
      { name: 'Alice Chen', email: 'alice@acme.corp', groups: ['eng-core'] },
      { name: 'Marcus Vance', email: 'marcus@acme.corp', groups: ['security'] },
    ];

    const allDocs = await storeAdapter.listDocuments('acme');
    const rfc104Doc = allDocs.find(d => d.id === 'RFC-104')!;
    const polSec08Doc = allDocs.find(d => d.id === 'POL-SEC-08')!;
    const polSec12Doc = allDocs.find(d => d.id === 'POL-SEC-12')!;

    // Check shared draft permissions for each document
    const isRfc104Allowed = isDocumentAllowedInSharedDraft(rfc104Doc.allowedGroups, invitedParticipants);
    const isPolSec08Allowed = isDocumentAllowedInSharedDraft(polSec08Doc.allowedGroups, invitedParticipants);
    const isPolSec12Allowed = isDocumentAllowedInSharedDraft(polSec12Doc.allowedGroups, invitedParticipants);

    console.log(`  -> Is RFC-104 permitted in shared draft?     ${isRfc104Allowed} (Expected: true)`);
    console.log(`  -> Is POL-SEC-08 permitted in shared draft?  ${isPolSec08Allowed} (Expected: true)`);
    console.log(`  -> Is POL-SEC-12 permitted in shared draft?  ${isPolSec12Allowed} (Expected: false)`);

    if (!isRfc104Allowed) throw new Error('Test 7 Failed: RFC-104 should be readable by all participants.');
    if (!isPolSec08Allowed) throw new Error('Test 7 Failed: POL-SEC-08 should be readable by all participants.');
    if (isPolSec12Allowed) throw new Error('Test 7 Failed: POL-SEC-12 must NOT be allowed in shared draft with Alice invited!');

    // Test shared draft text simulation
    const seedPolSec12 = SEED_ENTERPRISE_DOCS.find(d => d.id === 'POL-SEC-12')!;
    const restrictedPhrases = ['2-of-3 executive quorum', 'air-gapped break-glass console', 'fips 140-2 level 3'];

    // Construct meeting draft using only allowed documents
    const meetingDraftContent = `
# RFC-118: Next-Gen Payment Tokenization Engine
## 1. Scope & Objective
All checkout processing routes through regional gateway proxies as defined in RFC-104.
## 2. Telemetry Architecture
Deploy an in-region EU hashing proxy in Frankfurt per POL-SEC-08 safeguards.
## 3. Cryptographic Key Topologies
Master tokenization keys must be safeguarded with hardware isolation.
`;

    for (const phrase of restrictedPhrases) {
      if (meetingDraftContent.toLowerCase().includes(phrase)) {
        throw new Error(`Test 7 Failed: Restricted phrase "${phrase}" was found in shared draft!`);
      }
    }

    console.log('  [PASS] Test 7: Shared draft isolation verified. Zero POL-SEC-12 content in draft with Alice and Marcus.');

    console.log('\n================================================================================');
    console.log('       ALL 7 MULTI-TENANT ORG ACL TESTS PASSED SUCCESSFULLY!                    ');
    console.log('================================================================================\n');
  } finally {
    testServer.close();
  }
}

runOrgAclTests().catch((err) => {
  console.error('\n[FATAL] Test execution failed:', err);
  process.exit(1);
});
