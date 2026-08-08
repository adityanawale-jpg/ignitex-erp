import React, { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Search, Shield, UserCheck, UserX, Users, Star,
  ChevronRight, Save, RefreshCw, X, AlertCircle,
} from 'lucide-react'
import { apiService } from '@/api/apiService'
import Badge from '@/components/common/Badge'
import { getInitials } from '@/utils/helpers'
import { usePermission, useAppDispatch, useAppSelector } from '@/hooks'
import { fetchProfileAsync } from '@/redux/slices/authSlice'

// ── Types ────────────────────────────────────────────────────────
interface UserRole {
  role_id: number
  role_name: string
  role_code: string
  is_default: boolean
}

interface UserEntry {
  user_id: number
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  emp_email: string
  mobile_number: string
  department_id: string
  designation: string
  manager_id: number | null
  start_date: string
  expiry_date: string | null
  user_status: boolean
  roles: UserRole[]
}

interface RoleOption {
  id: number
  role_code: string
  role_name: string
  description: string
  is_active: boolean
}

// ── Role card colours (cycles through presets) ───────────────────
const ROLE_COLORS = [
  { bg: 'bg-violet-50',  border: 'border-violet-200',  icon: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700' },
  { bg: 'bg-sky-50',     border: 'border-sky-200',     icon: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
  { bg: 'bg-teal-50',    border: 'border-teal-200',    icon: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
]

// ── Page ─────────────────────────────────────────────────────────
const UserRoleAssignmentPage: React.FC = () => {
  const [users,           setUsers]           = useState<UserEntry[]>([])
  const [roles,           setRoles]           = useState<RoleOption[]>([])
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [selectedUser,    setSelectedUser]    = useState<UserEntry | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [defaultRoleId,   setDefaultRoleId]   = useState<number | null>(null)
  const [dirty,           setDirty]           = useState(false)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<'all' | 'assigned' | 'unassigned'>('all')
  const { canUpdate } = usePermission()
  const dispatch = useAppDispatch()
  const currentUserId = useAppSelector((state) => state.auth.user?.id)

  // ── Load ─────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiService.get('/users', {
          params: { page: 1, limit: 500, status: 'active', sort_by: 'first_name', sort_dir: 'asc' },
        }),
        apiService.get('/users/roles'),
      ])
      const fetchedUsers: UserEntry[] = usersRes.data?.data ?? []
      const fetchedRoles: RoleOption[] = (rolesRes.data?.data ?? []).filter((r: RoleOption) => r.is_active)
      setUsers(fetchedUsers)
      setRoles(fetchedRoles)

      // Refresh selected user's roles after save
      if (selectedUser) {
        const refreshed = fetchedUsers.find(u => u.user_id === selectedUser.user_id)
        if (refreshed) applySelection(refreshed)
      }
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [selectedUser]) // eslint-disable-line

  useEffect(() => { loadData() }, []) // eslint-disable-line

  // ── Selection ─────────────────────────────────────────────────
  const applySelection = (user: UserEntry) => {
    setSelectedUser(user)
    const ids = user.roles?.map(r => r.role_id) ?? []
    setSelectedRoleIds(ids)
    const def = user.roles?.find(r => r.is_default)
    setDefaultRoleId(def?.role_id ?? ids[0] ?? null)
    setDirty(false)
  }

  const selectUser = (user: UserEntry) => {
    if (dirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch user?')) return
    }
    applySelection(user)
  }

  // ── Toggle role ───────────────────────────────────────────────
  const toggleRole = (roleId: number) => {
    if (!canUpdate) return
    setSelectedRoleIds(prev => {
      const next = prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      if (!next.includes(defaultRoleId ?? -1)) setDefaultRoleId(next[0] ?? null)
      return next
    })
    setDirty(true)
  }

  const setDefault = (e: React.MouseEvent, roleId: number) => {
    e.stopPropagation()
    if (!canUpdate || !selectedRoleIds.includes(roleId)) return
    setDefaultRoleId(roleId)
    setDirty(true)
  }

  const clearAll = () => {
    if (!canUpdate) return
    setSelectedRoleIds([])
    setDefaultRoleId(null)
    setDirty(true)
  }

  // ── Save ──────────────────────────────────────────────────────
  const saveAssignment = async () => {
    if (!selectedUser) return
    if (selectedRoleIds.length === 0) { toast.error('Assign at least one role'); return }
    setSaving(true)
    try {
      await apiService.put(`/users/${selectedUser.user_id}/roles`, {
        role_ids:        selectedRoleIds,
        default_role_id: defaultRoleId ?? selectedRoleIds[0],
      })

      toast.success('Role assignment saved successfully')
      setDirty(false)
      await loadData(true)
      // Refresh navbar if the logged-in user's own roles were changed
      if (selectedUser.user_id === currentUserId) {
        dispatch(fetchProfileAsync())
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  // ── Stats ─────────────────────────────────────────────────────
  const assignedCount   = useMemo(() => users.filter(u => u.roles?.length > 0).length, [users])
  const unassignedCount = useMemo(() => users.filter(u => !u.roles?.length).length, [users])

  // ── Filtered users list ───────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = users
    if (statusFilter === 'assigned')   list = list.filter(u => u.roles?.length > 0)
    if (statusFilter === 'unassigned') list = list.filter(u => !u.roles?.length)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.employee_id?.toLowerCase().includes(q) ||
        u.emp_email?.toLowerCase().includes(q) ||
        u.department_id?.toLowerCase().includes(q)
      )
    }
    return list
  }, [users, search, statusFilter])

  // ── Check if selection changed from saved ─────────────────────
  const originalRoleIds  = selectedUser?.roles?.map(r => r.role_id).sort().join(',') ?? ''
  const currentRoleIds   = [...selectedRoleIds].sort().join(',')
  const originalDefault  = selectedUser?.roles?.find(r => r.is_default)?.role_id
  const hasChanges       = dirty || originalRoleIds !== currentRoleIds || originalDefault !== defaultRoleId

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>User-Role Assignment</span>
      </div>

      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">

        <div className="flex items-center gap-2 pl-3">
          {/* Total Users */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'all'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{users.length}</p>
              <p className="text-xs mt-0.5 text-blue-600 font-medium">Total Users</p>
            </div>
          </button>

          {/* Assigned */}
          <button
            onClick={() => setStatusFilter('assigned')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'assigned'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{assignedCount}</p>
              <p className="text-xs mt-0.5 text-green-600 font-medium">Role Assigned</p>
            </div>
          </button>

          {/* Unassigned */}
          <button
            onClick={() => setStatusFilter('unassigned')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'unassigned'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <UserX className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{unassignedCount}</p>
              <p className="text-xs mt-0.5 text-amber-600 font-medium">No Role</p>
            </div>
          </button>
        </div>

        <button onClick={() => loadData()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Split panel */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 230px)' }}>

        {/* ── LEFT: User list ───────────────────────────── */}
        <div className="card flex flex-col overflow-hidden flex-shrink-0" style={{ width: '340px' }}>

          {/* Search */}
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID, email…"
                className="form-input pl-9 pr-8 py-1.5 text-sm w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 px-0.5">
              {filteredUsers.length} of {users.length} users
              {statusFilter !== 'all' && <span className="ml-1 text-[var(--accent-gold)]">· filtered</span>}
            </p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
                  <div className="w-9 h-9 rounded-full animate-pulse bg-[var(--bg-tertiary)] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-[var(--bg-tertiary)] rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] px-4 text-center">
                <Users className="w-10 h-10 mb-3 opacity-25" />
                <p className="text-sm font-medium">No users found</p>
                <p className="text-xs mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUser?.user_id === user.user_id
                const hasRoles   = user.roles?.length > 0
                return (
                  <div
                    key={user.user_id}
                    onClick={() => selectUser(user)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-color)] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--accent-gold)]/8 border-l-[3px] border-l-[var(--accent-gold)]'
                        : 'hover:bg-[var(--bg-secondary)] border-l-[3px] border-l-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      hasRoles
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {getInitials(user.full_name || `${user.first_name} ${user.last_name ?? ''}`)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${isSelected ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                        {user.full_name || `${user.first_name} ${user.last_name ?? ''}`.trim()}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{user.employee_id}</p>

                      {/* Role badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {hasRoles ? (
                          <>
                            {user.roles.slice(0, 2).map(r => (
                              <span key={r.role_id} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                r.is_default
                                  ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30'
                                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                              }`}>
                                {r.is_default && '★ '}{r.role_name}
                              </span>
                            ))}
                            {user.roles.length > 2 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                                +{user.roles.length - 2} more
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                            No role assigned
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && <ChevronRight className="w-4 h-4 text-[var(--accent-gold)] flex-shrink-0 mt-1" />}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Role assignment ────────────────────── */}
        <div className="card flex flex-col flex-1 overflow-hidden min-w-0">
          {!selectedUser ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-5">
                <Shield className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-lg font-semibold text-[var(--text-secondary)]">Select a User</p>
              <p className="text-sm mt-2 max-w-sm">
                Choose a user from the list on the left to view and manage their role assignments.
              </p>
              {unassignedCount > 0 && (
                <div className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{unassignedCount} user{unassignedCount !== 1 ? 's have' : ' has'} no role assigned</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* User info header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center font-bold text-lg text-[var(--color-primary)] flex-shrink-0">
                    {getInitials(selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name ?? ''}`)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">
                      {selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name ?? ''}`.trim()}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{selectedUser.employee_id} · {selectedUser.emp_email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedUser.department_id && <Badge label={selectedUser.department_id} variant="secondary" />}
                      {selectedUser.designation    && <Badge label={selectedUser.designation}   variant="info" />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                      Unsaved changes
                    </span>
                  )}
                  {canUpdate && (
                    <button
                      onClick={saveAssignment}
                      disabled={saving || selectedRoleIds.length === 0}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save Assignment'}
                    </button>
                  )}
                </div>
              </div>

              {/* Role cards */}
              <div className="flex-1 overflow-y-auto p-6">

                {/* Section header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      Available Roles
                      <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                        ({roles.length} total)
                      </span>
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {selectedRoleIds.length > 0
                        ? `${selectedRoleIds.length} role${selectedRoleIds.length !== 1 ? 's' : ''} selected · Default: ${roles.find(r => r.id === defaultRoleId)?.role_name ?? '—'}`
                        : 'Click a role card to assign it to this user'
                      }
                    </p>
                  </div>
                  {selectedRoleIds.length > 0 && canUpdate && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Clear all
                    </button>
                  )}
                </div>

                {/* Role grid */}
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {roles.map((role, idx) => {
                    const color     = ROLE_COLORS[idx % ROLE_COLORS.length]
                    const isChecked = selectedRoleIds.includes(role.id)
                    const isDefault = defaultRoleId === role.id

                    return (
                      <div
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        className={`relative rounded-2xl border-2 p-5 transition-all select-none ${
                          canUpdate ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          isChecked
                            ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5 shadow-sm'
                            : `border-[var(--border-color)] ${color.bg} hover:border-[var(--accent-gold)]/40 hover:shadow-sm`
                        }`}
                      >
                        {/* Star — set default */}
                        {isChecked && canUpdate && (
                          <button
                            type="button"
                            onClick={e => setDefault(e, role.id)}
                            title={isDefault ? 'Default role' : 'Set as default role'}
                            className={`absolute top-3 right-3 transition-colors p-0.5 rounded ${
                              isDefault
                                ? 'text-[var(--accent-gold)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--accent-gold)]'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${isDefault ? 'fill-current' : ''}`} />
                          </button>
                        )}

                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mb-4 transition-all ${
                          isChecked
                            ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]'
                            : 'border-[var(--border-color)] bg-white'
                        }`}>
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>

                        {/* Icon + name */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isChecked ? 'bg-[var(--accent-gold)]/10' : color.bg + ' ' + color.border + ' border'
                          }`}>
                            <Shield className={`w-4 h-4 ${isChecked ? 'text-[var(--accent-gold)]' : color.icon}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[var(--text-primary)] leading-tight truncate">
                              {role.role_name}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--text-muted)]">{role.role_code}</p>
                          </div>
                        </div>

                        {role.description && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {role.description}
                          </p>
                        )}

                        {/* Default badge */}
                        {isDefault && (
                          <div className="mt-3 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 font-semibold">
                            <Star className="w-2.5 h-2.5 fill-current" /> Default Role
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Helper note */}
                {selectedRoleIds.length > 0 && (
                  <div className="mt-5 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3">
                    <Star className="w-4 h-4 text-[var(--accent-gold)] fill-current mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      <strong className="text-[var(--text-primary)]">Default Role</strong> determines the permissions applied at login.
                      Click the <Star className="w-3 h-3 inline text-[var(--text-muted)]" /> star icon on any assigned role to promote it as the default.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserRoleAssignmentPage
