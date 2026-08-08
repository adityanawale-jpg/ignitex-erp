import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import PageHeader from '@/components/common/PageHeader'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import Badge from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'

interface Category {
  id: number
  category_code: string
  category_name: string
  description: string
  is_active: boolean
}

const schema = yup.object({
  category_code: yup.string().required('Category code is required'),
  category_name: yup.string().required('Category name is required'),
  description: yup.string().default(''),
})

const DEMO: Category[] = [
  { id: 1, category_code: 'NECKLACE', category_name: 'Necklaces', description: 'All types of necklaces', is_active: true },
  { id: 2, category_code: 'RING', category_name: 'Rings', description: 'All types of rings', is_active: true },
  { id: 3, category_code: 'EARRING', category_name: 'Earrings', description: 'All types of earrings', is_active: true },
  { id: 4, category_code: 'BRACELET', category_name: 'Bracelets', description: 'All types of bracelets', is_active: true },
  { id: 5, category_code: 'BANGLE', category_name: 'Bangles', description: 'All types of bangles', is_active: true },
  { id: 6, category_code: 'PENDANT', category_name: 'Pendants', description: 'All types of pendants', is_active: true },
  { id: 7, category_code: 'CHAIN', category_name: 'Chains', description: 'All types of chains', is_active: true },
  { id: 8, category_code: 'ANKLET', category_name: 'Anklets', description: 'All types of anklets', is_active: true },
]

const CategoryIcons: Record<string, string> = {
  NECKLACE: '📿', RING: '💍', EARRING: '👂', BRACELET: '⌚',
  BANGLE: '🔮', PENDANT: '🏅', CHAIN: '⛓️', ANKLET: '🦶',
}

const CategoryMasterPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(DEMO)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [deleteItem, setDeleteItem] = useState<Category | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  })

  const openAdd = () => { setEditItem(null); reset(); setModalOpen(true) }

  const openEdit = (item: Category) => {
    setEditItem(item)
    setValue('category_code', item.category_code)
    setValue('category_name', item.category_name)
    setValue('description', item.description)
    setModalOpen(true)
  }

  const onSubmit = async (data: typeof schema.__outputType) => {
    await new Promise((r) => setTimeout(r, 400))
    if (editItem) {
      setCategories((prev) => prev.map((c) => c.id === editItem.id ? { ...c, ...data } : c))
      toast.success('Category updated')
    } else {
      setCategories((prev) => [...prev, { id: Date.now(), ...data, is_active: true }])
      toast.success('Category added')
    }
    setModalOpen(false)
    reset()
  }

  const columns = [
    {
      key: 'category_code',
      label: 'Category Code',
      sortable: true,
      render: (v: unknown) => (
        <span className="flex items-center gap-2">
          <span>{CategoryIcons[String(v)] || '💎'}</span>
          <span className="font-mono text-sm">{String(v)}</span>
        </span>
      ),
    },
    { key: 'category_name', label: 'Category Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'is_active',
      label: 'Status',
      render: (v: unknown) => <Badge label={v ? 'Active' : 'Inactive'} variant={v ? 'success' : 'danger'} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Category Master"
        subtitle="Manage jewellery product categories"
        actions={
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Category
          </button>
        }
      />

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {categories.map((c) => (
          <div key={c.id} className="card p-3 text-center hover:border-[var(--color-primary)] cursor-pointer transition-colors group">
            <div className="text-3xl mb-1">{CategoryIcons[c.category_code] || '💎'}</div>
            <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
              {c.category_name}
            </p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns as never}
        data={categories as never}
        searchable
        exportable
        title="Category List"
        actions={(row: unknown) => {
          const item = row as Category
          return (
            <div className="flex gap-1">
              <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Category' : 'Add Category'}
        size="md"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : editItem ? 'Update' : 'Add Category'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category Code *</label>
            <input {...register('category_code')} className="form-input" placeholder="e.g. NECKLACE" />
            {errors.category_code && <p className="text-xs text-red-500 mt-1">{errors.category_code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category Name *</label>
            <input {...register('category_name')} className="form-input" placeholder="e.g. Necklaces" />
            {errors.category_name && <p className="text-xs text-red-500 mt-1">{errors.category_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea {...register('description')} className="form-input" rows={3} placeholder="Category description..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        title="Delete Category"
        message={`Delete "${deleteItem?.category_name}"?`}
        confirmLabel="Delete"
        onConfirm={() => {
          setCategories((prev) => prev.filter((c) => c.id !== deleteItem?.id))
          toast.success('Category deleted')
          setDeleteItem(null)
        }}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}

export default CategoryMasterPage
