# WildVision Docker Deployment Guide

## 🚀 Quick Start - One Command Setup

```bash
docker-compose up --build
```

This single command will start:
- **Frontend**: React/Vite at http://localhost:3000
- **Backend API**: Hono at http://localhost:4000
- **ML Model Service**: FastAPI at http://localhost:8000
- **Database**: PostgreSQL at localhost:5433
- **Object Storage**: MinIO at http://localhost:9001

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WildVision Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React/Vite)      Backend API (Hono)             │
│  Port: 3000                 Port: 4000                      │
│  ├─ Upload Page             ├─ POST /api/upload/request    │
│  ├─ Dashboard               ├─ POST /api/upload/complete   │
│  ├─ Wildlife Map            ├─ POST /api/upload/confirm    │
│  └─ Confirmation Modal      └─ GET /api/images             │
│           │                          │                     │
│           └──────────────────────────┴──────────────┐      │
│                                                      │      │
│                              ML Model Service        │      │
│                              FastAPI (Python)        │      │
│                              Port: 8000              │      │
│                              ├─ POST /predict        │      │
│                              └─ dima806/animal...    │      │
│                                                      │      │
│           ┌──────────────────────────────────────────┘      │
│           │                                                  │
│  PostgreSQL Database          MinIO Object Storage          │
│  Port: 5433                   Ports: 9000/9001             │
│  ├─ Images                    ├─ Photo files              │
│  ├─ Detections               ├─ Thumbnails               │
│  ├─ Cameras                  └─ ML cache                 │
│  └─ Geography Hierarchy                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Service Details

### Frontend (React/Vite)
- **Port**: 3000
- **Container**: wildvision-web
- **Build**: Alpine Node.js
- **Features**:
  - Photo upload interface
  - Detection result confirmation
  - Dashboard with confirmed detections
  - Wildlife activity map

### Backend API (Hono)
- **Port**: 4000
- **Container**: wildvision-api
- **Runtime**: Bun (fast Node.js alternative)
- **Features**:
  - Image upload handling
  - ML service integration
  - Detection confirmation workflow
  - Database management

### ML Model Service (FastAPI)
- **Port**: 8000
- **Container**: wildvision-ml-model
- **Runtime**: Python 3.11
- **Model**: `dima806/animal_151_types_image_detection` (Hugging Face)
- **Features**:
  - Live animal detection (151 species)
  - Confidence scoring
  - JSON predictions

### Database (PostgreSQL + PostGIS)
- **Port**: 5433
- **Container**: wildvision-postgres
- **Extensions**: PostGIS (geospatial queries)
- **Volume**: postgres_data (persistent)

### Object Storage (MinIO)
- **Ports**: 9000 (API), 9001 (Console)
- **Container**: wildvision-minio
- **Volume**: minio_data (persistent)
- **Console**: http://localhost:9001

## 🔧 Environment Variables

Create a `.env` file in `infra/docker/` or set before running:

```env
# Database
DB_PASSWORD=wildvision_dev_password

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# Optional ML Service (auto-configured)
ML_SERVICE_URL=http://ml-model:8000

# Optional Node
NODE_ENV=production
PORT=4000
```

## 📤 Workflow: Photo Upload to Confirmation

```
1. USER UPLOADS PHOTO
   Frontend → POST /api/upload/request
   Response: presigned MinIO URL + upload path

2. DIRECT UPLOAD TO MINIO
   Browser → presigned URL
   Response: File stored in MinIO

3. BACKEND PROCESSES IMAGE
   Frontend → POST /api/upload/complete
   Backend:
   ├─ Downloads image from MinIO
   ├─ Extracts EXIF metadata
   ├─ Passes to ML service
   └─ Stores TEMPORARY record (unconfirmed)

4. ML DETECTION
   Backend → POST /predict (ML Model)
   ML Service returns:
   ├─ animal: "Tiger"
   ├─ confidence: 0.92
   └─ scientific_name: "panthera-tigris"

5. SHOW CONFIRMATION MODAL
   Frontend displays:
   ├─ Image preview
   ├─ Detected animal
   ├─ 92% confidence badge
   └─ [Confirm Detection] [Reject] buttons

6. USER CONFIRMS
   Frontend → POST /api/upload/confirm
   Backend:
   ├─ Updates confirmation_status='confirmed'
   ├─ Records confirmation_time
   └─ Triggers async metadata processing

7. DISPLAY ON DASHBOARD & MAP
   ✅ Animal appears in "Recent Confirmed Detections"
   ✅ Marker appears on Wildlife Map
   ✅ Shows timestamp and location
```

