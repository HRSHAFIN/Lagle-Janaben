import { supabase } from '../supabase';
import { HeroSlide } from '../../types';

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from('hero_slides')
    .select()
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HeroSlide[];
}

export async function uploadHeroImage(file: File): Promise<{ url: string; key: string }> {
  const key = `hero/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const bucket = supabase.storage.from('public-assets');
  const { data, error } = await bucket.upload(key, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return { url: bucket.getPublicUrl(data.path).data.publicUrl, key: data.path };
}

export async function createHeroSlide(
  slide: Omit<HeroSlide, 'id'>
): Promise<HeroSlide> {
  const { data, error } = await supabase.from('hero_slides').insert([slide]).select();
  if (error) throw new Error(error.message);
  return data![0] as HeroSlide;
}

export async function updateHeroSlide(
  id: string,
  patch: Partial<Omit<HeroSlide, 'id'>>
): Promise<HeroSlide> {
  const { data, error } = await supabase.from('hero_slides').update(patch).eq('id', id).select();
  if (error) throw new Error(error.message);
  return data![0] as HeroSlide;
}

export async function deleteHeroSlide(slide: HeroSlide): Promise<void> {
  const { error } = await supabase.from('hero_slides').delete().eq('id', slide.id);
  if (error) throw new Error(error.message);
  if (slide.image_key) {
    await supabase.storage.from('public-assets').remove([slide.image_key]);
  }
}
