import { insforge } from '../insforge';
import { Customer } from '../../types';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  join_date: string;
  total_orders: number;
  total_spent: number | string;
  status: Customer['status'];
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await insforge.database
    .from('customers')
    .select()
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as CustomerRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    joinDate: row.join_date,
    totalOrders: row.total_orders,
    totalSpent: Number(row.total_spent),
    status: row.status,
  }));
}

export async function updateCustomerStatus(id: string, status: Customer['status']): Promise<void> {
  const { error } = await insforge.database.from('customers').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}
