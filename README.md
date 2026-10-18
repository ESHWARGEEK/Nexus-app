# Nexus App

Nexus is an advanced enterprise productivity and compliance platform. It seamlessly integrates AI capabilities, Google Workspace tools, and stringent data security protocols to empower teams while maintaining organizational compliance.

## 🌟 Key Features

- **Intelligent Meeting Copilot:** Real-time assistance and transcript streaming during meetings (`MeetingCopilot.tsx`, `TranscriptStream.tsx`).
- **Google Workspace Integration:** Built-in experiences for Google Calendar and Google Meet (`GoogleCalendarView.tsx`, `GoogleMeetExperience.tsx`).
- **Nexus AI Assistant:** An integrated chatbot and grounded research feed powered by generative AI (`NexusAIChatbot.tsx`, `GroundedResearchFeed.tsx`).
- **Enterprise Security & Compliance:**
  - Data Loss Prevention (DLP) monitoring and parsing (`dlpAdapter.ts`, `ComplianceRadar.tsx`).
  - Export approval workflows (`ExportApprovalModal.tsx`).
  - Strict access control and tenant management (`AdminTenantModal.tsx`, `orgAcl.test.ts`).
- **Advanced Document Processing:** Automated parsing and understanding of documents using Document AI (`documentAiAdapter.ts`, `documentParserService.ts`).

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend & Database:** Node.js (`server.ts`), Firebase / Firestore
- **AI & ML Integrations:** Google Gemini (`geminiService.ts`), Speech-to-Text (`sttService.ts`), Document AI
- **Architecture:** Modular adapter pattern for external services and standardized service layers for core business logic.

## 📂 Project Structure

- `/src/adapters/`: Interfaces for external APIs (Auth, GenAI, DLP, Document AI, Search, STT).
- `/src/components/`: Reusable React UI components and main views (Dashboards, Modals, Chatbots).
- `/src/services/`: Core business logic and state management (Compliance, Workspace, Nexus Agent, Shared Drafts).
- `/src/data/`: Application data models and seeding scripts.
- `/src/tests/`: Unit and integration tests (ACLs, Datastores).
- `/public/sample-docs/`: Sample corporate policies and RFCs used for testing Document AI and DLP features.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Bun (optional, lockfile included)
- Firebase project credentials

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```
3. Set up your environment variables by copying the example file:
   ```bash
   cp .env.example .env
   ```
   _Fill in your Firebase, Google Workspace, and AI API keys in the `.env` file._

### Development

To start the Vite development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

## 🔒 Security

This application implements rigorous security controls, including rule-based Firestore access (`firestore.rules`), organizational ACLs (`orgAcl.test.ts`), and active Data Loss Prevention (`dlpService.ts`). Ensure all test documents in `/public/sample-docs/` remain sanitized.
