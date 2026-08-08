import { Router } from 'express';
import {
  getSupplierRateContracts, getSupplierRateContractStats, createSupplierRateContract,
  updateSupplierRateContract, toggleSupplierRateContractStatus, importSupplierRateContract,
} from '../controllers/supplierRateContract.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_SUPP_RATE';

router.get('/',         validateToken, requirePermission(MENU, 'view'),   getSupplierRateContracts);
router.get('/stats',   validateToken, requirePermission(MENU, 'view'),   getSupplierRateContractStats);
router.post('/',        validateToken, requirePermission(MENU, 'create'), createSupplierRateContract);
router.post('/import', validateToken, requirePermission(MENU, 'create'), importSupplierRateContract);
router.put('/:id',     validateToken, requirePermission(MENU, 'update'), updateSupplierRateContract);
router.delete('/:id',  validateToken, requirePermission(MENU, 'delete'), toggleSupplierRateContractStatus);

export default router;
