# Image Upload Guide - WildVision

## Quick Start for Testing

### Method 1: Using the Upload Page (Recommended)

1. **Go to**: http://localhost:3000/upload
2. **Select Hierarchy**:
   - Circle: "Maharashtra Circle"
   - Division: "Tadoba Andhari Tiger Reserve"
   - Range: "Tadoba Range" or "Kolsa Range"
   - Beat: Any beat (Tadoba North Beat, Tadoba South Beat, Kolsa Core Beat)
   - Camera: Select a camera (e.g., "TATR-CAM-001")

3. **Upload Image**:
   - Click "Select Files" or drag & drop
   - Choose a **small test image** (JPG or PNG, under 2MB for testing)
   - Click "Upload 1 File" button
   - Wait for completion

### Method 2: Direct API Upload (Using cURL or Postman)

```bash
# Step 1: Get auth token (use your login credentials)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "amit.patil@forest.gov.in",
    "password": "password123"
  }'

# Copy the access_token from response

# Step 2: Request presigned URL
curl -X POST http://localhost:4000/upload/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "file_type": "image/jpeg",
    "file_size": 1024000,
    "camera_id": "TATR-CAM-001"
  }'

# Copy upload_url and file_path from response

# Step 3: Upload to MinIO (using the presigned URL)
curl -X PUT "YOUR_PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/your/image.jpg

# Step 4: Finalize upload
curl -X POST http://localhost:4000/upload/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "FILE_PATH_FROM_STEP_2",
    "camera_id": "TATR-CAM-001",
    "original_filename": "test.jpg",
    "file_size": 1024000,
    "mime_type": "image/jpeg"
  }'
```

## What Happens After Upload

1. ✅ Image is stored in MinIO
2. ✅ Thumbnail is automatically generated
3. ✅ EXIF data is extracted (if available)
4. ✅ **ML Model processes the image** to detect animal species
5. ✅ Detection results are stored in database
6. ✅ Results appear on the map with animal species name

## Available Test Cameras

- Maharashtra Circle
  - Tadoba Andhari Tiger Reserve
    - Tadoba Range
      - Tadoba North Beat: TATR-CAM-001 to TATR-CAM-010
      - Tadoba South Beat: TATR-CAM-011 to TATR-CAM-015
    - Kolsa Range
      - Kolsa Core Beat: TATR-CAM-016 to TATR-CAM-025

## Troubleshooting Upload Errors

**Error: "Failed to finalize upload"**
- Check your token hasn't expired
- Verify camera_id is correct
- Make sure the file was uploaded to MinIO

**Error: "Camera not found"**
- Select a camera from the dropdown first
- Use the UUID or camera_id string from the system

**Error: "File not found in storage"**
- The presigned URL may have expired (15 min timeout)
- Request a new presigned URL and try again

**No dropdowns showing data?**
- Check browser console (F12) for errors
- Verify you're logged in
- Refresh the page

## View Results

After successful upload:
1. Go to http://localhost:3000/map
2. Look for animal detections on the map
3. Click markers to see species names and confidence scores
4. Visit http://localhost:3000/images to see all uploaded images
