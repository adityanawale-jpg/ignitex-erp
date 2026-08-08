-- ============================================================
-- 56_design_multi_images.sql
-- Multiple images per design with default flag and naming convention
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS design_images (
  id          SERIAL PRIMARY KEY,
  design_id   INT          NOT NULL REFERENCES design_master(id) ON DELETE CASCADE,
  image_name  VARCHAR(200),
  image_url   VARCHAR(500) NOT NULL,
  is_default  BOOLEAN      DEFAULT FALSE,
  sort_order  INT          DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_design_images_design ON design_images(design_id);

-- Migrate any existing design_master.design_image rows into design_images
INSERT INTO design_images (design_id, image_name, image_url, is_default, sort_order)
SELECT id,
       design_code || '_1',
       design_image,
       TRUE,
       1
FROM design_master
WHERE design_image IS NOT NULL AND design_image <> ''
ON CONFLICT DO NOTHING;

COMMIT;
