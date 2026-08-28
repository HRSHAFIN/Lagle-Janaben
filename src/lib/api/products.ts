import { insforge } from '../insforge';
import { Product } from '../../types';

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  category: string;
  image: string | null;
  images: string[] | null;
  material: string | null;
  dimensions: string | null;
  inventory: number;
  rating: number | string;
  featured: boolean;
  status: Product['status'];
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: row.category,
    image: row.image ?? '',
    images: row.images ?? undefined,
    material: row.material,
    dimensions: row.dimensions,
    inventory: row.inventory,
    rating: Number(row.rating),
    featured: row.featured,
    status: row.status,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await insforge.database
    .from('products')
    .select()
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProduct);
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await insforge.database
    .from('products')
    .insert([
      {
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        images: product.images ?? null,
        material: product.material ?? null,
        dimensions: product.dimensions ?? null,
        inventory: product.inventory,
        rating: product.rating,
        featured: product.featured,
        status: product.status,
      },
    ])
    .select();
  if (error) throw new Error(error.message);
  return mapProduct(data![0]);
}

export async function updateProduct(product: Product): Promise<Product> {
  const { data, error } = await insforge.database
    .from('products')
    .update({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      images: product.images ?? null,
      material: product.material ?? null,
      dimensions: product.dimensions ?? null,
      inventory: product.inventory,
      rating: product.rating,
      featured: product.featured,
      status: product.status,
    })
    .eq('id', product.id)
    .select();
  if (error) throw new Error(error.message);
  return mapProduct(data![0]);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await insforge.database.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
