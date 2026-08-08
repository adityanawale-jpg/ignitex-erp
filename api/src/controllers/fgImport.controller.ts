import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { logger } from '../utils/logger';
import { getQuery } from '../utils/queryConfig';

type Row = Record<string, string>;

// ── Small validation helpers ───────────────────────────────────────
const trim = (v: unknown) => String(v ?? '').trim();

function reqField(row: Row, field: string, label: string, errors: string[]): string {
  const v = trim(row[field]);
  if (!v) errors.push(`${label} is required`);
  return v;
}

function validLookup(
  lookups: Map<string, Set<string>>, type: string, value: string, label: string,
  errors: string[], required: boolean,
): string {
  const v = trim(value);
  if (!v) { if (required) errors.push(`${label} is required`); return v; }
  const set = lookups.get(type);
  if (!set || !set.has(v.toUpperCase())) errors.push(`${label} "${v}" is not a valid ${type} lookup code`);
  return v;
}

function validOccasion(lookups: Map<string, Set<string>>, value: string, errors: string[]): string {
  const v = trim(value);
  if (!v) { errors.push('Occasion is required'); return v; }
  const set = lookups.get('OCASSION');
  const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
  parts.forEach((p) => { if (!set || !set.has(p.toUpperCase())) errors.push(`Occasion "${p}" is not a valid OCASSION lookup code`); });
  return parts.join(',');
}

// ── Reference caches, built once per import run ────────────────────
interface Caches {
  lookups: Map<string, Set<string>>;             // lookup_type -> Set<UPPER lookup_code>
  alloyCodes: Set<string>;                        // UPPER alloy_code
  supplierNames: Set<string>;                     // UPPER vendor_company_name
  metalByCode: Map<string, { id: number; purity: string | null }>;
  stoneByCode: Map<string, { id: number; std_cts: number | null }>;
  componentByCode: Map<string, { id: number }>;
  findingBySku: Map<string, { variantId: number; gross: number; net: number; cts: number; gms: number }>;
  designByCode: Map<string, { designId: number; itemId: number }>;
  variantBySku: Map<string, { id: number; itemId: number }>;
  variantWithBom: Set<number>;
  designNoSeq: Map<string, number>;               // `${product}|${collection}` -> next 3-digit seq (in-memory, this run)
}

async function buildCaches(): Promise<Caches> {
  const [lookupRows, alloyRows, supplierRows, metalRows, stoneRows, componentRows, findingRows, designRows, variantRows, bomRows] =
    await Promise.all([
      prisma.master_lookup.findMany({ where: { is_active: true }, select: { lookup_type: true, lookup_code: true } }),
      prisma.alloy_master.findMany({ where: { is_active: true }, select: { alloy_code: true } }),
      prisma.supplier_master.findMany({ where: { is_active: true }, select: { vendor_company_name: true } }),
      prisma.metal_master.findMany({ where: { is_active: true }, select: { id: true, metal_code: true, purity: true } }),
      prisma.stone_item_master.findMany({ where: { is_active: true }, select: { id: true, stn_code: true, std_cts: true } }),
      prisma.component_master.findMany({ where: { is_active: true }, select: { id: true, component_code: true } }),
      prisma.bom_fin.findMany({
        where: { bom_status: 'ACTIVE', is_active: true, fin_item_variant: { is_active: true } },
        select: {
          gross_weight: true, net_weight: true, stone_cts: true, stone_gms: true,
          fin_item_variant: { select: { id: true, sku_code: true } },
        },
      }),
      prisma.fg_item_master.findMany({
        where: { is_active: true, design_master: { is_active: true } },
        select: { id: true, design_master: { select: { id: true, design_code: true } } },
      }),
      prisma.fg_item_variant.findMany({ where: { is_active: true }, select: { id: true, sku_code: true, item_id: true } }),
      prisma.bom_fg.findMany({ distinct: ['variant_id'], select: { variant_id: true } }),
    ]);

  const lookups = new Map<string, Set<string>>();
  lookupRows.forEach((r) => {
    if (!lookups.has(r.lookup_type)) lookups.set(r.lookup_type, new Set());
    lookups.get(r.lookup_type)!.add(r.lookup_code.toUpperCase());
  });

  return {
    lookups,
    alloyCodes: new Set(alloyRows.map((r) => r.alloy_code.toUpperCase())),
    supplierNames: new Set(supplierRows.map((r) => (r.vendor_company_name ?? '').toUpperCase())),
    metalByCode: new Map(metalRows.map((r) => [(r.metal_code ?? '').toUpperCase(), { id: r.id, purity: r.purity }])),
    stoneByCode: new Map(stoneRows.map((r) => [r.stn_code.toUpperCase(), { id: r.id, std_cts: r.std_cts ? Number(r.std_cts) : null }])),
    componentByCode: new Map(componentRows.map((r) => [(r.component_code ?? '').toUpperCase(), { id: r.id }])),
    findingBySku: new Map(findingRows.map((r) => [r.fin_item_variant.sku_code.toUpperCase(), {
      variantId: r.fin_item_variant.id, gross: Number(r.gross_weight) || 0, net: Number(r.net_weight) || 0,
      cts: Number(r.stone_cts) || 0, gms: Number(r.stone_gms) || 0,
    }])),
    designByCode: new Map(
      designRows
        .filter((r) => r.design_master)
        .map((r) => [r.design_master!.design_code.toUpperCase(), { designId: r.design_master!.id, itemId: r.id }]),
    ),
    variantBySku: new Map(variantRows.map((r) => [r.sku_code.toUpperCase(), { id: r.id, itemId: r.item_id }])),
    variantWithBom: new Set(bomRows.map((r) => r.variant_id)),
    designNoSeq: new Map(),
  };
}

