# WildVision BLIP Model Integration Guide

## 📱 Overview

This guide details the complete upgrade of WildVision with **BLIP (Salesforce Bootstrapping Language-Image Pre-training) for automatic animal detection** and a seamless preview + editable confirmation workflow.

---

## 🎯 Key Features Implemented

### 1. **BLIP Image Captioning Model**
- **Model**: `Salesforce/blip-image-captioning-base` from Hugging Face
- **Input**: Image (from upload or camera capture)
- **Output**: Natural language caption + extracted animal name
- **Example**: 
  - Input: Image of a tiger
  - Caption: "a tiger walking in the jungle"
  - Extracted Animal: "Tiger"
  - Confidence: 85%

### 2. **Automatic Animal Detection Flow**
- User uploads/captures image
- Image preview shown immediately
- ML model processes image in background
- Animal name auto-detected with confidence score
- User can edit animal name if needed
- Confirm or reject detection

### 3. **Database Integration**
- Store pending detections (confirmation_status = 'pending_confirmation')
- Store confirmed detections (confirmation_status = 'confirmed')
- Support user edits to animal names after detection
- Track detection metadata (caption, confidence, method)

### 4. **Frontend UI Components**
- **UploadPage**: Camera + file upload with preview
- **DetectionConfirmationModal**: Image preview + editable animal name + confirmation
- **DashboardPage**: Display confirmed detections
- **WildlifeMapPage**: Show detection markers on map

### 5. **Full Docker Support**
All services containerized and orchestrated via docker-compose:
- Frontend (React): Port 3000
- Backend API (Hono): Port 4000
- ML Service (FastAPI): Port 8000
- PostgreSQL: Port 5433
- MinIO Storage: Ports 9000/9001

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WildVision with BLIP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React/Vite 3000)     Backend API (Hono 4000)    │
│  ├─ Camera & File Upload         ├─ POST /api/upload/request
│  ├─ Image Preview                ├─ POST /api/upload/complete
│  ├─ Confirmation Modal           ├─ POST /api/upload/confirm
│  ├─ Dashboard                    ├─ GET /api/images
│  └─ Wildlife Map                 └─ [ML Service Integration]
│           │                              │
│           └──────────────────────────────┘
│                       │
│           ML Service: BLIP (8000)
│           ├─ Model: blip-image-captioning-base
│           ├─ POST /predict
│           ├─ Response: caption + animal name
│           └─ Extract animal via keyword matching
│           │
│  ┌────────┴────────┐
│  │                 │
│  ▼                 ▼
│ PostgreSQL      MinIO Storage
│ (5433)          (9000/9001)
│ ├─ Images       ├─ Photo files
│ ├─ Detections   ├─ Thumbnails
│ └─ Metadata     └─ Cache
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Details

### **File Changes**

#### 1. ML Service (`ml_service.py`)
**Status**: ✅ Updated

**Key Changes**:
- Replaced `pipeline("image-classification")` with BLIP model
- Uses `BlipProcessor` and `BlipForConditionalGeneration`
- New `extract_animal_from_caption()` function for animal extraction
- Updated `/predict` endpoint to return: `caption`, `animal`, `confidence`
- Response format:
  ```json
  {
    "caption": "a tiger walking in the jungle",
    "animal": "Tiger",
    "confidence": 0.85,
    "method": "BLIP Captioning",
    "metadata": {"method": "keyword_match"}
  }
  ```

#### 2. Backend Upload Routes (`apps/api/src/routes/upload.ts`)
**Status**: ✅ Updated

**Key Changes**:
- Updated `detectAnimal()` function to handle BLIP response
- Added `BLIPResponse` interface
- Updated type mapping: `label` ← `animal`, `score` ← `confidence`
- Enhanced `/upload/confirm` endpoint to accept `detected_animal` parameter for editable names
- Validates and saves edited animal names to database

**API Endpoints**:
```
POST /api/upload/request          → Generate presigned URL
POST /api/upload/complete         → Upload & detect (calls ML service)
POST /api/upload/confirm          → Confirm detection (with optional animal edit)
```

#### 3. Frontend Upload Page (`apps/web/src/pages/UploadPage.tsx`)
**Status**: ✅ Updated

**Key Changes**:
- Integrated BLIP detection flow
- Updated `handleDetectionConfirm()` to pass edited animal name
- Passes `detected_animal` parameter to backend confirmation endpoint
- Maintains existing camera select and file upload functionality

