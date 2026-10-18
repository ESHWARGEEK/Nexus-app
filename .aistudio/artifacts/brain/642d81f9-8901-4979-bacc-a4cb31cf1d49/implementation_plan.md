# Nexus Sidekick: Autonomous Enterprise Meeting & Workspace Teammate

Nexus Sidekick is an active AI meeting teammate and autonomous workspace agent built on Google Cloud Vertex AI. Nexus Sidekick participates in live meetings: streaming audio from server-side scenario files into Cloud Speech-to-Text with speaker diarization and automatic punctuation, broadcasting bi-directional agent events over an authenticated WebSocket connection, redacting PII through Cloud Sensitive Data Protection (DLP), querying enterprise knowledge via ACL-filtered Vertex AI Search, executing parallel Research and Compliance agents using Gemini structured JSON outputs in an ADK workflow engine, live-drafting technical specifications (PRDs/RFCs) on a shared canvas, and staging Google Workspace actions (Google Docs) with server-enforced human-in-the-loop approval.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural design establishes the following core technical and governance standards:

- **Server-Driven Audio Pipeline & WebSocket Distribution**:
  - The server reads pre-recorded scenario audio files directly into streaming Cloud Speech-to-Text, broadcasting diarized transcripts and live agent events down to all authenticated viewer WebSockets. Live microphone input is preserved as an optional stretch capability.
  - Client authentication is validated during the initial WebSocket handshake via subprotocol token negotiation (`['access_token', idToken]`) or an initial `{ type: 'AUTH', token: idToken }` message verified server-side with `firebase-admin`.
- **Shared-Session Multi-Viewer ACL & Role-Cached Routing**:
  - On each STT trigger, Vertex AI Search runs once per distinct connected role present in the session (cached by role for that turn). Search citations are delivered strictly to client connections matching that role.
  - Compliance disclosures are evaluated per connection: authorized roles receive the full clause text, while unauthorized roles receive only an advisory alert.
- **Shared Draft Content Isolation Over Invited Participant Roles**:
  - The shared Living Canvas (`RFC-118`) incorporates only content readable by *every invited participant* in the meeting (`meetings.participants` invited role set), rather than just currently connected sockets. This prevents late joiners from encountering restricted content that was retroactively synthesized into the shared living draft before their arrival.
  - Restricted citations (such as `POL-SEC-12`) appear exclusively in the authorized viewer's private research feed and are never synthesized into the shared living draft.
  - The evaluation harness includes an automated assertion verifying that the final drafted RFC document contains zero text from `POL-SEC-12` when viewed by `eng-core`.
- **Gemini Structured JSON Output Engine**:
  - Research and Compliance agents enforce strict schema validation via Gemini's `responseSchema` (structured JSON output), eliminating unstructured markdown hallucinations in agent hand-offs and ensuring predictable UI state transitions.
- **Four Named System UI States**:
  - The interface explicitly models four governing visual states: `listening` (ambient speech processing), `grounded` (retrieval verified above calibrated threshold), `refused` (below score threshold or access denied with on-screen explanation), and `export_locked` (critical compliance breach halting delivery).
- **Corpus Role Partitioning**:
  - `RFC-104: Payment Gateway Architecture v2.4` has `allowed_roles: ['eng-core', 'security', 'leadership']`.
  - `POL-SEC-08: Cross-Border Data Transfer Framework` has `allowed_roles: ['eng-core', 'security', 'leadership']`.
  - `POL-SEC-12: Executive Key Custody Standard` has `allowed_roles: ['security', 'leadership']`.
- **Server-Side Export Lock Enforcement**:
  - When the Compliance Guardian flags a critical violation, the export lock is enforced server-side in the export action endpoint (rejecting export dispatches with `403 Forbidden`), not merely in the client UI.
  - The lock releases only when: (a) the user applies an approved remediation diff, or (b) a user with role `security` or `leadership` executes an explicit, logged security override.
