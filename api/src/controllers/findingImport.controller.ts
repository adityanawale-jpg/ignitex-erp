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

// A Finding BOM is built from raw inputs only — unlike an FG BOM it cannot
// nest another Finding (FIN_ITEM_TYPE LOV: STONE / METAL / COMPONENT).
const BOM_ITEM_TYPES = ['METAL', 'STONE', 'COMPONENT'];

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

const num = (v: unknown): number | null => {
  const s = trim(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// ── Reference caches, built once per import run ────────────────────
interface Caches {
  lookups: Map<string, Set<string>>;             // lookup_type -> Set<UPPER lookup_code>
  alloyCodes: Set<string>;                        // UPPER alloy_code
  supplierNames: Set<string>;                     // UPPER vendor_company_name
  metalByCode: Map<string, { id: number; purity: string | null }>;
  stoneByCode: Map<string, { id: number; std_cts: number | null }>;
  componentByCode: Map<string, { id: number }>;
  designByCode: Map<string, { designId: number; itemId: number }>;
  variantBySku: Map<string, { id: number; itemId: number }>;
  variantWithBom: Set<number>;
  designNoSeq: Map<string, number>;               // `${product}|${collection}` -> next 3-digit seq (in-memory, this run)
}

async function buildCaches(): Promise<Caches> {
  const [lookupRows, alloyRows, supplierRows, metalRows, stoneRows, componentRows, designRows, variantRows, bomRows] =
    await Promise.all([
      prisma.master_lookup.findMany({ where: { is_active: true }, select: { lookup_type: true, lookup_code: true } }),
      prisma.alloy_master.findMany({ where: { is_active: true }, select: { alloy_code: true } }),
      prisma.supplier_master.findMany({ where: { is_active: true }, select: { vendor_company_name: true } }),
      prisma.metal_master.findMany({ where: { is_active: true }, select: { id: true, metal_code: true, purity: true } }),
      prisma.stone_item_master.findMany({ where: { is_active: true }, select: { id: true, stn_code: true, std_cts: true } }),
      prisma.component_master.findMany({ where: { is_active: true }, select: { id: true, component_code: true } }),
      prisma.fin_item_master.findMany({
        where: { is_active: true, design_master: { is_active: true } },
        select: { id: true, design_master: { select: { id: true, design_code: true } } },
      }),
      prisma.fin_item_variant.findMany({ where: { is_active: true }, select: { id: true, sku_code: true, item_id: true } }),
      prisma.bom_fin.findMany({ distinct: ['variant_id'], select: { variant_id: true } }),
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

// ── Grouping: Finding Master / Variant / BOM rows -> one group per design ──
interface Group {
  designRef: string;                 // key as it appears in the sheets
  finRow?: Row;                      // present when this is a brand-new design
  variantRows: Row[];                // Sheet-2 rows for this design (empty for BOM-only-on-existing-SKU groups)
  bomByVariantRef: Map<string, Row[]>;
}

function buildGroups(finRows: Row[], variantRows: Row[], bomRows: Row[]): { groups: Group[]; fileErrors: string[] } {
  const fileErrors: string[] = [];
  const groups = new Map<string, Group>();
  const getGroup = (ref: string): Group => {
    if (!groups.has(ref)) groups.set(ref, { designRef: ref, variantRows: [], bomByVariantRef: new Map() });
    return groups.get(ref)!;
  };

  const seenFinRef = new Set<string>();
  finRows.forEach((r) => {
    const ref = trim(r.design_ref);
    if (!ref) return; // reported per-row below via processGroup
    if (seenFinRef.has(ref)) { fileErrors.push(`Design Ref "${ref}" appears more than once in Finding Master sheet`); return; }
    seenFinRef.add(ref);
    getGroup(ref).finRow = r;
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

// ── Resolve or create the Design + Finding Item for one group ──────
async function resolveDesign(
  tx: Prisma.TransactionClient, group: Group, caches: Caches, userId: number | null | undefined,
): Promise<{ designId: number; itemId: number; designCode: string; errors: string[] }> {
  const errors: string[] = [];

  // Existing design referenced by code (no Sheet-1 row for this ref, or ref itself is a real design_code)
  const existing = caches.designByCode.get(group.designRef.toUpperCase());
  if (!group.finRow) {
    if (!existing) errors.push(`Design Ref "${group.designRef}" was not found in the Finding Master sheet and no active Design Code matches it`);
    return { designId: existing?.designId ?? 0, itemId: existing?.itemId ?? 0, designCode: group.designRef, errors };
  }

  const row = group.finRow;
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
  const skuType             = validLookup(caches.lookups, 'FIN_SKU_TYPE', row.sku_type, 'SKU Type', errors, false);
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

  // design_type FINDING keeps the design out of the FG Master's design search,
  // matching what the Finding Master's "New Design" drawer writes.
  const designRec = await tx.design_master.create({
    data: { design_code: designCode, design_no: designNo, collection_name: collection, product_name: product, design_attributes: {}, design_type: 'FINDING' },
    select: { id: true },
  });
  const designId = designRec.id;

  const itemRec = await tx.fin_item_master.create({
    data: {
      design_id: designId, design_code: designCode, design_no: designNo,
      collection_name: collection, product_name: product, manufacturing_name: manufacturingName,
      jewellery_type: jewelleryType, sku_type: skuType || null, gender, tech_type: techType,
      manufacturing_level: manufacturingLevel, occasion, group_sales: groupSales || null,
      sub_category: subCategory || null, status, uom1, uom2: uom2 || null,
      created_by: userId ?? null, updated_by: userId ?? null,
    },
    select: { id: true },
  });

  return { designId, itemId: itemRec.id, designCode, errors: [] };
}

// ── Resolve or create one Variant row ──────────────────────────────
async function resolveVariant(
  tx: Prisma.TransactionClient, row: Row, itemId: number, designCode: string, caches: Caches,
  skusInRun: Set<string>, localSkus: Set<string>,
): Promise<{ id: number; skuCode: string; errors: string[] }> {
  const errors: string[] = [];
  // Findings carry their own weight-band / size / width LOVs — FG's WEIGHT_BAND
  // and PRODUCT_SIZE do not apply here (see the Finding variant modal).
  const karatColor  = validLookup(caches.lookups, 'KARAT_COL', row.karat_color, 'Karat Color', errors, true);
  const skuType     = validLookup(caches.lookups, 'FIN_SKU_TYPE', row.sku_type, 'SKU Type', errors, true);
  const weightBand  = validLookup(caches.lookups, 'FINDING_WB', row.weight_band, 'Weight Band', errors, true);
  const size        = validLookup(caches.lookups, 'FINDING_SIZE', row.size, 'Size', errors, true);
  const widthSize   = validLookup(caches.lookups, 'WIDTH_SIZE', row.width_size, 'Width Size', errors, false);
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

  const variantRec = await tx.fin_item_variant.create({
    data: {
      item_id: itemId, sku_code: skuCode, karat_color: karatColor, sku_type: skuType,
      group_sales: groupSales || null, old_erp_variant: trim(row.old_erp_variant) || null,
      weight_band: weightBand, size, width_size: widthSize || null,
      style_tone: styleTone || null, design_source: designSource || null,
      standard_alloy: standardAlloy || null, catalogue_reference: trim(row.catalogue_reference) || null,
      vendor_name: vendorName || null, vendor_variant_code: trim(row.vendor_variant_code) || null,
      vendor_variant_name: trim(row.vendor_variant_name) || null, shape: shape || null,
      product_description: trim(row.product_description) || null,
      gross_weight: num(row.gross_weight), net_weight: num(row.net_weight),
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
  if (!BOM_ITEM_TYPES.includes(itemType)) { errors.push(`Item Type "${row.item_type}" must be one of ${BOM_ITEM_TYPES.join(', ')}`); return null; }
  if (!itemCode) { errors.push('Item Code is required'); return null; }

  // Per-type mandatory weights mirror what the Finding BOM page enforces on a
  // manually entered line, so an imported BOM is editable there without repair.
  const upper = itemCode.toUpperCase();
  if (itemType === 'METAL') {
    const m = caches.metalByCode.get(upper);
    if (!m) { errors.push(`Metal Code "${itemCode}" not found`); return null; }
    const net = num(row.net_weight);
    if (!net) { errors.push(`Net Weight is required for Metal line "${itemCode}"`); return null; }
    return { itemType, itemId: m.id, itemCode, itemName: itemCode, uom1Code: 'GM', purityCode: m.purity, grossWeight: null, netWeight: net, stoneCts: null, stoneGms: null, componentWeight: null };
  }
  if (itemType === 'STONE') {
    const s = caches.stoneByCode.get(upper);
    if (!s) { errors.push(`Stone Code "${itemCode}" not found`); return null; }
    const cts = trim(row.stone_cts) ? num(row.stone_cts) : (Number(s.std_cts) || 0);
    if (!cts) { errors.push(`Stone Cts is required for Stone line "${itemCode}" — the stone master has no standard cts to fall back on`); return null; }
    return { itemType, itemId: s.id, itemCode, itemName: itemCode, uom1Code: 'CT', purityCode: null, grossWeight: null, netWeight: null, stoneCts: cts, stoneGms: cts / 5, componentWeight: null };
  }
  // COMPONENT
  const c = caches.componentByCode.get(upper);
  if (!c) { errors.push(`Component Code "${itemCode}" not found`); return null; }
  const weight = num(row.component_weight);
  if (!weight) { errors.push(`Component Weight is required for Component line "${itemCode}"`); return null; }
  return { itemType, itemId: c.id, itemCode, itemName: itemCode, uom1Code: 'PCS', purityCode: null, grossWeight: weight, netWeight: null, stoneCts: null, stoneGms: null, componentWeight: weight };
}

// ── POST /findings/import ──────────────────────────────────────────
export const importFindingMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { finRows, variantRows, bomRows } = req.body as { finRows: Row[]; variantRows: Row[]; bomRows: Row[] };
    if (!Array.isArray(finRows) || !Array.isArray(variantRows) || !Array.isArray(bomRows)) {
      sendValidationError(res, 'finRows, variantRows and bomRows arrays are required');
      return;
    }

    const userId = req.user?.id ?? null;
    const caches = await buildCaches();
    const detailInsertSql = await getQuery('fin_bom_detail_insert');
    const { groups, fileErrors } = buildGroups(finRows, variantRows, bomRows);

    const failed: { design_ref: string; error: string }[] = [];
    const created = { designs: 0, items: 0, variants: 0, boms: 0, bomLines: 0 };
    const skusInRun = new Set<string>();

    for (const group of groups) {
      // Local counters/sets — only merged into shared state after the transaction actually
      // commits, so a rolled-back design never pollutes counts or in-memory caches.
      const local = { designs: 0, items: 0, variants: 0, boms: 0, bomLines: 0 };
      const localSkus = new Set<string>();
      const localVariantWithBom: number[] = [];
      try {
        await prisma.$transaction(async (tx) => {
          const design = await resolveDesign(tx, group, caches, userId);
          if (design.errors.length) throw new Error(design.errors.join('; '));
          if (group.finRow) { local.designs++; local.items++; }

          const variantIdByRef = new Map<string, { id: number; skuCode: string }>();

          for (const vRow of group.variantRows) {
            const vErrs: string[] = [];
            const ref = reqField(vRow, 'variant_ref', 'Variant Ref', vErrs);
            if (vErrs.length) throw new Error(vErrs.join('; '));
            const v = await resolveVariant(tx, vRow, design.itemId, design.designCode, caches, skusInRun, localSkus);
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
            if (caches.variantWithBom.has(variantId)) throw new Error(`BOM: Variant "${variantRef}" already has a BOM — use the Finding BOM page to add a new version`);

            const header = lineRows[0];
            const bomRec = await tx.bom_fin.create({
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

            // Recompute the header's weight/carat totals from the detail rows just
            // written, rather than re-summing them in JS float arithmetic — same
            // function the manual Finding BOM save endpoint uses.
            await tx.$executeRawUnsafe('SELECT fn_bom_fin_recalc_header($1)', bomId);
            localVariantWithBom.push(variantId);
          }
        });
        // Transaction committed — now safe to fold this design's local state into the shared run state.
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
      action: 'CREATE', module: AUDIT_MODULE.FINDING_MASTER_IMPORT,
      description: `Bulk import: ${groups.length - failed.length}/${groups.length} findings succeeded (designs=${created.designs}, variants=${created.variants}, boms=${created.boms})`,
      ipAddress: req.ip,
    });

    sendSuccess(res, {
      productsProcessed: groups.length,
      created,
      failed: [...failed, ...fileErrors.map((error) => ({ design_ref: '', error }))],
    }, 'Finding Master import completed');
  } catch (error) {
    logger.error('Finding Master import error:', error);
    sendValidationError(res, (error as Error).message || 'Failed to import Finding Master data');
  }
};
