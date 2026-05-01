# WildVision

WildVision is a wildlife camera-trap surveillance and movement analytics platform. It helps forest teams manage camera locations, upload patrol images, run AI-assisted animal classification, review uncertain detections, and inspect activity through dashboards, reports, and maps.

The project is organized as a Bun/Node monorepo with a React frontend, Hono API backend, Python FastAPI ML service, PostgreSQL/PostGIS database, and MinIO object storage.

## Project Status

This project is under active development. The core platform flows are implemented, including authentication, camera/geography management, image upload, BLIP-based animal captioning/classification, review workflows, analytics, and map views.

## Features

- Role-based authentication with JWT access and refresh tokens.
- Camera inventory management with brand, status, location, and geography hierarchy.
- Geography hierarchy for Circle, Division, Range, Beat, and Camera organization.
- Direct image upload workflow with MinIO object storage.
- BLIP-powered image captioning service for animal classification support.
- Confidence-based upload handling with high-confidence approval and low-confidence review routing.
- Admin review queue with approve, reject, reassess, undo, audit history, and CSV export support.
- Dashboard for camera health, verified detections, review pressure, and network map context.
- Wildlife map with camera markers, status legend, recent detections, and camera gallery access.
- Camera analytics and PDF report export.
- Offline-aware upload queue using IndexedDB on the web client.

## Architecture

```text
apps/web          React + Vite frontend
apps/api          Hono API running on Bun
apps/ml-service   FastAPI ML service using BLIP
infra/docker      PostgreSQL/PostGIS, MinIO, and ML service compose setup
```

Runtime services:

| Service | Default Port | Purpose |
| --- | ---: | --- |
| Web app | 3000 | Browser UI for operations, review, uploads, maps, and reports |
| API | 4000 | Authentication, uploads, camera/geography data, review workflows |
| ML service | 8000 | BLIP image captioning and animal keyword extraction |
| PostgreSQL/PostGIS | 5432 | Relational and geospatial data |
| MinIO | 9000, 9001 | Image storage and MinIO console |

## Technology Stack

Frontend:

- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router
- React Dropzone
- Google Maps JavaScript API
- jsPDF and jspdf-autotable
- IndexedDB for offline upload queueing

Backend:

- Bun
- Hono
- PostgreSQL via `postgres`
- MinIO SDK
- Sharp for image processing
- JWT authentication

ML service:

- Python
- FastAPI
- Transformers
- PyTorch CPU build
- Salesforce BLIP image captioning base model

## Repository Structure

```text
.
|-- apps
|   |-- api              # Hono API service
|   |-- web              # React frontend
|   |-- ml-service       # FastAPI BLIP service
|   `-- ai-node          # Bun AI service placeholder/experimental package
|-- docs                 # Planning and project documentation
|-- infra
|   `-- docker           # Docker Compose and database init scripts
|-- scripts              # Utility scripts
|-- TASKS.md             # Implementation tracker
|-- package.json         # Workspace scripts
`-- bun.lock             # Bun lockfile
```

## Prerequisites

- Git
- Bun 1.x
- Node.js 18 or newer
- Docker and Docker Compose
- Python 3.10 or newer, if running the ML service outside Docker

Optional:

- Google Maps API key for interactive maps.
- Sufficient disk space for Python packages and the BLIP model cache.

## Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Important variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wildvision
DB_USER=wildvision_user
DB_PASSWORD=wildvision_dev_password

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET=wildvision-images

JWT_SECRET=change-this-in-production
API_PORT=4000
ML_SERVICE_URL=http://127.0.0.1:8000
CORS_ORIGIN=http://localhost:3000
```

For maps, configure the frontend environment as needed:

```env
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_GOOGLE_MAPS_MAP_ID=optional-map-id
```

## Running the Project

### 1. Install workspace dependencies

```bash
bun install
```

### 2. Start infrastructure services

