import { insforge } from '../insforge';
import { PromoCode } from '../../types';

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await insforge.database
    .from('promo_codes')
    .select()
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PromoCode[];
}

export async function createPromoCode(
  promo: Omit<PromoCode, 'id' | 'used_count' | 'created_at'>
): Promise<PromoCode> {
  const { data, error } = await insforge.database
    .from('promo_codes')
    .insert([
      {
        code: promo.code.toUpperCase().trim(),
        type: promo.type,
        value: promo.value,
        min_order_amount: promo.min_order_amount,
        usage_limit: promo.usage_limit,
        is_active: promo.is_active,
        expires_at: promo.expires_at,
      },
    ])
    .select();
  if (error) throw new Error(error.message);
  return data![0] as PromoCode;
}

export async function deletePromoCode(id: string): Promise<void> {
  const { error } = await insforge.database.from('promo_codes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface PromoValidation {
  valid: boolean;
  discount: number;
  error?: string;
  code?: string;
}

export async function validatePromo(code: string, subtotal: number): Promise<PromoValidation> {
  const { data, error } = await insforge.database.rpc('validate_promo', {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error) throw new Error(error.message);
  const result = data as { valid: boolean; discount?: number; error?: string; code?: string };
  return { valid: result.valid, discount: Number(result.discount ?? 0), error: result.error, code: result.code };
}
