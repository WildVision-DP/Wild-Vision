# 💡 WildVision - Future Enhancements & Suggestions

**Project:** WildVision - Wildlife Surveillance & Movement Analytics Platform  
**Purpose:** Track features, improvements, and ideas not in the main TASKS.md  
**Status:** Living document - continuously updated  
**Last Updated:** February 18, 2026

---

## 📋 How to Use This File

This document captures:
- ✨ Quality-of-life improvements discovered during development
- 🎯 User experience enhancements
- 🔧 Technical debt and optimizations
- 💡 Future feature ideas
- 🐛 Non-critical bugs that can be addressed later

**Workflow:**
1. Add suggestions here as they arise
2. Review periodically with stakeholders
3. Promote to TASKS.md when prioritized for implementation
4. Mark as `[DONE]` when implemented, or `[MOVED]` when added to TASKS.md

---

## 🎨 UI/UX Enhancements

### Upload Experience

**[PENDING] Duplicate Upload Prevention**
- **Issue:** Currently allows same file to be uploaded multiple times to same camera (e.g., accidental double-click)
- **Impact:** Database bloat, storage waste, confusing gallery duplicates
- **Solution:** 
  - Check if filename already exists for camera before upload
  - Show warning: "This file has already been uploaded. Upload anyway?"
  - Add "Skip duplicates" checkbox in bulk upload
- **Implementation:**
  - Frontend: Check against existing images before adding to queue
  - Backend: Optional duplicate detection in `/upload/request` endpoint
  - Database query: `SELECT id FROM images WHERE camera_id = $1 AND original_filename = $2`
- **Effort:** Small (2-3 hours)
- **Priority:** Medium
- **Discovered:** Feb 18, 2026 during testing

---

## 🔐 Security & Access Control

*(No suggestions yet)*

---

## 📊 Analytics & Reporting

*(No suggestions yet)*

---

## 🗺️ Map & Geospatial Features

*(No suggestions yet)*

---

## 📸 Image Management

### Gallery Improvements

*(Placeholder for future gallery enhancement ideas)*

### Metadata & EXIF

*(Placeholder for metadata-related improvements)*

---

## 🧠 AI & Machine Learning

### Model Performance

*(Placeholder for AI/ML optimization ideas)*

### Verification Workflow

*(Placeholder for human-in-the-loop improvements)*

---

## 🔄 Data Sync & Offline Mode

### Offline Capabilities

*(Placeholder for offline mode enhancements)*

---

## ⚙️ System Administration

### Monitoring & Alerts

*(Placeholder for admin tools and monitoring features)*

---

## 🐛 Known Issues (Non-Critical)

### Google Maps Deprecation Warning
- **Issue:** `google.maps.Marker is deprecated. Use google.maps.marker.AdvancedMarkerElement`
- **Impact:** Cosmetic only, maps work fine
- **Solution:** Update to AdvancedMarkerElement API
- **Effort:** Medium (requires API key upgrade and code refactor)
- **Priority:** Low (can wait until Maps API forces update)
- **Discovered:** Feb 18, 2026

### MinIO Lifecycle Rules Warning
- **Issue:** "Invalid storage class" error in local MinIO
- **Impact:** None (dev environment doesn't need GLACIER tier)
- **Solution:** Graceful fallback already implemented, production MinIO will support
- **Effort:** N/A (already handled)
- **Priority:** None (expected behavior)
- **Discovered:** Feb 18, 2026

---

## 📝 Documentation Improvements

*(Placeholder for documentation enhancement ideas)*

---

## 🚀 Performance Optimizations

### Database Query Optimization

*(Placeholder for database performance ideas)*

### Image Loading & Caching

*(Placeholder for image optimization ideas)*

---

## 🎯 User Feedback & Requests

*(Placeholder for stakeholder/user feature requests)*

---

## 📦 DevOps & Deployment

### CI/CD Pipeline

*(Placeholder for deployment workflow improvements)*

---

## 🧪 Testing & Quality Assurance

### Automated Testing

*(Placeholder for testing infrastructure ideas)*

---

## 📌 Notes

- This file is meant to capture ideas quickly without formal specification
- All suggestions should include: Issue, Impact, Solution, Effort, Priority
- Review this file monthly or before major releases
- Keep suggestions actionable and specific

---

**Contributors:** Development Team  
**Next Review Date:** March 1, 2026
