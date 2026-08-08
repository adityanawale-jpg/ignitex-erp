-- Min/Max Planning quantity fields (Min/Max/MOQ Qty) are whole numbers only —
-- weight fields keep NUMERIC(12,4) precision, only the Quantity section changes.
ALTER TABLE min_max_planning_master
  ALTER COLUMN min_quantity TYPE INTEGER USING ROUND(min_quantity)::INTEGER,
  ALTER COLUMN max_quantity TYPE INTEGER USING ROUND(max_quantity)::INTEGER,
  ALTER COLUMN moq_quantity TYPE INTEGER USING ROUND(moq_quantity)::INTEGER;

ALTER TABLE min_max_planning_master
  ALTER COLUMN min_quantity SET DEFAULT 0,
  ALTER COLUMN max_quantity SET DEFAULT 0,
  ALTER COLUMN moq_quantity SET DEFAULT 0;
