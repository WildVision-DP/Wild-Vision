# 🐅 WildVision - Project Board

**Project:** WildVision - Wildlife Surveillance & Movement Analytics Platform  
**Client:** Forest Department of India  
**Current Sprint:** Week 1 (Jan 30 - Feb 5, 2026)  
**Sprint Goal:** Monorepo setup and RBAC schema design  
**Overall Progress:** 0%

**Design System:** shadcn/ui with muted palette (Forest Green + Beige) · See `design_guidelines.md`  
**Quality Standards:** Production-ready · Integration-first · Government-grade · No temporary solutions

---

## 📋 This Week's Tasks

### ⏳ To Do (10 tasks)

**Module 0: Project Foundations**
- **Task 0.1.1** - Create monorepo structure (4h)
  - Set up apps/api, apps/web, apps/ai-node directories
  - Configure Turborepo or Nx for monorepo management
  
- **Task 0.1.2** - Initialize Git standards (2h)
  - Conventional commits, branch protection, CODEOWNERS
  
- **Task 0.1.3** - Development environment setup (3h)
  - Install Bun.js, configure VS Code, ESLint, Prettier

**Module 1: Authentication & RBAC**
- **Task 1.1.1** - Design RBAC schema (6h)
  - 4 roles: Admin, Divisional Officer, Range Officer, Ground Staff
  - Permission matrix with role inheritance
  
- **Task 1.1.2** - Implement authentication (8h)
  - JWT tokens, password hashing, device binding

**Additional Setup**
- Set up PostgreSQL + PostGIS database
- Set up MinIO object storage
- Create initial Docker Compose configuration

**Sprint Status:** 🔵 Not Started (0/10 done, 0%)

---

## 🎯 Milestones

### M0: Project Foundations (Due: Feb 28, 2026)
**Progress:** ░░░░░░░░░░░░░░░░░░░░ 0%

**Scope:**
- Monorepo setup (Bun.js + React + AI node)
- Authentication & RBAC (4-tier hierarchy)
- Database schema (PostgreSQL + PostGIS)
- MinIO storage configuration
- Docker Compose setup

**Current:** Planning phase  
**Next:** Task 0.1.1 (Monorepo structure)

---

### M1: Camera & Geospatial Core (Due: Mar 31, 2026)
**Progress:** ░░░░░░░░░░░░░░░░░░░░ 0%

**Scope:**
- Camera lifecycle management
- Camera movement tracking (immutable history)
- Forest geography (divisions, ranges, beats)
- Google Maps integration
- Image ingestion pipeline (SD card uploads)
- MinIO bucket structure

**Status:** Not started (begins Week 5)

---

### M2: AI Inference & Verification (Due: Apr 30, 2026)
**Progress:** ░░░░░░░░░░░░░░░░░░░░ 0%

**Scope:**
- YOLOv8 model setup (wildlife + human + vehicle)
- Night IR image support
- Confidence-based auto-approval (≥ 0.85)
- Human-in-the-loop verification UI
- Audit trail for verifications

**Status:** Not started (begins Week 9)

---

### M3: Federated Learning (Due: May 31, 2026)
**Progress:** ░░░░░░░░░░░░░░░░░░░░ 0%

**Scope:**
- Flower FL server (Central HQ)
- Flower FL clients (Range HQs)
- Secure TLS communication
- Training triggers (time/data-based)
- Model governance & versioning
- Drift detection

**Status:** Not started (begins Week 13)  
**Risk:** HIGH - Most complex module

---

### M4: Analytics & Maps (Due: Jun 30, 2026)
**Progress:** ░░░░░░░░░░░░░░░░░░░░ 0%

**Scope:**
- Analytics dashboards (role-aware)
- Core KPIs (animal counts, intrusions, camera uptime)
- Plotly charts (density, trends, altitude vs species)
- Animal movement tracking
- Flagship species alerts (tiger, leopard)
- Interactive maps with filters

**Status:** Not started (begins Week 17)

---

### M5: Backend & Deployment (Due: Jul 30, 2026)
**Progress:** ░░░░░░░░░░░░░░░░░░░░ 0%

**Scope:**
- Bun.js API architecture (layered, event-driven)
- Docker deployment (edge + central profiles)
- Security & compliance (audit logs, encryption)
- Testing & simulation (synthetic data, load tests)
- Documentation & SOPs (role-specific manuals)

**Status:** Not started (begins Week 21)

---

## 📊 Quick Stats

**Total Tasks:** 100+  
**Completed:** 0 (0%)  
**In Progress:** 0 (0%)  
**Remaining:** 100+ (100%)

