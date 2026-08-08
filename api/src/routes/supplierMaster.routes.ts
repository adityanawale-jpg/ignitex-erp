import { Router } from 'express';
import {
  getSuppliers, getSupplierStats, checkSupplierName, checkSupplierPan, checkSupplierGstin,
  checkSupplierBankAccount, getSupplierById, createSupplier, updateSupplier, toggleSupplierStatus,
} from '../controllers/supplierMaster.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_SUPPLIER';

router.get('/',              validateToken, requirePermission(MENU, 'view'),   getSuppliers);
router.get('/stats',        validateToken, requirePermission(MENU, 'view'),   getSupplierStats);
router.get('/check-name',         validateToken, requirePermission(MENU, 'view'), checkSupplierName);
router.get('/check-pan',          validateToken, requirePermission(MENU, 'view'), checkSupplierPan);
router.get('/check-gstin',        validateToken, requirePermission(MENU, 'view'), checkSupplierGstin);
router.get('/check-bank-account', validateToken, requirePermission(MENU, 'view'), checkSupplierBankAccount);
router.get('/:id',    validateToken, requirePermission(MENU, 'view'),   getSupplierById);
router.post('/',       validateToken, requirePermission(MENU, 'create'), createSupplier);
router.put('/:id',    validateToken, requirePermission(MENU, 'update'), updateSupplier);
router.delete('/:id', validateToken, requirePermission(MENU, 'delete'), toggleSupplierStatus);

export default router;
