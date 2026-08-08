import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { BOM_STATUS } from '../constants/bomWorkflow';

// The five item masters a purchasing document can name, and the shape their
// rows are flattened into. Shared by Purchase Requisition and Purchase Order:
// both pick a SKU the same way, and a picker that drifted between the two would
// let a requisition be raised for an item its own PO could not find.
//
// Kept in step with the chk_pr_itemtype / chk_po_line_itemtype CHECK
// constraints. A value added here without a branch below is a picker with
// nowhere to look, which is why this is an enum rather than a master_lookup
// type editable from the Lookup Master screen.
export const ITEM_TYPES = ['FG', 'FINDING', 'METAL', 'STONE', 'COMPONENT'] as const;
export type ItemType = typeof ITEM_TYPES[number];

export const isItemType = (v: string): v is ItemType =>
  (ITEM_TYPES as readonly string[]).includes(v);

// One row of the SKU picker. Every item type returns this same shape so the
// screen fills its form the same way whichever type is picked; the columns a
// type has nothing for come back NULL.
export interface ItemLovRow {
  id:             number;
  code:           string;
  name:           string;
  description:    string | null;
  gross_weight:   Prisma.Decimal | null;
  net_weight:     Prisma.Decimal | null;
  purity:         string | null;
  std_cts:        Prisma.Decimal | null;
  vendor_item_no: string | null;
}