- **Cloud DLP infoType Configuration**:
  - The Cloud Sensitive Data Protection inspection template specifies explicit infoTypes: `CREDIT_CARD_NUMBER`, `US_SOCIAL_SECURITY_NUMBER`, `AUTH_TOKEN`, and `GCP_API_KEY`.
  - `PERSON_NAME` is deliberately excluded so diarized speaker identities (e.g. "Alice (Tech Lead)", "Marcus (Security)") are preserved in transcripts.
- **Cloud Run Single-Instance Demo & Scale-Out Path**:
  - The demo deployment specifies `--min-instances 1` and `--max-instances 1` to guarantee consistent in-memory WebSocket meeting session state. The scale-out path utilizes Firestore and Google Cloud Pub/Sub for cross-instance WebSocket event fan-out.

---

## 1. Overview & Core Concept

- **What It Does**: Nexus Sidekick acts as an autonomous technical chief-of-staff during cross-functional product and engineering meetings. As technical trade-offs are discussed, it retrieves verified RFC precedents, live-drafts specifications, catches compliance risks before commitments harden, and stages Google Workspace actions with human sign-off.
- **Target Persona**: Engineering Managers, Technical Product Managers, Security/Compliance Officers, and Enterprise Operations Directors.

### 1.1 Innovation & Differentiation

1. **Permission-Aware per Viewer**: The first meeting AI architected around per-role retrieval, restricted-policy warnings that withhold text from unauthorized listeners, and shared-draft isolation enforced across all invited participant roles.
2. **Proactive Compliance Prevention with Server-Enforced Export Lock**: Rather than detecting policy breaches weeks later in security review, Nexus Sidekick identifies violations in real time during dialogue and locks downstream Google Workspace exports with a server-side 403 gate until remediated.
3. **Grounded, Citable Output with a Refusal Gate and Measured Evaluation Harness**: Replaces hallucinated meeting summaries with calibrated relevance thresholds, an explicit refusal path ("No accessible results"), and an empirical test harness asserting zero confidential token leakage.

*Contrast with Passive Notetakers*: While traditional meeting recorders merely transcribe and summarize what was said, Nexus Sidekick actively governs what can be built, preventing regulatory drift and access breaches before commitments harden.

---

## 2. Experimental Metrics & Evaluation Framework

> [!NOTE]
> Baselines are measured on Day 1-2 by an independent human tester (or self-scored by author if an independent tester is unavailable) taking manual notes on the 3 scripted meetings without seeing model outputs. Targets represent experimental goals evaluated by the automated test harness across the meetings and a held-out test suite.

| Metric | Baseline (measured Day 1-2) | Experimental Target (To be replaced with harness results) | Measurement Methodology |
| :--- | :--- | :--- | :--- |
| **Meeting-to-Doc Delivery** | 35 to 45 min manual drafting (assumed) | < 60 sec to approved export | Elapsed seconds from meeting conclusion to user-approved Google Doc export |
| **Gold Outline Section Coverage** | TBD (measured) | >= 90% coverage | Evaluated against ground-truth PRD/RFC outline sections (Architecture, API, Risks) |
| **Time to First Grounded Answer** | 8.5 min manual search (assumed) | p50 < 2.5s, p95 < 3.8s | Measured from final-result STT utterance to snippet render (tracked on live timer) |
| **Action Item Recall & Precision** | TBD (measured) | >= 90% recall / >= 88% precision | Scored by harness against gold-standard annotated action items |
| **Compliance Risk Catch & FP Rate** | TBD (measured) | >= 85% catch / <= 10% FP rate | Synthetic benchmark across 15 injected policy violations; checks against over-triggering |

---