// ── Grouping: FG Master / Variant / BOM rows -> one group per product ──
interface Group {
  designRef: string;                 // key as it appears in the sheets
  fgRow?: Row;                       // present when this is a brand-new design
  variantRows: Row[];                // Sheet-2 rows for this design (empty for BOM-only-on-existing-SKU groups)
  bomByVariantRef: Map<string, Row[]>;
}

function buildGroups(fgRows: Row[], variantRows: Row[], bomRows: Row[]): { groups: Group[]; fileErrors: string[] } {
  const fileErrors: string[] = [];
  const groups = new Map<string, Group>();
  const getGroup = (ref: string): Group => {
    if (!groups.has(ref)) groups.set(ref, { designRef: ref, variantRows: [], bomByVariantRef: new Map() });
    return groups.get(ref)!;
  };

  const seenFgRef = new Set<string>();
  fgRows.forEach((r) => {
    const ref = trim(r.design_ref);
    if (!ref) return; // reported per-row below via processGroup
    if (seenFgRef.has(ref)) { fileErrors.push(`Design Ref "${ref}" appears more than once in FG Master sheet`); return; }
    seenFgRef.add(ref);
    getGroup(ref).fgRow = r;
  });

  const variantRefToDesignRef = new Map<string, string>();
  const seenVariantRef = new Set<string>();
  variantRows.forEach((r) => {
    const designRef = trim(r.design_ref);
    const variantRef = trim(r.variant_ref);
    if (!designRef || !variantRef) return; // reported per-row below
    if (seenVariantRef.has(variantRef)) { fileErrors.push(`Variant Ref "${variantRef}" appears more than once in Variant sheet`); return; }
    seenVariantRef.add(variantRef);
    getGroup(designRef).variantRows.push(r);
    variantRefToDesignRef.set(variantRef, designRef);
  });

  bomRows.forEach((r) => {
    const variantRef = trim(r.variant_ref);
    if (!variantRef) return; // reported per-row below
    const designRef = variantRefToDesignRef.get(variantRef) ?? `__existing_sku__:${variantRef}`;
    const group = getGroup(designRef);
    if (!group.bomByVariantRef.has(variantRef)) group.bomByVariantRef.set(variantRef, []);
    group.bomByVariantRef.get(variantRef)!.push(r);
  });

  return { groups: Array.from(groups.values()), fileErrors };
}

