import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { Plus, Edit2, RefreshCw, Shield } from 'lucide-react'
import { NoSymbolIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { dynamicApi } from '@/api/apiService'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import Badge from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import PageHeader from '@/components/common/PageHeader'
import { usePermission } from '@/hooks'

interface Role {
  id: number
  role_code: string
  role_name: string
  description: string
  is_active: boolean
  deactivation_reason: string | null
  deactivated_at: string | null
  created_at: string
  updated_at: string
}

const schema = yup.object({
  role_code:   yup.string().required('Role code is required').max(50),
  role_name:   yup.string().required('Role name is required').max(100),
  description: yup.string().default(''),
  is_active:   yup.boolean().default(true),
})

type FormData = yup.InferType<typeof schema>

const RoleMasterPage: React.FC = () => {
  const [roles,      setRoles]      = useState<Role[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editItem,   setEditItem]   = useState<Role | null>(null)
  const [toggleItem, setToggleItem] = useState<Role | null>(null)
  const { canCreate, canUpdate, canDelete } = usePermission()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: yupResolver(schema),
  })

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dynamicApi.get('role_master_list_get')
      if (res.data.success) setRoles(res.data.data || [])
    } catch {
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const openAdd = () => {
    setEditItem(null)
    reset({ role_code: '', role_name: '', description: '', is_active: true })
    setModalOpen(true)
  }

  const openEdit = (item: Role) => {
    setEditItem(item)
    setValue('role_code', item.role_code)
    setValue('role_name', item.role_name)
    setValue('description', item.description || '')
    setValue('is_active', item.is_active)
    setModalOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    try {
      if (editItem) {
        await dynamicApi.put('role_master_update', { id: { type: 'int', value: editItem.id } }, data)
        toast.success('Role updated')
      } else {
        await dynamicApi.post('role_master_create', {}, data)
        toast.success('Role created')
      }
      setModalOpen(false)
      fetchRoles()
    } catch {
      toast.error('Failed to save role')
    }
  }

  const handleToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      if (toggleItem.is_active) {
        await dynamicApi.put('role_master_deactivate', { id: { type: 'int', value: toggleItem.id } }, { reason })
        toast.success('Role deactivated')
      } else {
        await dynamicApi.put('role_master_activate', { id: { type: 'int', value: toggleItem.id } }, {})
        toast.success('Role activated')
      }
      setToggleItem(null)
      fetchRoles()
    } catch {
      toast.error('Failed to update role status')
    }
  }

  const columns = [
    {
      key: 'role_code',
      label: 'Code',
      sortable: true,
      render: (v: unknown) => (
        <span className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="font-mono text-sm font-medium">{String(v)}</span>
        </span>
      ),
    },
    { key: 'role_name', label: 'Role Name', sortable: true },
    {
      key: 'description',
      label: 'Description',
      render: (v: unknown) => v ? String(v) : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (v: unknown) => <Badge label={v ? 'Active' : 'Inactive'} variant={v ? 'success' : 'danger'} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v: unknown) => new Date(String(v)).toLocaleDateString('en-IN'),
    },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Role &amp; Responsibility</span>
      </div>

      <PageHeader
        title="Role Master"
        subtitle="Manage user roles and their settings"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchRoles} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
            </button>
            {canCreate && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Role
              </button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns as never}
        data={roles as never}
        loading={loading}
        searchable
        exportable
        title="Role List"
        actions={(row: unknown) => {
          const item = row as Role
          if (!canUpdate && !canDelete) return null
          return (
            <div className="flex gap-1">
              {canUpdate && (
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setToggleItem(item)}
                  className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'}`}
                  title={item.is_active ? 'Deactivate' : 'Activate'}
                >
                  {item.is_active
                    ? <NoSymbolIcon    className="w-4 h-4" />
                    : <CheckCircleIcon className="w-4 h-4" />
                  }
                </button>
              )}
            </div>
          )
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Role' : 'Add Role'}
        size="md"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : editItem ? 'Update' : 'Create Role'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Role Code *
            </label>
            <input
              {...register('role_code')}
              readOnly={!!editItem}
              className={`form-input ${editItem ? 'bg-[var(--bg-tertiary)] cursor-not-allowed opacity-70' : ''}`}
              placeholder="e.g. SALES_MGR"
            />
            {errors.role_code && (
              <p className="text-xs text-red-500 mt-1">{errors.role_code.message}</p>
            )}
            {editItem && (
              <p className="text-xs text-[var(--text-muted)] mt-1">Role code cannot be changed after creation.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Role Name *
            </label>
            <input
              {...register('role_name')}
              className="form-input"
              placeholder="e.g. Sales Manager"
            />
            {errors.role_name && (
              <p className="text-xs text-red-500 mt-1">{errors.role_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              className="form-input"
              rows={3}
              placeholder="Describe what this role can access..."
            />
          </div>

          {/* Active flag — shown in both add and edit, but readonly in edit */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="role_is_active"
              {...register('is_active')}
              disabled={!!editItem}
              className="w-4 h-4 accent-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label
              htmlFor="role_is_active"
              className={`text-sm font-medium text-[var(--text-secondary)] ${editItem ? 'opacity-50' : ''}`}
            >
              Active
            </label>
            {editItem && (
              <span className="text-xs text-[var(--text-muted)]">
                (Use the toggle button in the grid to change status)
              </span>
            )}
          </div>
        </div>
      </Modal>

      {/* Deactivate — ask for reason */}
      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Role"
        itemLabel={`Role "${toggleItem?.role_name}"? Users with only this role will lose access.`}
        onConfirm={(reason) => handleToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      {/* Activate — simple confirm */}
      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Role"
        message={`Activate role "${toggleItem?.role_name}"?`}
        confirmLabel="Activate"
        onConfirm={() => handleToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default RoleMasterPage
