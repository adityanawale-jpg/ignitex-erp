// Single write path onto stock_ledger / stock_balance. Every module that moves
// stock — Metal Receipt today, BOM issue / Sales dispatch / PO receipt
// eventually — posts through postStockMovement() (or reverseStockMovement() to
// back one out) rather than writing either table directly, so "sum the ledger"
// and "trust the balance cache" never have two different code paths to drift
// apart.
import { Prisma } from '../generated/prisma/client';

export type StockTxnType =
  | 'RECEIPT' | 'ISSUE' | 'REVERSAL' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface StockMovementInput {
  txnType:            StockTxnType;
  sourceModule:        string;
  sourceId:            number;
  // Set only on a REVERSAL row: the ledger.id of the posting it backs out.
  reversesLedgerId?:   bigint | number | null;
  invOrgCode?:         string | null;
  subInvCode:          string;
  itemType:            string;
  itemId?:             number | null;
  skuCode:             string;
  uid?:                string | null;
  purity?:             string | null;
  // Signed: positive in, negative out.
  quantity:            Prisma.Decimal | number | string;
  pureQuantity?:       Prisma.Decimal | number | string | null;
  remarks?:            string | null;
  createdBy?:          number | null;
}

// uid pools blank/untagged lots into one balance row (stock_balance.uid is
// NOT NULL default '' for exactly this reason — see the migration).
const balanceUid = (uid: string | null | undefined): string => (uid ?? '').trim();

export async function postStockMovement(
  tx: Prisma.TransactionClient,
  input: StockMovementInput,
) {
  const ledger = await tx.stock_ledger.create({
    data: {
      txn_type:           input.txnType,
      source_module:      input.sourceModule,
      source_id:          input.sourceId,
      reverses_ledger_id: input.reversesLedgerId ?? null,
      inv_org_code:       input.invOrgCode ?? null,
      sub_inv_code:       input.subInvCode,
      item_type:          input.itemType,
      item_id:            input.itemId ?? null,
      sku_code:           input.skuCode,
      uid:                input.uid ?? null,
      purity:             input.purity ?? null,
      quantity:           input.quantity,
      pure_quantity:      input.pureQuantity ?? null,
      remarks:            input.remarks ?? null,
      created_by:         input.createdBy ?? null,
    },
  });

  const uid = balanceUid(input.uid);

  await tx.stock_balance.upsert({
    where: {
      sub_inv_sku_uid: { sub_inv_code: input.subInvCode, sku_code: input.skuCode, uid },
    },
    create: {
      inv_org_code:  input.invOrgCode ?? null,
      sub_inv_code:  input.subInvCode,
      item_type:     input.itemType,
      item_id:       input.itemId ?? null,
      sku_code:      input.skuCode,
      uid,
      purity:        input.purity ?? null,
      quantity:      input.quantity,
      pure_quantity: input.pureQuantity ?? 0,
      last_ledger_id: ledger.id,
    },
    update: {
      quantity:       { increment: input.quantity },
      ...(input.pureQuantity != null ? { pure_quantity: { increment: input.pureQuantity } } : {}),
      last_ledger_id: ledger.id,
      updated_at:     new Date(),
    },
  });

  return ledger;
}

// Backs out the most recent not-yet-reversed RECEIPT (or other inbound txnType)
// a source record posted, by re-running postStockMovement with every quantity
// negated. Returns null if that source never posted anything — the caller
// decides whether that's an error or a no-op (e.g. a receipt cancelled before
// approval never posted, so there is nothing to reverse).
export async function reverseStockMovement(
  tx: Prisma.TransactionClient,
  params: {
    sourceModule: string;
    sourceId:     number;
    txnType?:     StockTxnType;
    createdBy?:   number | null;
    remarks?:     string | null;
  },
) {
  const original = await tx.stock_ledger.findFirst({
    where: {
      source_module:      params.sourceModule,
      source_id:          params.sourceId,
      txn_type:           params.txnType ?? 'RECEIPT',
      reverses_ledger_id: null,
    },
    orderBy: { id: 'desc' },
  });
  if (!original) return null;

  return postStockMovement(tx, {
    txnType:            'REVERSAL',
    sourceModule:        params.sourceModule,
    sourceId:            params.sourceId,
    reversesLedgerId:    original.id,
    invOrgCode:          original.inv_org_code,
    subInvCode:          original.sub_inv_code,
    itemType:            original.item_type,
    itemId:              original.item_id,
    skuCode:             original.sku_code,
    uid:                 original.uid,
    purity:              original.purity,
    quantity:            original.quantity.negated(),
    pureQuantity:        original.pure_quantity != null ? original.pure_quantity.negated() : null,
    remarks:             params.remarks ?? `Reversal of ledger #${original.id}`,
    createdBy:           params.createdBy ?? null,
  });
}