// ── Resolve or create the Design + FG Item for one group ──────────
async function resolveDesign(
  tx: Prisma.TransactionClient, group: Group, caches: Caches, userId: number | null | undefined,
): Promise<{ designId: number; itemId: number; designCode: string; errors: string[] }> {
  const errors: string[] = [];

  // Existing design referenced by code (no Sheet-1 row for this ref, or ref itself is a real design_code)
  const existing = caches.designByCode.get(group.designRef.toUpperCase());
  if (!group.fgRow) {
    if (!existing) errors.push(`Design Ref "${group.designRef}" was not found in the FG Master sheet and no active Design Code matches it`);
    return { designId: existing?.designId ?? 0, itemId: existing?.itemId ?? 0, designCode: group.designRef, errors };
  }

  const row = group.fgRow;
  const collection = reqField(row, 'collection_name', 'Collection Name', errors);
  const product    = reqField(row, 'product_name', 'Product Name', errors);
  validLookup(caches.lookups, 'COLLECTION', collection, 'Collection Name', errors, true);
  validLookup(caches.lookups, 'PRODUCT', product, 'Product Name', errors, true);
  const manufacturingName  = validLookup(caches.lookups, 'MANUFACTURING_NAME', row.manufacturing_name, 'Manufacturing Name', errors, true);
  const jewelleryType      = validLookup(caches.lookups, 'JEWELLERY_TYPE', row.jewellery_type, 'Jewellery Type', errors, true);
  const gender              = validLookup(caches.lookups, 'GENDER', row.gender, 'Gender', errors, true);
  const techType            = validLookup(caches.lookups, 'TECH_TYPE', row.tech_type, 'Tech Type', errors, true);
  const manufacturingLevel  = validLookup(caches.lookups, 'MANUFACTURING_LEVEL', row.manufacturing_level, 'Manufacturing Level', errors, true);
  const occasion            = validOccasion(caches.lookups, row.occasion, errors);
  const groupSales          = validLookup(caches.lookups, 'GROUP_SALES', row.group_sales, 'Group Sales', errors, false);
  const subCategory         = validLookup(caches.lookups, 'SUB-CATEGORY', row.sub_category, 'Sub Category', errors, false);
  const status              = validLookup(caches.lookups, 'STATUS', trim(row.status) || 'DRAFT', 'Status', errors, false) || 'DRAFT';
  const uom1                = validLookup(caches.lookups, 'UOM1', row.uom1, 'UOM1', errors, true);
  const uom2                = validLookup(caches.lookups, 'UOM', row.uom2, 'UOM2', errors, false);

  if (errors.length) return { designId: 0, itemId: 0, designCode: '', errors };

  // design_no: next 3-digit sequence per (product, collection), tracked in-memory for this whole run
  const seqKey = `${product.toUpperCase()}|${collection.toUpperCase()}`;
  let seq = caches.designNoSeq.get(seqKey);
  if (seq === undefined) {
    const rows = await tx.$queryRaw<{ next_no: string }[]>(Prisma.sql`
      SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ '^[0-9]+$' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 3, '0') AS next_no
      FROM design_master WHERE product_name = ${product} AND collection_name = ${collection} AND is_active = TRUE
    `);
    seq = parseInt(rows[0]?.next_no ?? '1', 10);
  }
  caches.designNoSeq.set(seqKey, seq + 1);
  const designNo   = String(seq).padStart(3, '0');
  const designCode = `${collection}-${product}-${designNo}`;

  const dupe = await tx.design_master.findUnique({ where: { design_code: designCode }, select: { id: true } });
  if (dupe) { errors.push(`Generated Design Code "${designCode}" already exists — Design Ref "${group.designRef}" cannot be created`); return { designId: 0, itemId: 0, designCode: '', errors }; }

  const designRec = await tx.design_master.create({
    data: { design_code: designCode, design_no: designNo, collection_name: collection, product_name: product, design_attributes: {} },
    select: { id: true },
  });
  const designId = designRec.id;

  const itemRec = await tx.fg_item_master.create({
    data: {
      design_id: designId, design_code: designCode, design_no: designNo,
      collection_name: collection, product_name: product, manufacturing_name: manufacturingName,
      jewellery_type: jewelleryType, gender, tech_type: techType, manufacturing_level: manufacturingLevel,
      occasion, group_sales: groupSales || null, sub_category: subCategory || null,
      status, uom1, uom2: uom2 || null, created_by: userId ?? null, updated_by: userId ?? null,
    },
    select: { id: true },
  });

  return { designId, itemId: itemRec.id, designCode, errors: [] };
}

