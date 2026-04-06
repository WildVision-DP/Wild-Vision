ALTER TABLE camera_brands ADD COLUMN IF NOT EXISTS description TEXT;
-- Create camera brands table
CREATE TABLE IF NOT EXISTS camera_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Seed with common brands using actual admin user
INSERT INTO camera_brands (name, code, description, created_by) VALUES
    ('Bushnell', 'BSH', 'Bushnell trail cameras', (SELECT id FROM users WHERE email = 'admin@example.com')),
    ('Reconyx', 'RCX', 'Reconyx professional cameras', (SELECT id FROM users WHERE email = 'admin@example.com')),
    ('Cuddeback', 'CDB', 'Cuddeback digital cameras', (SELECT id FROM users WHERE email = 'admin@example.com')),
    ('Browning', 'BRW', 'Browning strike force cameras', (SELECT id FROM users WHERE email = 'admin@example.com'))
ON CONFLICT (code) DO NOTHING;

-- Add brand_id to cameras if not exists
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES camera_brands(id);
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS camera_name VARCHAR(255);
