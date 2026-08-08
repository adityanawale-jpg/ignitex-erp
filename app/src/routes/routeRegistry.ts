import React from 'react';

// Maps every routable path to its lazy component.
// AdminLayout renders all open tabs from this registry (keep-alive pattern)
// so components stay mounted across tab switches — no remount = no re-fetch.
const ROUTE_REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType<object>>> = {
  '/dashboard':                  React.lazy(() => import('@/pages/dashboard/HomePage')),

  '/masters/lookup':             React.lazy(() => import('@/pages/masters/LookupMasterPage')),
  '/master-mgmt/lookup':         React.lazy(() => import('@/pages/masters/LookupMasterPage')),
  '/master-mgmt/finished-goods': React.lazy(() => import('@/pages/masters/FinishedGoodsItemPage')),
  '/master-mgmt/finding-master': React.lazy(() => import('@/pages/masters/FindingMasterPage')),
  '/master-mgmt/stone-items':    React.lazy(() => import('@/pages/masters/StoneItemPage')),
  '/master-mgmt/components':     React.lazy(() => import('@/pages/masters/ComponentMasterPage')),
  '/master-mgmt/metal-master':   React.lazy(() => import('@/pages/masters/MetalMasterPage')),
  '/master-mgmt/fg-bom':         React.lazy(() => import('@/pages/masters/FGBOMPage')),
  '/master-mgmt/sfg-bom':        React.lazy(() => import('@/pages/masters/FindingBOMPage')),
  '/master-mgmt/min-max-planning': React.lazy(() => import('@/pages/masters/MinMaxPlanningPage')),
  '/master-mgmt/supplier-rate':   React.lazy(() => import('@/pages/masters/SupplierRateContractPage')),
  '/master-mgmt/inventory-structure': React.lazy(() => import('@/pages/masters/InventoryStructurePage')),
  '/master-mgmt/customer-price': React.lazy(() => import('@/pages/masters/CustomerPriceMasterPage')),
  '/master-mgmt/daily-rate':     React.lazy(() => import('@/pages/masters/DailyRateMasterPage')),
  '/master-mgmt/departments':    React.lazy(() => import('@/pages/masters/DeptMasterPage')),
  '/master-mgmt/machines':       React.lazy(() => import('@/pages/masters/MachineMasterPage')),
  '/master-mgmt/operations':     React.lazy(() => import('@/pages/masters/OperationMasterPage')),
  '/master-mgmt/alloys':         React.lazy(() => import('@/pages/masters/AlloyMasterPage')),
  '/master-mgmt/supplier':       React.lazy(() => import('@/pages/masters/SupplierMasterPage')),
  '/master-mgmt/customer':       React.lazy(() => import('@/pages/masters/CustomerMasterPage')),

  '/order-mgmt/sales-order':     React.lazy(() => import('@/pages/orders/SalesOrderPage')),

  '/purchase-mgmt/requisitions': React.lazy(() => import('@/pages/purchase/PurchaseRequisitionPage')),
  '/purchase-mgmt/orders':       React.lazy(() => import('@/pages/purchase/PurchaseOrderPage')),

  '/inventory-mgmt/metal-receipt': React.lazy(() => import('@/pages/inventory/MetalReceiptPage')),
  '/inventory-mgmt/on-hand':       React.lazy(() => import('@/pages/inventory/OnHandStockPage')),

  '/settings/users':             React.lazy(() => import('@/pages/settings/UserManagementPage')),
  '/settings/roles':             React.lazy(() => import('@/pages/settings/RoleMasterPage')),
  '/settings/menus':             React.lazy(() => import('@/pages/settings/MenuMasterPage')),
  '/settings/permissions':       React.lazy(() => import('@/pages/settings/PermissionMasterPage')),
  '/settings/user-permissions':  React.lazy(() => import('@/pages/settings/UserMenuPermissionPage')),
  '/settings/user-roles':        React.lazy(() => import('@/pages/settings/UserRoleAssignmentPage')),
  '/settings/mail-config':       React.lazy(() => import('@/pages/settings/MailConfigurationPage')),
  '/settings/login-logs':        React.lazy(() => import('@/pages/settings/LoginLogsPage')),
  '/settings/error-logs':        React.lazy(() => import('@/pages/settings/ErrorLogsPage')),
  '/settings/audit-logs':        React.lazy(() => import('@/pages/settings/AuditLogsPage')),
  '/settings/erp-config':        React.lazy(() => import('@/pages/settings/ERPConfigurationPage')),
  '/settings/workflow-config':   React.lazy(() => import('@/pages/settings/WorkflowConfigPage')),

  '/profile':                    React.lazy(() => import('@/pages/settings/UserProfilePage')),
};

export default ROUTE_REGISTRY;
