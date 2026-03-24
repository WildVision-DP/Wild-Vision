# 🐯 WildVision: Wildlife Surveillance & Movement Analytics Platform

![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![Node.js](https://img.shields.io/badge/node-20-green)

## 📋 Overview

**WildVision** is a comprehensive wildlife surveillance platform that uses machine learning to detect and categorize animals from camera trap images. The system automatically captures wildlife movements, confirms detections, and provides real-time visualization through dashboards and interactive maps.

### ✨ Key Features

- 📸 **Photo Upload Interface** - Simple drag-and-drop upload for wildlife images
- 🤖 **ML-Powered Detection** - Hugging Face model detects 151 animal species with confidence scoring
- ✅ **User Confirmation Workflow** - Humans validate AI detections before saving
- 📊 **Detection Dashboard** - View all confirmed wildlife sightings with metadata
- 🗺️ **Interactive Maps** - Visualize animal locations on the surveillance area map
- 📍 **Geographic Hierarchy** - Organize cameras by Circle → Division → Range → Beat
- 🔐 **Role-Based Access Control** - Ground Staff, Field Officer, Admin, Superadmin roles
- 💾 **Persistent Storage** - PostgreSQL database + MinIO object storage
- 🐳 **Docker Deployment** - One-command startup for entire system

## 🏗️ System Architecture

### Three-Service Model

```
User Interface          API Backend            ML Intelligence
┌──────────────┐       ┌──────────────┐      ┌──────────────┐
│              │       │              │      │              │
│   React UI   │──────▶│  Hono API    │─────▶│ FastAPI ML   │
│  (Port 3000) │       │ (Port 4000)  │      │ (Port 8000)  │
│              │       │              │      │  Hugging Face│
└──────────────┘       └──────────────┘      └──────────────┘
       │                      │                     ▲
       └──────────┬───────────┴─────────────────────┘
                  ▼
         PostgreSQL + PostGIS
         MinIO Object Storage
```

### Service Breakdown

| Service | Port | Technology | Purpose |
|---------|------|-----------|---------|
| **Frontend** | 3000 | React + Vite | User interface for upload & dashboard |
| **Backend API** | 4000 | Hono (Bun runtime) | Image processing, ML coordination, database |
| **ML Service** | 8000 | FastAPI (Python) | Animal detection using Hugging Face model |
| **Database** | 5433 | PostgreSQL + PostGIS | Images, detections, camera locations |
| **Storage** | 9000 | MinIO S3-compatible | Image files and thumbnails |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- ~8GB disk space (for ML model)

### Deploy Everything with One Command

```bash
cd Wild-Vision
docker-compose -f infra/docker/docker-compose.yml up --build
```

The system will automatically:
1. ✅ Start PostgreSQL database
2. ✅ Start MinIO object storage
3. ✅ Download & initialize ML model (first run: 2-10 minutes)
4. ✅ Build & start backend API
5. ✅ Build & start frontend UI

**Access the platform:**
- 🌐 Frontend: http://localhost:3000
- 📡 API Docs: http://localhost:4000
- 🤖 ML Docs: http://localhost:8000/docs
- 💾 Storage: http://localhost:9001 (minioadmin / minioadmin123)

## 📤 Photo Upload & Detection Workflow

### Step 1: Upload Photo
```
User selects photo from device
    ↓
Frontend asks: "Which camera captured this?"
    ↓
User selects from geographic hierarchy
```

### Step 2: Image Transmission
```
Frontend requests presigned upload URL
    ↓
User's browser uploads directly to MinIO (secure, fast)
    ↓
Backend receives completion notification
```

### Step 3: ML Detection
```
Backend downloads image from MinIO
    ↓
Backend extracts EXIF metadata (time, location)
    ↓
Backend sends to ML service
    ↓
ML service processes with Hugging Face model
    ↓
Returns: { animal: "Tiger", confidence: 0.94, scientific_name: "panthera-tigris" }
```

### Step 4: User Confirmation
```
Frontend shows modal with:
  ├─ Full image preview
  ├─ Detected animal: "Tiger"
  ├─ Confidence: 94%
  └─ Buttons: [Confirm] [Reject]
    ↓
User clicks "Confirm Detection"
```

### Step 5: Save & Display
```
Backend saves detection as "confirmed"
    ↓
Dashboard updated instantly
    ↓
Map adds marker at this location
    ↓
Detection appears in "Recent Confirmed Detections"
```

## 💾 Database Schema

### Key Tables

#### `images`
Stores uploaded photos and detection results
```sql
- id: UUID (primary key)
- camera_id: UUID (which camera)
- file_path: VARCHAR (path in MinIO)
- detected_animal: VARCHAR (e.g., "Tiger")
- detection_confidence: NUMERIC (0-100%)
- confirmation_status: VARCHAR ('pending_confirmation', 'confirmed', 'rejected')
- confirmed_at: TIMESTAMP (when user confirmed)
- confirmed_by: UUID (which user confirmed)
- taken_at: TIMESTAMP (from EXIF data)
- metadata: JSONB (EXIF, GPS, etc.)
```

#### `cameras`
Geographic-aware camera locations
```sql
- id: UUID
- camera_id: VARCHAR (unique identifier)
- circle_id, division_id, range_id, beat_id
- name, description, location (PostGIS geometry)
```

#### Geographic Hierarchy
```
Circle (Reserve/Protected Area)
    └─ Division
        └─ Range
            └─ Beat
                └─ Camera
```

## 🔐 Authentication & Roles

All API requests require JWT token with role level:

| Role | Level | Permissions |
|------|-------|-------------|
| Ground Staff | 1 | View cameras, upload images |
| Field Officer | 2 | + Manage camera locations |
| Admin | 3 | + Manage all users and data |
| Superadmin | 4 | + System configuration |

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGc...",
  "user": { "id": "...", "email": "...", "role": 1 }
}
```

## 🐳 Docker Deployment Guide

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for comprehensive guide including:
- Complete architecture diagram
- Service health checking
- Environment variable configuration
- Troubleshooting guide
- Production deployment notes

## 📊 API Examples

### Upload a Photo

**1. Get Presigned Upload URL**
```bash
POST /api/upload/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "tiger_photo.jpg",
  "file_type": "image/jpeg",
  "file_size": 2048576,
  "camera_id": "tadoba-cam-01"
}