## 3. Google Cloud Multi-Agent System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Nexus Sidekick Frontend (React)                           │
│  ┌───────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────────┐  │
│  │ Live Meeting Stream   │ │ Living Deliverables       │ │ Sidekick Multi-Agent     │  │
│  │ • Scenario Controller │ │ Canvas (Markdown/Doc)     │ │ Cockpit                  │  │
│  │ • Diarized Transcripts│ │ • Lowest-common-denom draft│ • Role-Routed Citations  │  │
│  │ • 4 Named UI States   │ │ • Clickable Provenance    │ │ • Compliance Radar       │  │
│  └───────────────────────┘ └───────────────────────────┘ └──────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Bi-Directional WebSocket
                                            │ (Transcripts, Citations, Draft Diffs, Actions)
                                            │ [Auth: Firebase JWT in subprotocol / init msg]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Cloud Run Container (Node.js / Express + ADK)                   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      ADK Workflow Agent Orchestration Engine                   │   │
│   │                                                                                │   │
│   │  ┌──────────────────┐    ┌───────────────┐                                     │   │
│   │  │Server-Side Audio │───▶│Listener Agent │                                     │   │
│   │  │Stream to STT     │    │• Diarized STT │                                     │   │
│   │  └──────────────────┘    │• Cloud DLP PII│ (Preserves PERSON_NAME)             │   │
│   │                          └───────┬───────┘                                     │   │
│   │                                  │ Final-Result Sentence Boundary Trigger      │   │
│   │                   ┌──────────────┴──────────────┐                              │   │
│   │                   ▼ (ADK Parallel Execution)    ▼ (ADK Parallel Execution)     │   │
│   │           ┌───────────────┐             ┌───────────────┐                      │   │
│   │           │Research Agent │             │Compliance     │                      │   │
│   │           │• Cached Query │             │Guardian Agent │                      │   │
│   │           │  per distinct │             │• Structured   │                      │   │
│   │           │  session role │             │  JSON Output  │                      │   │
│   │           └───────┬───────┘             └───────┬───────┘                      │   │
│   │                   │                             │ Critical Finding             │   │
│   │                   │ If score < threshold        │ (Server-Enforced Lock)       │   │
│   │                   ▼                             ▼                              │   │
│   │           ┌───────────────┐             ┌───────────────┐                      │   │
│   │           │Refusal Path   │             │Action Agent   │                      │   │
│   │           │"No accessible │             │• HITL Gate    │                      │   │
│   │           │ results"      │             │• Google APIs  │                      │   │
│   │           └───────┬───────┘             └───────▲───────┘                      │   │
│   │                   │ (ADK Sequential Hand-off)   │ Release Lock on Remediation/ │   │
│   │                   ▼                             │ Logged Security Override     │   │
│   │           ┌───────────────┐                     │                              │   │
│   │           │Drafting Agent │─────────────────────┘                              │   │
│   │           │• Canvas Draft │ (Uses only content readable by all invited roles)  │   │
│   │           └───────────────┘                                                    │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
┌─────────────────────────────┐ ┌───────────────────────┐ ┌──────────────────────────────┐
│  Knowledge & Ingestion Tier │ │ Persistence & State   │ │ Enterprise Analytics Tier    │
│  • Document AI: Layout      │ │ • Firestore:          │ │ • BigQuery:                  │
│    Parser for RFCs/policies │ │   - `meetings`        │ │   - `meeting_sessions`       │
│  • Vertex AI Search:        │ │   - `transcript_chunks│ │   - `compliance_events`      │
│    ACL-filtered datastore   │ │   - `artifacts` (docs)│ │   - `harness_runs`           │
│    (`allowed_roles`, ACL)   │ │   - `audit_logs`      │ │     (real benchmark metrics) │
└─────────────────────────────┘ └───────────────────────┘ └──────────────────────────────┘
```

### Stage-by-Stage Latency Budget (Component Breakdown)

```
Server Audio Chunk (300ms) ──▶ Speech-to-Text Final (500ms) ──▶ Cloud DLP (120ms)
                                                                       │
                                                                       ▼
Total TTFT ~2.42s ◀── Gemini 3.5 Flash TTFT (800ms) ◀── Parallel Research & Compliance (700ms)
```

