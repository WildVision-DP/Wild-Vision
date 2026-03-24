# WildVision Storage Layout Documentation

**Module:** 3.1.2 - Storage Layout (MinIO)  
**Status:** ✅ Complete  
**Last Updated:** February 18, 2026

---

## Overview

WildVision uses MinIO (S3-compatible object storage) for storing camera trap images and thumbnails. The storage is organized hierarchically by forest administrative boundaries and dates for efficient querying and management.

---

## Bucket Structure (Task 3.1.2.1)

### Main Images Path Pattern
```
{bucket}/circle/division/range/beat/camera-id/yyyy-mm-dd/uuid.ext
```

### Thumbnails Path Pattern
```
{bucket}/thumbnails/circle/division/range/beat/camera-id/yyyy-mm-dd/uuid.jpg
```

### Example Paths
```
wildvision-images/
├── Karnataka_Circle/
│   └── Bandipur_Division/
│       └── North_Range/
│           └── Beat_01/
│               └── BRW-BTR-DIV-001-RNG-N01-BT01-001/
│                   └── 2026-02-18/
│                       ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
│                       └── b2c3d4e5-f6a7-8901-bcde-f23456789012.jpg
└── thumbnails/
    └── Karnataka_Circle/
        └── Bandipur_Division/
            └── North_Range/
                └── Beat_01/
                    └── BRW-BTR-DIV-001-RNG-N01-BT01-001/
                        └── 2026-02-18/
                            ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
                            └── b2c3d4e5-f6a7-8901-bcde-f23456789012.jpg
```

---

## Bucket Configuration

### Bucket Name
- **Development:** `wildvision-images`
- **Production:** `wildvision-images-prod` (recommended)

### Bucket Policy (Task 3.1.2.2)

