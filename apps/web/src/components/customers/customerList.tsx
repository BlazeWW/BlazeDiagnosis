'use client';

import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import {
  EmptyState,
  ResponsiveTable,
  tableCellClassName,
  tableHeadClassName,
} from '@/components/data-display';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchCustomers } from '@/lib/apiClient';
import type { Customer } from '@/types/customers';
import { useRouter } from 'next/navigation';
import { deleteCustomer } from '@/lib/apiClient';

function getCustomerName(customer: Customer) {
  const name = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();
  return name || 'Unnamed customer';
}

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleDelete = async (id: string) => {
  if (!confirm('Archive this customer?')) return;
  try {
    await deleteCustomer(id);
    setCustomers((current) => current.filter((c) => c.id !== id));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete customer.');
  }
};
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setError(null);
        setLoading(true);

        const data = await fetchCustomers();
        setCustomers(data.customers);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load customer directory.',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        getCustomerName(customer),
        customer.email,
        customer.phone,
        customer.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [customers, query]);

  return (
    <Card>
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Customer directory</CardTitle>
          <CardDescription>
            Search tenant customers and verify contact details before opening a
            service request.
          </CardDescription>
        </div>
        <div className="w-full md:max-w-xs">
          <Input
            aria-label="Search customers"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone..."
            value={query}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            Loading customer directory...
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!loading && filteredCustomers.length === 0 ? (
          <EmptyState
            description="No customer records matched the current filter. Add a customer or clear the search field."
            title="No customers found"
          />
        ) : null}

        {!loading && filteredCustomers.length > 0 ? (
          <ResponsiveTable>
            <thead>
              <tr className={tableHeadClassName}>
                <th className={tableCellClassName}>Name</th>
                <th className={tableCellClassName}>Email</th>
                <th className={tableCellClassName}>Phone</th>
                <th className={tableCellClassName}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => (
                <tr
                  className=" cursor-pointer transition hover:bg-muted/40"
                  key={customer.id}
                  onClick={() =>
                    router.push(`/station/customers/${customer.id}` as Route)
                  }
                >
                  <td
                    className={`${tableCellClassName} font-semibold text-foreground`}
                  >
                    {getCustomerName(customer)}
                  </td>
                  <td className={`${tableCellClassName} text-muted-foreground`}>
                    {customer.email ?? '—'}
                  </td>
                  <td className={`${tableCellClassName} text-muted-foreground`}>
                    {customer.phone ?? '—'}
                  </td>
                  <td className={tableCellClassName}>
                    <StatusBadge
                      tone={
                        (customer.status ?? 'Active') === 'Pending'
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {customer.status ?? 'Active'}
                    </StatusBadge>
                  </td>
                  <td className={tableCellClassName}>
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={(e) => { e.stopPropagation(); void handleDelete(customer.id); }}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        ) : null}
      </CardContent>
    </Card>
  );
}
