# 🐅 Wildlife Surveillance & Movement Analytics Platform

> **Client**: Forest Department of India  
> **Primary Stack**: Bun.js · React · Google Maps API · PostgreSQL + PostGIS · MinIO · YOLOv8 · Flower FL · Docker

This document is a **single-source task authority** for building the complete system.  
Structure, numbering, and granularity intentionally mirror the reference TASKS.md you attached, adapted fully for **your wildlife + FL + geospatial domain**.

---

## 📦 Module 0 – Project Foundations & Governance

### 0.1 Repository & Monorepo Setup

**Task 0.1.1**: Create monorepo structure
- `apps/api` → Bun.js backend
- `apps/web` → React dashboard
- `apps/ai-node` → Local inference + FL client
- `infra/docker` → docker-compose, k8s manifests
- `infra/db` → Postgres & MinIO schemas
- `docs/` → architecture, SOPs, diagrams

**Task 0.1.2**: Initialize Git + standards
- Conventional commits
- Branches: `main`, `dev`, `release/*`
- CODEOWNERS for Forest Dept roles

---

## 🔐 Module 1 – Authentication, Roles & Hierarchy

### 1.1 Role Model (STRICT HIERARCHY)

Roles:
1. **Admin (Global – FULL ACCESS)**
2. Divisional Officer (Multiple ranges)
3. Range Officer (Single range)
4. Ground Staff (Field-level)

**Task 1.1.1**: Design RBAC schema
- Role table
- Permission matrix table
- Role inheritance (Admin ⊇ Divisional ⊇ Range ⊇ Ground)

**Task 1.1.2**: Implement auth
- JWT + refresh tokens
- Device binding for ground staff
- Session audit trail

---

## 📍 Module 2 – Camera, Location & Geospatial Core

### 2.1 Camera Lifecycle

**Task 2.1.1**: Camera master model
- Camera ID (Gov-issued)
- Division → Range → Beat
- Latitude / Longitude (PostGIS)
- Install date, moved history

**Task 2.1.2**: Camera movement tracking
- Maintain immutable camera-location history
- Geospatial validity checks

### 2.2 Forest Geography

**Task 2.2.1**: Administrative boundaries
- Division polygons
- Range polygons
- Beat polygons

**Task 2.2.2**: Google Maps integration
- Heatmaps
- Clustered sightings
- Camera density layers

---

## 📸 Module 3 – Image Ingestion & Storage

### 3.1 SD Card Upload Pipeline

**Task 3.1.1**: Upload UI (Ground Staff)
- Bulk folder upload
- Offline-first capability

**Task 3.1.2**: Storage layout (MinIO)

```text
/division/
  /range/
    /camera-id/
      /yyyy-mm-dd/
        image.jpg
```

**Task 3.1.3**: Image metadata extraction
- EXIF timestamp
- Camera ID binding
- Geo-consistency check

---

## 🧠 Module 4 – AI Inference & Verification Pipeline

### 4.1 Local AI (Edge Node)

**Task 4.1.1**: YOLOv8 model setup
- Species + human + vehicle classes
- Night IR compatibility

**Task 4.1.2**: Confidence-based logic
- Threshold ≥ 0.85 → auto-tag
- Threshold < 0.85 → manual review

### 4.2 Human-in-the-loop

**Task 4.2.1**: Verification UI (Range Officer)
- Side-by-side comparison
- Override + reason logging

**Task 4.2.2**: Audit trail
- Who verified
- What changed
- When

---

## 🔁 Module 5 – Federated Learning (CRITICAL)

### 5.1 FL Topology

Edge Node (Range HQ):
- Local model training
- Only weights shared

Central HQ:
- Global aggregator
- Secure model redistribution

**Task 5.1.1**: Flower FL setup
- Flower client per range
- Secure TLS channels

**Task 5.1.2**: Training triggers
- Time-based
- Data-volume-based
- Manual admin override

**Task 5.1.3**: Model governance
- Versioning
- Rollback support
- Drift detection

---

## 📊 Module 6 – Analytics & Visualization

### 6.1 Dashboards (Role-aware)

**Task 6.1.1**: Core KPIs
- Animal counts per species
- Human intrusion events
- Camera uptime

**Task 6.1.2**: Plotly integration
- Density plots
- Temporal trends
- Altitude vs species

### 6.2 Animal Trails

**Task 6.2.1**: Movement tracking
- Temporal + spatial joins
- Probabilistic trails

**Task 6.2.2**: Highlight flagship species
- Tiger, Leopard
- Special tags + alerts

---

## 🗺 Module 7 – Map Intelligence

**Task 7.1.1**: Live map layers
- Cameras
- Sightings
- Movement paths

**Task 7.1.2**: Advanced filters
- Species
- Date range
- Confidence
- Officer verified only

---

## 🧱 Module 8 – Backend (Bun.js)

**Task 8.1.1**: API architecture
- Layered (controller → service → repo)
- Zod validation

**Task 8.1.2**: Event-driven pipeline
- Image uploaded → infer → verify → analyze

---

## 🐳 Module 9 – Docker & Deployment

**Task 9.1.1**: Dockerize all services
- bun-api
- ai-node
- postgres
- minio
- flower-server

**Task 9.1.2**: docker-compose profiles
- `edge`
- `central`

**Task 9.1.3**: Secure secrets management
- Vault / env sealing

---

## 🛡 Module 10 – Security, Audit & Compliance

**Task 10.1.1**: Compliance alignment
- Govt data retention norms
- Immutable logs

**Task 10.1.2**: Intrusion detection
- Abnormal camera activity
- Suspicious uploads

---

## 🧪 Module 11 – Testing & Simulation

**Task 11.1.1**: Synthetic data generator
- Fake camera feeds
- Mock animal trails

**Task 11.1.2**: Load & failure testing
- Camera outage simulation
- Network partition for FL

---

## 📚 Module 12 – Documentation & SOPs

**Task 12.1.1**: Role-specific manuals
- Ground staff SOP
- Range officer SOP

**Task 12.1.2**: Disaster recovery playbooks

---

## 🔚 Final Notes

- This structure supports **real forest deployment**
- Designed for **poor connectivity & field constraints**
- Future-safe for **satellite + drone feeds**

---

If you want next:
- ⏭ **Exact folder + file tree**
- ⏭ **DDL (Postgres + PostGIS schemas)**
- ⏭ **Exact Bun.js API contracts**
- ⏭ **FL training lifecycle deep-dive**

Just tell me.