**Flow**:
1. User uploads/captures image
2. `uploadFile()` → presigned URL → MinIO upload
3. `/api/upload/complete` → ML detection → pending record created
4. Modal shows prediction → user can edit
5. User confirms → `handleDetectionConfirm(editedAnimal)` → backend saves

#### 4. Detection Modal (`apps/web/src/components/DetectionConfirmationModal.tsx`)
**Status**: ✅ Enhanced

**Key Changes**:
- Updated `onConfirm` callback to pass edited animal name
- Modal now returns edited animal to parent component
- Edit interface for animal name is fully functional

**UI Flow**:
```
Image Preview
↓
Detected Animal: [Tiger ✏️] (editable)
Scientific Name: tiger-sp
Confidence: 85%
↓
[Confirm Detection]  [Retake/Upload Again]
```

#### 5. Dashboard Page (`apps/web/src/pages/DashboardPage.tsx`)
**Status**: ✅ Working

**No changes needed** - Already displays:
- Confirmed detections with animal names
- Detection images and thumbnails
- Confidence scores
- Geographic location (division, range, beat)

#### 6. Wildlife Map Page (`apps/web/src/pages/WildlifeMapPage.tsx`)
**Status**: ✅ Working

**No changes needed** - Already:
- Fetches confirmed detections
- Displays detection list with animal names
- Can pass detections to MapComponent for marker rendering

#### 7. Docker Configuration
**Status**: ✅ Complete

**Files**:
- `Dockerfile.ml` - Updated for BLIP (already in place)
- `docker-compose.yml` - Complete with all services
- `ml_requirements.txt` - Already contains BLIP dependencies

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11 (for local ML service development)

### Option 1: Docker Compose (Recommended)

```bash
cd Wild-Vision/infra/docker

# Create .env file (optional)
cat > .env << EOF
DB_PASSWORD=wildvision_dev_password
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
EOF

# Start all services
docker-compose up --build

# Wait 60 seconds for services to initialize...
```

**Access**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- ML Service: http://localhost:8000
- MinIO Console: http://localhost:9001 (admin/minioadmin123)
- PostgreSQL: localhost:5433

### Option 2: Local Development

```bash
# 1. Start ML Service
cd python/wildvision_model_integration
python -m venv ml_env
source ml_env/bin/activate  # or ml_env\Scripts\activate on Windows
pip install -r ml_requirements.txt
python ml_service.py  # Runs on http://localhost:8000

# 2. Start Backend (in another terminal)
cd Wild-Vision/apps/api
npm install
bun run dev  # or npm run dev

# 3. Start Frontend (in another terminal)
cd Wild-Vision/apps/web
npm install
npm run dev  # Runs on http://localhost:5173

# 4. Ensure PostgreSQL and MinIO are running
# (Use docker or local installation)
```

---

## 📸 Usage Workflow

### Step 1: Open Upload Page
```
1. Navigate to http://localhost:3000/upload
2. Select Camera from dropdown
3. (Recommended) Select geographic hierarchy (Circle → Division → Range → Beat)
```

### Step 2: Capture or Upload Image
```
Option A - Camera:
  1. Click "📷 Capture from Camera"
  2. Allow browser camera permission
  3. Take photo
  4. Image preview shown

Option B - File Upload:
  1. Click "📤 Upload Image"
  2. Select file from device
  3. Image preview shown
```

### Step 3: Automatic Detection
```
1. Image sent to ML service
2. BLIP model generates caption
3. Animal name extracted via keyword matching
4. Detection result returned (caption + animal + confidence)
5. Temporary record created with status='pending_confirmation'
```

### Step 4: Confirmation Modal
```
Interface:
┌─────────────────────────────────┐
│  Image Preview                  │
│  (300px × 300px thumbnail)      │
│                                 │
├─────────────────────────────────┤
│  Detection Result:              │
│                                 │
│  Detected Animal: [Tiger ✏️]    │
│  (Editable - allow user input)  │
│                                 │
│  Scientific Name: tiger-sp      │
│  Confidence: 85%                │
│                                 │
├─────────────────────────────────┤
│  [✓ Confirm]  [🔄 Retake/Edit] │
└─────────────────────────────────┘

User Actions:
- Edit animal name by clicking ✏️
- Click Save to confirm edit
- Click [✓ Confirm] to save detection
- Click [🔄 Retake] to reject and re-upload
```