1. **Audio Ingestion & Diarization**: The server reads pre-recorded scenario audio files directly into streaming Cloud Speech-to-Text (`model: latest_long`, `enableAutomaticPunctuation: true`, `diarizationConfig: { enableSpeakerDiarization: true }`). Resulting diarized transcript events broadcast to authenticated client WebSockets.
2. **Cloud DLP Sanitization**: Immediately post-STT on the backend, Cloud Sensitive Data Protection (`deidentifyContent`) redacts `CREDIT_CARD_NUMBER`, `US_SOCIAL_SECURITY_NUMBER`, `AUTH_TOKEN`, and `GCP_API_KEY`. `PERSON_NAME` is explicitly excluded to preserve diarized speaker names.
3. **Leading-Edge Triggering**: Listens for STT `is_final: true` events containing sentence delimiters (`?`, `.`). Dispatches parallel calls with a 1.5s trailing debounce against duplicates.
4. **Parallel Research & Compliance Execution (Gemini Structured Outputs)**:
   - **Research Agent**: Identifies distinct roles among connected session viewers. Executes Vertex AI Search once per unique role:
     `filter: "allowed_roles:ANY('${role}')"`.
     Results are cached for that turn and dispatched only to viewer sockets holding that role.
     - *Calibrated Score Gate*: Evaluates relevance score. If below calibrated threshold (initial 0.65), terminates with `STATE_UNGROUNDED`: *"No accessible results"* with an explicit on-screen refusal explanation.
   - **Compliance Guardian Agent**: Scans dialogue and the **last saved draft version** in `artifacts` using Gemini structured JSON schema output (`finding_id`, `severity`, `clause_reference`, `remediation_diff`).
     - For authorized roles: returns `clause_text` with advisory diff.
     - For unauthorized roles: returns *"Violates a restricted internal policy (Contact Security Team for guidance)"*, withholding policy text.
     - If severity is critical, sets `exportLocked: true` server-side on the Action Agent.
5. **Drafting Agent (ADK Sequential Hand-off)**: Synthesizes meeting agreements and public RFC citations. It evaluates the meeting's *invited participant roles* (`meetings.participants`), ensuring the shared draft in `artifacts` contains only content readable by all invited participants.
6. **Action Agent (Human-in-the-Loop)**: Converts agreed decisions into Google Docs exports. Server-side validation rejects exports with `403 Forbidden` if `exportLocked` is active, releasing only upon remediation diff application or logged override.

---

## 4. Ingestion, Schema & Governance

### A. Document AI Layout Parser & Datastore Indexing Pipeline
- Document AI **Layout Parser** parses 3 enterprise seed documents with per-chunk `allowed_roles` metadata:
  1. `RFC-104: Payment Gateway Architecture v2.4` (`allowed_roles: ['eng-core', 'security', 'leadership']`).
  2. `POL-SEC-08: Cross-Border Data Transfer Framework` (`allowed_roles: ['eng-core', 'security', 'leadership']`).
  3. `POL-SEC-12: Executive Key Custody & HSM Access Standard` (`allowed_roles: ['security', 'leadership']`).
- Datastore Schema Fields configured as `isFilterable: true`:
  - `doc_id`: Unique identifier.
  - `title`: Document title.
  - `allowed_roles`: `["eng-core", "security", "leadership"]`.
  - `clause_text`: Paraphrased internal policy clause text.

### B. Firestore Operational State Collections
- `meetings/{meetingId}`: Session title, invitedParticipants (`[{ userId, email, role }]`), `recordingConsent: true`, status (`active` | `completed`).
- `meetings/{meetingId}/transcript_chunks/{id}`: Speaker, timestamp, sanitizedText, intent.
- `meetings/{meetingId}/artifacts/{id}`: Current markdown content, version, docType (`rfc` | `prd`), exportUrl.
- `meetings/{meetingId}/audit_logs/{id}`: Agent name, action payload, approvalStatus (`pending` | `approved` | `rejected`), timestamp.