From the repository root:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres minio ml-service
```

This starts:

- PostgreSQL/PostGIS
- MinIO
- Python ML service

MinIO console:

```text
http://localhost:9001
```

Default development credentials are configured in `infra/docker/docker-compose.yml`.

### 3. Run database migrations

```bash
cd apps/api
bun run src/db/migrate.ts
```

If seed scripts are needed, check `apps/api/src/db` and `infra/docker/init-scripts`.

### 4. Start the API

```bash
cd apps/api
bun run dev
```

API runs at:

```text
http://localhost:4000
```

### 5. Start the web app

```bash
cd apps/web
npm run dev
```

Web app runs at:

```text
http://localhost:3000
```

### 6. Run the ML service manually, if not using Docker

```bash
cd apps/ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r ml_requirements.txt
uvicorn ml_service:app --host 0.0.0.0 --port 8000
```

ML docs:

```text
http://localhost:8000/docs
```

## Common Commands

From the repository root:

```bash
bun install
bun run dev
bun run lint
bun run test
```

Frontend:

```bash
cd apps/web
npm run dev
npm run build
npm run preview
```

API:

```bash
cd apps/api
bun run dev
bun run build
bun run test
```

ML service:

```bash
cd apps/ml-service
uvicorn ml_service:app --host 0.0.0.0 --port 8000
```

## Main Workflows

### Authentication

Users sign in through the web app. The API returns JWT tokens and user metadata, which the frontend stores for authenticated requests.

### Camera and Geography Setup

Administrators manage the geography hierarchy and camera inventory:

```text
Circle -> Division -> Range -> Beat -> Camera
```

Camera records include operational status, brand/model data, notes, and coordinates used by map views.

### Image Upload

1. User selects geography and source camera.
2. User captures or uploads one or more image files.
3. Web app queues files and uploads them to the API.
4. API stores images in MinIO and sends image data to the ML service.
5. ML service returns a BLIP caption, extracted animal label, confidence, and metadata.
6. High-confidence detections can be accepted automatically.
7. Low-confidence detections are grouped and sent to the admin review queue.

### Review Queue

Admins and authorized reviewers can:

- Filter by animal, status, confidence range, and sort order.
- Inspect image, camera, location, and prediction metadata.
- Correct species labels.
- Approve, reject, or reassess detections.
- Undo the latest review action when allowed.
- Export audit and verification reports.

### Maps and Analytics

The app includes:

- Camera network map.
- Wildlife activity map.
- Camera status and detection summaries.
- Camera analytics table.
- PDF report exports.

## API Surface

Route groups are implemented under `apps/api/src/routes`:

```text
/api/auth
/api/users
/api/cameras
/api/geography
/api/brands
/api/upload
/api/images
/api/admin
/api/proxy
/api/test
```

Representative endpoints:

```http
POST /api/auth/login
GET  /api/cameras
POST /api/cameras
GET  /api/geography/divisions
POST /api/upload/direct
GET  /api/images?confirmation_status=confirmed
GET  /api/admin/reviews
POST /api/admin/reviews/:id/approve
POST /api/admin/reviews/:id/reject
GET  /api/admin/stats/summary
```

## ML Service Notes

The current ML service uses `Salesforce/blip-image-captioning-base`.

Important limitation:

- BLIP is an image captioning model, not an object detector.
- The service extracts animal labels from generated captions using keyword matching.
- It does not produce reliable bounding boxes.
- Review UI should treat BLIP output as classification support, not detector-localization proof.

## Testing and Verification

Recommended checks before pushing changes:

```bash
cd apps/web
npm run build
```

```bash
cd apps/api
bun run test
```

Manual smoke test:

- Log in.
- Open Dashboard.
- Open Cameras and verify map/list views.
- Upload one or more images.
- Confirm high-confidence and low-confidence grouped behavior.
- Open Admin Review and approve/reject a detection.
- Open Wildlife Map and Analytics.

## Development Notes

- The root package manager is Bun.
- The frontend currently uses npm scripts inside `apps/web`.
- The root `build` script should be reviewed before relying on it for production builds.
- The project contains planning files such as `TASKS.md` and `docs/planning/*`; keep them updated when completing tracked work.

## Security Notes

- Change default MinIO and JWT credentials before any production deployment.
- Keep `.env` out of version control.
- Use HTTPS in deployed environments.
- Restrict Google Maps API keys by domain.
- Add production-grade rate limiting and logging before public exposure.

## License

MIT License. See `LICENSE` if present in this repository.
