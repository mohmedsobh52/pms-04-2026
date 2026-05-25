// Normalized historical item interface
export interface NormalizedHistoricalItem {
  id: string;
  item_number: string;
  description: string;
  description_ar: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_code: string;
}

// Column name mapping table
const COLUMN_MAPPINGS: Record<string, string[]> = {
  item_number: ['item', 'no', 'no.', '#', 'م', 'رقم البند', 'item_number', 'البند', 'item no', 'item_no', 'رقم', 'serial', 'sn', 's/n', 'رقم البند'],
  description: ['description', 'desc', 'item description', 'الوصف الانجليزي', 'english description', 'desc.', 'item desc'],
  description_ar: ['وصف البند', 'الوصف', 'البيان', 'الوصف العربي', 'وصف', 'بيان الأعمال', 'بيان'],
  unit: ['unit', 'الوحدة', 'وحدة', 'uom', 'الوحده'],
  quantity: ['quantity', 'الكمية', 'qty', 'الكميه', 'كمية', 'amount', 'qty.'],
  unit_price: ['price', 'سعر الوحدة', 'unit_price', 'unit price', 'سعر', 'rate', 'unit rate', 'سعر الوحده'],
  total_price: ['total', 'الإجمالي', 'الاجمالي', 'total_price', 'المبلغ', 'القيمة', 'إجمالي', 'اجمالي', 'total price', 'amount', 'المبلغ الإجمالي'],
  item_code: ['item code', 'كود البند', 'item_code', 'code', 'الكود', 'كود'],
};

/**
 * Match a column name from the file to a normalized field name
 */
export function matchColumnName(columnName: string): string | null {
  const normalized = columnName.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (const alias of aliases) {
      if (normalized === alias.toLowerCase() || normalized.includes(alias.toLowerCase())) {
        return field;
      }
    }
  }
  return null;
}

/**
 * Generate a simple UUID
 */
function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Parse a numeric value from various formats
 */
function parseNumeric(value: any): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[,،\s]/g, '').replace(/[^\d.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Build a column mapping from headers to normalized field names
 */
function buildColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const field = matchColumnName(header);
    if (field && !usedFields.has(field)) {
      map[header] = field;
      usedFields.add(field);
    }
  }
  return map;
}

/**
 * Normalize raw historical items from varied column formats into a unified BOQ structure
 */
export function normalizeHistoricalItems(rawItems: any[], headers?: string[]): NormalizedHistoricalItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  // Get headers from first item if not provided
  const itemHeaders = headers || Object.keys(rawItems[0] || {});

  // Detect if data is already normalized — keys match canonical field names exactly.
  const canonical = new Set(['item_number','description','description_ar','unit','quantity','unit_price','total_price','item_code']);
  const isAlreadyNormalized = itemHeaders.some(h => canonical.has(h));

  const columnMap = isAlreadyNormalized ? {} : buildColumnMap(itemHeaders);

  return rawItems.map((raw, index) => {
    const item: Partial<NormalizedHistoricalItem> = {
      id: generateId(),
    };


    // Map each raw field to normalized field
    for (const [originalKey, normalizedKey] of Object.entries(columnMap)) {
      const value = raw[originalKey];
      if (value === undefined || value === null) continue;

      switch (normalizedKey) {
        case 'item_number':
          item.item_number = String(value).trim();
          break;
        case 'description':
          item.description = String(value).trim();
          break;
        case 'description_ar':
          item.description_ar = String(value).trim();
          break;
        case 'unit':
          item.unit = String(value).trim();
          break;
        case 'quantity':
          item.quantity = parseNumeric(value);
          break;
        case 'unit_price':
          item.unit_price = parseNumeric(value);
          break;
        case 'total_price':
          item.total_price = parseNumeric(value);
          break;
        case 'item_code':
          item.item_code = String(value).trim();
          break;
      }
    }

    // If no mapping found, try to detect from already normalized keys
    if (!item.item_number && raw.item_number) item.item_number = String(raw.item_number);
    if (!item.description && raw.description) item.description = String(raw.description);
    if (!item.description_ar && raw.description_ar) item.description_ar = String(raw.description_ar);
    if (!item.unit && raw.unit) item.unit = String(raw.unit);
    if (item.quantity === undefined && raw.quantity !== undefined) item.quantity = parseNumeric(raw.quantity);
    if (item.unit_price === undefined && raw.unit_price !== undefined) item.unit_price = parseNumeric(raw.unit_price);
    if (item.total_price === undefined && raw.total_price !== undefined) item.total_price = parseNumeric(raw.total_price);
    if (!item.item_code && raw.item_code) item.item_code = String(raw.item_code);

    // Defaults
    const quantity = item.quantity ?? 0;
    const unitPrice = item.unit_price ?? 0;
    const totalPrice = item.total_price ?? (quantity * unitPrice);

    return {
      id: item.id!,
      item_number: item.item_number || String(index + 1),
      description: item.description || '',
      description_ar: item.description_ar || '',
      unit: item.unit || '',
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice > 0 ? totalPrice : quantity * unitPrice,
      item_code: item.item_code || '',
    };
  });
}

/**
 * Create an empty normalized item
 */
export function createEmptyItem(): NormalizedHistoricalItem {
  return {
    id: generateId(),
    item_number: '',
    description: '',
    description_ar: '',
    unit: '',
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    item_code: '',
  };
}

/**
 * Calculate total price from quantity and unit price
 */
export function calculateTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}