### C. BigQuery Analytics Schema & Live Insertion
- Dataset `nexus_analytics`:
  - `meeting_sessions`: `meeting_id`, `duration_sec`, `decisions_count`, `compliance_warnings_count`, `timestamp`.
  - `compliance_events`: `event_id`, `policy_id`, `clause_ref`, `severity`, `user_remediation_choice`.
  - `harness_runs`: `run_id`, `evaluated_meetings`, `action_item_recall`, `action_item_precision`, `compliance_catch_rate`, `compliance_false_positive_rate`, `gold_section_coverage_pct`, `p50_latency_ms`, `p95_latency_ms`, `mode` (`audio_stt_live` | `transcript_direct`), `timestamp`.

---

## 5. UI Architecture, Named System States & Design Constitution

- **High-Density 1440px Viewport**:
  - **Left Stream Console (320px)**: Scenario selector, audio player, diarized transcript, live latency stopwatch timer.
  - **Center Living Deliverables Canvas (620px)**: Split Markdown editor / preview with real-time streaming updates, version history, clickable sentence provenance, and 1-click Google Docs export.
  - **Right Multi-Agent Cockpit (500px)**:
    - *Grounded Research Feed*: Verified chunk citations with source links and confidence ratings (displays "No accessible results" with on-screen refusal explanation).
    - *Compliance Radar*: Active policy checks with clause text, advisory status, and suggested remediation diffs.
    - *Workspace Action Queue*: Pending Drive export with explicit `Approve` and `Reject` buttons (server-enforced export lock state clearly signaled).

### 5.1 Four Named System UI States
1. **`listening`**: Ambient audio stream active; processing speech chunks and diarization without active tool invocation.
2. **`grounded`**: Technical inquiry matched against indexed datastore with relevance score exceeding calibrated threshold ($\ge 0.65$); verified citation displayed with confidence rating.
3. **`refused`**: Score gate failed or query targets an unauthorized document; UI displays an on-screen refusal explanation (*"Query fell below the 0.65 relevance threshold or document is restricted from role [eng-core]"*) disclosing zero confidential metadata.
4. **`export_locked`**: Active critical compliance violation detected; export button is disabled and backend endpoint enforces 403 Forbidden until an approved remediation diff is applied.

### 5.2 Accessibility & Typography Restraint
- **WCAG AA Contrast**: Enforced minimum 4.5:1 text contrast across all slate surfaces (`text-slate-100` on `#0B0F17`, `text-slate-300` on `#111827`).
- **No AI Slop**: No decorative pulsing dots, no pseudo-technical `//` headers, zero pill badge sandwiches. Monospace tabular numerals (`font-mono tabular-nums`) for all timestamps, latency values, and policy codes.

---

## 6. Day 1-2 Milestones & Phased Implementation Roadmap

### Day 1-2: Independent Human Baselines & Smoke Tests
1. **Human Baseline Measurement**:
   - An independent human tester takes manual notes on the 3 scripted meetings without seeing model outputs to establish baseline figures.
2. **Streaming Diarization & Automatic Punctuation Smoke Test**:
   - Stream test audio from server to Cloud Speech-to-Text (`model: latest_long`, `enableAutomaticPunctuation: true`) verifying `speaker_tag` presence and sentence punctuation (`?`, `.`) in final results.
3. **ADK Node Workflow Agent Primitives Smoke Test**:
   - Verify whether `@google/adk` exposes `ParallelAgent` and `SequentialAgent` classes in TypeScript.
4. **Markdown-to-HTML-to-Google-Docs Export Engine Smoke Test**:
   - Verify conversion pipeline transforming Markdown into semantic HTML with simple styled tables and blockquotes for callouts.
5. **Vertex AI Search Score Discovery & Chunk ACL Smoke Test**:
   - On the real datastore, print the relevance score field and verify per-chunk `allowed_roles` filtering.

