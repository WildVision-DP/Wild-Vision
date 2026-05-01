# BLIP Limitations and YOLO Upgrade Path

Wild Vision currently uses a BLIP-backed ML service for image-level animal identification. The service is useful for caption-driven species hints and the manual review workflow, but it is not a true object detector.

## Current BLIP Contract

- The API stores one image-level animal label in `images.detected_animal`.
- Confidence is stored as an integer percentage in `images.detection_confidence`.
- Review state uses `images.confirmation_status` with `pending_confirmation`, `confirmed`, and `rejected`.
- High-confidence predictions are auto-approved with `auto_approved = true` and `approval_method = 'auto_approved'`.
- Low-confidence or fallback predictions stay in `pending_confirmation` for manual review.

## Known Limitations

- BLIP does not return bounding boxes, so the UI cannot show where an animal appears in the image.
- BLIP does not reliably count multiple animals or separate multiple species in one image.
- Confidence is a workflow confidence signal, not a calibrated detector probability.
- Small, blurry, night-vision, partially occluded, or background animals may be missed or mislabeled.
- The current label mapping is caption-driven and should be treated as a review aid, not final taxonomy.
- Human, vehicle, and non-wildlife object detection is outside the current BLIP workflow.

## When To Add YOLO/Object Detection

Add a detector model when the product needs:

- Bounding boxes around animals.
- Multiple detections per image.
- Animal count estimates.
- Species-specific detector classes.
- Human or vehicle alerts.
- Better performance on infrared/night camera-trap imagery.
- Detector metrics such as precision, recall, false positive rate, and per-class confidence.

## Recommended Upgrade Path

1. Keep the existing `confirmation_status` workflow unchanged so review/admin UI remains stable.
2. Extend the ML service response with a `detections` array:

```json
{
  "model": "yolo",
  "model_version": "yolo-wildvision-v1",
  "detections": [
    {
      "label": "tiger",
      "scientific_name": "Panthera tigris",
      "confidence_percent": 94,
      "bbox": { "x": 120, "y": 80, "width": 360, "height": 240 }
    }
  ]
}
```

3. Add a child table such as `image_detections` for per-object rows while preserving the current top-level `images.detected_animal` summary.
4. Store `model`, `model_version`, confidence unit, and raw model metadata in JSONB for auditability.
5. Update the review UI to approve/reject individual detections or the whole image.
6. Add evaluation reports before enabling YOLO auto-approval in production.

## Compatibility Rule

Future YOLO work should keep API confidence values as integer percentages from 0 to 100 and keep `confirmation_status` as the canonical review status field.
