import { isSupabaseConfigured, supabase } from './supabase';

type EntityTable = 'products' | 'orders' | 'customers' | 'coupons';

interface StoredEntity<T extends { id: string }> {
  id: string;
  data: T;
  [key: string]: unknown;
}

const PRODUCT_COLUMNS = [
  'sku',
  'brand',
  'slug',
  'product_form',
  'net_weight',
  'country_of_origin',
  'shelf_life',
  'skin_type',
  'concerns',
  'claims',
  'seo_title',
  'seo_description',
  'tags',
  'status',
  'is_featured',
  'is_new_arrival',
  'is_best_seller',
  'sort_order',
  'is_cruelty_free',
  'is_vegan',
  'is_derma_tested',
  'shipping_weight',
  'is_free_shipping',
  'estimated_delivery',
  'return_policy',
  'warranty_info',
  'product_video_url',
  'has_variants',
  'variant_type',
  'variants',
] as const;

const warnSupabaseError = (action: string, error: unknown) => {
  if ((import.meta as any).env?.DEV) {
    console.warn(`Supabase ${action} failed. Falling back to local state.`, error);
  }
};

const canUseSupabase = () => isSupabaseConfigured && supabase;

const naturalIdNumber = (id: string) => Number(id.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);

export async function listEntities<T extends { id: string }>(table: EntityTable): Promise<T[] | null> {
  if (!canUseSupabase()) return null;

  const selectColumns = table === 'products'
    ? `id,data,${PRODUCT_COLUMNS.join(',')}`
    : 'id,data';

  const { data, error } = await supabase!
    .from(table)
    .select(selectColumns)
    .order('updated_at', { ascending: false });

  if (error) {
    warnSupabaseError(`list ${table}`, error);
    return null;
  }

  const entities = (data as unknown as StoredEntity<T>[]).map(row => {
    if (table !== 'products') return { ...row.data, id: row.id };

    const columnData = PRODUCT_COLUMNS.reduce<Record<string, unknown>>((acc, column) => {
      if (row[column] !== null && row[column] !== undefined) {
        acc[column] = row[column];
      }
      return acc;
    }, {});

    return { ...columnData, ...row.data, id: row.id };
  });

  if (table === 'orders') {
    return entities.sort((a, b) => {
      const aDate = Date.parse((a as T & { date?: string }).date || '');
      const bDate = Date.parse((b as T & { date?: string }).date || '');
      return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
    });
  }

  return entities.sort((a, b) => naturalIdNumber(a.id) - naturalIdNumber(b.id));
}

export async function upsertEntity<T extends { id: string }>(table: EntityTable, entity: T) {
  return upsertEntities(table, [entity]);
}

export async function upsertEntities<T extends { id: string }>(table: EntityTable, entities: T[]) {
  if (!canUseSupabase()) return false;

  const payload = entities.map(entity => {
    const base: Record<string, unknown> = { id: entity.id, data: entity };

    if (table === 'products') {
      PRODUCT_COLUMNS.forEach(column => {
        base[column] = (entity as Record<string, unknown>)[column];
      });
    }

    return base;
  });

  const { error } = await supabase!
    .from(table)
    .upsert(payload);

  if (error) {
    warnSupabaseError(`upsert ${table}`, error);
    return false;
  }

  return true;
}

export async function replaceEntities<T extends { id: string }>(table: EntityTable, entities: T[]) {
  if (!canUseSupabase()) return false;

  return upsertEntities(table, entities);
}

export async function deleteEntity(table: EntityTable, id: string) {
  if (!canUseSupabase()) return false;

  const { error } = await supabase!
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    warnSupabaseError(`delete ${table}`, error);
    return false;
  }

  return true;
}

export async function getStoreValue<T>(key: string): Promise<T | null> {
  if (!canUseSupabase()) return null;

  const { data, error } = await supabase!
    .from('store_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    warnSupabaseError(`get setting ${key}`, error);
    return null;
  }

  return data?.value as T | null;
}

export async function setStoreValue<T>(key: string, value: T) {
  if (!canUseSupabase()) return false;

  const { error } = await supabase!
    .from('store_settings')
    .upsert({ key, value });

  if (error) {
    warnSupabaseError(`set setting ${key}`, error);
    return false;
  }

  return true;
}