### Phased Roadmap & Fallback Cut Order
1. Ingestion, ACL & Core Agents (Top Priority - Must Be Real)
2. Google Workspace HTML-Docs Export (Must Be Real)
3. Cloud STT & Audio Replay (Use cached diarized audio stream if real-time STT quotas hit)
4. Evaluation Harness & BigQuery Sync (Automated benchmark script with ACL draft leakage assertion)
5. Dashboard Polish (Secondary)

*Stretch Items (Below Cut Line - Not Part of Live Demo)*:
- **Clickable Sentence Provenance Panel**: Click any sentence in the living draft canvas to reveal its underlying meeting utterance timestamp and source document citation in an interactive provenance drawer.
- **Google Calendar Follow-up Action**: Stage automated calendar review invitations via `calendar.events` scope.
- **Live Microphone Streaming**: Real-time browser mic streaming via WebRTC/WebSocket.

#### Phase 1: Full-Stack Foundation, Auth & Persistence
- Configure Express backend in `server.ts` with Vertex AI `@google/genai` (`gemini-3.5-flash`).
- Configure Application Default Credentials (ADC) and Google Cloud IAM service account (`nexus-runtime-sa`).
- Initialize Firestore collections (`meetings`, `transcript_chunks`, `artifacts`, `audit_logs`).

#### Phase 2: Document AI Layout Parser & Vertex Search Ingestion Pipeline
- Build ingestion script parsing the 3 seed documents (`RFC-104`, `POL-SEC-08`, `POL-SEC-12`) with Document AI Layout Parser.
- Upload structured chunks and metadata into Vertex AI Search Datastore (`datastore-enterprise-knowledge`).
- Implement verified query test asserting ACL role filtering: verify `eng-core` receives "No accessible results" for `POL-SEC-12`, while `security` receives full citations; verify `RFC-104` is accessible to both.

#### Phase 3: ADK Multi-Agent Orchestrator & State Machine
- Implement the ADK Parallel Workflow agent running Research Agent and Compliance Guardian concurrently upon sentence-boundary trigger over WebSocket.
- Implement per-role search caching and client socket routing with Gemini structured JSON output.
- Implement calibrated threshold refusal logic (`STATE_UNGROUNDED`) when relevance score falls below threshold.
- Implement server-side compliance export lock rejecting `/api/export` with `403` until remediation or logged override.

#### Phase 4: Server Audio Transport, Diarized STT & Cloud DLP
- Build server audio pipeline feeding pre-recorded scenario audio into Cloud Speech-to-Text with speaker diarization and automatic punctuation.
- Integrate Cloud Sensitive Data Protection (DLP) sanitizing `CREDIT_CARD_NUMBER`, `US_SOCIAL_SECURITY_NUMBER`, `AUTH_TOKEN`, and `GCP_API_KEY` while preserving `PERSON_NAME`.
- Implement leading-edge STT `is_final: true` trigger with 1.5s trailing debounce.

#### Phase 5: Living Canvas & Grounded Citations
- Render live Markdown canvas with streaming section updates over WebSocket.
- Enforce invited participant role intersection on the shared canvas.
- Connect Research Agent to display verified citations in the private research feed.

#### Phase 6: Proactive Compliance Guardian & Action Gate
- Implement Compliance Agent reading the last saved draft version in `artifacts`.
- Display advisory alerts with clause text only for authorized roles, and generic restricted alerts for unauthorized roles.
- Connect Google Workspace OAuth for Drive/Doc creation (with HTML conversion engine), verifying server-side export lock release upon remediation.

#### Phase 7: Evaluation Harness & BigQuery Live Analytics
- Build evaluation harness script (`npm run evaluate:harness`) that replays the 3 test meetings and writes scored runs to BigQuery.
- Add automated assertion verifying that the final draft viewed as `eng-core` contains zero text from `POL-SEC-12`.
- Render analytics dashboard displaying real run metrics alongside historical trends.

#### Phase 8: Cloud Run Container & Build Verification
- Provide Dockerfile and verify production compilation with zero errors.

---

