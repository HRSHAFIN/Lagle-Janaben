import { insforge } from '../insforge';
import { ShippingSettings } from '../../types';

const DEFAULT_SETTINGS: ShippingSettings = { shipping_fee: 10, free_shipping_threshold: 150 };

export async function fetchShippingSettings(): Promise<ShippingSettings> {
  const { data, error } = await insforge.database
    .from('shipping_settings')
    .select('shipping_fee, free_shipping_threshold')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_SETTINGS;
  return {
    shipping_fee: Number(data.shipping_fee),
    free_shipping_threshold: Number(data.free_shipping_threshold),
  };
}

export async function updateShippingSettings(settings: ShippingSettings): Promise<void> {
  const { error } = await insforge.database
    .from('shipping_settings')
    .update({
      shipping_fee: settings.shipping_fee,
      free_shipping_threshold: settings.free_shipping_threshold,
    })
    .eq('is_active', true);
  if (error) throw new Error(error.message);
}