// ── Resolve or create one Variant row ──────────────────────────────
async function resolveVariant(
  tx: Prisma.TransactionClient, row: Row, itemId: number, designCode: string, caches: Caches, userId: number | null | undefined,
  skusInRun: Set<string>, localSkus: Set<string>,
): Promise<{ id: number; skuCode: string; errors: string[] }> {
  const errors: string[] = [];
  const karatColor  = validLookup(caches.lookups, 'KARAT_COL', row.karat_color, 'Karat Color', errors, true);
  const skuType     = validLookup(caches.lookups, 'FG_SKU_TYPE', row.sku_type, 'SKU Type', errors, true);
  const weightBand  = validLookup(caches.lookups, 'WEIGHT_BAND', row.weight_band, 'Weight Band', errors, true);
  const size        = validLookup(caches.lookups, 'PRODUCT_SIZE', row.size, 'Size', errors, true);
  const groupSales  = validLookup(caches.lookups, 'GROUP_SALES', row.group_sales, 'Group Sales', errors, false);
  const styleTone   = validLookup(caches.lookups, 'STYLE_TONE', row.style_tone, 'Style Tone', errors, false);
  const designSource = validLookup(caches.lookups, 'DESIGN_SOURCE', row.design_source, 'Design Source', errors, false);
  const shape        = validLookup(caches.lookups, 'SHAPE', row.shape, 'Shape', errors, false);

  const standardAlloy = trim(row.standard_alloy);
  if (standardAlloy && !caches.alloyCodes.has(standardAlloy.toUpperCase())) errors.push(`Standard Alloy "${standardAlloy}" is not a valid alloy code`);

  const vendorName = trim(row.vendor_name);
  if (vendorName && !caches.supplierNames.has(vendorName.toUpperCase())) errors.push(`Vendor Name "${vendorName}" does not match an active supplier`);

  if (errors.length) return { id: 0, skuCode: '', errors };

  const skuCode = [designCode, karatColor, weightBand, size].filter(Boolean).join('-');
  const skuUpper = skuCode.toUpperCase();
  if (skusInRun.has(skuUpper) || localSkus.has(skuUpper) || caches.variantBySku.has(skuUpper)) {
    errors.push(`SKU Code "${skuCode}" already exists`);
    return { id: 0, skuCode: '', errors };
  }
  localSkus.add(skuUpper);

  const variantRec = await tx.fg_item_variant.create({
    data: {
      item_id: itemId, sku_code: skuCode, karat_color: karatColor, sku_type: skuType,
      group_sales: groupSales || null, old_erp_variant: trim(row.old_erp_variant) || null,
      weight_band: weightBand, size, width_size: trim(row.width_size) || null,
      style_tone: styleTone || null, design_source: designSource || null,
      standard_alloy: standardAlloy || null, catalogue_reference: trim(row.catalogue_reference) || null,
      vendor_name: vendorName || null, vendor_variant_code: trim(row.vendor_variant_code) || null,
      vendor_variant_name: trim(row.vendor_variant_name) || null, shape: shape || null,
      product_description: trim(row.product_description) || null,
    },
    select: { id: true },
  });

  return { id: variantRec.id, skuCode, errors: [] };
}