## 7. Cloud Run Deployment & Demo-Day Execution

### Cloud Run Deployment Configuration
```bash
# Production Deployment to Cloud Run with ADC, session affinity, min-instances warming, and 3600s timeout.
# Note: --max-instances 1 guarantees single-instance in-memory WebSocket meeting state for the demo.
# The horizontal scale-out architecture uses Firestore and Google Cloud Pub/Sub for cross-instance fan-out.
gcloud run deploy nexus-sidekick \
  --source . \
  --region us-central1 \
  --service-account "nexus-runtime-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --timeout 3600s \
  --session-affinity \
  --min-instances 1 \
  --max-instances 1 \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID="${GOOGLE_CLOUD_PROJECT}",LOCATION="us-central1"
```

### Demo-Day Checklist (Pre-Flight Safeguards)
- [ ] **Warm-up Query**: Send one pre-demo test query 2 minutes before presenting to ensure Cloud Run container and Vertex AI client instances are fully warm.
- [ ] **OAuth Token Re-Authentication**: Re-authenticate the Google Workspace test account within 24 hours prior to presenting (Google OAuth refresh tokens in Testing mode expire after 7 days).
- [ ] **Backup Video**: Keep a local screen recording of a complete end-to-end run on standby in case of network or quota interruptions.

### 2:35 Hackathon Demo Script

1. **Minute 0:00 – The Problem & Persona (25s)**:
   - "Teams often spend 30 to 45 minutes after complex architecture meetings drafting notes, while compliance risks slip by until late security audits. Nexus Sidekick is an active, compliance-governed AI teammate operating in the meeting itself."
2. **Minute 0:25 – Live Grounded Teammate & Living Canvas (45s)**:
   - In Browser Window 1 (`alice@acme.corp` - `eng-core`): Select Scenario 1: *EU Payment Gateway Architecture Sync*.
   - Start playback. Note the **`listening`** UI badge. As Alice asks *"Do we have an approved retry pattern for EU tokenization?"*, the system shifts to **`grounded`** and the timer stops at ~2.3s.
   - Sidekick displays the exact citation from *RFC-104 (Section 3.2)* with calibrated confidence score.
   - The Living Canvas drafts the new document: *RFC-118: Next-Gen Payment Tokenization Engine*.
3. **Minute 1:10 – Multi-Account ACL Enforcement & Refusal State (35s)**:
   - In Scenario 1 audio, the speaker asks: *"Should we store the master tokenization private keys directly in our service config or use the executive HSM vault?"*
   - In Window 1 (Alice - `eng-core`), Sidekick shifts to **`refused`** with an on-screen refusal explanation: *"No accessible results for role [eng-core]"*, disclosing zero key policies.
   - Switch to Window 2 (`marcus@acme.corp` - `security`), pre-opened on the same live session. Marcus immediately sees the cited clause from `POL-SEC-12 (Executive Key Custody Standard)`.
   - Point out that *RFC-118* on the shared canvas remains free of restricted text, enforcing draft isolation across all invited participants.
4. **Minute 1:45 – The Compliance Guardian & Server-Enforced Export Lock (25s)**:
   - The team debates storing unencrypted payment metadata in a shared US bucket.
   - The system shifts to **`export_locked`**: flags *Cross-Border Transfer Policy §4.2* with clause text, marks it *CRITICAL (Advisory)*, and locks the Google Docs export button (enforced with a 403 server gate).
   - Click "Review & Apply Remediation" to incorporate the compliant EU token vault pattern into *RFC-118*. The export lock releases immediately.
5. **Minute 2:10 – Real Google Doc Export & Verified Analytics (25s)**:
   - Meeting concludes. Sidekick stages the final deliverable: "Export RFC-118 to Google Docs".
   - Click **Approve**, firing the real Google Workspace API to generate the live Google Doc in Google Drive.
   - Switch to the Analytics tab: narrate the actual live numbers recorded on screen from the BigQuery harness and meeting run.
