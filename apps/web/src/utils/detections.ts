export type ConfirmationStatus = 'pending_confirmation' | 'confirmed' | 'rejected';
export type DetectionReviewStatus =
    | 'auto_approved'
    | 'manual_confirmed'
    | 'pending_confirmation'
    | 'rejected';

type DetectionLike = {
    confirmation_status?: string;
    detection_status?: string;
    auto_approved?: boolean;
    approval_method?: string | null;
};

export function normalizeConfidence(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    const percent = parsed <= 1 ? parsed * 100 : parsed;
    return Math.max(0, Math.min(100, Math.round(percent)));
}

export function isAutoApprovedDetection(detection: DetectionLike): boolean {
    return detection.auto_approved === true || detection.approval_method === 'auto_approved';
}

export function getDetectionReviewStatus(detection: DetectionLike): DetectionReviewStatus {
    if (isAutoApprovedDetection(detection)) return 'auto_approved';

    if (
        detection.confirmation_status === 'confirmed' ||
        detection.detection_status === 'manual_approved'
    ) {
        return 'manual_confirmed';
    }

    if (
        detection.confirmation_status === 'rejected' ||
        detection.detection_status === 'rejected'
    ) {
        return 'rejected';
    }

    return 'pending_confirmation';
}

export function getDetectionReviewLabel(detection: DetectionLike): string {
    const status = getDetectionReviewStatus(detection);
    if (status === 'auto_approved') return 'Auto Approved';
    if (status === 'manual_confirmed') return 'Verified';
    if (status === 'rejected') return 'Rejected';
    return 'Pending Review';
}
