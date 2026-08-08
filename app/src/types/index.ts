// ============================================================
// ROYAL CHAIN - Global TypeScript Types
// ============================================================

// API Types
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
  total?: number
  page?: number
}

export interface ApiParam {
  type: 'str' | 'int' | 'dbl' | 'dat' | 'tim' | 'bool'
  value: string | number | boolean | null
}

export interface ApiRequest {
  token: string
  method: string
  params?: Record<string, ApiParam | string | number | boolean>
}

// Auth Types
export interface User {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  emp_email: string
  mobile_number?: string
  profile_image?: string
  department_id?: string
  designation?: string
  user_status?: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Menu Types
export interface MenuItem {
  id: number
  parent_id: number | null
  menu_code: string
  menu_name: string
  menu_url?: string
  menu_icon?: string
  menu_order: number
  menu_level: number
  can_view?: boolean
  can_create?: boolean
  can_update?: boolean
  can_delete?: boolean
  children?: MenuItem[]
}

// Tab Types
export interface Tab {
  id: string
  title: string
  path: string
  icon?: string
  closeable: boolean
}

// Notification Types
export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  notification_type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  action_url?: string
  created_at: string
}

// Party Types
export interface Party {
  id?: number
  party_code: string
  party_name: string
  party_type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH'
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
  pan?: string
  credit_limit?: number
  opening_balance?: number
  is_active?: boolean
  created_at?: string
}

// Metal Types
export interface Metal {
  id?: number
  metal_code: string
  metal_name: string
  purity_code?: string
  purity_percentage?: number
  current_rate?: number
  unit?: string
  is_active?: boolean
}

// Category Types
export interface Category {
  id?: number
  category_code: string
  category_name: string
  description?: string
  is_active?: boolean
}

// Product Types
export interface Product {
  id?: number
  product_code: string
  product_name: string
  category_id?: number
  metal_id?: number
  gross_weight?: number
  net_weight?: number
  stone_weight?: number
  making_charges?: number
  mrp?: number
  gender?: string
  description?: string
  is_active?: boolean
  category_name?: string
  metal_name?: string
}

// Sales Order Types
export interface SalesOrder {
  id?: number
  order_no: string
  order_date: string
  party_id: number
  party_name?: string
  total_amount?: number
  discount_amount?: number
  tax_amount?: number
  net_amount?: number
  status?: string
  remarks?: string
  created_at?: string
}

export interface SalesOrderItem {
  id?: number
  order_id: number
  product_id: number
  product_name?: string
  quantity: number
  rate: number
  amount: number
  making_charges?: number
  tax_percentage?: number
  tax_amount?: number
}

// Lookup Types
export interface LookupItem {
  id: number
  lookup_type: string
  lookup_code: string
  lookup_name: string
  lookup_value?: string
  display_order?: number
  parent_code?: string
}

// Dashboard Types
export interface DashboardStats {
  total_parties: number
  total_products: number
  todays_orders: number
  todays_sales: number
}

// User Management Types
export interface UserManagement {
  user_id?: number
  employee_id: string
  first_name: string
  last_name: string
  emp_email?: string
  mobile_number?: string
  department_id?: string
  designation?: string
  manager_id?: number
  user_status?: boolean
  start_date?: string
  expiry_date?: string
  timezone?: string
  language?: string
  created_at?: string
}

// Table Column Type
export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}