// ── Resolve one BOM line's item against the right master table ────
function resolveBomLineItem(row: Row, caches: Caches, errors: string[]): {
  itemType: string; itemId: number; itemCode: string; itemName: string; uom1Code: string | null;
  purityCode: string | null; grossWeight: number | null; netWeight: number | null;
  stoneCts: number | null; stoneGms: number | null; componentWeight: number | null;
} | null {
  const itemType = trim(row.item_type).toUpperCase();
  const itemCode = trim(row.item_code);
  if (!['METAL', 'STONE', 'FINDING', 'COMPONENT'].includes(itemType)) { errors.push(`Item Type "${row.item_type}" must be one of METAL, STONE, FINDING, COMPONENT`); return null; }
  if (!itemCode) { errors.push('Item Code is required'); return null; }

  const upper = itemCode.toUpperCase();
  if (itemType === 'METAL') {
    const m = caches.metalByCode.get(upper);
    if (!m) { errors.push(`Metal Code "${itemCode}" not found`); return null; }
    return { itemType, itemId: m.id, itemCode, itemName: itemCode, uom1Code: 'GM', purityCode: m.purity, grossWeight: null, netWeight: null, stoneCts: null, stoneGms: null, componentWeight: null };
  }
  if (itemType === 'STONE') {
    const s = caches.stoneByCode.get(upper);
    if (!s) { errors.push(`Stone Code "${itemCode}" not found`); return null; }
    const cts = trim(row.stone_cts) ? Number(row.stone_cts) : (Number(s.std_cts) || 0);
    return { itemType, itemId: s.id, itemCode, itemName: itemCode, uom1Code: 'CT', purityCode: null, grossWeight: null, netWeight: null, stoneCts: cts, stoneGms: cts / 5, componentWeight: null };
  }
  if (itemType === 'COMPONENT') {
    const c = caches.componentByCode.get(upper);
    if (!c) { errors.push(`Component Code "${itemCode}" not found`); return null; }
    const weight = Number(row.component_weight) || 0;
    return { itemType, itemId: c.id, itemCode, itemName: itemCode, uom1Code: 'PCS', purityCode: null, grossWeight: weight, netWeight: null, stoneCts: null, stoneGms: null, componentWeight: weight };
  }
  // FINDING — must have an ACTIVE Finding BOM
  const f = caches.findingBySku.get(upper);
  if (!f) { errors.push(`Finding SKU "${itemCode}" not found or has no ACTIVE Finding BOM`); return null; }
  return { itemType, itemId: f.variantId, itemCode, itemName: itemCode, uom1Code: 'GM', purityCode: null, grossWeight: f.gross, netWeight: f.net, stoneCts: f.cts, stoneGms: f.gms, componentWeight: null };
}

