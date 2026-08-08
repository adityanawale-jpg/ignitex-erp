import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline'
import PageHeader from '@/components/common/PageHeader'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import Badge from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatCurrency, formatWeight } from '@/utils/helpers'

interface Product {
  id: number
  product_code: string
  product_name: string
  category_id: number
  category_name: string
  metal_id: number
  metal_name: string
  gross_weight: number
  net_weight: number
  stone_weight: number
  making_charges: number
  mrp: number
  gender: string
  description: string
  is_active: boolean
}

const CATEGORIES = [
  { id: 1, name: 'Necklaces' }, { id: 2, name: 'Rings' }, { id: 3, name: 'Earrings' },
  { id: 4, name: 'Bracelets' }, { id: 5, name: 'Bangles' }, { id: 6, name: 'Pendants' },
  { id: 7, name: 'Chains' }, { id: 8, name: 'Anklets' },
]

const METALS = [
  { id: 1, name: 'Gold 24K (999)' }, { id: 2, name: 'Gold 22K (916)' },
  { id: 3, name: 'Gold 18K (750)' }, { id: 4, name: 'Silver 999' }, { id: 5, name: 'Platinum 950' },
]

const schema = yup.object({
  product_code: yup.string().required('Product code is required'),
  product_name: yup.string().required('Product name is required'),
  category_id: yup.number().required('Category is required').positive('Select a category'),
  metal_id: yup.number().required('Metal is required').positive('Select a metal'),
  gross_weight: yup.number().min(0).required('Gross weight is required'),
  net_weight: yup.number().min(0).required('Net weight is required'),
  stone_weight: yup.number().min(0).default(0),
  making_charges: yup.number().min(0).default(0),
  mrp: yup.number().min(0).required('MRP is required'),
  gender: yup.string().required('Gender is required'),
  description: yup.string().default(''),
})

const DEMO: Product[] = [
  { id: 1, product_code: 'P001', product_name: 'Gold Mangalsutra Classic', category_id: 1, category_name: 'Necklaces', metal_id: 2, metal_name: 'Gold 22K (916)', gross_weight: 12.5, net_weight: 11.8, stone_weight: 0, making_charges: 1200, mrp: 68000, gender: 'Female', description: 'Traditional mangalsutra', is_active: true },
  { id: 2, product_code: 'P002', product_name: 'Diamond Solitaire Ring', category_id: 2, category_name: 'Rings', metal_id: 3, metal_name: 'Gold 18K (750)', gross_weight: 3.2, net_weight: 2.8, stone_weight: 0.4, making_charges: 800, mrp: 45000, gender: 'Female', description: 'Classic solitaire ring', is_active: true },
  { id: 3, product_code: 'P003', product_name: 'Gold Jhumka Earrings', category_id: 3, category_name: 'Earrings', metal_id: 2, metal_name: 'Gold 22K (916)', gross_weight: 8.4, net_weight: 7.9, stone_weight: 0, making_charges: 600, mrp: 48000, gender: 'Female', description: 'Traditional jhumka style', is_active: true },
  { id: 4, product_code: 'P004', product_name: 'Men\'s Gold Chain 22K', category_id: 7, category_name: 'Chains', metal_id: 2, metal_name: 'Gold 22K (916)', gross_weight: 20.0, net_weight: 20.0, stone_weight: 0, making_charges: 1500, mrp: 116000, gender: 'Male', description: 'Thick box chain', is_active: true },
  { id: 5, product_code: 'P005', product_name: 'Silver Anklet Pair', category_id: 8, category_name: 'Anklets', metal_id: 4, metal_name: 'Silver 999', gross_weight: 25.0, net_weight: 24.5, stone_weight: 0, making_charges: 200, mrp: 2100, gender: 'Female', description: 'Traditional silver anklets', is_active: true },
]

const ProductMasterPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(DEMO)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Product | null>(null)
  const [deleteItem, setDeleteItem] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'grid'>('list')

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  })

  const openAdd = () => { setEditItem(null); reset(); setModalOpen(true) }

  const openEdit = (item: Product) => {
    setEditItem(item)
    Object.entries(item).forEach(([k, v]) => setValue(k as keyof typeof schema.__outputType, v as never))
    setModalOpen(true)
  }

  const onSubmit = async (data: typeof schema.__outputType) => {
    await new Promise((r) => setTimeout(r, 500))
    const catName = CATEGORIES.find((c) => c.id === Number(data.category_id))?.name || ''
    const metName = METALS.find((m) => m.id === Number(data.metal_id))?.name || ''
    if (editItem) {
      setProducts((prev) => prev.map((p) => p.id === editItem.id ? { ...p, ...data, category_name: catName, metal_name: metName } : p))
      toast.success('Product updated')
    } else {
      setProducts((prev) => [...prev, { id: Date.now(), ...data, category_name: catName, metal_name: metName, is_active: true }])
      toast.success('Product added')
    }
    setModalOpen(false)
    reset()
  }

  const columns = [
    { key: 'product_code', label: 'Code', sortable: true },
    { key: 'product_name', label: 'Product Name', sortable: true },
    { key: 'category_name', label: 'Category', sortable: true },
    { key: 'metal_name', label: 'Metal', sortable: true },
    {
      key: 'gross_weight',
      label: 'Gross Wt',
      render: (v: unknown) => <span>{formatWeight(Number(v))}</span>,
    },
    {
      key: 'mrp',
      label: 'MRP',
      sortable: true,
      render: (v: unknown) => <span className="font-semibold text-[var(--color-gold)]">{formatCurrency(Number(v))}</span>,
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (v: unknown) => <Badge label={String(v)} variant="secondary" />,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (v: unknown) => <Badge label={v ? 'Active' : 'Inactive'} variant={v ? 'success' : 'danger'} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Product Master"
        subtitle="Manage your jewellery product catalogue"
        actions={
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Product
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: products.length, color: 'var(--color-primary)' },
          { label: 'Active', value: products.filter((p) => p.is_active).length, color: '#10b981' },
          { label: 'Avg MRP', value: formatCurrency(products.reduce((a, b) => a + b.mrp, 0) / products.length), color: 'var(--color-gold)' },
          { label: 'Categories', value: new Set(products.map((p) => p.category_id)).size, color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="card p-4 border-l-4" style={{ borderLeftColor: s.color }}>
            <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns as never}
        data={products as never}
        searchable
        exportable
        title="Product Catalogue"
        actions={(row: unknown) => {
          const item = row as Product
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
        title={editItem ? 'Edit Product' : 'Add Product'}
        size="2xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : editItem ? 'Update' : 'Add Product'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Product Code *</label>
            <input {...register('product_code')} className="form-input" placeholder="P001" />
            {errors.product_code && <p className="text-xs text-red-500 mt-1">{errors.product_code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Product Name *</label>
            <input {...register('product_name')} className="form-input" placeholder="Gold Necklace Classic" />
            {errors.product_name && <p className="text-xs text-red-500 mt-1">{errors.product_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category *</label>
            <select {...register('category_id')} className="form-input">
              <option value="">Select Category</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Metal *</label>
            <select {...register('metal_id')} className="form-input">
              <option value="">Select Metal</option>
              {METALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {errors.metal_id && <p className="text-xs text-red-500 mt-1">{errors.metal_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Gross Weight (g) *</label>
            <input type="number" step="0.001" {...register('gross_weight')} className="form-input" />
            {errors.gross_weight && <p className="text-xs text-red-500 mt-1">{errors.gross_weight.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Net Weight (g) *</label>
            <input type="number" step="0.001" {...register('net_weight')} className="form-input" />
            {errors.net_weight && <p className="text-xs text-red-500 mt-1">{errors.net_weight.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Stone Weight (g)</label>
            <input type="number" step="0.001" {...register('stone_weight')} className="form-input" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Making Charges (₹)</label>
            <input type="number" {...register('making_charges')} className="form-input" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">MRP (₹) *</label>
            <input type="number" {...register('mrp')} className="form-input" />
            {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Gender *</label>
            <select {...register('gender')} className="form-input">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Unisex">Unisex</option>
            </select>
            {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea {...register('description')} className="form-input" rows={2} placeholder="Product description..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        title="Delete Product"
        message={`Delete "${deleteItem?.product_name}"?`}
        confirmLabel="Delete"
        onConfirm={() => {
          setProducts((prev) => prev.filter((p) => p.id !== deleteItem?.id))
          toast.success('Product deleted')
          setDeleteItem(null)
        }}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}

export default ProductMasterPage