Response: { "upload_url": "...", "file_path": "...", "uuid": "..." }
```

**2. Upload to MinIO**
```bash
PUT <presigned_url>
Content-Type: image/jpeg

[binary image data]
```

**3. Get ML Detection**
```bash
POST /api/upload/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_path": "tadoba/division1/.../image.jpg",
  "camera_id": "tadoba-cam-01",
  "original_filename": "tiger_photo.jpg",
  "file_size": 2048576
}

Response: {
  "pending_detection": {
    "id": "uuid",
    "detected_animal": "Tiger",
    "confidence": 94,
    "thumbnail_path": "..."
  }
}
```

**4. Confirm Detection**
```bash
POST /api/upload/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "image_id": "uuid",
  "confirmed": true
}
```

### Query Confirmed Detections

```bash
GET /api/images?confirmation_status=confirmed&limit=10
Authorization: Bearer <token>

Response: [
  {
    "id": "uuid",
    "detected_animal": "Tiger",
    "detection_confidence": 94,
    "confirmed_at": "2026-03-15T14:30:00Z",
    "thumbnail_path": "...",
    "camera_id": "tadoba-cam-01"
  },
  ...
]
```

## 🛠️ Development Guide

### Run Locally (Without Docker)

**1. Start Services**
```bash
# Terminal 1: PostgreSQL + MinIO
cd Wild-Vision/infra/docker
docker-compose up postgres minio

# Terminal 2: ML Service
python ml_service.py
# Runs on http://localhost:8000

# Terminal 3: Backend API
cd Wild-Vision/apps/api
bun install
bun run src/db/migrate.ts  # Run migrations
bun run dev  # Runs on http://localhost:4000