**Days Elapsed:** 0/180 (0%)  
**Weeks Remaining:** 26

---

## 🎯 Next 4 Sprints

### Week 2 (Feb 6-12, 2026): Database & Auth Backend
**Goal:** PostgreSQL + PostGIS setup, JWT auth implementation  
**Tasks:** 1.1.2-1.1.3  
**Key:** Login working, RBAC enforced

### Week 3 (Feb 13-19, 2026): Auth UI & Camera Schema
**Goal:** Login/register UI, camera database design  
**Tasks:** 1.1.4, 2.1.1  
**Key:** Users can log in, camera model defined

### Week 4 (Feb 20-26, 2026): Camera Management
**Goal:** Camera CRUD, movement tracking  
**Tasks:** 2.1.2, 2.2.1  
**Key:** Camera locations tracked with PostGIS

### Week 5 (Feb 27 - Mar 5, 2026): Forest Geography
**Goal:** Administrative boundaries, Google Maps  
**Tasks:** 2.2.2, 3.1.1  
**Key:** Map showing divisions/ranges/cameras

---

## 🚨 Blockers & Risks

**Active Blockers:** None

**Top Risks:**
1. **Federated Learning Complexity** (HIGH) - Allocate extra time, consult experts
2. **Field Connectivity Issues** (MEDIUM) - Offline-first design required
3. **YOLOv8 Model Accuracy** (MEDIUM) - Human verification as fallback

---

## 🔗 Quick Links

**Local Services (After Setup):**
- Web Dashboard: http://localhost:3000
- Bun.js API: http://localhost:4000
- MinIO Console: http://localhost:9001
- PostgreSQL: localhost:5432
- Flower FL Server: http://localhost:8080

**Documentation:**
- [TASKS.md](TASKS.md) - Full task list (100+ tasks)
- [PROGRESS.md](PROGRESS.md) - Weekly progress tracker
- [Surveillance Spec](wildlife_surveillance_platform_master_task_breakdown_bun.md) - Original requirements

**Tech Stack:**
- [Bun.js](https://bun.sh) - Backend runtime
- [React](https://react.dev) - Frontend framework
- [PostGIS](https://postgis.net) - Geospatial database
- [YOLOv8](https://docs.ultralytics.com) - Object detection
- [Flower FL](https://flower.dev) - Federated learning
- [MinIO](https://min.io) - Object storage

---

## 📝 Sprint Planning Notes

### Week 1 Focus Areas

**Critical Path:**
1. Set up monorepo with Bun.js + React
2. Install and configure PostgreSQL + PostGIS
3. Design RBAC schema (4 roles with inheritance)
4. Set up MinIO for object storage
5. Create initial Docker Compose file

**Success Criteria:**
- ✅ All developers can run `bun install` and start services
- ✅ PostgreSQL + PostGIS accessible
- ✅ MinIO accessible via console
- ✅ RBAC schema documented and reviewed
- ✅ Git repository with proper structure

**Blockers to Watch:**
- Bun.js compatibility issues (new runtime)
- PostGIS installation on Windows (if applicable)
- Team familiarity with monorepo tools

---

## 🎉 Achievements

### This Week
- ✅ Project kickoff completed
- ✅ Tech stack finalized
- ✅ Task breakdown created (100+ tasks)
- ✅ Documentation structure established

---

## 📅 Key Dates

| Date | Event |
|------|-------|
| Jan 30, 2026 | Project start |
| Feb 5, 2026 | Week 1 review |
| Feb 28, 2026 | M0: Foundation complete |
| Mar 31, 2026 | M1: Camera & geospatial |
| Apr 30, 2026 | M2: AI inference |
| May 31, 2026 | M3: Federated learning |
| Jun 30, 2026 | M4: Analytics & maps |
| **Jul 30, 2026** | **M5: Full deployment** |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Central HQ (Forest Dept)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Bun.js API  │  │   React Web  │  │  Flower FL   │  │
│  │              │  │   Dashboard  │  │   Server     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  PostgreSQL  │  │    MinIO     │                    │
│  │  + PostGIS   │  │   Storage    │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                          ↕ TLS
┌─────────────────────────────────────────────────────────┐
│                   Range HQ (Edge Node)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   AI Node    │  │  Flower FL   │  │  Local DB    │  │
│  │  (YOLOv8)    │  │   Client     │  │  (Sync)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Ground Staff Upload Interface            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated:** Jan 30, 2026  
**Next Update:** Feb 1, 2026
