import React, { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Search, Shield, Save, RefreshCw, ChevronRight, ChevronDown,
  AlertCircle, Check, X as XIcon, Minus, Users, X,
} from 'lucide-react'
import { apiService } from '@/api/apiService'
import PageHeader from '@/components/common/PageHeader'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import { getInitials } from '@/utils/helpers'
import { usePermission } from '@/hooks'

interface UserEntry {
  user_id: number
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  emp_email: string
  roles: { role_id: number; role_name: string; role_code: string; is_default: boolean }[]
}

interface MenuPerm {
  menu_id: number
  menu_code: string
  menu_name: string
  parent_id: number | null
  menu_level: number
  menu_order: number
  parent_name: string | null
  role_can_view: boolean
  role_can_create: boolean
  role_can_update: boolean
  role_can_delete: boolean
  role_can_print: boolean
  role_can_export: boolean
  user_can_view: boolean | null
  user_can_create: boolean | null
  user_can_update: boolean | null
  user_can_delete: boolean | null
  user_can_print: boolean | null
  user_can_export: boolean | null
}

type PermKey = 'can_view' | 'can_create' | 'can_update' | 'can_delete' | 'can_print' | 'can_export'
type Override = boolean | null // null = inherit

const PERM_COLS: { key: PermKey; label: string }[] = [
  { key: 'can_view',   label: 'View' },
  { key: 'can_create', label: 'Add' },
  { key: 'can_update', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
  { key: 'can_print',  label: 'Print' },
  { key: 'can_export', label: 'Download' },
]

// Cycle inherit -> allow -> deny -> inherit
const nextState = (current: Override): Override => {
  if (current === null) return true
  if (current === true) return false
  return null
}

const UserMenuPermissionPage: React.FC = () => {
  const [users, setUsers] = useState<UserEntry[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserEntry | null>(null)

  const [menus, setMenus] = useState<MenuPerm[]>([])
  const [overrides, setOverrides] = useState<Record<number, Record<PermKey, Override>>>({})
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set())
  const [loadingMenus, setLoadingMenus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { canUpdate } = usePermission('SA_USER_PERM')

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await apiService.get('/users', {
        params: { page: 1, limit: 500, status: 'active', sort_by: 'first_name', sort_dir: 'asc' },
      })
      setUsers(res.data?.data ?? [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const fetchMenuPermissions = useCallback(async (userId: number) => {
    setLoadingMenus(true)
    try {
      const res = await apiService.get(`/users/${userId}/menu-permissions`)
      if (res.data.success) {
        const data: MenuPerm[] = res.data.data || []
        setMenus(data)
        const map: Record<number, Record<PermKey, Override>> = {}
        const parentIds = new Set<number>()
        data.forEach((m) => {
          map[m.menu_id] = {
            can_view:   m.user_can_view,
            can_create: m.user_can_create,
            can_update: m.user_can_update,
            can_delete: m.user_can_delete,
            can_print:  m.user_can_print,
            can_export: m.user_can_export,
          }
          if (m.menu_level === 1) parentIds.add(m.menu_id)
        })
        setOverrides(map)
        setCollapsedParents(parentIds)
        setIsDirty(false)
      }
    } catch {
      toast.error('Failed to load menu permissions')
    } finally {
      setLoadingMenus(false)
    }
  }, [])

  const selectUser = (user: UserEntry) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch user?')) return
    }
    setSelectedUser(user)
    fetchMenuPermissions(user.user_id)
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const filteredUsers = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter((u) =>
      u.full_name?.toLowerCase().includes(q) ||
      u.employee_id?.toLowerCase().includes(q) ||
      u.emp_email?.toLowerCase().includes(q)
    )
  }, [users, search])

  const sortedMenus = useMemo<MenuPerm[]>(() => {
    const parents = menus.filter((m) => m.parent_id === null).sort((a, b) => a.menu_order - b.menu_order)
    const result: MenuPerm[] = []
    parents.forEach((parent) => {
      result.push(parent)
      menus
        .filter((m) => m.parent_id === parent.menu_id)
        .sort((a, b) => a.menu_order - b.menu_order)
        .forEach((child) => result.push(child))
    })
    return result
  }, [menus])

  const visibleMenus = useMemo(() => {
    return sortedMenus.filter((m) => {
      if (m.menu_level === 1) return true
      return !collapsedParents.has(m.parent_id!)
    })
  }, [sortedMenus, collapsedParents])

  const toggleCollapse = (menuId: number) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev)
      if (next.has(menuId)) next.delete(menuId)
      else next.add(menuId)
      return next
    })
  }

  const cycleCell = (menuId: number, key: PermKey) => {
    if (!canUpdate) return
    setOverrides((prev) => ({
      ...prev,
      [menuId]: { ...prev[menuId], [key]: nextState(prev[menuId]?.[key] ?? null) },
    }))
    setIsDirty(true)
  }

  const childCount = (menuId: number) => menus.filter((m) => m.parent_id === menuId).length

  const savePermissions = async () => {
    if (!selectedUser || !canUpdate) return
    setSaving(true)
    try {
      const permissions = menus.map((m) => {
        const o = overrides[m.menu_id] ?? {
          can_view: null, can_create: null, can_update: null,
          can_delete: null, can_print: null, can_export: null,
        }
        return { menu_id: m.menu_id, ...o }
      })

      await apiService.put(`/users/${selectedUser.user_id}/menu-permissions/bulk`, { permissions })

      toast.success('Permissions saved successfully')
      setIsDirty(false)
      fetchMenuPermissions(selectedUser.user_id)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.')
      } else {
        toast.error('Failed to save permissions')
      }
    } finally {
      setSaving(false)
    }
  }

  const roleBaselineFor = (m: MenuPerm, key: PermKey): boolean => {
    switch (key) {
      case 'can_view':   return m.role_can_view
      case 'can_create': return m.role_can_create
      case 'can_update': return m.role_can_update
      case 'can_delete': return m.role_can_delete
      case 'can_print':  return m.role_can_print
      case 'can_export': return m.role_can_export
    }
  }

  const renderCell = (m: MenuPerm, key: PermKey) => {
    const state = overrides[m.menu_id]?.[key] ?? null
    const roleValue = roleBaselineFor(m, key)

    if (state === true) {
      return (
        <button
          type="button"
          onClick={() => cycleCell(m.menu_id, key)}
          disabled={!canUpdate}
          title="Allowed for this user (overrides role) — click to change"
          className="w-6 h-6 rounded-full bg-green-100 text-green-600 border border-green-300 flex items-center justify-center mx-auto disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )
    }
    if (state === false) {
      return (
        <button
          type="button"
          onClick={() => cycleCell(m.menu_id, key)}
          disabled={!canUpdate}
          title="Denied for this user (overrides role) — click to change"
          className="w-6 h-6 rounded-full bg-red-100 text-red-600 border border-red-300 flex items-center justify-center mx-auto disabled:cursor-not-allowed"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={() => cycleCell(m.menu_id, key)}
        disabled={!canUpdate}
        title={`Inherited from role: ${roleValue ? 'Allowed' : 'Denied'} — click to override`}
        className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)] flex items-center justify-center mx-auto disabled:cursor-not-allowed"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageBreadcrumb parent="System Admin" current="User-wise Permission Override" />

      <PageHeader
        breadcrumbItems={[]}
        title="User-wise Permission Override"
        subtitle="Fine-tune role-based permissions for an individual user — inherit, allow, or deny each action per form"
      />

      <div className="flex gap-4 flex-1 min-h-0 mt-4" style={{ height: 'calc(100vh - 230px)' }}>
        {/* ── LEFT: User list ───────────────────────────── */}
        <div className="card flex flex-col overflow-hidden flex-shrink-0" style={{ width: '320px' }}>
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, email…"
                className="form-input pl-9 pr-8 py-1.5 text-sm w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 px-0.5">{filteredUsers.length} of {users.length} users</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingUsers ? (
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
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUser?.user_id === user.user_id
                const defaultRole = user.roles?.find((r) => r.is_default) ?? user.roles?.[0]
                return (
                  <div
                    key={user.user_id}
                    onClick={() => selectUser(user)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--accent-gold)]/8 border-l-[3px] border-l-[var(--accent-gold)]'
                        : 'hover:bg-[var(--bg-secondary)] border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {getInitials(user.full_name || `${user.first_name} ${user.last_name ?? ''}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${isSelected ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                        {user.full_name || `${user.first_name} ${user.last_name ?? ''}`.trim()}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                        {user.employee_id}{defaultRole ? ` · ${defaultRole.role_name}` : ''}
                      </p>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-[var(--accent-gold)] flex-shrink-0" />}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Menu permission matrix ─────────────── */}
        <div className="card flex flex-col flex-1 overflow-hidden min-w-0">
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-5">
                <Shield className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-lg font-semibold text-[var(--text-secondary)]">Select a User</p>
              <p className="text-sm mt-2 max-w-sm">
                Choose a user from the list on the left to view and override their form-wise permissions.
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                <div>
                  <h3 className="font-semibold text-base text-[var(--text-primary)]">
                    {selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name ?? ''}`.trim()}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Grey dash = inherit from role · Green check = force allow · Red cross = force deny
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                      Unsaved changes
                    </span>
                  )}
                  <button onClick={() => fetchMenuPermissions(selectedUser.user_id)} className="btn-secondary flex items-center gap-1" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  {canUpdate && (
                    <button
                      onClick={savePermissions}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save Permissions'}
                    </button>
                  )}
                </div>
              </div>

              {isDirty && (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Unsaved changes — click <strong>Save Permissions</strong> to apply.</span>
                </div>
              )}

              <div className="flex-1 overflow-auto p-6">
                {loadingMenus ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                        <th className="text-left p-3 font-medium text-[var(--text-secondary)]">Menu / Screen</th>
                        {PERM_COLS.map((col) => (
                          <th key={col.key} className="text-center p-3 w-20">
                            <div className="font-medium text-xs text-[var(--text-secondary)]">{col.label}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMenus.map((m) => {
                        const isLevel1 = m.menu_level === 1
                        const isCollapsed = collapsedParents.has(m.menu_id)
                        const children = childCount(m.menu_id)

                        return (
                          <tr
                            key={m.menu_id}
                            className={`border-b border-[var(--border-color)] transition-colors ${
                              isLevel1 ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <td className="p-3">
                              <div className={`flex items-center gap-2 ${isLevel1 ? 'font-semibold' : 'pl-8'}`}>
                                {isLevel1 && children > 0 ? (
                                  <button
                                    onClick={() => toggleCollapse(m.menu_id)}
                                    className="text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                    title={isCollapsed ? 'Expand' : 'Collapse'}
                                  >
                                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                ) : isLevel1 ? (
                                  <span className="w-4 inline-block" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                                )}
                                <span className={isLevel1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                                  {m.menu_name}
                                </span>
                                {isLevel1 && children > 0 && (
                                  <span className="font-normal text-xs text-[var(--text-muted)]">
                                    ({isCollapsed ? `${children} items` : children})
                                  </span>
                                )}
                                <span className="font-mono text-xs text-[var(--text-muted)]">({m.menu_code})</span>
                              </div>
                            </td>
                            {PERM_COLS.map((col) => (
                              <td key={col.key} className="p-3 text-center">
                                {renderCell(m, col.key)}
                              </td>
                            ))}
                          </tr>
                        )
                      })}

                      {menus.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">No menus found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserMenuPermissionPage
