# 🐅 WildVision - Progress Tracker

**Project:** WildVision - Wildlife Surveillance & Movement Analytics Platform  
**Client:** Forest Department of India  
**Project Start:** Jan 30, 2026  
**Target Completion:** Jul 30, 2026 (6 months)  
**Current Phase:** Planning & Foundation  
**Overall Progress:** 0%

**Design System:** shadcn/ui · Muted Colors (Forest Green #4a6f4a + Beige #b39d71)  
**Quality Standard:** Production-ready code only · No temporary solutions · Complete testing required

> **Note:** Progress is updated only after tasks are completed satisfactorily with no persisting errors. See `design_guidelines.md` for complete UI/UX specifications.

---

## 📅 Timeline Overview

```
Month 1-2   Foundation & Core        ░░░░░░░░░░░░░░░░░░   0%  [PLANNING]
Month 3     Upload & AI Pipeline     ░░░░░░░░░░░░░░░░░░   0%  
Month 4     Federated Learning       ░░░░░░░░░░░░░░░░░░   0%  
Month 5     Analytics & Maps         ░░░░░░░░░░░░░░░░░░   0%  
Month 6     Testing & Deployment     ░░░░░░░░░░░░░░░░░░   0%  
```

---

## 📊 Current Sprint: Week 1 (Jan 30 - Feb 5, 2026)

**Goal:** Project setup and monorepo foundation  
**Progress:** 0/10 tasks complete (0%)

### ⏳ This Week's Focus
- Task 0.1.1: Create monorepo structure
- Task 0.1.2: Initialize Git standards
- Task 0.1.3: Development environment setup
- Task 1.1.1: Design RBAC schema

### 🎯 Key Deliverables
- [ ] Monorepo structure with apps/api, apps/web, apps/ai-node
- [ ] Bun.js runtime installed and configured
- [ ] Git repository with conventional commits
- [ ] RBAC schema designed (4 roles: Admin, Divisional, Range, Ground)

**Status:** 🔵 Planning Phase

---

## 🎯 Milestone Status

### M0: Project Foundations (Feb 28, 2026) - 0% Complete
**Modules:** 0, 1  
**Duration:** 4 weeks

✅ **Done:**
- None yet

⏳ **In Progress:**
- Planning phase

⚪ **Pending:**
- Task 0.1.1-0.1.3: Monorepo setup
- Task 1.1.1-1.1.4: Authentication & RBAC
- Database schema design (PostgreSQL + PostGIS)
- MinIO storage setup

**Key Technologies:**
- Bun.js for backend API
- React for dashboard
- PostgreSQL + PostGIS for geospatial data
- Docker for containerization

---

### M1: Camera & Geospatial Core (Mar 31, 2026) - 0% Complete
**Modules:** 2, 3  
**Duration:** 4 weeks

⚪ **Pending:**
- Task 2.1.1-2.1.2: Camera lifecycle management
- Task 2.2.1-2.2.2: Forest geography & Google Maps
- Task 3.1.1-3.1.3: Image ingestion pipeline
- PostGIS spatial queries
- MinIO bucket structure

**Key Technologies:**
- PostGIS for spatial data
- Google Maps API
- MinIO for object storage

---

### M2: AI Inference & Verification (Apr 30, 2026) - 0% Complete
**Modules:** 4  
**Duration:** 4 weeks

⚪ **Pending:**
- Task 4.1.1-4.1.2: YOLOv8 model setup
- Task 4.2.1-4.2.2: Human-in-the-loop verification
- Wildlife species detection (tiger, leopard, elephant, etc.)
- Night IR image support
- Confidence-based auto-approval (≥ 0.85)

**Key Technologies:**
- YOLOv8 for object detection
- ONNX Runtime for inference
- Custom wildlife dataset

---

### M3: Federated Learning (May 31, 2026) - 0% Complete
**Modules:** 5  
**Duration:** 4 weeks

⚪ **Pending:**
- Task 5.1.1: Flower FL setup (server + clients)
- Task 5.1.2: Training triggers (time/data-based)
- Task 5.1.3: Model governance & versioning
- Edge-to-central model aggregation
- Secure TLS communication

**Key Technologies:**
- Flower FL framework
- TLS encryption
- Model versioning system

**Critical:** This is the most complex module and requires careful planning for edge deployment.

---

### M4: Analytics & Maps (Jun 30, 2026) - 0% Complete
**Modules:** 6, 7  
**Duration:** 4 weeks

⚪ **Pending:**
- Task 6.1.1-6.1.2: Analytics dashboards with Plotly
- Task 6.2.1-6.2.2: Animal movement tracking
- Task 7.1.1-7.1.2: Interactive maps with filters
- Species density heatmaps
- Flagship species alerts (tiger, leopard)

**Key Technologies:**
- Plotly.js for charts
- Google Maps API
- PostGIS spatial queries

---

### M5: Backend & Deployment (Jul 30, 2026) - 0% Complete
**Modules:** 8, 9, 10, 11, 12  
**Duration:** 4 weeks

⚪ **Pending:**
- Task 8.1.1-8.1.2: Bun.js API architecture
- Task 9.1.1-9.1.3: Docker deployment (edge + central profiles)
- Task 10.1.1-10.1.2: Security & compliance
- Task 11.1.1-11.1.2: Testing & simulation
- Task 12.1.1-12.1.2: Documentation & SOPs

**Key Technologies:**
- Bun.js HTTP server
- Docker Compose
- HashiCorp Vault (secrets)

---

## 📈 Metrics

### Development Velocity
- **Tasks Completed:** 0/100+ (0%)
- **Days Elapsed:** 0/180 (0%)
- **Current Velocity:** TBD
- **Required Velocity:** ~4 tasks/week

### Tech Stack Readiness
- **Bun.js:** Not installed
- **PostgreSQL + PostGIS:** Not configured
- **MinIO:** Not configured
- **YOLOv8:** Model not trained
- **Flower FL:** Not set up
- **Docker:** Not configured

---

## 🚨 Blockers & Risks

### Active Blockers
*None*

### Known Risks

1. **Federated Learning Complexity** - HIGH RISK
   - FL is critical but complex
   - Requires secure edge-to-central communication
   - Network partition handling needed
   - Mitigation: Allocate extra time (4 weeks), consult FL experts

2. **Field Connectivity Issues** - MEDIUM RISK
   - Range HQs may have poor internet
   - Offline-first design required
   - Mitigation: Implement robust offline queue, sync mechanisms

3. **YOLOv8 Model Accuracy** - MEDIUM RISK
   - Wildlife detection in night IR images is challenging
   - May need extensive training data
   - Mitigation: Human-in-the-loop verification, continuous model improvement

4. **PostGIS Learning Curve** - LOW RISK
   - Team may need to learn spatial queries
   - Mitigation: Training sessions, documentation

5. **Forest Department Approval Delays** - MEDIUM RISK
   - Government processes can be slow
   - Mitigation: Early engagement, clear communication

---

## 📅 Upcoming Deadlines

| Date | Milestone | Deliverable |
|------|-----------|-------------|
| Feb 5, 2026 | Week 1 | Monorepo setup complete |
| Feb 28, 2026 | M0 | Foundation complete (Auth, RBAC, DB) |
| Mar 31, 2026 | M1 | Camera & geospatial core |
| Apr 30, 2026 | M2 | AI inference & verification |
| May 31, 2026 | M3 | Federated learning |
| Jun 30, 2026 | M4 | Analytics & maps |
| Jul 30, 2026 | **M5** | **Full system deployment** |

---

## 🎉 Recent Wins

### This Week
- ✅ Project planning initiated
- ✅ Surveillance documentation reviewed
- ✅ Tech stack finalized (Bun.js, React, PostGIS, YOLOv8, Flower FL)
- ✅ Task breakdown created (100+ tasks)

---

## 📝 Notes & Decisions

### Jan 30, 2026

**Tech Stack Decisions:**
- **Bun.js** chosen for backend (fast, modern JavaScript runtime)
- **React** for dashboard (component-based, large ecosystem)
- **PostgreSQL + PostGIS** for geospatial data (proven, powerful)
- **MinIO** for object storage (S3-compatible, self-hosted)
- **YOLOv8** for wildlife detection (state-of-the-art, customizable)
- **Flower FL** for federated learning (secure, scalable)
- **Docker** for deployment (consistent, portable)

**Architecture Decisions:**
- Monorepo structure for code organization
- Edge + Central deployment model (Range HQ + Forest HQ)
- Offline-first design for field operations
- Event-driven pipeline (upload → infer → verify → analyze)
- Strict RBAC with 4-tier hierarchy

**Key Requirements:**
- Support for 4 user roles (Admin, Divisional Officer, Range Officer, Ground Staff)
- Camera movement tracking (immutable history)
- Confidence-based auto-approval (≥ 0.85)
- Federated learning for privacy-preserving model training
- Flagship species alerts (tiger, leopard)
- Google Maps integration for visualization

---

## 🔗 Quick Links

**Documentation:**
- [TASKS.md](TASKS.md) - Full task list (100+ tasks)
- [PROJECT_BOARD.md](PROJECT_BOARD.md) - Current sprint board
- [Surveillance Files](wildlife_surveillance_platform_master_task_breakdown_bun.md) - Original requirements

**External Resources:**
- [Bun.js Docs](https://bun.sh/docs)
- [PostGIS Docs](https://postgis.net/documentation/)
- [YOLOv8 Docs](https://docs.ultralytics.com/)
- [Flower FL Docs](https://flower.dev/docs/)

---

**Last Updated:** Jan 30, 2026  
**Next Review:** Feb 6, 2026