// Searches one item master. `search` is the user's text; '%' or an empty string
// means "show all" — the same convention the BOM and Sales Order LOVs use.
//
// One branch per type rather than a union, because each master carries a
// different notion of "weight": FG/Finding read theirs off the ACTIVE BOM
// header, Metal has none but does carry the purity Pure Wt is derived from, and
// Stone is bought by carat.
export async function searchItemMaster(itemtype: ItemType, search: string): Promise<ItemLovRow[]> {
  const term = (search ?? '').trim();
  const sp   = (term && term !== '%') ? `%${term}%` : '%%';

  if (itemtype === 'FG' || itemtype === 'FINDING') {
    const variant = itemtype === 'FG' ? 'fg_item_variant' : 'fin_item_variant';
    const master  = itemtype === 'FG' ? 'fg_item_master'  : 'fin_item_master';
    const bom     = itemtype === 'FG' ? 'bom_fg'          : 'bom_fin';

    // Table names come from the validated itemtype above, never from the
    // request, so Prisma.raw here interpolates a constant of ours.
    return prisma.$queryRaw<ItemLovRow[]>(Prisma.sql`
      SELECT iv.id,
             iv.sku_code AS code,
             CONCAT_WS(' — ', iv.sku_code,
               COALESCE(im.product_name, im.collection_name, im.manufacturing_name)) AS name,
             COALESCE(NULLIF(iv.product_description, ''), im.product_name,
                      im.collection_name, im.manufacturing_name) AS description,
             bf.gross_weight,
             bf.net_weight,
             NULL::VARCHAR AS purity,
             NULL::NUMERIC AS std_cts,
             NULLIF(TRIM(COALESCE(iv.vendor_variant_code, '')), '') AS vendor_item_no
      FROM   ${Prisma.raw(variant)} iv
      JOIN   ${Prisma.raw(master)}  im ON im.id = iv.item_id
      LEFT   JOIN LATERAL (
               SELECT b.gross_weight, b.net_weight
               FROM   ${Prisma.raw(bom)} b
               WHERE  b.variant_id = iv.id
                 AND  b.bom_status = ${BOM_STATUS.ACTIVE}
                 AND  b.is_active  = TRUE
               ORDER  BY b.id DESC
               LIMIT  1
             ) bf ON TRUE
      WHERE  iv.is_active = TRUE AND im.is_active = TRUE
        AND (iv.sku_code                          ILIKE ${sp}
          OR COALESCE(im.product_name,       '') ILIKE ${sp}
          OR COALESCE(im.manufacturing_name, '') ILIKE ${sp}
          OR COALESCE(iv.vendor_variant_code, '') ILIKE ${sp})
      ORDER  BY iv.sku_code
      LIMIT  60
    `);
  }

  if (itemtype === 'METAL') {
    // metal_master stores lookup codes; the labels come from master_lookup so
    // the picker reads the way the Metal Master screen does.
    return prisma.$queryRaw<ItemLovRow[]>(Prisma.sql`
      SELECT m.id,
             m.metal_code AS code,
             TRIM(CONCAT_WS(' ',
               COALESCE(mt.lookup_name, m.metal_type),
               COALESCE(kc.lookup_name, m.karat_color),
               COALESCE(pu.lookup_name, m.purity),
               COALESCE(mn.lookup_name, m.metal_name))) AS name,
             TRIM(CONCAT_WS(' ',
               COALESCE(mn.lookup_name, m.metal_name),
               COALESCE(kc.lookup_name, m.karat_color),
               COALESCE(pu.lookup_name, m.purity))) AS description,
             NULL::NUMERIC AS gross_weight,
             NULL::NUMERIC AS net_weight,
             m.purity       AS purity,
             NULL::NUMERIC  AS std_cts,
             NULL::VARCHAR  AS vendor_item_no
      FROM   metal_master m
      LEFT   JOIN master_lookup mt ON mt.lookup_type = 'METAL_TYPE' AND mt.lookup_code = m.metal_type
      LEFT   JOIN master_lookup kc ON kc.lookup_type = 'KARAT_COL'  AND kc.lookup_code = m.karat_color
      LEFT   JOIN master_lookup pu ON pu.lookup_type = 'PURITY'     AND pu.lookup_code = m.purity
      LEFT   JOIN master_lookup mn ON mn.lookup_type = 'METAL_NAME' AND mn.lookup_code = m.metal_name
      WHERE  m.is_active = TRUE AND m.metal_code ILIKE ${sp}
      ORDER  BY m.metal_code
      LIMIT  60
    `);
  }

  if (itemtype === 'STONE') {
    return prisma.$queryRaw<ItemLovRow[]>(Prisma.sql`
      SELECT s.id,
             s.stn_code AS code,
             TRIM(CONCAT_WS(' ', s.stn_type, s.stn_shape,
               COALESCE(s.stn_quality, ''), COALESCE(s.stn_size, ''))) AS name,
             TRIM(CONCAT_WS(' ', s.stn_type, s.stn_shape,
               COALESCE(s.stn_quality, ''), COALESCE(s.stn_color, ''),
               COALESCE(s.stn_size, ''))) AS description,
             NULL::NUMERIC AS gross_weight,
             NULL::NUMERIC AS net_weight,
             NULL::VARCHAR AS purity,
             s.std_cts,
             NULL::VARCHAR AS vendor_item_no
      FROM   stone_item_master s
      WHERE  s.is_active = TRUE AND s.stn_code ILIKE ${sp}
      ORDER  BY s.stn_code
      LIMIT  60
    `);
  }

  return prisma.$queryRaw<ItemLovRow[]>(Prisma.sql`
    SELECT c.id,
           c.component_code AS code,
           TRIM(CONCAT_WS(' ', c.component_name, c.component_desc)) AS name,
           COALESCE(NULLIF(c.component_desc, ''), c.component_name) AS description,
           NULL::NUMERIC AS gross_weight,
           NULL::NUMERIC AS net_weight,
           NULL::VARCHAR AS purity,
           NULL::NUMERIC AS std_cts,
           NULL::VARCHAR AS vendor_item_no
    FROM   component_master c
    WHERE  c.is_active = TRUE
      AND (c.component_code                ILIKE ${sp}
        OR COALESCE(c.component_name, '') ILIKE ${sp})
    ORDER  BY c.component_code
    LIMIT  60
  `);
}
