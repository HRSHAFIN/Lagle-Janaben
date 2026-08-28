import { insforge } from '../insforge';
import { Account } from '../../types';

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Account['role'];
  created_at: string;
}

/** Admin-only: every registered account that has synced a profile row. */
export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await insforge.database
    .from('profiles')
    .select()
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProfileRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
  }));
}
