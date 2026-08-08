-- ============================================================
-- 114_item_media_gallery.sql
-- Real image+video gallery for the FG/Finding item "Media" tab
-- ("Product Image Gallery" was previously a dead placeholder).
-- Mirrors design_images (56_design_multi_images.sql) but scoped
-- to the item itself (not the shared design) and generalized to
-- also hold videos.
-- Run after 113_variant_document_uploads.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS fg_item_media (
  id          SERIAL PRIMARY KEY,
  item_id     INT          NOT NULL REFERENCES fg_item_master(id) ON DELETE CASCADE,
  media_type  VARCHAR(10)  NOT NULL CHECK (media_type IN ('image', 'video')),
  media_name  VARCHAR(200),
  media_url   VARCHAR(500) NOT NULL,
  is_default  BOOLEAN      DEFAULT FALSE,
  sort_order  INT          DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fg_item_media_item ON fg_item_media(item_id);

CREATE TABLE IF NOT EXISTS fin_item_media (
  id          SERIAL PRIMARY KEY,
  item_id     INT          NOT NULL REFERENCES fin_item_master(id) ON DELETE CASCADE,
  media_type  VARCHAR(10)  NOT NULL CHECK (media_type IN ('image', 'video')),
  media_name  VARCHAR(200),
  media_url   VARCHAR(500) NOT NULL,
  is_default  BOOLEAN      DEFAULT FALSE,
  sort_order  INT          DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fin_item_media_item ON fin_item_media(item_id);