### Step 5: Save to Dashboard
```
On Confirmation:
1. Backend receives: image_id, confirmed=true, detected_animal (edited)
2. Update database:
   - confirmation_status = 'confirmed'
   - detected_animal = edited value (if changed)
   - confirmed_at = CURRENT_TIMESTAMP
   - status = 'processed'
3. Trigger background metadata processing
4. Return success response
```

### Step 6: View on Dashboard
```
Go to Dashboard:
1. See "Recent Detections" section
2. Each detection shows:
   - Animal image/thumbnail
   - Animal name (as confirmed/edited)
   - Scientific name
   - Confidence score
   - Timestamp
   - Geographic location
```

### Step 7: View on Wildlife Map
```
Go to Wildlife Activity Map:
1. See camera locations (green/yellow/red pins)
2. See confirmed detections:
   - List on right sidebar
   - Can optionally render as map markers
3. Click detection to see details
```

---

## 🧪 Testing the Pipeline

### 1. Unit Test ML Service
```bash
# Test BLIP endpoint
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg"

# Expected Response:
# {
#   "caption": "a tiger walking in the jungle",
#   "animal": "Tiger",
#   "confidence": 0.85,
#   "method": "BLIP Captioning"
# }
```

### 2. Integration Test Upload Flow
```bash
# 1. Get presigned URL
curl -X POST http://localhost:4000/api/upload/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "tiger.jpg",
    "file_type": "image/jpeg",
    "file_size": 1024000,
    "camera_id": "camera-001"
  }'

# 2. Upload to MinIO (use presigned URL from response)
curl -X PUT https://presigned-url... \
  -H "Content-Type: image/jpeg" \
  --data-binary @tiger.jpg

# 3. Complete upload (trigger ML detection)
curl -X POST http://localhost:4000/api/upload/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "uploads/camera-001/tiger.jpg",
    "camera_id": "camera-001",
    "original_filename": "tiger.jpg",
    "file_size": 1024000,
    "mime_type": "image/jpeg"
  }'

# 4. Confirm detection
curl -X POST http://localhost:4000/api/upload/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": "image-uuid-from-response",
    "confirmed": true,
    "detected_animal": "Tiger"  # Can be edited
  }'
```

### 3. End-to-End Browser Test
```
1. Open http://localhost:3000 in browser
2. Login with valid credentials
3. Navigate to Upload page
4. Select camera
5. Upload test image (wildlife photo)
6. See detection modal
7. Edit animal name (optional)
8. Confirm detection
9. Navigate to Dashboard
10. Verify detection appears
11. Navigate to Wildlife Map
12. Verify detection in list/markers
```

---

## 🔄 How BLIP Animal Extraction Works

### Keyword Matching Strategy
```python
ANIMAL_KEYWORDS = {
    # Big Cats
    "tiger", "lion", "leopard", "cheetah", ...
    # Canines
    "wolf", "dog", "fox", ...
    # Primates
    "monkey", "ape", "gorilla", ...
    # Herbivores
    "deer", "elk", "moose", ...
    # ... (100+ animals)
}

# Example:
caption = "a tiger walking in the jungle"
↓
matches = ["tiger"]  # Found in caption
↓
animal = "Tiger"  # Capitalize first match
confidence = 0.85  # Based on matching method
```

### Confidence Scoring
- **keyword_match** (direct match): 85% confidence
- **noun_extraction** (fallback): 60% confidence
- **unknown**: 0% confidence

### Supported Animals
Currently supported ~100 animal keywords covering:
- **Big Cats**: Tiger, Lion, Leopard, Cheetah, Cougar, Lynx, Bobcat...
- **Canines**: Wolf, Fox, Jackal, Hyena, Coyote, Dog...
- **Primates**: Monkey, Ape, Gorilla, Chimpanzee, Orangutan, Baboon...
- **Herbivores**: Deer, Elk, Moose, Zebra, Giraffe, Buffalo...
- **Bears**: Grizzly, Panda...
- **Reptiles**: Snake, Crocodile, Lizard, Turtle...
- **Birds**: Eagle, Hawk, Owl, Swan, Duck, Peacock...
- And many more!

**To add animals**, edit `ANIMAL_KEYWORDS` set in `ml_service.py`.

---

## 🔐 Security Considerations

