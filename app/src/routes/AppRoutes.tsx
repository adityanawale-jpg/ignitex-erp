import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks'
import AdminLayout from '@/layouts/AdminLayout'

// ── Eager-loaded (always needed) ──────────────────────────────
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ActivatePage from '@/pages/auth/ActivatePage'

// ── Lazy-loaded pages ─────────────────────────────────────────
const HomePage              = lazy(() => import('@/pages/dashboard/HomePage'))
const UnderConstructionPage = lazy(() => import('@/pages/common/UnderConstruction'))
const UserManagementPage    = lazy(() => import('@/pages/settings/UserManagementPage'))
const MailConfigurationPage = lazy(() => import('@/pages/settings/MailConfigurationPage'))
const RoleMasterPage        = lazy(() => import('@/pages/settings/RoleMasterPage'))
const MenuMasterPage        = lazy(() => import('@/pages/settings/MenuMasterPage'))
const PermissionMasterPage      = lazy(() => import('@/pages/settings/PermissionMasterPage'))
const UserMenuPermissionPage    = lazy(() => import('@/pages/settings/UserMenuPermissionPage'))
const UserRoleAssignmentPage    = lazy(() => import('@/pages/settings/UserRoleAssignmentPage'))
const UserProfilePage       = lazy(() => import('@/pages/settings/UserProfilePage'))
const ERPConfigurationPage  = lazy(() => import('@/pages/settings/ERPConfigurationPage'))
const LookupMasterPage         = lazy(() => import('@/pages/masters/LookupMasterPage'))
const FinishedGoodsItemPage    = lazy(() => import('@/pages/masters/FinishedGoodsItemPage'))
const StoneItemPage            = lazy(() => import('@/pages/masters/StoneItemPage'))
const ComponentMasterPage      = lazy(() => import('@/pages/masters/ComponentMasterPage'))
const MetalMasterPage          = lazy(() => import('@/pages/masters/MetalMasterPage'))
const SupplierMasterPage       = lazy(() => import('@/pages/masters/SupplierMasterPage'))
const CustomerMasterPage       = lazy(() => import('@/pages/masters/CustomerMasterPage'))
const LoginLogsPage  = lazy(() => import('@/pages/settings/LoginLogsPage'))
const ErrorLogsPage  = lazy(() => import('@/pages/settings/ErrorLogsPage'))
const AuditLogsPage  = lazy(() => import('@/pages/settings/AuditLogsPage'))
const FindingMasterPage    = lazy(() => import('@/pages/masters/FindingMasterPage'))
const AlloyMasterPage      = lazy(() => import('@/pages/masters/AlloyMasterPage'))
const WorkflowConfigPage   = lazy(() => import('@/pages/settings/WorkflowConfigPage'))
const FGBOMPage            = lazy(() => import('@/pages/masters/FGBOMPage'))
const FindingBOMPage       = lazy(() => import('@/pages/masters/FindingBOMPage'))
const MinMaxPlanningPage   = lazy(() => import('@/pages/masters/MinMaxPlanningPage'))
const SupplierRateContractPage = lazy(() => import('@/pages/masters/SupplierRateContractPage'))
const InventoryStructurePage   = lazy(() => import('@/pages/masters/InventoryStructurePage'))
const CustomerPriceMasterPage  = lazy(() => import('@/pages/masters/CustomerPriceMasterPage'))
const DailyRateMasterPage      = lazy(() => import('@/pages/masters/DailyRateMasterPage'))
const SalesOrderPage           = lazy(() => import('@/pages/orders/SalesOrderPage'))
const PurchaseRequisitionPage  = lazy(() => import('@/pages/purchase/PurchaseRequisitionPage'))
const PurchaseOrderPage        = lazy(() => import('@/pages/purchase/PurchaseOrderPage'))
const MetalReceiptPage         = lazy(() => import('@/pages/inventory/MetalReceiptPage'))
const OnHandStockPage          = lazy(() => import('@/pages/inventory/OnHandStockPage'))

// ── Loading Spinner ───────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
  </div>
)

// ── Route Guards ─────────────────────────────────────────────
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector((s) => s.auth)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector((s) => s.auth)
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

