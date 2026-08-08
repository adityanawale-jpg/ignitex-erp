import React, { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Save, RefreshCw, Shield, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react'
import { dynamicApi } from '@/api/apiService'
import PageHeader from '@/components/common/PageHeader'
import { usePermission } from '@/hooks'

interface Role {
  id: number
  role_code: string
  role_name: string
  is_active: boolean
}

interface MenuPerm {
  menu_id: number
  menu_code: string
  menu_name: string
  parent_id: number | null
  menu_level: number
  menu_order: number
  parent_name: string | null
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
  can_print: boolean
  can_export: boolean
}

type PermKey = 'can_view' | 'can_create' | 'can_update' | 'can_delete' | 'can_print' | 'can_export'

const PERM_COLS: { key: PermKey; label: string; color: string }[] = [
  { key: 'can_view',   label: 'View',     color: 'text-blue-500'   },
  { key: 'can_create', label: 'Add',      color: 'text-green-500'  },
  { key: 'can_update', label: 'Edit',     color: 'text-amber-500'  },
  { key: 'can_delete', label: 'Delete',   color: 'text-red-500'    },
  { key: 'can_print',  label: 'Print',    color: 'text-purple-500' },
  { key: 'can_export', label: 'Download', color: 'text-teal-500'   },
]

const PermissionMasterPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [menus, setMenus] = useState<MenuPerm[]>([])
  const [perms, setPerms] = useState<Record<number, Record<PermKey, boolean>>>({})
  // Independent "All" checkbox state per row — not derived from individual perms
  const [rowAllState, setRowAllState] = useState<Record<number, boolean>>({})
  // Parent menu IDs that are collapsed; all parents start collapsed
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set())
  const [loadingMenus, setLoadingMenus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { canUpdate } = usePermission()

  const fetchRoles = useCallback(async () => {
    try {
      const res = await dynamicApi.get('role_master_list_get')
      if (res.data.success) {
        const active = (res.data.data || []).filter((r: Role) => r.is_active)
        setRoles(active)
        if (active.length > 0) setSelectedRole(active[0].id)
      }
    } catch {
      toast.error('Failed to load roles')
    }
  }, [])

  const fetchPermissions = useCallback(async (roleId: number) => {
    setLoadingMenus(true)
    try {
      const res = await dynamicApi.get('permission_menus_by_role_get', {
        role_id: { type: 'int', value: roleId },
      })
      if (res.data.success) {
        const data: MenuPerm[] = res.data.data || []
        setMenus(data)
        const map: Record<number, Record<PermKey, boolean>> = {}
        const allState: Record<number, boolean> = {}
        const parentIds = new Set<number>()
        data.forEach((m) => {
          map[m.menu_id] = {
            can_view:   m.can_view,
            can_create: m.can_create,
            can_update: m.can_update,
            can_delete: m.can_delete,
            can_print:  m.can_print,
            can_export: m.can_export,
          }
          allState[m.menu_id] = PERM_COLS.every((c) => m[c.key])
          if (m.menu_level === 1) parentIds.add(m.menu_id)
        })
        setPerms(map)
        setRowAllState(allState)
        setCollapsedParents(parentIds) // collapse all parents by default
        setIsDirty(false)
      }
    } catch {
      toast.error('Failed to load permissions')
    } finally {
      setLoadingMenus(false)
    }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  useEffect(() => {
    if (selectedRole) fetchPermissions(selectedRole)
  }, [selectedRole, fetchPermissions])

  // Block browser refresh / tab close when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Re-order flat list: each parent followed by its children.
  // Orphan menus (parent deleted) are excluded — only children whose
  // parent_id matches an existing parent are ever added.
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

  // Only show parent rows + children of expanded parents
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

  // Toggle a single cell — does NOT touch rowAllState
  const toggle = (menuId: number, key: PermKey) => {
    if (!canUpdate) return
    setPerms((prev) => ({
      ...prev,
      [menuId]: { ...prev[menuId], [key]: !prev[menuId]?.[key] },
    }))
    setIsDirty(true)
  }

  // Toggle one column for all rows — does NOT touch rowAllState
  const toggleColumn = (key: PermKey, value: boolean) => {
    if (!canUpdate) return
    setPerms((prev) => {
      const next = { ...prev }
      menus.forEach((m) => {
        next[m.menu_id] = { ...next[m.menu_id], [key]: value }
      })
      return next
    })
    setIsDirty(true)
  }

  // Set all 6 perms for a single row AND sync rowAllState
  const toggleRow = (menuId: number, value: boolean) => {
    if (!canUpdate) return
    setPerms((prev) => ({
      ...prev,
      [menuId]: {
        can_view: value, can_create: value, can_update: value,
        can_delete: value, can_print: value, can_export: value,
      },
    }))
    setRowAllState((prev) => ({ ...prev, [menuId]: value }))
    setIsDirty(true)
  }

  // Per-row "All" checkbox click — toggles independently
  const toggleRowAll = (menuId: number) => {
    toggleRow(menuId, !rowAllState[menuId])
  }

  // Toggle all 6 perms for a parent group (parent row + all its children)
  const toggleGroup = (parentMenuId: number, value: boolean) => {
    if (!canUpdate) return
    const groupIds = menus
      .filter((m) => m.menu_id === parentMenuId || m.parent_id === parentMenuId)
      .map((m) => m.menu_id)
    setPerms((prev) => {
      const next = { ...prev }
      groupIds.forEach((id) => {
        next[id] = {
          can_view: value, can_create: value, can_update: value,
          can_delete: value, can_print: value, can_export: value,
        }
      })
      return next
    })
    setRowAllState((prev) => {
      const next = { ...prev }
      groupIds.forEach((id) => { next[id] = value })
      return next
    })
    setIsDirty(true)
  }

  const savePermissions = async () => {
    if (!selectedRole || !canUpdate) return
    setSaving(true)
    try {
      const permissions = menus.map((m) => {
        const p = perms[m.menu_id] ?? {
          can_view: false, can_create: false, can_update: false,
          can_delete: false, can_print: false, can_export: false,
        }
        return {
          menu_id:    m.menu_id,
          can_view:   p.can_view,
          can_create: p.can_create,
          can_update: p.can_update,
          can_delete: p.can_delete,
          can_print:  p.can_print,
          can_export: p.can_export,
        }
      })

      await import('@/api/apiService').then(({ apiService }) =>
        apiService.put('/users/permissions/bulk', { role_id: selectedRole, permissions })
      )

      toast.success('Permissions saved successfully')
      setIsDirty(false)
      fetchPermissions(selectedRole)
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

  const childCount = (menuId: number) => menus.filter((m) => m.parent_id === menuId).length
  const selectedRoleName = roles.find((r) => r.id === selectedRole)?.role_name ?? ''

  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>User Permission Management</span>
      </div>
      <PageHeader
        breadcrumbItems={[]}
        title="User Permission Management"
        subtitle="Configure role-based access permissions per menu"
        actions={
          canUpdate ? (
            <button
              onClick={savePermissions}
              disabled={saving || !selectedRole}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          ) : undefined
        }
      />

      {/* Role Selector */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-4">
        <Shield className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
        <label className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">Configure Role:</label>
        <select
          value={selectedRole ?? ''}
          onChange={(e) => setSelectedRole(Number(e.target.value))}
          className="form-input w-auto min-w-[220px]"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.role_name} ({r.role_code})
            </option>
          ))}
        </select>
        <button
          onClick={() => selectedRole && fetchPermissions(selectedRole)}
          className="btn-secondary flex items-center gap-1"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {selectedRoleName && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            Showing permissions for: <strong className="text-[var(--text-primary)]">{selectedRoleName}</strong>
          </span>
        )}
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Unsaved changes — click <strong>Save Permissions</strong> to apply.</span>
        </div>
      )}

      {/* Permission Matrix */}
      {loadingMenus ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                  <th className="text-left p-3 font-medium text-[var(--text-secondary)]">
                    Menu / Screen
                  </th>

                  {/* All column — On checks ALL 6 perms for every row; Off clears all */}
                  <th className="text-center p-3 w-20">
                    <div className="font-medium text-[var(--text-secondary)] text-xs mb-1">All</div>
                    {canUpdate && (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => menus.forEach((m) => toggleRow(m.menu_id, true))}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--color-primary)]"
                        >On</button>
                        <span className="text-[var(--text-muted)]">/</span>
                        <button
                          onClick={() => menus.forEach((m) => toggleRow(m.menu_id, false))}
                          className="text-xs text-[var(--text-muted)] hover:text-red-500"
                        >Off</button>
                      </div>
                    )}
                  </th>

                  {/* Per-permission columns — All/None only affects that column */}
                  {PERM_COLS.map((col) => (
                    <th key={col.key} className="text-center p-3 w-24">
                      <div className={`font-medium text-xs mb-1 ${col.color}`}>{col.label}</div>
                      {canUpdate && (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => toggleColumn(col.key, true)}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--color-primary)]"
                            title={`Enable ${col.label} for all`}
                          >All</button>
                          <span className="text-[var(--text-muted)]">/</span>
                          <button
                            onClick={() => toggleColumn(col.key, false)}
                            className="text-xs text-[var(--text-muted)] hover:text-red-500"
                            title={`Disable ${col.label} for all`}
                          >None</button>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleMenus.map((m) => {
                  const p = perms[m.menu_id] ?? {
                    can_view: false, can_create: false, can_update: false,
                    can_delete: false, can_print: false, can_export: false,
                  }
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
                              {isCollapsed
                                ? <ChevronRight className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />
                              }
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
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            ({m.menu_code})
                          </span>
                        </div>
                      </td>

                      {/* Row-level All — parent group shows On/Off cascade; child shows checkbox */}
                      <td className="p-3 text-center">
                        {isLevel1 ? (
                          canUpdate ? (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => toggleGroup(m.menu_id, true)}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--color-primary)]"
                                title="Enable all permissions for this group"
                              >On</button>
                              <span className="text-[var(--text-muted)]">/</span>
                              <button
                                onClick={() => toggleGroup(m.menu_id, false)}
                                className="text-xs text-[var(--text-muted)] hover:text-red-500"
                                title="Disable all permissions for this group"
                              >Off</button>
                            </div>
                          ) : null
                        ) : (
                          <input
                            type="checkbox"
                            checked={!!rowAllState[m.menu_id]}
                            onChange={() => toggleRowAll(m.menu_id)}
                            disabled={!canUpdate}
                            className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer disabled:cursor-not-allowed"
                            title="Toggle all permissions"
                          />
                        )}
                      </td>

                      {PERM_COLS.map((col) => (
                        <td key={col.key} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!p[col.key]}
                            onChange={() => toggle(m.menu_id, col.key)}
                            disabled={!canUpdate}
                            className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}

                {menus.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-[var(--text-muted)]">
                      {selectedRole ? 'No menus found.' : 'Select a role to configure permissions.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {menus.length > 0 && canUpdate && (
            <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-end">
              <button
                onClick={savePermissions}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PermissionMasterPage
