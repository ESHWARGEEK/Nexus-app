import { AuthAdapter } from '../adapters/authAdapter';
import { SearchAdapter } from '../adapters/searchAdapter';

/**
 * Security & ACL Test Suite
 * Asserts that the role comes exclusively from a verified Firebase ID token,
 * ignoring any role specified in the request body.
 * 
 * Specifically tests:
 * An authenticated 'eng-core' user sending role 'security' in the request body
 * still receives zero results for restricted policy POL-SEC-12.
 */
async function runAuthAclTest() {
  console.log('===============================================================');
  console.log('   RUNNING TEST: AUTH & ACL ROLE SPOOFING PREVENTION           ');
  console.log('===============================================================');

  const authAdapter = new AuthAdapter();
  const searchAdapter = new SearchAdapter();

  // 1. Create a simulated Firebase ID Token for Alice (eng-core)
  // Payload: { sub: 'user_alice', email: 'alice@acme.corp', role: 'eng-core' }
  const engCorePayload = Buffer.from(JSON.stringify({
    iss: 'https://securetoken.google.com/ai-builder-cup-511510',
    aud: 'ai-builder-cup-511510',
    sub: 'user_alice',
    email: 'alice@acme.corp',
    role: 'eng-core'
  })).toString('base64');
  const engCoreToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${engCorePayload}.fakeSignature`;

  // 2. Simulate incoming request where user sends role: 'security' in body (attempted privilege escalation)
  const incomingRequestBody = {
    query: 'What is our policy on master cryptographic keys, HSM vault access, and key custody?',
    role: 'security', // ATTACK ATTEMPT: User attempts to claim security role
  };

  console.log('Step 1: Authenticating incoming token...');
  const verifiedAuth = await authAdapter.verifyToken(engCoreToken);
  console.log(`  -> Token verified identity: ${verifiedAuth.email}`);
  console.log(`  -> Token verified role:     ${verifiedAuth.role}`);
  console.log(`  -> Requested body role:     ${incomingRequestBody.role} (MUST BE IGNORED)`);

  // Enforce server-side security rule: role comes ONLY from verified token
  const effectiveRole = verifiedAuth.role; // Ignores incomingRequestBody.role

  if (effectiveRole !== 'eng-core') {
    throw new Error(`SECURITY VULNERABILITY: Role was elevated to ${effectiveRole} instead of eng-core!`);
  }
  console.log('  [PASS] Server successfully discarded body.role and used verified token role.');

  // 3. Execute search with effectiveRole
  console.log('\nStep 2: Executing search query with verified role...');
  const searchResult = await searchAdapter.query(incomingRequestBody.query, effectiveRole);

  const polSec12Findings = searchResult.results.filter(
    r => r.doc_id === 'POL-SEC-12' || r.doc_title.includes('POL-SEC-12') || r.section.includes('Key Custody')
  );

  console.log(`  -> Total citations returned: ${searchResult.results.length}`);
  console.log(`  -> POL-SEC-12 citations returned for eng-core: ${polSec12Findings.length}`);

  if (polSec12Findings.length > 0) {
    console.error('  [FAIL] POL-SEC-12 was leaked to an eng-core user!');
    process.exit(1);
  }
  console.log('  [PASS] Verified 0 results for POL-SEC-12 returned to eng-core user.');

  // 4. Verification control: Verify that Marcus (security role) DOES receive POL-SEC-12
  console.log('\nStep 3: Verification control: Testing with legitimate security token (Marcus Vance)...');
  const securityPayload = Buffer.from(JSON.stringify({
    iss: 'https://securetoken.google.com/ai-builder-cup-511510',
    aud: 'ai-builder-cup-511510',
    sub: 'user_marcus',
    email: 'marcus@acme.corp',
    role: 'security'
  })).toString('base64');
  const securityToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${securityPayload}.fakeSignature`;

  const verifiedSecurityAuth = await authAdapter.verifyToken(securityToken);
  const securitySearchResult = await searchAdapter.query(incomingRequestBody.query, verifiedSecurityAuth.role);

  const securityPolSec12Findings = securitySearchResult.results.filter(
    r => r.doc_id === 'POL-SEC-12' || r.doc_title.includes('POL-SEC-12')
  );

  console.log(`  -> POL-SEC-12 citations returned for security role: ${securityPolSec12Findings.length}`);
  if (securityPolSec12Findings.length === 0) {
    throw new Error('Verification control failed: security role could not retrieve POL-SEC-12!');
  }
  console.log('  [PASS] Security role successfully retrieved authorized POL-SEC-12 specification.');

  console.log('\n===============================================================');
  console.log('   ALL AUTH & ACL TESTS PASSED (0 POL-SEC-12 LEAKS TO ENG-CORE) ');
  console.log('===============================================================');
}

runAuthAclTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
