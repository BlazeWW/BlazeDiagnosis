'use client';

import React, { useState, useEffect } from 'react';

interface IPart {
  id: string;
  name: string;
  partNumber: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string;
  quantityOnHand: string;
  retailPrice: string;
}

export const PartsCatalogPanel: React.FC = () => {
  const [catalog, setCatalog] = useState<IPart[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  const [form, setForm] = useState({
    name: '',
    partNumber: '',
    sku: '',
    brand: '',
    category: '',
    description: '',
    costPrice: '0.00',
    retailPrice: '0.00',
    quantityOnHand: '0.00',
  });

  useEffect(() => {
    refreshCatalog();
  }, []);

  const refreshCatalog = async () => {
    setLoading(true);
    setErrorText(null);
    
    try {
      const res = await fetch('/api/parts');
      if (!res.ok) throw new Error('Failed to retrieve catalog from backend service.');
      
      const data = await res.json();
      setCatalog(data);
    } catch (err: any) {
      setErrorText(err.message || 'Error syncing with backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prevForm => ({ ...prevForm, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorText(null);

    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Express server rejected part registration.');

      resetForm();
      await refreshCatalog();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to sync with API.');
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      partNumber: '',
      sku: '',
      brand: '',
      category: '',
      description: '',
      costPrice: '0.00',
      retailPrice: '0.00',
      quantityOnHand: '0.00',
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '14px' }}>Parts Master Inventory</h2>
      
      {errorText && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '4px', marginBottom: '14px' }}>
          {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', background: '#f9fafb', padding: '16px', borderRadius: '6px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input type="text" name="name" placeholder="Part Name" required value={form.name} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="text" name="partNumber" placeholder="Part Number" required value={form.partNumber} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <input type="text" name="sku" placeholder="SKU Code" value={form.sku} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="text" name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="text" name="category" placeholder="Category" value={form.category} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <input type="number" step="0.01" name="costPrice" placeholder="Cost Price" value={form.costPrice} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="number" step="0.01" name="retailPrice" placeholder="Retail Price" value={form.retailPrice} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="number" step="0.01" name="quantityOnHand" placeholder="Initial Qty" value={form.quantityOnHand} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <textarea name="description" placeholder="Item description log notes..." value={form.description} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        <button type="submit" disabled={isPending} style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isPending ? 'Processing...' : 'Register Catalog Item'}
        </button>
      </form>

      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Active System Stock Profiles</h3>
      {loading ? (
        <p>Parsing database registry...</p>
      ) : catalog.length === 0 ? (
        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No parts registered yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Part Number</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Brand</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Stock Qty</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Retail Price</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{item.name}</td>
                <td style={{ padding: '8px' }}>{item.partNumber}</td>
                <td style={{ padding: '8px' }}>{item.brand || '-'}</td>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.quantityOnHand}</td>
                <td style={{ padding: '8px', color: '#16a34a' }}>${item.retailPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