// ── POST /finished-goods/import ────────────────────────────────────
export const importFGMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fgRows, variantRows, bomRows } = req.body as { fgRows: Row[]; variantRows: Row[]; bomRows: Row[] };
    if (!Array.isArray(fgRows) || !Array.isArray(variantRows) || !Array.isArray(bomRows)) {
      sendValidationError(res, 'fgRows, variantRows and bomRows arrays are required');
      return;
    }

    const userId = req.user?.id ?? null;
    const caches = await buildCaches();
    const [detailInsertSql] = await Promise.all([getQuery('fg_bom_detail_insert')]);
    const { groups, fileErrors } = buildGroups(fgRows, variantRows, bomRows);

    const failed: { design_ref: string; error: string }[] = [];
    const created = { designs: 0, items: 0, variants: 0, boms: 0, bomLines: 0 };
    const skusInRun = new Set<string>();

    for (const group of groups) {
      // Local counters/sets — only merged into shared state after the transaction actually
      // commits, so a rolled-back product never pollutes counts or in-memory caches.
      const local = { designs: 0, items: 0, variants: 0, boms: 0, bomLines: 0 };
      const localSkus = new Set<string>();
      const localVariantWithBom: number[] = [];
      try {
        await prisma.$transaction(async (tx) => {
          const design = await resolveDesign(tx, group, caches, userId);
          if (design.errors.length) throw new Error(design.errors.join('; '));
          if (group.fgRow) { local.designs++; local.items++; }

          const variantIdByRef = new Map<string, { id: number; skuCode: string }>();

          for (const vRow of group.variantRows) {
            const vErrs: string[] = [];
            const ref = reqField(vRow, 'variant_ref', 'Variant Ref', vErrs);
            if (vErrs.length) throw new Error(vErrs.join('; '));
            const v = await resolveVariant(tx, vRow, design.itemId, design.designCode, caches, userId, skusInRun, localSkus);
            if (v.errors.length) throw new Error(`Variant "${ref}": ${v.errors.join('; ')}`);
            variantIdByRef.set(ref, { id: v.id, skuCode: v.skuCode });
            local.variants++;
          }

          for (const [variantRef, lineRows] of group.bomByVariantRef.entries()) {
            let variantId: number;
            if (variantIdByRef.has(variantRef)) {
              variantId = variantIdByRef.get(variantRef)!.id;
            } else {
              const existing = caches.variantBySku.get(variantRef.toUpperCase());
              if (!existing) throw new Error(`BOM: Variant Ref "${variantRef}" was not found in the Variant sheet and no active SKU Code matches it`);
              variantId = existing.id;
            }
            if (caches.variantWithBom.has(variantId)) throw new Error(`BOM: Variant "${variantRef}" already has a BOM — use the FG BOM page to add a new version`);

            const header = lineRows[0];
            const bomRec = await tx.bom_fg.create({
              data: {
                variant_id: variantId, bom_version: '1.0', bom_status: 'DRAFT',
                min_weight: header.min_weight || null, max_weight: header.max_weight || null,
                gross_weight: 0, net_weight: 0, stone_cts: 0, stone_gms: 0, component_weight: 0,
                effective_from: header.effective_from || null, effective_to: header.effective_to || null,
                remarks: header.header_remarks || null, created_by: userId ?? 0, updated_by: userId,
              },
              select: { id: true },
            });
            const bomId = bomRec.id;
            local.boms++;

            for (const [i, lRow] of lineRows.entries()) {
              const lineErrs: string[] = [];
              const resolved = resolveBomLineItem(lRow, caches, lineErrs);
              if (!resolved || lineErrs.length) throw new Error(`BOM line ${i + 1} for "${variantRef}": ${lineErrs.join('; ')}`);
              await tx.$queryRawUnsafe(detailInsertSql,
                bomId, resolved.itemType, resolved.itemType, i + 1, resolved.itemId,
                resolved.itemCode, resolved.itemName, Number(lRow.item_quantity) || 1, resolved.uom1Code,
                null, null, resolved.purityCode, null, null,
                resolved.grossWeight, resolved.netWeight, resolved.stoneCts, resolved.stoneGms,
                resolved.componentWeight, trim(lRow.line_remarks) || null, userId,
              );
              local.bomLines++;
            }

            // Recompute the header's weight/carat totals from the detail rows
            // just written, rather than re-summing them in JS float arithmetic
            // (finding Y) — same function used by the manual FG BOM save endpoint.
            await tx.$executeRawUnsafe('SELECT fn_bom_fg_recalc_header($1)', bomId);
            localVariantWithBom.push(variantId);
          }
        });
        // Transaction committed — now safe to fold this product's local state into the shared run state.
        created.designs += local.designs; created.items += local.items;
        created.variants += local.variants; created.boms += local.boms; created.bomLines += local.bomLines;
        localSkus.forEach((s) => skusInRun.add(s));
        localVariantWithBom.forEach((id) => caches.variantWithBom.add(id));
      } catch (err) {
        failed.push({ design_ref: group.designRef, error: (err as Error).message });
      }
    }

    logAudit({
      userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.FG_MASTER_IMPORT,
      description: `Bulk import: ${groups.length - failed.length}/${groups.length} products succeeded (designs=${created.designs}, variants=${created.variants}, boms=${created.boms})`,
      ipAddress: req.ip,
    });

    sendSuccess(res, {
      productsProcessed: groups.length,
      created,
      failed: [...failed, ...fileErrors.map((error) => ({ design_ref: '', error }))],
    }, 'FG Master import completed');
  } catch (error) {
    logger.error('FG Master import error:', error);
    sendValidationError(res, (error as Error).message || 'Failed to import FG Master data');
  }
};