1. **ML Service**: Runs on localhost (port 8000), not exposed publicly
2. **Image Storage**: MinIO with access key/secret
3. **Database**: PostgreSQL with password protection
4. **API Auth**: Bearer token required for all endpoints
5. **CORS**: Configured to allow frontend origin
6. **File Upload**: Size limit 50MB, type validation

---

## 📊 Database Schema

### images table
```sql
CREATE TABLE images (
    id UUID PRIMARY KEY,
    camera_id UUID REFERENCES cameras(id),
    file_path VARCHAR(512) UNIQUE,
    thumbnail_path VARCHAR(512),
    detected_animal VARCHAR(255),  -- ML detected or user edited
    detected_animal_scientific VARCHAR(255),
    detection_confidence INT,  -- 0-100
    confirmation_status VARCHAR(50),  -- pending_confirmation, confirmed, rejected
    confirmed_at TIMESTAMP,
    confirmed_by UUID REFERENCES users(id),
    metadata JSONB,  -- Stores caption, AI predictions, etc.
    ...
);
```

---

## 🐛 Troubleshooting

### Issue: ML Service not detecting
**Check**:
1. ML service running: `curl http://localhost:8000/health`
2. Image format supported: JPEG, PNG, etc.
3. Image size: Max 50MB
4. Logs: Check `docker logs wildvision-ml-model`

### Issue: Detection modal not showing
**Check**:
1. Backend returns 200 from `/api/upload/complete`
2. Response has `pending_detection` object
3. Frontend state updated correctly
4. Modal component loaded

### Issue: Image not displaying in modal
**Check**:
1. MinIO has the file: Visit http://localhost:9001
2. Thumbnail generated: Check `/api/image/{path}` endpoint
3. CORS headers sent correctly
4. Path is correct in `thumbnail_path` field

### Issue: BLIP model not found
**Check**:
1. Internet connection available (for Hugging Face download)
2. Disk space available: BLIP model is ~1GB
3. HuggingFace cache directory writable: `/tmp/huggingface`
4. Logs: `docker logs wildvision-ml-model`

---

## 📈 Performance Notes

- **BLIP Model Loading**: ~30 seconds first time (caches after)
- **Inference Time**: ~5-10 seconds per image (GPU: 2-3 seconds)
- **Detection Confidence**: 85% for keyword matches, 60% for fallback
- **Scalability**: Sequential processing (can parallelize with Celery/Queue)

---

## 🎓 Next Steps

### Enhancements
1. **Confidence Threshold**: Add user-configurable threshold
2. **Better NLP**: Use spaCy for entity extraction
3. **Model Ensemble**: Combine BLIP with classification model
4. **Batch Processing**: Queue system for high-volume uploads
5. **Fine-tuning**: Custom BLIP model for specific animals
6. **Geo-weighting**: Prioritize animals by region
7. **Human Review Queue**: Flag low-confidence detections
8. **Bulk Operations**: Batch confirm/edit multiple detections

### Integrations
1. **Notification System**: Alert on rare animal detection
2. **Analytics Dashboard**: Detection trends, confidence metrics
3. **Export/Reports**: CSV export of detections
4. **Real-time Updates**: WebSocket for live detection notifications
5. **Mobile App**: React Native for field rangers

---

## 📚 References

- **BLIP Model**: https://huggingface.co/Salesforce/blip-image-captioning-base
- **Transformers Library**: https://huggingface.co/docs/transformers
- **FastAPI**: https://fastapi.tiangolo.com
- **Hono Framework**: https://hono.dev
- **Docker Compose**: https://docs.docker.com/compose

---

## ✅ Checklist: Deployment Ready

- [x] BLIP ML service updated
- [x] Backend routes enhanced for detection confirmation
- [x] Frontend upload flow integrated
- [x] Confirmation modal enhanced
- [x] Dashboard displays detections
- [x] Wildlife map integration ready
- [x] Docker compose configured
- [x] ml_requirements.txt has BLIP dependencies
- [x] Database schema supports detection tracking
- [x] Auth/security implemented
- [ ] Test in production environment
- [ ] Load testing completed
- [ ] User training/documentation

---

## 🤝 Support

For issues or questions:
1. Check logs: `docker logs wildvision-ml-model`
2. Test endpoints manually with curl
3. Review this guide's troubleshooting section
4. Check database state for detection records

---

**Last Updated**: March 22, 2026  
**BLIP Version**: Salesforce/blip-image-captioning-base  
**Tested On**: Docker Compose, Python 3.11, Node.js 18+
