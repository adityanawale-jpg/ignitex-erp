import { Router } from 'express';
import {
  getCustomers, getCustomerStats, checkCustomerName, checkCustomerCompany, checkCustomerPan,
  checkCustomerGstin, getCustomerById, createCustomer, updateCustomer, toggleCustomerStatus,
} from '../controllers/customerMaster.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_CUSTOMER';

router.get('/',                 validateToken, requirePermission(MENU, 'view'),   getCustomers);
router.get('/stats',           validateToken, requirePermission(MENU, 'view'),   getCustomerStats);
router.get('/check-name',      validateToken, requirePermission(MENU, 'view'), checkCustomerName);
router.get('/check-company',   validateToken, requirePermission(MENU, 'view'), checkCustomerCompany);
router.get('/check-pan',       validateToken, requirePermission(MENU, 'view'), checkCustomerPan);
router.get('/check-gstin',     validateToken, requirePermission(MENU, 'view'), checkCustomerGstin);
router.get('/:id',             validateToken, requirePermission(MENU, 'view'),   getCustomerById);
router.post('/',       validateToken, requirePermission(MENU, 'create'), createCustomer);
router.put('/:id',    validateToken, requirePermission(MENU, 'update'), updateCustomer);
router.delete('/:id', validateToken, requirePermission(MENU, 'delete'), toggleCustomerStatus);

export default router;