## 🎯 Testing the System

### 1. Frontend is Ready
```
✅ Open http://localhost:3000
   → You should see WildVision dashboard
```

### 2. Backend API is Working
```
✅ Check http://localhost:4000/health
   → { "status": "healthy", "service": "WildVision API" }
```

### 3. ML Model is Ready
```
✅ Check http://localhost:8000/docs
   → FastAPI Swagger UI with /predict endpoint
```

### 4. Database is Ready
```
✅ Check logs: docker logs wildvision-postgres
   → Should see "database system is ready to accept connections"
```

### 5. Storage is Ready
```
✅ Check http://localhost:9001
   → MinIO Console (login: minioadmin / minioadmin123)
```

## 🛑 Troubleshooting

### All services starting but nothing works
```bash
# Check if all containers are running
docker-compose ps

# View logs for a specific service
docker-compose logs -f backend
docker-compose logs -f ml-model
docker-compose logs -f frontend
```

### ML Service taking too long to start
```
⏳ This is NORMAL - it's downloading the 151-species model (~2GB)
   On first run, expect 3-10 minutes for ML service to be ready
   Watch: docker-compose logs -f ml-model
```

### Port already in use
```bash
# Kill process using port
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:4000 | xargs kill -9  # Backend
lsof -ti:8000 | xargs kill -9  # ML Model
```

### Database connection failed
```bash
# Check database is healthy
docker-compose ps postgres

# Run migrations
docker exec wildvision-api bun run src/db/migrate.ts
```

## 📚 API Endpoints

### Upload Flow
- `POST /api/upload/request` - Get presigned MinIO URL
- `POST /api/upload/complete` - Process uploaded image, get detection
- `POST /api/upload/confirm` - Confirm detection and save

### Image Gallery
- `GET /api/images` - List all images
- `GET /api/images?confirmation_status=confirmed` - Only confirmed detections

### Cameras & Geography
- `GET /api/cameras` - List all surveillance cameras
- `GET /api/geography/circles` - List geographic circles
- `GET /api/geography/divisions/:circle_id` - List divisions in circle

## 🔐 Security Notes

For **production deployment**:
1. Change all default passwords in `.env`
2. Enable HTTPS on frontend
3. Set `NODE_ENV=production`
4. Use environment variables instead of hardcoded values
5. Implement JWT token rotation
6. Add rate limiting to API
7. Use private container registry
8. Enable network policies in Kubernetes

## 📊 Monitoring

Monitor container health:
```bash
# Watch all services
docker-compose stats

# Check specific service
docker-compose ps backend

# View recent logs
docker-compose logs --tail=50 -f
```

## 🔄 Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Full rebuild (if code changed)
docker-compose down && docker-compose up --build
```

## 🗑️ Cleanup

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes database!)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

---

## Expected Behavior

When you run `docker-compose up --build`:

1. **MinIO starts first** (0-10 seconds)
2. **PostgreSQL starts** (0-10 seconds) 
3. **ML Model downloads & initializes** (2-10 minutes on first run) ⏳
4. **Backend waits for all dependencies**, then starts (10-30 seconds)
5. **Frontend builds from source**, then starts (20-60 seconds)

**Total first-run time: ~5-15 minutes**

Once all services show "healthy" status:
- ✅ Open http://localhost:3000
- ✅ Upload a wildlife photo
- ✅ Confirm detection
- ✅ See it on dashboard & map

---

Created: March 2026
WildVision: Wildlife Surveillance & Movement Analytics Platform
