import { openDB, DBSchema } from 'idb';

interface UploadFile {
    id: string; // uuid
    file: File;
    cameraId: string;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number;
    error?: string;
    timestamp: number;
    retryCount?: number; // Added for retry mechanism (3.1.1.11)
}

interface WildVisionDB extends DBSchema {
    uploads: {
        key: string;
        value: UploadFile;
        indexes: { 'by-status': string };
    };
}

const DB_NAME = 'wildvision-db';
const DB_VERSION = 2; // Incremented version to support schema changes

export async function initDB() {
    return openDB<WildVisionDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Create or update the store
            if (!db.objectStoreNames.contains('uploads')) {
                const store = db.createObjectStore('uploads', { keyPath: 'id' });
                store.createIndex('by-status', 'status');
            }
        },
    });
}

export async function addUploadToQueue(upload: UploadFile) {
    const db = await initDB();
    await db.put('uploads', upload);
}

export async function updateUploadStatus(id: string, updates: Partial<UploadFile>) {
    const db = await initDB();
    const tx = db.transaction('uploads', 'readwrite');
    const store = tx.objectStore('uploads');
    const item = await store.get(id);
    if (item) {
        await store.put({ ...item, ...updates });
    }
    await tx.done;
}

export async function getPendingUploads() {
    const db = await initDB();
    return db.getAllFromIndex('uploads', 'by-status', 'pending');
}

export async function getAllUploads() {
    const db = await initDB();
    return db.getAll('uploads');
}

export async function removeUpload(id: string) {
    const db = await initDB();
    await db.delete('uploads', id);
}
