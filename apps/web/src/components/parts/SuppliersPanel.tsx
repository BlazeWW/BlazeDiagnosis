'use client';

import React, { useState, useEffect } from 'react';

interface ISupplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  preferred: boolean;
}

export const SuppliersPanel: React.FC = () => {
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    preferred: false,
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const res = await fetch('/api/suppliers');
      if (!res.ok) throw new Error('Failed to retrieve supplier database records.');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err: any) {
      setErrorText(err.message || 'Error syncing vendor data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm({ ...form, [name]: finalValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorText(null);

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Server pipeline rejected supplier creation.');

      setForm({ name: '', email: '', phone: '', status: 'active', preferred: false });
      await loadSuppliers();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to save vendor.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '14px' }}>Vendor & Supplier Profile Registry</h2>
      
      {errorText && (
        <div style={{ backgroundColor: '#fee2e2', color: '#b17272', padding: '10px', borderRadius: '4px', marginBottom: '14px' }}>
          {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', background: '#f9fafb', padding: '16px', borderRadius: '6px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input type="text" name="name" placeholder="Company Legal Name" required value={form.name} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="email" name="email" placeholder="Contact Email Address" required value={form.email} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
          <input type="text" name="phone" placeholder="Support Hotline Phone" value={form.phone} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input type="checkbox" name="preferred" checked={form.preferred} onChange={handleChange} />
            Mark as Preferred Vendor
          </label>
        </div>
        <button type="submit" disabled={isPending} style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isPending ? 'Processing...' : 'Register Corporate Vendor'}
        </button>
      </form>

      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Active System Suppliers</h3>
      {loading ? (
        <p>Loading database registry...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Company Name</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((sup) => (
              <tr key={sup.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', fontWeight: sup.preferred ? 'bold' : 'normal' }}>
                  {sup.name} {sup.preferred && '⭐'}
                </td>
                <td style={{ padding: '8px' }}>{sup.email || '-'}</td>
                <td style={{ padding: '8px' }}>{sup.phone || '-'}</td>
                <td style={{ padding: '8px' }}>{sup.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
