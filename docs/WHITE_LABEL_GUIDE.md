# White Label & Repurposing Guide for Tendriv-Admin

This document outlines how the `Project_Tendriv-Admin` repository functions, its architecture, and a roadmap for repurposing it as a white-label CRM, CMS, and admin portal for external clients.

## 1. How This Repo Works

The Admin repository is an internal business operations surface. It serves as:
- A **CRM and Sales Pipeline** (managing outreach contacts and leads).
- A **Content Management System (CMS)** and Autoblog Review Queue.
- A **System-Health Dashboard** (observability, log drains).

### Architecture
- **Framework:** Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS.
- **Database:** Supabase (PostgreSQL). By strict internal governance, it connects *only* to a marketing/operations database, purposefully isolated from any core application databases.
- **Background Jobs:** Leverages Vercel Cron Jobs (configured in `vercel.json`) to trigger serverless API routes for tasks like B2B intel sweeps, lead scoring, and CRM matching.

## 2. External Connection Points

The repo is highly integrated. If repurposing, these are the external dependencies you must wire up or mock out:

1. **Supabase (Primary DB & Auth):**
   - Handles data storage (CRM contacts, blog posts, pipeline topics).
   - Expected schemas include `blog_posts`, `blog_drafts`, `outreach_contacts`, and observability logs.
2. **Autoblog Engine (External Microservice):**
   - The Admin app connects to an external generation engine (e.g., `rfp-blog.vercel.app`).
   - Integration happens via proxy (`lib/autoblog/proxy.ts`) using API keys and Server-Sent Events (SSE) for streaming updates.
3. **Public Marketing Site (Cross-Repo Integrations):**
   - Webhooks are sent back and forth between this Admin portal and the public-facing marketing site (e.g., content approval and notification webhooks).
4. **B2B Intel & AI Pipeline:**
   - **Google Places API / Serper API:** Used for discovery and firmographics.
   - **Gemini / Anthropic:** Used for AI extraction, lead analysis, and content brief generation.
5. **Email & Analytics:**
   - **Cyberimpact:** Mailing list management.
   - **Google Analytics 4 (GA4):** Server-side proxy for tracking.
6. **Observability:**
   - Endpoints `/api/drains/vercel` and `/api/drains/supabase` ingest log drains.

## 3. How to Recreate & White-Label for Paying Clients

To turn this into a scalable white-label offering, you will provision an isolated "stack" for each client.

### Manual Setup per Client
1. **Repository:** Fork or clone this repository to act as the base template.
2. **Database:** Spin up a new Supabase project. Run the migrations in `supabase/migrations/` to initialize the CRM and CMS tables.
3. **Hosting:** Create a new project on Vercel.
4. **Configuration:** Inject the required environment variables found in `.env.example`:
   - Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
   - AI and B2B Intel keys (Anthropic, Gemini, Google Places, Serper).
   - Third-party SaaS keys (Cyberimpact, GA4).
   - Secret keys for Webhooks, Cron Jobs, and Log Drains.

## 4. Automation Opportunities for New Client Onboarding

When scaling up to multiple clients, manual setup becomes a bottleneck. The following processes can be fully automated:

1. **Infrastructure as Code (IaC):**
   - Use **Terraform** or **Pulumi** with the Vercel and Supabase providers.
   - You can automate the creation of a Vercel project, link it to the base GitHub repository, and automatically provision a new Supabase instance.
2. **Database Migrations:**
   - Automate schema creation by running `supabase db push` in a CI/CD pipeline triggered when a new client's environment is provisioned.
3. **Environment Variable Provisioning:**
   - Automatically inject generated secrets (e.g., `CRON_SECRET`, `GATE_JWT_SECRET`, log drain tokens) into the Vercel project via the Vercel API.
4. **Initial Data Seeding:**
   - Execute a post-deployment script to seed the database with the client's initial configuration (e.g., default pipeline stages, taxonomy tags, or initial admin user accounts).

## 5. Tech Stack Constraints & Integration Risks

Before offering this as a generic service, be aware of these architectural constraints:

- **Drift-Prone Cross-System Contracts:**
  - The system tightly couples with external services (like the Autoblog engine and Marketing repo webhooks). Database ENUMs or JSON schemas (e.g., `status='approved'`) are shared across these boundaries. If the external service schema changes, the Admin app will silently fail if not synced.
- **High Dependency on Serverless Executions:**
  - Long-running tasks rely on Vercel's edge/serverless function timeouts and Cron architecture. For heavy AI tasks or B2B intel sweeps, you must stay within Vercel's timeout limits (e.g., 15-60 seconds depending on the Vercel tier).
- **Hardcoded Governance Checks:**
  - Ensure you remove or update the files in `governance/` (like `000_GOVERNANCE.md` and `SECURITY.md`). The current repository strictly forbids connecting to certain database IDs. You'll need to strip these static checks and perhaps build dynamic environment validation for your white-label clients.
- **Provider Lock-in:**
  - The codebase leans heavily on Supabase for Auth, PostgREST APIs, and Edge Functions, and Vercel for hosting and cron execution. Migrating to generic Docker/AWS deployments would require significant rewrites to `.vercel/`, cron configurations, and potentially the authentication flow.
