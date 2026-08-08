import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, RefreshCw, Menu, ChevronRight, ChevronDown, ChevronsUpDown, CheckCircle, XCircle } from 'lucide-react'
import { dynamicApi } from '@/api/apiService'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import Badge from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { usePermission } from '@/hooks'

interface MenuRow {
  id: number
  parent_id: number | null
  menu_code: string
  menu_name: string
  menu_url: string | null
  menu_icon: string | null
  menu_order: number
  menu_level: number
  is_active: boolean
  created_at: string
  parent_name: string | null
}

const schema = yup.object({
  menu_code: yup.string().required('Menu code is required').max(100),
  menu_name: yup.string().required('Menu name is required').max(200),
  menu_level: yup.number().oneOf([1, 2], 'Level must be 1 or 2').required().default(2),
  parent_id: yup
    .number()
    .nullable()
    .transform((v) => (v === '' || v === null || isNaN(Number(v)) ? null : Number(v)))
    .default(null),
  menu_url: yup.string().nullable().transform((v) => (v === '' ? null : v)).default(null),
  menu_icon: yup.string().nullable().transform((v) => (v === '' ? null : v)).default(null),
  menu_order: yup.number().min(0).default(0),
  is_active: yup.boolean().default(true),
})

type FormData = yup.InferType<typeof schema>

