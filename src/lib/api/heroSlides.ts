import { insforge } from '../insforge';
import { HeroSlide } from '../../types';

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await insforge.database
    .from('hero_slides')
    .select()
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HeroSlide[];
}

export async function uploadHeroImage(file: File): Promise<{ url: string; key: string }> {
  const key = `hero/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { data, error } = await insforge.storage.from('public-assets').upload(key, file);
  if (error) throw new Error(error.message);
  return { url: data!.url, key: data!.key };
}

export async function createHeroSlide(
  slide: Omit<HeroSlide, 'id'>
): Promise<HeroSlide> {
  const { data, error } = await insforge.database.from('hero_slides').insert([slide]).select();
  if (error) throw new Error(error.message);
  return data![0] as HeroSlide;
}

export async function updateHeroSlide(
  id: string,
  patch: Partial<Omit<HeroSlide, 'id'>>
): Promise<HeroSlide> {
  const { data, error } = await insforge.database.from('hero_slides').update(patch).eq('id', id).select();
  if (error) throw new Error(error.message);
  return data![0] as HeroSlide;
}

export async function deleteHeroSlide(slide: HeroSlide): Promise<void> {
  const { error } = await insforge.database.from('hero_slides').delete().eq('id', slide.id);
  if (error) throw new Error(error.message);
  if (slide.image_key) {
    await insforge.storage.from('public-assets').remove(slide.image_key);
  }
}
