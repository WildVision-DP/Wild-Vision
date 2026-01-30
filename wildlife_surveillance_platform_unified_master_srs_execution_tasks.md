# 🐅 Wildlife Surveillance & Movement Analytics Platform

> **Client**: Forest Department of India  
> **Document Type**: **Unified SRS + Architecture + Execution Task Bible**  
> **Target Stack**: Bun.js · React · Google Maps API · PostgreSQL + PostGIS · MinIO · YOLOv8 · Flower FL · Docker

This single Markdown file intentionally **combines**:
- System Requirements (SRS)
- Architecture & workflows
- File/folder layout
- Database schemas
- API contracts
- Federated Learning lifecycle
- Docker & deployment tasks

This is designed to be **directly executable** by a dev team without further clarification.

---

## 📌 1. System Vision & Scope

### 1.1 Objective
Develop a secure, scalable, and field-operable platform to:
- Track wildlife movement using camera traps
- Identify species using AI with human oversight
- Support forest administrative hierarchy
- Provide analytics, maps, and decision support

### 1.2 Primary Users
| Role | Scope |
|----|----|
| Admin | System-wide control |
| Divisional Officer | Multi-range oversight |
| Range Officer | Camera + verification |
| Ground Staff | Field data ingestion |

---

## 🏗 2. System Architecture (Logical)

### 2.1 Layered Architecture

```
[ Users ]
    ↓
[ Web Dashboard (React) ]
    ↓
[ Bun.js API Gateway ]
    ↓
[ Event & AI Pipeline ]
    ↓
[ Data + Maps + Analytics ]
```

### 2.2 Edge vs Central Deployment

| Edge (Range HQ) | Central (HQ) |
|---------------|-------------|
| Image ingestion | Global analytics |
| Local AI infer | FL aggregation |
| FL client | Model governance |

---

## 📁 3. Folder & File Structure

```
root/
├─ apps/
│  ├─ api/              # Bun.js backend
│  ├─ web/              # React dashboard
│  ├─ ai-node/          # Inference + FL client
│
├─ infra/
│  ├─ docker/
│  ├─ db/
│
├─ storage/              # MinIO mount
├─ docs/
└─ docker-compose.yml
```

---

## 🗄 4. Database Design (Postgres + PostGIS)

### 4.1 Core Tables

- `users(id, role_id, division_id, range_id)`
- `cameras(id, status)`
- `camera_locations(camera_id, geom, valid_from, valid_to)`
- `images(id, camera_id, captured_at, path)`
- `detections(id, image_id, species, confidence)`
- `verifications(id, officer_id, decision)`

### 4.2 Spatial Indexing
- GIST on `geom`
- Time-range btree indexes

---

## 🔐 5. RBAC & Permissions

- Role inheritance model
- Admin ⊇ Divisional ⊇ Range ⊇ Ground
- Every action permission-guarded

---

## 📸 6. Image Ingestion Workflow

1. Ground Staff uploads SD card images
2. Files stored in MinIO (range-wise)
3. Metadata extracted
4. AI inference triggered

---

## 🧠 7. AI Identification Pipeline

### 7.1 Inference
- YOLOv8 ONNX runtime
- Night IR trained model

### 7.2 Confidence Logic

| Confidence | Action |
|----------|-------|
| ≥ 0.85 | Auto-approve |
| < 0.85 | Manual verification |

---

## 🔁 8. Federated Learning Lifecycle

### 8.1 FL Steps

1. Train locally (per range)
2. Send weights
3. Aggregate globally
4. Redistribute model

### 8.2 Governance
- Version control
- Drift alerts

---

## 📊 9. Analytics & Maps

- Animal density heatmaps
- Species time trends
- Movement trails
- Camera coverage analysis

---

## 🐳 10. Docker & Deployment

### 10.1 Containers

- api
- web
- ai-node
- postgres + postgis
- minio
- flower-server

### 10.2 Profiles
- edge
- central

---

## 🧪 11. Testing & Validation

- AI accuracy benchmarks
- Upload stress tests
- Offline scenarios

---

## 📘 12. SOPs & Compliance

- Upload SOP
- Verification SOP
- Disaster recovery SOP

---

# 🧩 13. MASTER TASK BREAKDOWN

Each task is **atomic, numbered, and execution-ready**.

## Module 0 – Project Setup
- **Task 0.1** Initialize monorepo
- **Task 0.2** Configure Bun + TS
- **Task 0.3** Setup linting, CI

## Module 1 – Auth & RBAC
- **Task 1.1** RBAC schema
- **Task 1.2** Auth middleware

## Module 2 – Camera Management
- **Task 2.1** Camera CRUD
- **Task 2.2** Location history

## Module 3 – Image Ingestion
- **Task 3.1** SD upload UI
- **Task 3.2** MinIO storage

## Module 4 – AI & Verification
- **Task 4.1** Model inference
- **Task 4.2** Verification UI

## Module 5 – Federated Learning
- **Task 5.1** Flower setup
- **Task 5.2** Training schedules

## Module 6 – Analytics
- **Task 6.1** Dashboards
- **Task 6.2** Filters & KPIs

## Module 7 – Maps
- **Task 7.1** Map layers
- **Task 7.2** Trails logic

## Module 8 – Backend APIs
- **Task 8.1** Event pipelines
- **Task 8.2** Query optimization

## Module 9 – Deployment
- **Task 9.1** Docker images
- **Task 9.2** Compose profiles

## Module 10 – Security
- **Task 10.1** Audit logs

## Module 11 – Testing
- **Task 11.1** Integration tests

## Module 12 – Documentation
- **Task 12.1** User manuals

---

## ✅ Final Note
This file alone can act as:
- SRS
- Technical proposal attachment
- Execution checklist
- Long-term maintainability guide

No redesign should be required later.
