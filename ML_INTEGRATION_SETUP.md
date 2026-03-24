# 🐯 Animal Detection ML Integration Setup

This guide explains how to set up the Hugging Face animal detection model integration with WildVision.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Web Frontend                         │
│              (React/TypeScript)                         │
│                  :3000                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Node.js API                             │
│            (Hono Framework)                             │
│        POST /images/upload                              │
│                  :4000                                  │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Python ML Service         │
    │  (FastAPI)                 │
    │  POST /predict             │
    │        :8000               │
    │  (Hugging Face Model)      │
    └────────────────────────────┘
```

## Setup Steps

### 1. Install Python ML Service Dependencies

```bash
# Navigate to project root
cd c:\Users\hp\OneDrive\Desktop\python\wildvision_model_integration

# Create Python environment (optional but recommended)
python -m venv ml_env

# Activate environment
# On Windows:
ml_env\Scripts\activate

# Install dependencies
pip install -r ml_requirements.txt
```

**First run will download the model (~500MB) from Hugging Face.**

### 2. Start the ML Service

Open a new terminal (leave your dev server running):

```bash
cd c:\Users\hp\OneDrive\Desktop\python\wildvision_model_integration

# Activate environment if you created one:
# ml_env\Scripts\activate

# Start ML service
python ml_service.py
```

You should see:
```
🐯 Starting Animal Detection ML Service on http://localhost:8000
API docs available at http://localhost:8000/docs
```

### 3. Verify ML Service is Running

- Test health: `curl http://localhost:8000/health`
- API docs: http://localhost:8000/docs (interactive)

### 4. Configure Node.js API

The Node.js API (running on :4000) will automatically connect to the ML service.

If you're running ML service on a different host/port, set this environment variable:

```bash
# In the root .env file
ML_SERVICE_URL=http://localhost:8000
```

### 5. Verify Integration

The dev server should already be running. Check that there are no errors:

```bash
# API should be running
http://localhost:4000/health

# Web should be running
http://localhost:3000
```

---

## API Endpoints

### Upload Image with Auto-Detection

**POST** `http://localhost:4000/images/upload`

Request:
```bash
curl -X POST http://localhost:4000/images/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  -F "camera_id=YOUR_CAMERA_UUID"
```

Response:
```json
{
  "image": {
    "id": "uuid",
    "camera_id": "uuid",
    "file_path": "/images/camera_id/2026-03-14/uuid.jpg",
    "detected_animal": "Tiger",
    "detected_animal_scientific": "panthera-tigris",
    "detection_confidence": 0.95,
    "uploaded_at": "2026-03-14T10:30:45Z"
  }
}
```

### Get Detection Summary

**GET** `http://localhost:4000/images/detections/summary?division_id=UUID`

Query Parameters (all optional):
- `division_id` - Filter by division
- `range_id` - Filter by range
- `beat_id` - Filter by beat

Response:
```json
{
  "detections": [
    {
      "animal": "Tiger",
      "count": 15,
      "avg_confidence": "0.9234",
      "last_detected": "2026-03-14T10:30:45Z"
    },
    {
      "animal": "Leopard",
      "count": 8,
      "avg_confidence": "0.8756",
      "last_detected": "2026-03-14T10:15:20Z"
    }
  ]
}
```

---

## Frontend Integration

### Image Upload Component

```typescript
const uploadImage = async (file: File, cameraId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera_id', cameraId);

    const response = await fetch('/api/images/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
    });

    const data = await response.json();
    return data.image;
};
```

### Display Results on Map

```typescript
// The detected animal appears automatically on the map
// as a marker with:
// - Common name (e.g., "Tiger")
// - Scientific name (e.g., "panthera-tigris")
// - Confidence score (95%)
// - Camera location
```

---

## Model Details

**Model**: `dima806/animal_151_types_image_detection`

- **Types**: 151 animal species
- **Input**: JPEG/PNG image
- **Output**: Class label + confidence score (0-1)
- **Inference time**: ~2-5 seconds per image (GPU faster)

### Supported Animals (examples)

Tigers, Lions, Leopards, Bears, Elephants, Zebras, Giraffes, Monkeys, Deer, Boars, Domestic animals, Birds, and 140+ more species.

---

## Troubleshooting

### ML Service is down/unavailable

**Error**: `Service Unavailable` in detection results

**Fix:**
1. Check if ML service is running: `curl http://localhost:8000/health`
2. Restart it: `python ml_service.py`
3. Check firewall isn't blocking port 8000

### SSL Certificate errors (Python)

**Solution**: Add this to ml_service.py if needed:
```python
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
```

### Model download fails

**Error**: `Connection timeout downloading model`

**Fix:**
1. Check internet connection
2. Download manually first:
```python
from transformers import pipeline
pipeline("image-classification", model="dima806/animal_151_types_image_detection")
```

### High memory usage

The model requires ~4GB RAM for inference. If you get OOM errors:
- Close other applications
- Increase available RAM
- Or use GPU (install CUDA for faster inference)

---

## Performance Tips

1. **GPU Acceleration** (Optional)
   - Install CUDA: https://developer.nvidia.com/cuda-downloads
   - Install cuDNN
   - Update requirements: `torch[cuda]` instead of `torch`

2. **Batch Processing**
   - Process multiple images at once for better throughput
   - Queue images if many are uploaded simultaneously

3. **Caching**
   - Database caches predictions automatically
   - Re-upload same image will use cached result

---

## Next Steps

1. ✅ ML service running
2. ✅ Node.js API integrated
3. 📍 **View detections on dashboard**
   - Go to `/map` to see animals
   - Filter by division/range/beat
   - Click map markers to see detection details

4. 📸 **Upload camera images**
   - Use image upload feature in UI
   - Or integrate with real camera feeds

---

## Support

For issues or questions:
- Check API docs: http://localhost:8000/docs
- ML model docs: https://huggingface.co/dima806/animal_151_types_image_detection
- Check server logs for detailed errors
