-- Migration 006: Create camera brands table
CREATE TABLE IF NOT EXISTS camera_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE, -- 3-letter code for camera IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Seed some common brands
INSERT INTO camera_brands (name, code, created_by) VALUES
    ('Bushnell', 'BSH', (SELECT id FROM users WHERE email = 'admin@wildvision.gov.in')),
    ('Reconyx', 'RCX', (SELECT id FROM users WHERE email = 'admin@wildvision.gov.in')),
    ('Cuddeback', 'CDB', (SELECT id FROM users WHERE email = 'admin@wildvision.gov.in')),
    ('Browning', 'BRW', (SELECT id FROM users WHERE email = 'admin@wildvision.gov.in'))
ON CONFLICT (code) DO NOTHING;

-- Add brand_id to cameras table
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES camera_brands(id);
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS camera_name VARCHAR(255);
