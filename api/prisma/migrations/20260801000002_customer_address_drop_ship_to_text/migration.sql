-- Customer Master → Address Information: Ship To now uses the same structured
-- address lines as Bill To, so the free-text block and the live "Same as Bill To"
-- mirror both go away. A Bill To row is copied into a new Ship To row from the
-- address list instead (a snapshot, independently editable afterwards).
--
-- The three UPDATEs below recover the existing free-text data into adrs_1..3 so
-- nothing is lost when the columns are dropped. Blank target fields only —
-- anything already captured structurally wins.

-- 1. Mirrored rows: city / state / pincode were already copied from Bill To when
--    the box was ticked, so only the street lines come out of the text block.
UPDATE customer_address_info c
SET adrs_1 = COALESCE(NULLIF(BTRIM(c.adrs_1), ''), LEFT(NULLIF(BTRIM(p.parts[1]), ''), 255)),
    adrs_2 = COALESCE(NULLIF(BTRIM(c.adrs_2), ''), LEFT(NULLIF(BTRIM(p.parts[2]), ''), 255)),
    adrs_3 = COALESCE(NULLIF(BTRIM(c.adrs_3), ''), LEFT(NULLIF(BTRIM(p.parts[3]), ''), 255))
FROM (
  SELECT id, string_to_array(REPLACE(ship_to_address, CHR(13), ''), CHR(10)) AS parts
  FROM customer_address_info
  WHERE same_as_bill_to = TRUE
    AND COALESCE(BTRIM(ship_to_address), '') <> ''
) p
WHERE c.id = p.id;

-- 2. Hand-typed rows: the block has no known layout, so keep the first two lines
--    as-is and fold whatever follows into line 3.
UPDATE customer_address_info c
SET adrs_1 = COALESCE(NULLIF(BTRIM(c.adrs_1), ''), LEFT(NULLIF(BTRIM(p.parts[1]), ''), 255)),
    adrs_2 = COALESCE(NULLIF(BTRIM(c.adrs_2), ''), LEFT(NULLIF(BTRIM(p.parts[2]), ''), 255)),
    adrs_3 = COALESCE(
      NULLIF(BTRIM(c.adrs_3), ''),
      LEFT(NULLIF(BTRIM(array_to_string(p.parts[3:array_length(p.parts, 1)], ', ')), ''), 255)
    )
FROM (
  SELECT id, string_to_array(REPLACE(ship_to_address, CHR(13), ''), CHR(10)) AS parts
  FROM customer_address_info
  WHERE same_as_bill_to = FALSE
    AND COALESCE(BTRIM(ship_to_address), '') <> ''
) p
WHERE c.id = p.id;

-- 3. Mirrored rows saved before the flatten ever ran have an empty text block —
--    take their street lines straight off the customer's first Bill To row.
UPDATE customer_address_info c
SET adrs_1 = b.adrs_1, adrs_2 = b.adrs_2, adrs_3 = b.adrs_3
FROM (
  SELECT DISTINCT ON (customer_id) customer_id, adrs_1, adrs_2, adrs_3
  FROM customer_address_info
  WHERE adrs_type = 'BILL_TO'
  ORDER BY customer_id, id
) b
WHERE c.customer_id = b.customer_id
  AND c.same_as_bill_to = TRUE
  AND COALESCE(BTRIM(c.adrs_1), '') = '';

ALTER TABLE customer_address_info
  DROP COLUMN IF EXISTS ship_to_address,
  DROP COLUMN IF EXISTS same_as_bill_to;
