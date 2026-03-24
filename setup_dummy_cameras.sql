-- Insert dummy camera data for Maharashtra forest beats
INSERT INTO cameras (
  camera_id, 
  camera_name, 
  beat_id,
  division_id,
  range_id,
  latitude, 
  longitude, 
  camera_model, 
  serial_number, 
  install_date, 
  status,
  brand_id,
  created_by,
  notes
)
WITH beat_ranges AS (
  SELECT 
    b.id as beat_id,
    r.id as range_id,
    r.division_id,
    b.name as beat_name,
    ROW_NUMBER() OVER (ORDER BY b.id) as rn
  FROM beats b
  JOIN ranges r ON b.range_id = r.id
  LIMIT 10
),
admin_user AS (
  SELECT id FROM users WHERE email = 'admin@example.com'
)
SELECT 
  'CAM-MH-' || LPAD(br.rn::text, 3, '0'),
  br.beat_name || '-CAM-' || LPAD(br.rn::text, 3, '0'),
  br.beat_id,
  br.division_id,
  br.range_id,
  19.9975 + (br.rn * 0.01)::numeric,
  75.6972 + (br.rn * 0.01)::numeric,
  CASE br.rn % 4
    WHEN 1 THEN 'Bushnell Trophy Cam'
    WHEN 2 THEN 'Reconyx Hyperfire'
    WHEN 3 THEN 'Cuddeback Black Series'
    ELSE 'Browning Strike Force'
  END,
  'SN-' || LPAD(br.rn::text, 5, '0') || '-2024',
  '2024-01-15'::DATE + (br.rn * INTERVAL '1 day'),
  CASE br.rn % 3
    WHEN 0 THEN 'maintenance'
    WHEN 1 THEN 'inactive'
    ELSE 'active'
  END::varchar,
  cb.id,
  au.id,
  'Dummy camera for testing Maharashtra forests'
FROM beat_ranges br
CROSS JOIN admin_user au
LEFT JOIN camera_brands cb ON cb.name = 
  CASE br.rn % 4
    WHEN 1 THEN 'Bushnell'
    WHEN 2 THEN 'Reconyx'
    WHEN 3 THEN 'Cuddeback'
    ELSE 'Browning'
  END
ON CONFLICT (camera_id) DO NOTHING;
