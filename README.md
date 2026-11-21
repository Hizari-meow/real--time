# Real-Time Collaborative Workspace
### High-Concurrency Distributed Collaboration Platform with CRDT-Driven State Convergence

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Yjs CRDT](https://img.shields.io/badge/Yjs-CRDT-orange.svg?style=flat-square)](https://yjs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-red.svg?style=flat-square&logo=redis)](https://redis.io/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

An enterprise-grade, distributed real-time collaborative platform engineered for high-concurrency environments. Built from the ground up to solve distributed state synchronization, network partition resilience, and zero-conflict multi-user editing across documents, infinite whiteboards, task pipelines, and cloud storage.

---

## 🏛️ System Architecture

```
                             +--------------------------------+
                             |   Client Web Browser (React)   |
                             |  TipTap / ProseMirror / HTML5  |
                             |   Yjs CRDT + y-indexeddb Cache |
                             +---------------+----------------+
                                             |
                                 WSS / HTTPS (Port 8080)
                                             |
                                             v
                             +--------------------------------+
                             |   NGINX Reverse Proxy / L7     |
                             |   Load Balancer & SSL Engine   |
                             +---------------+----------------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
                   v                                                   v
    +------------------------------+                    +------------------------------+
    |   Gateway Node 1 (:4001)     |                    |   Gateway Node 2 (:4002)     |
    |  - WebSocket Handshake (JWT) |                    |  - WebSocket Handshake (JWT) |
    |  - Binary Frame Validation   |                    |  - Binary Frame Validation   |
    |  - Per-Packet Authorization  |                    |  - Per-Packet Authorization  |
    |  - Active Y.Doc In-Memory    |                    |  - Active Y.Doc In-Memory    |
    |  - Snapshot Fencing Worker   |                    |  - Snapshot Fencing Worker   |
    +--------------+---------------+                    +--------------+---------------+
                   |                                                   |
                   +-------------------------+-------------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |        Redis 7.2 Backplane        |
                           |  - Channel: room:doc:{id}         |
                           |  - Channel: collab:auth:revoke    |
                           |  - Cyclic Echo Cancellation       |
                           +-----------------+-----------------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
                   v                                                   v
    +------------------------------+                    +------------------------------+
    |       PostgreSQL 16 DB       |                    |     MinIO S3 Storage (:9000) |
    |  - Row-Level Tenant Isolation|                    |  - Point-in-time Snapshots   |
    |  - Advisory Locks (pg_lock)  |                    |  - Deduplicated Binary Slices|
    |  - Transactional Outbox      |                    |  - Multi-tenant Cloud Drive  |
    |  - Storage Quota Mutex       |                    |  - Presigned URL Delivery    |
    +------------------------------+                    +------------------------------+
```

---

## ⚡ Core Engineering Pillars

### 1. Mathematical Zero-Conflict Convergence (Yjs CRDTs)
- **Local-First Mutations**: Updates are applied optimistically to client-side memory and synchronized asynchronously over binary WebSockets (`MSG_SYNC`).
- **State Vector Delta Negotiation**: Two-step synchronization protocol (`SyncStep1` vector clock negotiation $\rightarrow$ `SyncStep2` differential binary update) eliminates redundant network payload transmission.
- **Client-Scoped Undo/Redo**: Custom transaction origin binding ensures user operations can be rolled back individually without corrupting concurrent collaborators' edits.

### 2. Multi-Node Cluster with Inter-Node Echo Cancellation
- **Horizontal Gateway Scaling**: Headless WebSocket gateways communicate over a high-throughput Redis Pub/Sub cluster backplane.
- **Node-Origin Deduplication**: Gateway nodes stamp outgoing frames with a unique instance UUID (`config.nodeId`), discarding self-published echoes and preventing infinite feedback loops.
- **Server-Side Packet Authorization**: Every binary frame is inspected at the network transport boundary; unauthorized writes (`viewer` attempting mutations) are discarded prior to memory CRDT ingestion.

### 3. Tiered Persistence & Monotonic Snapshot Fencing
- **Microsecond In-Memory Editing**: Collaborations occur entirely in ephemeral Node.js RAM buffers.
- **Point-in-Time S3 Archival**: Periodic background workers serialize the Yjs document state into compressed binary blobs stored in MinIO/S3 (`orgs/{orgId}/snapshots/`).
- **Distributed Fencing Token**: Monotonically incrementing version counters (`last_committed_version`, `next_alloc_version`) coupled with lease tokens (`snapshot_lease_token`, `snapshot_lease_expires >= NOW()`) prevent split-brain writes during failover.

### 4. Strict Multi-Tenant Isolation & Storage Quota Atomicity
- **Pessimistic Quota Locking**: Multi-process file upload reservations utilize PostgreSQL `SELECT ... FOR UPDATE` rows within `StorageQuotaService` to eliminate race conditions and over-allocation.
- **Self-Healing Storage Reaper**: Automated orphan cleanup service reconciles MinIO S3 object prefixes against database persistence records, pruning stalled binary fragments from failed client uploads.
- **Database-Level Trigger Guards**: PostgreSQL trigger functions validate cross-tenant foreign key constraints (`check_whiteboard_task_tenant_match`) to enforce hard tenant boundaries.

### 5. High-Concurrency Advisory Locking (Dot Voting Engine)
- **Two-Tier Lock Hierarchy**: Session-level ballot counters combine PostgreSQL transaction-level advisory locks (`pg_advisory_xact_lock(hashtext('ballot:' || sid || ':' || uid))`) with row-level locks on `whiteboard_ballots`.
- **SHA-256 Idempotency Ledger**: Request fingerprints (`userId:sessionId:stickyId:delta:key`) prevent double-voting under high-frequency retry bursts while strictly rejecting conflicting payloads (HTTP 409).

---

## 📦 Functional Modules

| Module | Core Functionality | Architecture Details |
| :--- | :--- | :--- |
| **M1: Document Engine** | Collaborative rich-text editor (Google Docs/Notion style) | TipTap / ProseMirror + Yjs, spatial comments drawer, change tracking, version history drawer. |
| **M2: Project Kanban** | Jira/Linear-inspired task management | Kanban multi-views (Board, Gantt Timeline, Calendar, Analytics), subtasks, sprint planning, dependency tracking. |
| **M3: Infinite Canvas** | Vector whiteboard (Figma/Miro style) | Real-time vector shapes, freehand pen tool, sticky notes, orthogonal smart connectors, dot voting session ledger. |
| **M4: Cloud Drive** | High-performance enterprise storage | S3-compatible chunked multipart upload, transactional quota reservations, recursive folder trees, file previews. |
| **M5: Knowledge Wiki** | Hierarchical SOP and documentation hub | Nested tree structure, markdown rendering, cross-document linking, access control lists. |
| **M6: Team Hub** | Unified communication & huddle | Project channels, direct messaging, audio/video huddle integration, rich media attachments. |

---

## 🛠️ Technology Stack

```
Frontend:
  ├── Framework: Next.js 14 (App Router)
  ├── Language: TypeScript 5.3 (Strict Mode)
  ├── State & CRDT: Yjs, y-protocols, y-indexeddb, lib0
  ├── Editor Core: TipTap 2.2 / ProseMirror
  └── Styling & UI: Tailwind CSS, Lucide Icons, Glassmorphism UI

Backend:
  ├── Runtime: Node.js 20+ / tsx
  ├── API Gateway: Express 4.18 + ws (Clustered WebSocket Server)
  ├── Data Access: Prisma ORM 5.10
  ├── Authentication: JWT (Access + Sliding Refresh Cookie Token)
  └── Concurrency: Redis Pub/Sub, Advisory Xact Locks, PL/pgSQL

Infrastructure & Storage:
  ├── Database: PostgreSQL 16 Alpine
  ├── In-Memory Broker: Redis 7.2 Alpine
  ├── Object Storage: MinIO S3 (Production-grade bucket quotas)
  ├── Load Balancer: NGINX (Reverse Proxy, WebSockets, Rate Limiting)
  └── Containerization: Docker & Docker Compose
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) v20.x or higher
- [npm](https://www.npmjs.com/) v10.x or higher

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Hizari-meow/real--time.git
cd real--time
npm install
```

### 2. Configure Environment Variables
Copy the default environment template:
```bash
cp .env.example .env
```

### 3. Spin Up Infrastructure (PostgreSQL, Redis, MinIO, NGINX)
```bash
# Starts Postgres (5434), Redis (6380), MinIO (9000/9001), Gateways (4001, 4002), and NGINX (8080)
npm run docker:up
```

### 4. Run Database Migrations & Seeds
```bash
npm run db:push
npm run db:generate
```

### 5. Start Frontend Development Server
```bash
npm run dev:web
```

Open [http://localhost:3005](http://localhost:3005) in your browser.

---

## 🧪 Default Test Accounts (Pre-Seeded)

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Workspace Owner** | `owner@collab.local` | `password123` | Full enterprise control, workspace settings, RBAC management |
| **Workspace Admin** | `admin@collab.local` | `password123` | Resource moderation, project administration, audit logs |
| **Team Member** | `member@collab.local` | `password123` | Standard editor access across documents, kanban, and drive |

---

## 🔬 Testing & Reliability Verification

The codebase includes an extensive suite of automated tests verifying distributed consistency, race-condition mitigation, and boundary enforcement:

```bash
# Run core unit and integration test suite
npm run test:core

# Run concurrent Yjs CRDT convergence verification
npm run test:convergence

# Run multi-process storage quota stress test
npx tsx tests/phase4-quota-multiprocess.test.ts

# Run audit verification gates
npx tsx tests/audit-phase4-gate.ts
```

---

## 📋 Architectural Standards & Conventions
- **Zero Raw Mutations**: All collaborative text and canvas mutations flow strictly through Yjs CRDT transaction boundaries.
- **Fail-Safe Tenancy**: Every query at the ORM and database level enforces explicit `orgId` filtering. Cross-tenant references are rejected at the schema level.
- **Idempotent Operations**: Non-read endpoints support client-generated `idempotencyKey` headers bound to SHA-256 payload fingerprints.
- **Graceful Degradation**: Offline-first clients cache state vectors in browser IndexedDB, synchronizing automatically upon WebSocket reconnection.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
