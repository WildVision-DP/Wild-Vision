# 🐅 WildVision - Task List

**Project:** WildVision - Wildlife Surveillance & Movement Analytics Platform  
**Client:** Forest Department of India  
**Tech Stack:** Bun.js · React · **shadcn/ui** · Google Maps API · PostgreSQL + PostGIS · MinIO · BLIP/FastAPI ML Service · Docker  
**Total Modules:** 12 | **Project Start:** Jan 30, 2026  
**Legend:** `[ ]` Not Started | `[/]` In Progress | `[x]` Done | P0 = Critical | P1 = High | P2 = Medium

---

## 🎨 Design & Quality Standards

**UI Framework:** shadcn/ui with muted color palette (Forest Green #4a6f4a + Beige #b39d71)  
**Design Philosophy:** Professional · Simple · Modern · Government-Grade  
**Reference:** See `design_guidelines.md` for complete UI/UX specifications

### Critical Requirements
> ⚠️ **Government Project Standards** - This project requires the highest level of precision and accuracy.

- ✅ **Production-Ready Code Only** - NO temporary solutions or placeholders
- ✅ **Integration-First Design** - Every module must integrate seamlessly
- ✅ **Complete Testing** - Tasks marked done only after thorough testing with no errors
- ✅ **Consistent UI/UX** - Muted colors, clean layouts, professional appearance
- ✅ **Precision & Foresight** - Consider integration challenges before implementation
- ✅ **No Feature Skipping** - Implement all features completely, no shortcuts

**Progress Tracking:** Update PROGRESS.md and PROJECT_BOARD.md only after successful task completion with satisfactory results and no persisting errors.

---

## 📦 Module 0 – Project Foundations & Governance

### 0.1 Repository & Monorepo Setup (P0)

**Status:** [x] Complete  
**Owner:** DevOps Team  
**Completed:** Jan 31, 2026

**Subtasks:**
- [x] 0.1.1: Initialize Git repository with main, dev, release/* branches
- [x] 0.1.2: Create `apps/api` (Bun.js), `apps/web` (React), `apps/ai-node` placeholder, and `apps/ml-service` (FastAPI + BLIP)
- [x] 0.1.3: Create `infra/docker` for docker-compose and k8s manifests
- [x] 0.1.4: Create `infra/db` for Postgres & MinIO schemas
- [x] 0.1.5: Set up monorepo tooling (Turborepo)
- [x] 0.1.6: Configure shared TypeScript config
- [x] 0.1.7: Create root package.json with workspace configuration
- [x] 0.1.8: Create `docs/` directory for architecture, SOPs, diagrams

---

### 0.2 Git Standards & Workflow (P0)

**Status:** [x] Complete  
**Owner:** DevOps Team  
**Completed:** Jan 31, 2026

**Subtasks:**
- [x] 0.2.1: Configure conventional commits (feat, fix, docs, etc.)
- [x] 0.2.2: Set up branch protection rules for main (dev branch created)
- [x] 0.2.3: Create CODEOWNERS file for Forest Dept roles
- [x] 0.2.4: Add .gitignore for Node.js, Bun, Docker
- [x] 0.2.5: Set up pre-commit hooks (Husky)
- [x] 0.2.6: Configure commit message linting
- [x] 0.2.7: Create PR template
- [x] 0.2.8: Document Git workflow in docs/GIT_WORKFLOW.md

---

### 0.3 Development Environment Setup (P0)

**Status:** [x] Complete  
**Owner:** All Developers  
**Completed:** Jan 31, 2026

**Subtasks:**
- [x] 0.3.1: Install Bun.js runtime (v1.3.7 confirmed)
- [x] 0.3.2: Configure VS Code workspace settings
- [x] 0.3.3: Install recommended VS Code extensions (ESLint, Prettier, etc.)
- [x] 0.3.4: Set up EditorConfig for consistent formatting
- [x] 0.3.5: Configure ESLint for TypeScript
- [x] 0.3.6: Configure Prettier and commitlint
- [x] 0.3.7: Set up Husky pre-commit hooks
- [x] 0.3.8: Create development environment documentation

---

## 🔐 Module 1 – Authentication, Roles & Hierarchy

### 1.1 Role Model (STRICT HIERARCHY)

**Task 1.1.1** - Design RBAC Schema | **P0** | **Status:** [x] Complete

- [x] **Task 1.1.1.1**: Create roles table (id, name, description, level)
- [x] **Task 1.1.1.2**: Define 4 roles: Admin (Global), Divisional Officer, Range Officer, Ground Staff
- [x] **Task 1.1.1.3**: Create permissions table (id, resource, action, description)
- [x] **Task 1.1.1.4**: Create role_permissions junction table
- [x] **Task 1.1.1.5**: Design role inheritance matrix (Admin ⊇ Divisional ⊇ Range ⊇ Ground)
- [x] **Task 1.1.1.6**: Create users table with role_id foreign key
- [x] **Task 1.1.1.7**: Add division_id and range_id to users for scope limiting
- [x] **Task 1.1.1.8**: Document permission matrix in docs/rbac.md
- [x] **Task 1.1.1.9**: Create SQL migration for RBAC tables
- [x] **Task 1.1.1.10**: Add indexes for performance (role_id, user_id)

---

**Task 1.1.2** - Implement Authentication | **P0** | **Status:** [x] Complete

- [x] **Task 1.1.2.1**: Install JWT library for Bun.js
- [x] **Task 1.1.2.2**: Create password hashing utility (bcrypt or argon2)
- [x] **Task 1.1.2.3**: Implement JWT token generation (access + refresh)
- [x] **Task 1.1.2.4**: Set token expiry (access: 1h, refresh: 7d)
- [x] **Task 1.1.2.5**: Create POST /auth/register endpoint
- [x] **Task 1.1.2.6**: Create POST /auth/login endpoint
- [x] **Task 1.1.2.7**: Create POST /auth/refresh endpoint
- [x] **Task 1.1.2.8**: Create POST /auth/logout endpoint
- [x] **Task 1.1.2.9**: Implement device binding for ground staff (device fingerprint)
- [x] **Task 1.1.2.10**: Create session audit trail table
- [x] **Task 1.1.2.11**: Log all login/logout events with IP, device info
- [x] **Task 1.1.2.12**: Add rate limiting to auth endpoints (5 req/min)

---

**Task 1.1.3** - Create Auth Middleware | **P0** | **Status:** [x] Complete

- [x] **Task 1.1.3.1**: Create JWT verification middleware
- [x] **Task 1.1.3.2**: Extract token from Authorization header or cookie
- [x] **Task 1.1.3.3**: Validate token signature and expiry
- [x] **Task 1.1.3.4**: Load user from database and attach to request context
- [x] **Task 1.1.3.5**: Create role-based access control middleware
- [x] **Task 1.1.3.6**: Implement @requireAuth decorator
- [x] **Task 1.1.3.7**: Implement @requireRole(role) decorator
- [x] **Task 1.1.3.8**: Implement @requirePermission(resource, action) decorator
- [x] **Task 1.1.3.9**: Add scope checking (division/range access)
- [x] **Task 1.1.3.10**: Handle unauthorized access (401/403 responses)

---

**Task 1.1.4** - Build Auth UI | **P0** | **Status:** [x] Complete

- [x] **Task 1.1.4.1**: Create login page component (React)
- [x] **Task 1.1.4.2**: Add email and password input fields
- [x] **Task 1.1.4.3**: Add form validation (email format, password strength)
- [x] **Task 1.1.4.4**: Implement login API call
- [x] **Task 1.1.4.5**: Store tokens in httpOnly cookies or localStorage
- [x] **Task 1.1.4.6**: Create registration page (if needed)
- [x] **Task 1.1.4.7**: Create password reset flow
- [x] **Task 1.1.4.8**: Add loading states and error messages
- [x] **Task 1.1.4.9**: Implement auto-redirect after login
- [x] **Task 1.1.4.10**: Create protected route wrapper component
- [x] **Task 1.1.4.11**: Add role-based UI rendering
- [x] **Task 1.1.4.12**: Style with modern UI library (shadcn/ui or similar)

---

## 📍 Module 2 – Camera, Location & Geospatial Core

### 2.1 Camera Lifecycle

**Task 2.1.1** - Camera Master Model | **P0** | **Status:** [x] Complete

- [x] **Task 2.1.1.1**: Create cameras table with PostGIS geometry column
- [x] **Task 2.1.1.2**: Add camera_id (Gov-issued unique identifier)
- [x] **Task 2.1.1.3**: Add division_id, range_id, beat_id foreign keys
- [x] **Task 2.1.1.4**: Add latitude/longitude columns (POINT geometry type)
- [x] **Task 2.1.1.5**: Add install_date, status (active/inactive/maintenance)
- [x] **Task 2.1.1.6**: Add camera model, serial number fields
- [x] **Task 2.1.1.7**: Create GIST spatial index on geometry column
- [x] **Task 2.1.1.8**: Add validation for GPS coordinates (India bounds)
- [x] **Task 2.1.1.9**: Create SQL migration for cameras table
- [x] **Task 2.1.1.10**: Document camera data model in docs/

---

**Task 2.1.2** - Camera Movement Tracking | **P0** | **Status:** [x] Complete

- [x] **Task 2.1.2.1**: Create camera_locations table (immutable history)
- [x] **Task 2.1.2.2**: Add camera_id, location (POINT), valid_from, valid_to
- [x] **Task 2.1.2.3**: Implement temporal validity constraints
- [x] **Task 2.1.2.4**: Create API endpoint POST /cameras/{id}/move
- [x] **Task 2.1.2.5**: Validate new location (geospatial bounds check)
- [x] **Task 2.1.2.6**: Close current location record (set valid_to)
- [x] **Task 2.1.2.7**: Create new location record (set valid_from)
- [x] **Task 2.1.2.8**: Log camera movement in audit trail
- [x] **Task 2.1.2.9**: Add reason field for movement
- [x] **Task 2.1.2.10**: Create GET /cameras/{id}/history endpoint

---

### 2.2 Forest Geography

**Task 2.2.1** - Administrative Boundaries | **P0** | **Status:** [x] Complete

- [x] **Task 2.2.1.1**: Create divisions table with POLYGON geometry
- [x] **Task 2.2.1.2**: Create ranges table with POLYGON geometry
- [x] **Task 2.2.1.3**: Create beats table with POLYGON geometry
- [x] **Task 2.2.1.4**: Import Forest Department boundary data (GeoJSON/Shapefile)
- [x] **Task 2.2.1.5**: Validate polygon geometries (no self-intersections)
- [x] **Task 2.2.1.6**: Create spatial indexes on all geometry columns
- [x] **Task 2.2.1.7**: Implement containment queries (point in polygon)
- [x] **Task 2.2.1.8**: Add boundary metadata (name, area, perimeter)
- [x] **Task 2.2.1.9**: Create GET /geography/divisions endpoint
- [x] **Task 2.2.1.10**: Create GET /geography/ranges endpoint
- [x] **Task 2.2.1.11**: Create GET /geography/beats endpoint

---

**Task 2.2.2** - Google Maps Integration | **P1** | **Status:** [x] Complete

- [x] **Task 2.2.2.1**: Set up Google Maps API key
- [x] **Task 2.2.2.2**: Install @googlemaps/js-api-loader
- [x] **Task 2.2.2.3**: Create map component in React
- [x] **Task 2.2.2.4**: Display camera locations as markers
- [x] **Task 2.2.2.5**: Implement heatmap layer for sightings
- [x] **Task 2.2.2.6**: Add marker clustering for camera density
- [x] **Task 2.2.2.7**: Display administrative boundaries as polygons
- [x] **Task 2.2.2.8**: Add custom map styles (forest theme)
- [x] **Task 2.2.2.9**: Implement click handlers for markers
- [x] **Task 2.2.2.10**: Add info windows with camera/sighting details
- [x] **Task 2.2.2.11**: Optimize map performance for large datasets

---

## 📸 Module 3 – Image Ingestion & Storage

### 3.1 SD Card Upload Pipeline

**Task 3.1.1** - Upload UI (Ground Staff) | **P0** | **Status:** [x] Complete

- [x] **Task 3.1.1.1**: Create upload page component (React)
- [x] **Task 3.1.1.2**: Implement bulk folder upload (drag & drop)
- [x] **Task 3.1.1.3**: Add file type validation (jpg, png, raw formats)
- [x] **Task 3.1.1.4**: Add file size validation (max 50MB per image)
- [x] **Task 3.1.1.5**: Display upload progress for each file
- [x] **Task 3.1.1.6**: Implement offline-first capability (queue uploads)
- [x] **Task 3.1.1.7**: Store pending uploads in IndexedDB
- [x] **Task 3.1.1.8**: Auto-resume uploads on reconnection
- [x] **Task 3.1.1.9**: Add camera selection dropdown
- [x] **Task 3.1.1.10**: Show upload statistics (total, success, failed)
- [x] **Task 3.1.1.11**: Add retry mechanism for failed uploads

---

**Task 3.1.2** - Storage Layout (MinIO) | **P0** | **Status:** [x] Complete

- [x] **Task 3.1.2.1**: Create MinIO bucket structure: /circle/division/range/beat/camera-id/yyyy-mm-dd/
- [x] **Task 3.1.2.2**: Configure MinIO bucket policies (private by default)
- [x] **Task 3.1.2.3**: Set up lifecycle rules for old images (archive after 2 years)
- [x] **Task 3.1.2.4**: Implement presigned URL generation for uploads
- [x] **Task 3.1.2.5**: Create POST /upload/request endpoint (returns presigned URL)
- [x] **Task 3.1.2.6**: Validate upload request (camera access, file metadata)
- [x] **Task 3.1.2.7**: Generate unique object key with UUID
- [x] **Task 3.1.2.8**: Set presigned URL expiry (15 minutes)
- [x] **Task 3.1.2.9**: Create POST /upload/complete endpoint
- [x] **Task 3.1.2.10**: Verify file exists in MinIO after upload
- [x] **Task 3.1.2.11**: Create database record for uploaded image

---

**Task 3.1.3** - Image Metadata Extraction | **P0** | **Status:** [x] Complete

- [x] **Task 3.1.3.1**: Install EXIF parsing library (exifr or similar)
- [x] **Task 3.1.3.2**: Create metadata extraction service
- [x] **Task 3.1.3.3**: Extract EXIF timestamp (DateTimeOriginal)
- [x] **Task 3.1.3.4**: Extract GPS coordinates from EXIF
- [x] **Task 3.1.3.5**: Extract camera serial number from EXIF
- [x] **Task 3.1.3.6**: Parse image dimensions (width, height)
- [x] **Task 3.1.3.7**: Bind image to camera_id based on EXIF or filename
- [x] **Task 3.1.3.8**: Perform geo-consistency check (camera location vs EXIF GPS)
- [x] **Task 3.1.3.9**: Store metadata in images table (JSONB column)
- [x] **Task 3.1.3.10**: Handle missing EXIF data gracefully
- [x] **Task 3.1.3.11**: Create background job for metadata extraction

---

## 🧠 Module 4 – AI Inference & Verification Pipeline

### 4.1 ML Inference Service

**Implementation Decision:** YOLOv8/ONNX was replaced for the current project iteration with a FastAPI BLIP image-captioning service. YOLO-style object detection, bounding boxes, and fine-tuning remain deferred unless the project later requires detection boxes instead of image-level animal labels.

**Task 4.1.1** - BLIP Model Integration | **P0** | **Status:** [x] Complete

- [x] **Task 4.1.1.1**: Create `apps/ml-service` FastAPI service
- [x] **Task 4.1.1.2**: Add `/health` endpoint for service readiness checks
- [x] **Task 4.1.1.3**: Add `/predict` multipart image endpoint
- [x] **Task 4.1.1.4**: Integrate `Salesforce/blip-image-captioning-base`
- [x] **Task 4.1.1.5**: Load BLIP lazily so health checks stay responsive during model warmup
- [x] **Task 4.1.1.6**: Extract animal names from BLIP captions using wildlife keyword matching
- [x] **Task 4.1.1.7**: Return animal label, confidence, caption, method, and metadata from ML service
- [x] **Task 4.1.1.8**: Add fast mock ML service for local development/testing
- [x] **Task 4.1.1.9**: Connect API upload flow to `ML_SERVICE_URL`
- [x] **Task 4.1.1.10**: Persist detected animal, scientific name, confidence, and ML metadata on image records
- [x] **Task 4.1.1.11**: Generate thumbnails for uploaded images after inference
- [x] **Task 4.1.1.12**: Add ML service to Docker compose with model/cache volumes

---

**Task 4.1.2** - Confidence-Based Detection Workflow | **P0** | **Status:** [/] In Progress

- [x] **Task 4.1.2.1**: Define configurable confidence threshold via `ML_AUTO_APPROVE_CONFIDENCE`
- [x] **Task 4.1.2.2**: Store detection result directly on `images` records
- [x] **Task 4.1.2.3**: Add confirmation status fields (`pending_confirmation`, `confirmed`, `rejected`)
- [x] **Task 4.1.2.4**: Implement auto-approval logic for high-confidence detections
- [x] **Task 4.1.2.5**: Queue low-confidence detections for manual confirmation/review
- [x] **Task 4.1.2.6**: Add admin review endpoints under `/admin/reviews`
- [x] **Task 4.1.2.7**: Add filtering by confidence range in admin review API
- [x] **Task 4.1.2.8**: Normalize backend/frontend status naming (`pending_confirmation` vs `pending_review`, `confirmed` vs `manual_approved`)
- [x] **Task 4.1.2.9**: Normalize confidence units across API and UI (0-1 vs 0-100)
- [x] **Task 4.1.2.10**: Log auto-approvals and manual review actions consistently in audit trail
- [x] **Task 4.1.2.11**: Add model/inference metrics for auto-approval rate and failure rate
- [x] **Task 4.1.2.12**: Document current BLIP limitations and future YOLO/object-detection upgrade path

---

### 4.2 Human-in-the-Loop

**Task 4.2.1** - Verification UI (Range Officer/Admin) | **P0** | **Status:** [x] Complete

- [x] **Task 4.2.1.1**: Create admin review dashboard page
- [x] **Task 4.2.1.2**: Display pending detections in review list
- [x] **Task 4.2.1.3**: Implement side-by-side comparison view
- [x] **Task 4.2.1.4**: Show detection bounding boxes when detector metadata exists, with BLIP unavailable state
- [x] **Task 4.2.1.5**: Display AI prediction with confidence score
- [x] **Task 4.2.1.6**: Add editable species/animal name field
- [x] **Task 4.2.1.7**: Add Approve/Reject/Reassess actions
- [x] **Task 4.2.1.8**: Implement keyboard shortcuts (A=approve, R=reject, E=edit)
- [x] **Task 4.2.1.9**: Add notes/reason support for review actions
- [x] **Task 4.2.1.10**: Show verification progress (X/Y reviewed)
- [x] **Task 4.2.1.11**: Add filters (animal, status, confidence, sort)
- [x] **Task 4.2.1.12**: Implement pagination
- [x] **Task 4.2.1.13**: Fix review UI/API status mismatch and thumbnail route mismatch

---

**Task 4.2.2** - Audit Trail | **P0** | **Status:** [x] Complete

- [x] **Task 4.2.2.1**: Keep current review state on `images` and use `audit_logs` as immutable verification history
- [x] **Task 4.2.2.2**: Store who confirmed/reviewed each image (`confirmed_by`)
- [x] **Task 4.2.2.3**: Log what changed (original vs corrected species)
- [x] **Task 4.2.2.4**: Store when verification occurred (`confirmed_at`)
- [x] **Task 4.2.2.5**: Store verification reason/notes in image metadata
- [x] **Task 4.2.2.6**: Create GET /detections/{id}/audit endpoint
- [x] **Task 4.2.2.7**: Display audit history in UI
- [x] **Task 4.2.2.8**: Add undo functionality for recent verifications
- [x] **Task 4.2.2.9**: Create verification analytics (accuracy, speed)
- [x] **Task 4.2.2.10**: Generate verification reports for officers

---

## 🔁 Module 5 – Federated Learning (CRITICAL)

### 5.1 FL Topology

**Task 5.1.1** - Flower FL Setup | **P0** | **Status:** [ ] Not Started

- [ ] **Task 5.1.1.1**: Install Flower framework (flwr)
- [ ] **Task 5.1.1.2**: Set up Flower server at Central HQ
- [ ] **Task 5.1.1.3**: Create Flower client for each Range HQ
- [ ] **Task 5.1.1.4**: Configure secure TLS channels for communication
- [ ] **Task 5.1.1.5**: Implement client authentication (certificates)
- [ ] **Task 5.1.1.6**: Create client configuration (model path, data path)
- [ ] **Task 5.1.1.7**: Implement model weight serialization
- [ ] **Task 5.1.1.8**: Create aggregation strategy (FedAvg or custom)
- [ ] **Task 5.1.1.9**: Set minimum clients for aggregation (e.g., 3)
- [ ] **Task 5.1.1.10**: Add client availability checking
- [ ] **Task 5.1.1.11**: Implement graceful handling of offline clients
- [ ] **Task 5.1.1.12**: Create FL monitoring dashboard

---

**Task 5.1.2** - Training Triggers | **P0** | **Status:** [ ] Not Started

- [ ] **Task 5.1.2.1**: Implement time-based training schedule (e.g., weekly)
- [ ] **Task 5.1.2.2**: Implement data-volume-based triggers (e.g., 1000 new images)
- [ ] **Task 5.1.2.3**: Add manual admin override for training
- [ ] **Task 5.1.2.4**: Create training job queue
- [ ] **Task 5.1.2.5**: Implement training status tracking (pending, running, completed)
- [ ] **Task 5.1.2.6**: Add training notifications (email/SMS to admin)
- [ ] **Task 5.1.2.7**: Log all training rounds in database
- [ ] **Task 5.1.2.8**: Create GET /fl/training/status endpoint
- [ ] **Task 5.1.2.9**: Create POST /fl/training/start endpoint (admin only)
- [ ] **Task 5.1.2.10**: Implement training cancellation

---

**Task 5.1.3** - Model Governance | **P0** | **Status:** [ ] Not Started

- [ ] **Task 5.1.3.1**: Create model_versions table (version, weights_path, metrics, timestamp)
- [ ] **Task 5.1.3.2**: Implement model versioning (semantic versioning)
- [ ] **Task 5.1.3.3**: Store model weights in MinIO
- [ ] **Task 5.1.3.4**: Track model performance metrics (accuracy, F1, etc.)
- [ ] **Task 5.1.3.5**: Implement rollback support (revert to previous version)
- [ ] **Task 5.1.3.6**: Create model comparison tool
- [ ] **Task 5.1.3.7**: Implement drift detection (data distribution changes)
- [ ] **Task 5.1.3.8**: Add model validation before deployment
- [ ] **Task 5.1.3.9**: Create model deployment workflow
- [ ] **Task 5.1.3.10**: Implement A/B testing for new models
- [ ] **Task 5.1.3.11**: Create model performance dashboard
- [ ] **Task 5.1.3.12**: Document model governance process

---

## 📊 Module 6 – Analytics & Visualization

### 6.1 Dashboards (Role-aware)

**Task 6.1.1** - Core KPIs | **P0** | **Status:** [ ] Not Started

- [ ] **Task 6.1.1.1**: Create analytics dashboard page (React)
- [ ] **Task 6.1.1.2**: Implement role-based data filtering (division/range scope)
- [ ] **Task 6.1.1.3**: Calculate animal counts per species
- [ ] **Task 6.1.1.4**: Calculate human intrusion events
- [ ] **Task 6.1.1.5**: Calculate camera uptime percentage
- [ ] **Task 6.1.1.6**: Create GET /analytics/kpis endpoint
- [ ] **Task 6.1.1.7**: Add date range filtering
- [ ] **Task 6.1.1.8**: Display KPIs in stat cards
- [ ] **Task 6.1.1.9**: Add trend indicators (↑↓ from previous period)
- [ ] **Task 6.1.1.10**: Implement real-time updates (WebSocket or polling)
- [ ] **Task 6.1.1.11**: Cache analytics results (Redis)

---

**Task 6.1.2** - Plotly Integration | **P1** | **Status:** [ ] Not Started

- [ ] **Task 6.1.2.1**: Install Plotly.js and react-plotly.js
- [ ] **Task 6.1.2.2**: Create density plot component (species distribution)
- [ ] **Task 6.1.2.3**: Create temporal trends chart (sightings over time)
- [ ] **Task 6.1.2.4**: Create altitude vs species scatter plot
- [ ] **Task 6.1.2.5**: Create camera activity heatmap (time of day)
- [ ] **Task 6.1.2.6**: Add interactive tooltips and zoom
- [ ] **Task 6.1.2.7**: Implement chart export (PNG, SVG, PDF)
- [ ] **Task 6.1.2.8**: Add chart customization options
- [ ] **Task 6.1.2.9**: Optimize chart rendering for large datasets
- [ ] **Task 6.1.2.10**: Create chart templates for common analyses

---

### 6.2 Animal Trails

**Task 6.2.1** - Movement Tracking | **P1** | **Status:** [ ] Not Started

- [ ] **Task 6.2.1.1**: Create movement tracking query (temporal + spatial joins)
- [ ] **Task 6.2.1.2**: Find sequential sightings of same species
- [ ] **Task 6.2.1.3**: Calculate time gaps between sightings
- [ ] **Task 6.2.1.4**: Calculate distance between camera locations
- [ ] **Task 6.2.1.5**: Implement probabilistic trail algorithm
- [ ] **Task 6.2.1.6**: Filter trails by max time gap (e.g., 24 hours)
- [ ] **Task 6.2.1.7**: Filter trails by max distance (e.g., 10 km)
- [ ] **Task 6.2.1.8**: Create GET /analytics/trails endpoint
- [ ] **Task 6.2.1.9**: Visualize trails on map (polylines)
- [ ] **Task 6.2.1.10**: Add animation for trail progression

---

**Task 6.2.2** - Highlight Flagship Species | **P1** | **Status:** [ ] Not Started

- [ ] **Task 6.2.2.1**: Create flagship_species table (species_id, priority)
- [ ] **Task 6.2.2.2**: Mark tiger and leopard as flagship species
- [ ] **Task 6.2.2.3**: Create special alerts for flagship sightings
- [ ] **Task 6.2.2.4**: Implement SMS/email notifications for officers
- [ ] **Task 6.2.2.5**: Add flagship species filter to dashboards
- [ ] **Task 6.2.2.6**: Create dedicated flagship species report
- [ ] **Task 6.2.2.7**: Highlight flagship trails on map (different color)
- [ ] **Task 6.2.2.8**: Track flagship species population trends
- [ ] **Task 6.2.2.9**: Generate monthly flagship species summary

---

## 🗺 Module 7 – Map Intelligence

**Task 7.1.1** - Live Map Layers | **P0** | **Status:** [ ] Not Started

- [ ] **Task 7.1.1.1**: Create map page with Google Maps
- [ ] **Task 7.1.1.2**: Add camera layer (markers with status colors)
- [ ] **Task 7.1.1.3**: Add sightings layer (species-specific icons)
- [ ] **Task 7.1.1.4**: Add movement paths layer (polylines)
- [ ] **Task 7.1.1.5**: Implement layer toggle controls
- [ ] **Task 7.1.1.6**: Add layer opacity controls
- [ ] **Task 7.1.1.7**: Create custom map legend
- [ ] **Task 7.1.1.8**: Implement marker clustering for performance
- [ ] **Task 7.1.1.9**: Add info windows for markers
- [ ] **Task 7.1.1.10**: Optimize map rendering for large datasets

---

**Task 7.1.2** - Advanced Filters | **P0** | **Status:** [ ] Not Started

- [ ] **Task 7.1.2.1**: Add species filter (multi-select dropdown)
- [ ] **Task 7.1.2.2**: Add date range filter (calendar picker)
- [ ] **Task 7.1.2.3**: Add confidence filter (slider)
- [ ] **Task 7.1.2.4**: Add "officer verified only" checkbox
- [ ] **Task 7.1.2.5**: Add camera filter (multi-select)
- [ ] **Task 7.1.2.6**: Add division/range filter (hierarchical)
- [ ] **Task 7.1.2.7**: Implement filter combination logic (AND/OR)
- [ ] **Task 7.1.2.8**: Add "clear all filters" button
- [ ] **Task 7.1.2.9**: Save filter presets
- [ ] **Task 7.1.2.10**: Update map in real-time on filter change
- [ ] **Task 7.1.2.11**: Add URL query params for shareable filtered views

---

## 🧱 Module 8 – Backend (Bun.js)

**Task 8.1.1** - API Architecture | **P0** | **Status:** [ ] Not Started

- [ ] **Task 8.1.1.1**: Set up Bun.js HTTP server
- [ ] **Task 8.1.1.2**: Implement layered architecture (controller → service → repository)
- [ ] **Task 8.1.1.3**: Install Zod for request validation
- [ ] **Task 8.1.1.4**: Create validation schemas for all endpoints
- [ ] **Task 8.1.1.5**: Implement error handling middleware
- [ ] **Task 8.1.1.6**: Add request logging middleware
- [ ] **Task 8.1.1.7**: Set up CORS configuration
- [ ] **Task 8.1.1.8**: Create OpenAPI/Swagger documentation
- [ ] **Task 8.1.1.9**: Implement rate limiting
- [ ] **Task 8.1.1.10**: Add request ID generation
- [ ] **Task 8.1.1.11**: Create health check endpoints

---

**Task 8.1.2** - Event-Driven Pipeline | **P0** | **Status:** [ ] Not Started

- [ ] **Task 8.1.2.1**: Set up event bus (Redis Pub/Sub or similar)
- [ ] **Task 8.1.2.2**: Define event types (image.uploaded, image.inferred, etc.)
- [ ] **Task 8.1.2.3**: Create event publishers
- [ ] **Task 8.1.2.4**: Create event subscribers
- [ ] **Task 8.1.2.5**: Implement image upload → infer pipeline
- [ ] **Task 8.1.2.6**: Implement infer → verify pipeline
- [ ] **Task 8.1.2.7**: Implement verify → analyze pipeline
- [ ] **Task 8.1.2.8**: Add event logging and monitoring
- [ ] **Task 8.1.2.9**: Implement retry logic for failed events
- [ ] **Task 8.1.2.10**: Create event replay mechanism

---

## 🐳 Module 9 – Docker & Deployment

**Task 9.1.1** - Dockerize All Services | **P0** | **Status:** [ ] Not Started

- [ ] **Task 9.1.1.1**: Create Dockerfile for bun-api
- [ ] **Task 9.1.1.2**: Create Dockerfile for React web app
- [ ] **Task 9.1.1.3**: Create Dockerfile for ai-node
- [ ] **Task 9.1.1.4**: Use official PostgreSQL + PostGIS image
- [ ] **Task 9.1.1.5**: Use official MinIO image
- [ ] **Task 9.1.1.6**: Create Dockerfile for Flower server
- [ ] **Task 9.1.1.7**: Optimize Docker images (multi-stage builds)
- [ ] **Task 9.1.1.8**: Add health checks to all containers
- [ ] **Task 9.1.1.9**: Configure container resource limits
- [ ] **Task 9.1.1.10**: Create .dockerignore files

---

**Task 9.1.2** - Docker Compose Profiles | **P0** | **Status:** [ ] Not Started

- [ ] **Task 9.1.2.1**: Create docker-compose.yml
- [ ] **Task 9.1.2.2**: Define 'edge' profile (Range HQ deployment)
- [ ] **Task 9.1.2.3**: Define 'central' profile (Central HQ deployment)
- [ ] **Task 9.1.2.4**: Configure service dependencies
- [ ] **Task 9.1.2.5**: Set up named volumes for persistence
- [ ] **Task 9.1.2.6**: Configure networks (frontend, backend, storage)
- [ ] **Task 9.1.2.7**: Add environment variable files (.env)
- [ ] **Task 9.1.2.8**: Create docker-compose.override.yml for local dev
- [ ] **Task 9.1.2.9**: Document deployment commands
- [ ] **Task 9.1.2.10**: Test edge and central profiles

---

**Task 9.1.3** - Secure Secrets Management | **P0** | **Status:** [ ] Not Started

- [ ] **Task 9.1.3.1**: Set up HashiCorp Vault or Docker Secrets
- [ ] **Task 9.1.3.2**: Store database credentials securely
- [ ] **Task 9.1.3.3**: Store MinIO access keys securely
- [ ] **Task 9.1.3.4**: Store JWT signing keys securely
- [ ] **Task 9.1.3.5**: Store Google Maps API key securely
- [ ] **Task 9.1.3.6**: Implement secret rotation policy
- [ ] **Task 9.1.3.7**: Add secret access logging
- [ ] **Task 9.1.3.8**: Create secret backup and recovery process
- [ ] **Task 9.1.3.9**: Document secrets management workflow

---

## 🛡 Module 10 – Security, Audit & Compliance

**Task 10.1.1** - Compliance Alignment | **P0** | **Status:** [ ] Not Started

- [ ] **Task 10.1.1.1**: Research Govt data retention norms
- [ ] **Task 10.1.1.2**: Implement data retention policies
- [ ] **Task 10.1.1.3**: Create immutable audit logs table
- [ ] **Task 10.1.1.4**: Log all data access and modifications
- [ ] **Task 10.1.1.5**: Implement GDPR-like data export
- [ ] **Task 10.1.1.6**: Implement data deletion workflow
- [ ] **Task 10.1.1.7**: Create compliance reports
- [ ] **Task 10.1.1.8**: Document compliance procedures
- [ ] **Task 10.1.1.9**: Add data encryption at rest (MinIO)
- [ ] **Task 10.1.1.10**: Add data encryption in transit (TLS)

---

**Task 10.1.2** - Intrusion Detection | **P1** | **Status:** [ ] Not Started

- [ ] **Task 10.1.2.1**: Monitor abnormal camera activity (too many/few images)
- [ ] **Task 10.1.2.2**: Detect suspicious upload patterns
- [ ] **Task 10.1.2.3**: Monitor failed login attempts
- [ ] **Task 10.1.2.4**: Implement IP-based rate limiting
- [ ] **Task 10.1.2.5**: Add anomaly detection for API usage
- [ ] **Task 10.1.2.6**: Create security alerts (email/SMS)
- [ ] **Task 10.1.2.7**: Log all security events
- [ ] **Task 10.1.2.8**: Create security dashboard
- [ ] **Task 10.1.2.9**: Implement automated response (block IP, etc.)

---

## 🧪 Module 11 – Testing & Simulation

**Task 11.1.1** - Synthetic Data Generator | **P1** | **Status:** [ ] Not Started

- [ ] **Task 11.1.1.1**: Create fake camera feed generator
- [ ] **Task 11.1.1.2**: Generate synthetic wildlife images (GAN or image augmentation)
- [ ] **Task 11.1.1.3**: Create mock animal trails (realistic movement patterns)
- [ ] **Task 11.1.1.4**: Generate EXIF metadata for synthetic images
- [ ] **Task 11.1.1.5**: Populate database with test data
- [ ] **Task 11.1.1.6**: Create seed script for development environment
- [ ] **Task 11.1.1.7**: Document synthetic data generation process

---

**Task 11.1.2** - Load & Failure Testing | **P1** | **Status:** [ ] Not Started

- [ ] **Task 11.1.2.1**: Set up load testing framework (k6 or Artillery)
- [ ] **Task 11.1.2.2**: Create load test scenarios (upload, inference, queries)
- [ ] **Task 11.1.2.3**: Simulate camera outage scenarios
- [ ] **Task 11.1.2.4**: Simulate network partition for FL
- [ ] **Task 11.1.2.5**: Test database failover
- [ ] **Task 11.1.2.6**: Test MinIO failure recovery
- [ ] **Task 11.1.2.7**: Create chaos engineering tests
- [ ] **Task 11.1.2.8**: Document test results and bottlenecks
- [ ] **Task 11.1.2.9**: Implement performance optimizations

---

## 📚 Module 12 – Documentation & SOPs

**Task 12.1.1** - Role-Specific Manuals | **P1** | **Status:** [ ] Not Started

- [ ] **Task 12.1.1.1**: Create Ground Staff SOP (image upload, camera maintenance)
- [ ] **Task 12.1.1.2**: Create Range Officer SOP (verification, reports)
- [ ] **Task 12.1.1.3**: Create Divisional Officer SOP (analytics, oversight)
- [ ] **Task 12.1.1.4**: Create Admin SOP (system management, FL training)
- [ ] **Task 12.1.1.5**: Add screenshots and videos to manuals
- [ ] **Task 12.1.1.6**: Translate manuals to Hindi (if required)
- [ ] **Task 12.1.1.7**: Create quick reference cards
- [ ] **Task 12.1.1.8**: Conduct user training sessions

---

**Task 12.1.2** - Disaster Recovery Playbooks | **P0** | **Status:** [ ] Not Started

- [ ] **Task 12.1.2.1**: Create database backup and restore procedures
- [ ] **Task 12.1.2.2**: Create MinIO backup and restore procedures
- [ ] **Task 12.1.2.3**: Document system recovery steps
- [ ] **Task 12.1.2.4**: Create incident response plan
- [ ] **Task 12.1.2.5**: Set up automated backups (daily)
- [ ] **Task 12.1.2.6**: Test backup restoration regularly
- [ ] **Task 12.1.2.7**: Document RTO and RPO targets
- [ ] **Task 12.1.2.8**: Create communication plan for outages

---

## 📋 Summary

**Total Modules:** 12  
**Total Tasks:** 100+  
**Critical Path:** Module 0 → Module 1 → Module 2 → Module 3 → Module 4 cleanup/stabilization → Module 6/7 analytics and maps  
**Deployment Model:** Edge (Range HQ) + Central (Forest HQ)  
**Key Differentiators:** BLIP-assisted wildlife labeling, PostGIS geospatial, Offline-first upload, Field-optimized review workflow

---

**Last Updated:** May 1, 2026  
**Next Review:** After Module 4 cleanup tasks are resolved