// ── App Routes ────────────────────────────────────────────────
const AppRoutes: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/activate" element={<ActivatePage />} />

    {/* Protected */}
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={null} />
      <Route path="profile" element={<Suspense fallback={<PageLoader />}><UserProfilePage /></Suspense>} />

      {/* Dashboard */}
      <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />

      {/* Settings */}
      <Route path="settings/users"       element={<Suspense fallback={<PageLoader />}><UserManagementPage /></Suspense>} />
      <Route path="settings/roles"       element={<Suspense fallback={<PageLoader />}><RoleMasterPage /></Suspense>} />
      <Route path="settings/menus"       element={<Suspense fallback={<PageLoader />}><MenuMasterPage /></Suspense>} />
      <Route path="settings/permissions"  element={<Suspense fallback={<PageLoader />}><PermissionMasterPage /></Suspense>} />
      <Route path="settings/user-permissions" element={<Suspense fallback={<PageLoader />}><UserMenuPermissionPage /></Suspense>} />
      <Route path="settings/user-roles"   element={<Suspense fallback={<PageLoader />}><UserRoleAssignmentPage /></Suspense>} />
      <Route path="settings/mail-config"  element={<Suspense fallback={<PageLoader />}><MailConfigurationPage /></Suspense>} />
      <Route path="settings/login-logs"   element={<Suspense fallback={<PageLoader />}><LoginLogsPage /></Suspense>} />
      <Route path="settings/error-logs"   element={<Suspense fallback={<PageLoader />}><ErrorLogsPage /></Suspense>} />
      <Route path="settings/audit-logs"   element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
      <Route path="settings/erp-config"  element={<Suspense fallback={<PageLoader />}><ERPConfigurationPage /></Suspense>} />

      {/* Masters */}
      <Route path="masters/lookup"             element={<Suspense fallback={<PageLoader />}><LookupMasterPage /></Suspense>} />
      <Route path="master-mgmt/lookup"         element={<Suspense fallback={<PageLoader />}><LookupMasterPage /></Suspense>} />
      <Route path="master-mgmt/finished-goods"  element={<Suspense fallback={<PageLoader />}><FinishedGoodsItemPage /></Suspense>} />
      <Route path="master-mgmt/stone-items"    element={<Suspense fallback={<PageLoader />}><StoneItemPage /></Suspense>} />
      <Route path="master-mgmt/components"     element={<Suspense fallback={<PageLoader />}><ComponentMasterPage /></Suspense>} />
      <Route path="master-mgmt/metal-master"  element={<Suspense fallback={<PageLoader />}><MetalMasterPage /></Suspense>} />
      <Route path="master-mgmt/supplier"      element={<Suspense fallback={<PageLoader />}><SupplierMasterPage /></Suspense>} />
      <Route path="master-mgmt/customer"     element={<Suspense fallback={<PageLoader />}><CustomerMasterPage /></Suspense>} />
      <Route path="master-mgmt/finding"      element={<Suspense fallback={<PageLoader />}><FindingMasterPage /></Suspense>} />
      <Route path="master-mgmt/workflow"     element={<Suspense fallback={<PageLoader />}><WorkflowConfigPage /></Suspense>} />
      <Route path="master-mgmt/alloy"        element={<Suspense fallback={<PageLoader />}><AlloyMasterPage /></Suspense>} />
      <Route path="master-mgmt/fg-bom"       element={<Suspense fallback={<PageLoader />}><FGBOMPage /></Suspense>} />
      <Route path="master-mgmt/sfg-bom"      element={<Suspense fallback={<PageLoader />}><FindingBOMPage /></Suspense>} />
      <Route path="master-mgmt/min-max-planning" element={<Suspense fallback={<PageLoader />}><MinMaxPlanningPage /></Suspense>} />
      <Route path="master-mgmt/supplier-rate" element={<Suspense fallback={<PageLoader />}><SupplierRateContractPage /></Suspense>} />
      <Route path="master-mgmt/inventory-structure" element={<Suspense fallback={<PageLoader />}><InventoryStructurePage /></Suspense>} />
      <Route path="master-mgmt/customer-price" element={<Suspense fallback={<PageLoader />}><CustomerPriceMasterPage /></Suspense>} />
      <Route path="master-mgmt/daily-rate"     element={<Suspense fallback={<PageLoader />}><DailyRateMasterPage /></Suspense>} />

      {/* Order Management */}
      <Route path="order-mgmt/sales-order" element={<Suspense fallback={<PageLoader />}><SalesOrderPage /></Suspense>} />

      {/* Purchase Management */}
      <Route path="purchase-mgmt/requisitions" element={<Suspense fallback={<PageLoader />}><PurchaseRequisitionPage /></Suspense>} />
      <Route path="purchase-mgmt/orders"       element={<Suspense fallback={<PageLoader />}><PurchaseOrderPage /></Suspense>} />

      {/* Inventory Management */}
      <Route path="inventory-mgmt/metal-receipt" element={<Suspense fallback={<PageLoader />}><MetalReceiptPage /></Suspense>} />
      <Route path="inventory-mgmt/on-hand"       element={<Suspense fallback={<PageLoader />}><OnHandStockPage /></Suspense>} />

      {/* Catch-all inside admin: show Under Construction instead of redirecting */}
      <Route path="*" element={<Suspense fallback={<PageLoader />}><UnderConstructionPage /></Suspense>} />
    </Route>

    {/* Public fallback */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
)

export default AppRoutes