const MenuMasterPage: React.FC = () => {
  const [menus, setMenus] = useState<MenuRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuRow | null>(null)
  const [deleteItem, setDeleteItem] = useState<MenuRow | null>(null)
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | null>(null)
  const initialCollapseSet = useRef(false)
  const { canCreate, canUpdate, canDelete } = usePermission()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: yupResolver(schema),
  })

  const menuLevel = watch('menu_level')

  const fetchMenus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dynamicApi.get('menu_master_list_get')
      if (res.data.success) {
        const data: MenuRow[] = res.data.data || []
        setMenus(data)
        if (!initialCollapseSet.current) {
          initialCollapseSet.current = true
          setCollapsedParents(new Set(data.filter(m => m.menu_level === 1).map(m => m.id)))
        }
      }
    } catch {
      toast.error('Failed to load menus')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMenus() }, [fetchMenus])

  /* ── collapse helpers ─────────────────────────── */
  const toggleCollapse = (parentId: number) => {
    setCollapsedParents(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }

  const level1Ids = useMemo(() => menus.filter(m => m.menu_level === 1).map(m => m.id), [menus])
  const allCollapsed = level1Ids.length > 0 && level1Ids.every(id => collapsedParents.has(id))

  const toggleAll = () => {
    setCollapsedParents(allCollapsed ? new Set() : new Set(level1Ids))
  }

  /* ── modal openers ────────────────────────────── */
  const openAdd = () => {
    setEditItem(null)
    reset({ menu_code: '', menu_name: '', menu_level: 1, parent_id: null, menu_url: null, menu_icon: null, menu_order: 0, is_active: true })
    setModalOpen(true)
  }

  const openAddSub = (parent: MenuRow) => {
    setEditItem(null)
    reset({ menu_code: '', menu_name: '', menu_level: 2, parent_id: parent.id, menu_url: null, menu_icon: null, menu_order: 0, is_active: true })
    setModalOpen(true)
  }

  const openEdit = (item: MenuRow) => {
    setEditItem(item)
    setValue('menu_code', item.menu_code)
    setValue('menu_name', item.menu_name)
    setValue('menu_level', item.menu_level as 1 | 2)
    setValue('parent_id', item.parent_id)
    setValue('menu_url', item.menu_url ?? null)
    setValue('menu_icon', item.menu_icon ?? null)
    setValue('menu_order', item.menu_order)
    setValue('is_active', item.is_active)
    setModalOpen(true)
  }

  /* ── submit / delete ──────────────────────────── */
  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        parent_id: data.menu_level === 1 ? null : (data.parent_id ?? null),
      }
      if (editItem) {
        await dynamicApi.put('menu_master_update', { id: { type: 'int', value: editItem.id } }, payload)
        toast.success('Menu updated')
      } else {
        await dynamicApi.post('menu_master_create', {}, payload)
        toast.success('Menu created')
      }
      setModalOpen(false)
      fetchMenus()
    } catch {
      toast.error('Failed to save menu')
    }
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    try {
      await dynamicApi.delete('menu_master_delete', { id: { type: 'int', value: deleteItem.id } })
      toast.success('Menu deactivated')
      setDeleteItem(null)
      fetchMenus()
    } catch {
      toast.error('Failed to deactivate menu')
    }
  }

  /* ── data ─────────────────────────────────────── */
  const parentMenus = menus.filter((m) => m.menu_level === 1 && m.is_active)

  const sortedMenus = useMemo(() => {
    const level1 = menus
      .filter((m) => m.menu_level === 1)
      .sort((a, b) => a.menu_order - b.menu_order || a.menu_name.localeCompare(b.menu_name))

    const result: MenuRow[] = []
    for (const parent of level1) {
      result.push(parent)
      const children = menus
        .filter((m) => m.menu_level === 2 && m.parent_id === parent.id)
        .sort((a, b) => a.menu_order - b.menu_order || a.menu_name.localeCompare(b.menu_name))
      result.push(...children)
    }

    const orphans = menus
      .filter((m) => m.menu_level === 2 && !level1.some((p) => p.id === m.parent_id))
      .sort((a, b) => a.menu_order - b.menu_order)
    result.push(...orphans)

    return result
  }, [menus])

  const activeCount   = useMemo(() => menus.filter(m => m.is_active).length,  [menus])
  const inactiveCount = useMemo(() => menus.filter(m => !m.is_active).length, [menus])

  // Rows visible in the table — Level-2 children hidden when parent is collapsed
  const visibleMenus = useMemo(() => {
    let base = sortedMenus
    if (statusFilter === 'active')   base = sortedMenus.filter(m => m.is_active)
    if (statusFilter === 'inactive') base = sortedMenus.filter(m => !m.is_active)
    return base.filter(m => m.menu_level === 1 || !collapsedParents.has(m.parent_id!))
  }, [sortedMenus, collapsedParents, statusFilter])

  /* ── columns ──────────────────────────────────── */
  const columns = [
    {
      key: 'menu_level',
      label: 'Level',
      width: '90px',
      render: (v: unknown) =>
        Number(v) === 1
          ? <Badge label="Parent" variant="gold" />
          : <Badge label="Sub Menu" variant="secondary" />,
    },
    {
      key: 'menu_name',
      label: 'Menu Name',
      render: (v: unknown, row: unknown) => {
        const item = row as MenuRow
        if (item.menu_level === 1) {
          const isCollapsed = collapsedParents.has(item.id)
          const childCount = menus.filter(m => m.menu_level === 2 && m.parent_id === item.id).length
          return (
            <span className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id) }}
                className="p-0.5 rounded hover:bg-[var(--border-color)] text-[var(--text-muted)] transition-colors"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
                }
              </button>
              <Menu className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
              {String(v)}
              {childCount > 0 && (
                <span className="ml-1 text-xs font-normal text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-full">
                  {childCount}
                </span>
              )}
            </span>
          )
        }
        return (
          <span className="flex items-center gap-1 pl-8">
            <span className="text-[var(--text-muted)] text-xs mr-1">└─</span>
            <Menu className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <span className="text-[var(--text-secondary)] text-sm">{String(v)}</span>
          </span>
        )
      },
    },
    {
      key: 'menu_code',
      label: 'Code',
      render: (v: unknown) => (
        <span className="font-mono text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
          {String(v)}
        </span>
      ),
    },
    {
      key: 'menu_url',
      label: 'URL',
      render: (v: unknown) =>
        v
          ? <span className="font-mono text-xs text-[var(--color-primary)]">{String(v)}</span>
          : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'menu_icon',
      label: 'Icon',
      render: (v: unknown) =>
        v ? <span className="text-xs text-[var(--text-secondary)]">{String(v)}</span>
          : <span className="text-[var(--text-muted)]">—</span>,
    },
    { key: 'menu_order', label: 'Order', width: '70px' },
    {
      key: 'is_active',
      label: 'Status',
      render: (v: unknown) => <Badge label={v ? 'Active' : 'Inactive'} variant={v ? 'success' : 'danger'} />,
    },
  ]

  /* ── modal title ──────────────────────────────── */
  const modalTitle = editItem
    ? `Edit Menu — ${editItem.menu_name}`
    : menuLevel === 2
      ? 'Add Sub Menu'
      : 'Add Parent Menu'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Menu Configuration</span>
      </div>

      {/* Top bar: stat cards (left) + actions (right) */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

        <div className="flex items-center gap-2 pl-3">
          <button
            onClick={() => setStatusFilter(f => f === 'active' ? null : 'active')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'active'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{activeCount}</p>
              <p className="text-xs mt-0.5 text-green-600 font-medium">Active Menus</p>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter(f => f === 'inactive' ? null : 'inactive')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'inactive'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{inactiveCount}</p>
              <p className="text-xs mt-0.5 text-red-500 font-medium">Inactive Menus</p>
            </div>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleAll}
            className="btn-secondary flex items-center gap-2 text-sm"
            title={allCollapsed ? 'Expand All' : 'Collapse All'}
          >
            <ChevronsUpDown className="w-4 h-4" />
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
          <button onClick={fetchMenus} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCreate && (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Menu
            </button>
          )}
        </div>

      </div>

      <DataTable
        columns={columns as never}
        data={visibleMenus as never}
        loading={loading}
        searchable
        exportable
        pageSize={100}
        title="Menu List"
        rowClassName={(row: unknown) => {
          const item = row as MenuRow
          return item.menu_level === 1 ? 'bg-[var(--bg-secondary)]' : ''
        }}
        actions={(row: unknown) => {
          const item = row as MenuRow
          return (
            <div className="flex gap-1">
              {canCreate && item.menu_level === 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); openAddSub(item) }}
                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-emerald-500"
                  title="Add Sub Menu"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {canUpdate && (
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500"
                  title="Deactivate"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        }}
      />

      {/* ── Add / Edit Modal ──────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        size="md"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : editItem ? 'Update' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Level *</label>
              <select
                {...register('menu_level', { valueAsNumber: true })}
                className="form-input"
                disabled={!!editItem}
              >
                <option value={1}>Level 1 — Parent Menu</option>
                <option value={2}>Level 2 — Sub Menu</option>
              </select>
            </div>
            {menuLevel === 2 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Parent Menu *</label>
                <select
                  {...register('parent_id', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                  className="form-input"
                >
                  <option value="">— Select Parent —</option>
                  {parentMenus.map((m) => (
                    <option key={m.id} value={m.id}>{m.menu_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Menu Code *</label>
            <input
              {...register('menu_code')}
              readOnly={!!editItem}
              className={`form-input uppercase ${editItem ? 'bg-[var(--bg-tertiary)] cursor-not-allowed opacity-70' : ''}`}
              placeholder="e.g. SALES_REPORT"
            />
            {errors.menu_code && <p className="text-xs text-red-500 mt-1">{errors.menu_code.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Menu Name *</label>
            <input {...register('menu_name')} className="form-input" placeholder="e.g. Sales Report" />
            {errors.menu_name && <p className="text-xs text-red-500 mt-1">{errors.menu_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">URL</label>
              <input {...register('menu_url')} className="form-input" placeholder="/reports/sales" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Icon Name</label>
              <input {...register('menu_icon')} className="form-input" placeholder="ChartBarIcon" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Display Order</label>
              <input
                type="number"
                {...register('menu_order', { valueAsNumber: true })}
                className="form-input"
                min={0}
              />
            </div>
            <div className="flex items-center gap-3 pb-1">
              <input
                type="checkbox"
                id="menu_is_active"
                {...register('is_active')}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              <label htmlFor="menu_is_active" className="text-sm font-medium text-[var(--text-secondary)]">Active</label>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        title="Deactivate Menu"
        message={`Deactivate menu "${deleteItem?.menu_name}"? It will no longer appear in navigation.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}

export default MenuMasterPage
