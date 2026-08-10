import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Search, Edit2, Trash2, X, Loader2, Users, RefreshCw, Filter } from 'lucide-react';
import { dynamicApi } from '@/api/apiService';
import toast from 'react-hot-toast';
import PageBreadcrumb from '@/components/common/PageBreadcrumb'

interface Party {
  id: number;
  party_code: string;
  party_name: string;
  party_type: string;
  phone: string;
  email: string;
  city: string;
  gstin: string;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
}

const partySchema = yup.object({
  party_code: yup.string().required('Party code is required'),
  party_name: yup.string().required('Party name is required'),
  party_type: yup.string().required('Party type is required').oneOf(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  phone: yup.string(),
  email: yup.string().email('Invalid email'),
  address: yup.string(),
  city: yup.string(),
  state: yup.string(),
  gstin: yup.string(),
  credit_limit: yup.number().min(0, 'Must be positive').default(0),
});

type PartyFormData = yup.InferType<typeof partySchema>;

const PartyMasterPage: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PartyFormData>({
    resolver: yupResolver(partySchema),
  });

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dynamicApi.get('party_list_get');
      if (res.data.success) {
        setParties(res.data.data || []);
      }
    } catch {
      // Sample data
      setParties([
        { id: 1, party_code: 'C001', party_name: 'Ramesh Jewellers', party_type: 'CUSTOMER', phone: '9876543210', email: 'ramesh@example.com', city: 'Ahmedabad', gstin: '24ABCDE1234F1Z5', credit_limit: 500000, is_active: true, created_at: '2026-01-15' },
        { id: 2, party_code: 'S001', party_name: 'Gold Suppliers Ltd', party_type: 'SUPPLIER', phone: '9898989898', email: 'gold@example.com', city: 'Mumbai', gstin: '27XYZAB5678G2A1', credit_limit: 0, is_active: true, created_at: '2026-02-01' },
        { id: 3, party_code: 'B001', party_name: 'Priya Ornaments', party_type: 'BOTH', phone: '9512341234', email: 'priya@example.com', city: 'Surat', gstin: '24PRIYA1234H1Z5', credit_limit: 200000, is_active: true, created_at: '2026-02-15' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  useEffect(() => {
    let filtered = parties;
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.party_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
      );
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter((p) => p.party_type === filterType);
    }
    setFilteredParties(filtered);
  }, [parties, searchQuery, filterType]);

  const openAddModal = () => {
    reset({});
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (party: Party) => {
    reset(party as PartyFormData);
    setEditingId(party.id);
    setModalOpen(true);
  };

  const onSubmit = async (data: PartyFormData) => {
    setSaving(true);
    try {
      if (editingId) {
        await dynamicApi.put('party_update', { id: editingId }, data as Record<string, unknown>);
        toast.success('Party updated successfully');
      } else {
        await dynamicApi.post('party_create', {}, data as Record<string, unknown>);
        toast.success('Party created successfully');
      }
      setModalOpen(false);
      fetchParties();
    } catch {
      // Simulate success for demo
      toast.success(editingId ? 'Party updated (demo)' : 'Party created (demo)');
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete party "${name}"?`)) return;
    try {
      await dynamicApi.delete('party_delete', { id });
      setParties((prev) => prev.filter((p) => p.id !== id));
      toast.success('Party deleted');
    } catch {
      toast.success('Party deleted (demo)');
      setParties((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const typeColors: Record<string, string> = {
    CUSTOMER: 'badge-success',
    SUPPLIER: 'badge-info',
    BOTH: 'badge-warning',
  };

  return (
    <div className="animate-fade-in">
      <PageBreadcrumb parent="Masters" current="Party Master" />

      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201, 151, 58, 0.1)', color: 'var(--accent-gold)' }}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-title">Party Master</h1>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {filteredParties.length} of {parties.length} records
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={fetchParties}>
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Party
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, code or phone..."
            className="form-input pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          {['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH'].map((type) => (
            <button
              key={type}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors`}
              style={{
                background: filterType === type ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: filterType === type ? '#1a1000' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
              onClick={() => setFilterType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 spinner" style={{ color: 'var(--accent-gold)' }} />
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No parties found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'Try a different search term' : 'Add your first party to get started'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Phone</th>
                <th>City</th>
                <th>GSTIN</th>
                <th>Credit Limit</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.map((party) => (
                <tr key={party.id}>
                  <td>
                    <span className="font-mono text-xs" style={{ color: 'var(--accent-gold)' }}>
                      {party.party_code}
                    </span>
                  </td>
                  <td className="font-medium">{party.party_name}</td>
                  <td>
                    <span className={typeColors[party.party_type] || 'badge'}>
                      {party.party_type}
                    </span>
                  </td>
                  <td>{party.phone}</td>
                  <td>{party.city}</td>
                  <td className="font-mono text-xs">{party.gstin}</td>
                  <td>
                    {party.credit_limit
                      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(party.credit_limit)
                      : '—'}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => openEditModal(party)}
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => handleDelete(party.id, party.party_name)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl animate-slide-up flex flex-col"
            style={{ border: '1px solid var(--border-color)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
              style={{ background: 'var(--bg-modal-header)', borderBottom: '1px solid var(--border-color)' }}
            >
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Party' : 'Add New Party'}
              </h3>
              <button
                type="button"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1" style={{ background: 'var(--bg-modal)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Party Code *</label>
                  <input {...register('party_code')} className="form-input" placeholder="e.g. C001" />
                  {errors.party_code && <p className="text-xs text-red-500 mt-1">{errors.party_code.message}</p>}
                </div>
                <div>
                  <label className="form-label">Party Type *</label>
                  <select {...register('party_type')} className="form-input">
                    <option value="">Select type</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="SUPPLIER">Supplier</option>
                    <option value="BOTH">Both</option>
                  </select>
                  {errors.party_type && <p className="text-xs text-red-500 mt-1">{errors.party_type.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Party Name *</label>
                  <input {...register('party_name')} className="form-input" placeholder="Full business name" />
                  {errors.party_name && <p className="text-xs text-red-500 mt-1">{errors.party_name.message}</p>}
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input {...register('phone')} className="form-input" placeholder="10-digit mobile" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input {...register('email')} type="email" className="form-input" placeholder="email@example.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Address</label>
                  <input {...register('address')} className="form-input" placeholder="Full address" />
                </div>
                <div>
                  <label className="form-label">City</label>
                  <input {...register('city')} className="form-input" placeholder="City" />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input {...register('state')} className="form-input" placeholder="State" />
                </div>
                <div>
                  <label className="form-label">GSTIN</label>
                  <input {...register('gstin')} className="form-input" placeholder="GST Number" />
                </div>
                <div>
                  <label className="form-label">Credit Limit (₹)</label>
                  <input {...register('credit_limit')} type="number" className="form-input" placeholder="0" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-3 px-6 py-4 rounded-b-2xl flex-shrink-0"
              style={{ background: 'var(--bg-modal-footer)', borderTop: '1px solid var(--border-color)' }}
            >
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 spinner" /> : null}
                {saving ? 'Saving...' : editingId ? 'Update Party' : 'Create Party'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PartyMasterPage;