**Access Control:** Private by default - all access requires presigned URLs

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::wildvision-images/*",
        "arn:aws:s3:::wildvision-images"
      ],
      "Condition": {
        "StringNotEquals": {
          "s3:authType": "REST-HEADER"
        }
      }
    }
  ]
}
```

**Security Features:**
- ✅ No public read access
- ✅ Authentication required for all operations
- ✅ Access controlled via presigned URLs (15-minute expiry)
- ✅ TLS encryption in transit
- ✅ Encrypted at rest (MinIO supports SSE-C/SSE-S3)

---

## Lifecycle Management (Task 3.1.2.3)

### Archive Policy
Images are automatically transitioned to cold storage (GLACIER tier) after **2 years (730 days)** to reduce storage costs.

```json
{
  "Rule": [
    {
      "ID": "archive-old-images",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Transition": [
        {
          "Days": 730,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

**Notes:**
- Requires MinIO with ILM (Information Lifecycle Management) support
- For deployments without ILM, manual archiving scripts are needed
- Archives maintain full path structure for traceability

---

## Upload Workflow

### 1. Request Upload URL (Task 3.1.2.4, 3.1.2.5)

**Endpoint:** `POST /api/upload/request`

**Request:**
```json
{
  "filename": "IMG_1234.jpg",
  "file_type": "image/jpeg",
  "file_size": 4567890,
  "camera_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response:**
```json
{
  "upload_url": "https://minio:9000/wildvision-images/Karnataka_Circle/.../uuid.jpg?X-Amz-Signature=...",
  "file_path": "Karnataka_Circle/Bandipur_Division/.../uuid.jpg",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Process:**
1. Validates camera exists and user has access (Task 3.1.2.6)
2. Builds hierarchical path from camera's geography
3. Generates UUID for unique filename (Task 3.1.2.7)
4. Creates presigned PUT URL with 15-minute expiry (Task 3.1.2.8)

### 2. Client Uploads to MinIO

Client performs direct PUT request to presigned URL:
```bash
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @IMG_1234.jpg \
  "https://minio:9000/wildvision-images/...?X-Amz-Signature=..."
```

### 3. Complete Upload (Task 3.1.2.9, 3.1.2.10, 3.1.2.11)

**Endpoint:** `POST /api/upload/complete`

**Request:**
```json
{
  "file_path": "Karnataka_Circle/Bandipur_Division/.../uuid.jpg",
  "camera_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "original_filename": "IMG_1234.jpg",
  "file_size": 4567890,
  "mime_type": "image/jpeg"
}
```

**Process:**
1. Verifies file exists in MinIO using `statObject()` (Task 3.1.2.10)
2. Downloads file for metadata extraction
3. Extracts EXIF data (date, GPS, camera info)
4. Generates thumbnail (300px width, 80% JPEG quality)
5. Stores thumbnail in parallel path
6. Runs AI inference (currently stub - Module 4)
7. Creates database record with metadata (Task 3.1.2.11)

---

## Path Components

### Circle
Top-level administrative boundary (e.g., "Karnataka Circle")
- Sanitized: Replace non-alphanumeric with underscore

### Division
Wildlife division within a circle (e.g., "Bandipur Division")

### Range
Forest range within a division (e.g., "North Range")

### Beat
Smallest patrol unit within a range (e.g., "Beat 01")

### Camera ID
Unique device identifier (e.g., "BRW-BTR-DIV-001-RNG-N01-BT01-001")
- Format: `{Brand}-{Division}-{Range}-{Beat}-{Sequence}`

### Date
Upload date in ISO format (e.g., "2026-02-18")
- Enables efficient date-based querying

### UUID
Globally unique identifier for each image
- Prevents filename collisions
- Enables deduplication

---

## Database Integration

### Images Table Schema
```sql
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id UUID NOT NULL REFERENCES cameras(id),
    file_path TEXT NOT NULL,           -- MinIO object key
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    taken_at TIMESTAMPTZ,              -- From EXIF
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',       -- EXIF + AI predictions
    status TEXT DEFAULT 'pending',
    thumbnail_path TEXT,
    ai_confidence FLOAT,
    review_status TEXT DEFAULT 'pending',
    deleted_at TIMESTAMPTZ
);
```

---

## Security Considerations

### Authentication
- All uploads require valid JWT token
- Role level ≥ 1 (Ground Staff minimum)

### Authorization
- Users can only upload to cameras they have access to
- Camera access validated via division/range/beat hierarchy

### Presigned URLs
- Short-lived (15 minutes)
- One-time use for specific object
- Cannot be reused for other files

### Audit Trail
- All uploads logged with user ID, timestamp, IP
- File modifications tracked in audit_logs table

---

## Performance Optimization

### Parallelization
- Thumbnail generation runs async (doesn't block upload)
- Metadata extraction uses streaming for large files

### Caching
- Geography hierarchy cached to reduce DB queries
- Presigned URLs generated on-demand

### Scalability
- MinIO supports horizontal scaling
- Partitioned by date for efficient pruning
- Thumbnails reduce bandwidth for gallery views

---

## Disaster Recovery

### Backup Strategy
- Daily incremental backups of bucket
- Monthly full backups
- Cross-region replication for critical deployments

### Restoration
```bash
# Restore from backup
mc mirror backup-bucket/ wildvision-images/

# Verify integrity
mc ls --recursive wildvision-images/ | wc -l
```

---

## Monitoring & Alerts

### Key Metrics
- Upload success rate
- Average upload time
- Storage usage by division
- Archive transition rate

### Alerts
- Failed uploads (> 5% error rate)
- Storage quota approaching limit (> 80%)
- Lifecycle rule failures

---

## Future Enhancements

### Planned (Not in Scope for 3.1.2)
- [ ] Deduplication based on image hash
- [ ] Compression for RAW formats
- [ ] Multi-region replication
- [ ] CDN integration for faster downloads
- [ ] Automated backup rotation

---

## References

- **Implementation:** `apps/api/src/services/minio.ts`
- **Upload Routes:** `apps/api/src/routes/upload.ts`
- **Related Tasks:** Module 3.1.3 (Metadata Extraction)
- **Security:** See `docs/security.md`
- **Deployment:** See `infra/docker/docker-compose.yml`

---

**Document Owner:** Backend Team  
**Review Cycle:** Quarterly or after major changes