# Terminal 4: Frontend
cd Wild-Vision/apps/web
npm install
npm run dev  # Runs on http://localhost:3000
```

**2. Run Database Migrations**
```bash
cd Wild-Vision/apps/api
bun run src/db/migrate.ts
```

**3. Seed Test Data**
```bash
# Database is auto-seeded with:
# - 25 test cameras in Tadoba Andhari Tiger Reserve
# - Complete geographic hierarchy
# - Test users with different roles
```

## 📈 ML Model Details

### Hugging Face Model: `dima806/animal_151_types_image_detection`

**Capabilities:**
- Detects 151 animal species
- Returns confidence scores (0-100%)
- Fast inference (~1-5 seconds per image)
- Works on CPU and GPU

**Supported Animals:**
- Big cats: Tiger, Lion, Leopard, Jaguar, Cougar, Cheetah
- Primates: Gorilla, Chimpanzee, Orangutan
- Elephants: Asian, African
- Ungulates: Deer, Buffalo, Antelope, Zebra
- Carnivores: Wolf, Bear, Hyena, Badger
- ...and 130+ more species

### Fallback Behavior
If ML service is unavailable, system uses random detection (dev mode). In production, upload is rejected with error.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Upload an animal image
- [ ] Confirm detection appears with correct animal & confidence
- [ ] Reject detection and re-upload (should allow retry)
- [ ] Check detection appears on Dashboard
- [ ] Check detection marker appears on Wildlife Map
- [ ] Filter by confirmation status on images list
- [ ] Test role-based access (Field Officer can upload, Ground Staff cannot)
- [ ] Query confirmed detections via API

### Integration Testing
```bash
# Run test suites
cd Wild-Vision
npm run test

# API endpoint tests
cd apps/api
bun run test/endpoints.ts
```

## 📦 Project Structure

```
wildvision_model_integration/
├── Wild-Vision/                    # Main monorepo
│   ├── apps/
│   │   ├── api/                    # Backend (Hono)
│   │   │   ├── src/
│   │   │   │   ├── index.ts        # Main server
│   │   │   │   ├── routes/         # API endpoints
│   │   │   │   ├── services/       # Business logic
│   │   │   │   ├── db/             # Database & migrations
│   │   │   │   └── middleware/     # Auth, logging
│   │   │   └── Dockerfile          # Container config
│   │   │
│   │   └── web/                    # Frontend (React)
│   │       ├── src/
│   │       │   ├── pages/          # Upload, Dashboard, Map
│   │       │   ├── components/     # Reusable UI
│   │       │   └── lib/            # Utilities
│   │       └── Dockerfile          # Container config
│   │
│   ├── infra/
│   │   └── docker/
│   │       ├── docker-compose.yml  # All services config
│   │       └── init-scripts/       # DB initialization
│   │
│   └── docs/                       # Documentation
│
├── Dockerfile.ml                   # ML service container
├── ml_service.py                   # Python FastAPI service
├── ml_requirements.txt             # Python dependencies
└── DOCKER_DEPLOYMENT.md           # Deployment guide
```

## 🔒 Security Considerations

- ✅ JWT-based authentication on all API endpoints
- ✅ Role-based access control (Ground Staff → Superadmin)
- ✅ Presigned URLs for secure file uploads
- ✅ HTTPS ready (configure in production)
- ⚠️ Default credentials should be changed in production
- ⚠️ Rate limiting recommended for public deployment

## 🐛 Known Issues & Limitations

1. **ML Model Size**: First run downloads ~2GB model - expect 3-10 minutes
2. **GPU Support**: Works on CPU, but much faster with NVIDIA GPU
3. **Concurrent Uploads**: Limited by available memory
4. **Geographic Accuracy**: GPS data extracted from EXIF, may be inaccurate

## 📞 Support & Contribution

- 📧 Contact: [your-email]
- 🐛 Report Issues: GitHub Issues section
- 🤝 Contribute: Fork, branch, pull request workflow

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- **Hugging Face** - `dima806/animal_151_types_image_detection` model
- **Bun Team** - Fast JavaScript runtime
- **FastAPI** - Modern Python web framework
- **PostGIS** - Geospatial database extension

---

**Status**: ✅ Production Ready | **Last Updated**: March 2026 | **Version**: 1.0.0

🐯 **Wildlife Surveillance & Movement Analytics Platform**
