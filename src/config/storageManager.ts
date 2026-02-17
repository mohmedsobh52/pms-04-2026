// Storage Keys Manager - Unified storage management system
const STORAGE_KEYS = {
  AUTO_SAVE: 'app_auto_save_data',
  BALANCE_SETTINGS: 'app_balance_settings',
  ANALYSIS_SESSION: 'app_analysis_session',
  ANALYSIS_TRACKING: 'app_analysis_tracking',
  NAV_HISTORY: 'app_nav_history',
  EDITED_PRICES: 'app_edited_prices',
  COMPANY_SETTINGS: 'app_company_settings',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

interface StorageOptions {
  prefix?: string;
  version?: number;
}

interface StorageData<T> {
  version: number;
  timestamp: number;
  value: T;
}

class StorageManager {
  private prefix: string;
  private version: number;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || 'pms_';
    this.version = options.version || 1;
  }

  private getKey(key: StorageKey): string {
    return `${this.prefix}v${this.version}_${key}`;
  }

  set<T>(key: StorageKey, value: T, storage: 'local' | 'session' = 'local'): boolean {
    try {
      const store = storage === 'local' ? localStorage : sessionStorage;
      const fullKey = this.getKey(key);
      const data: StorageData<T> = {
        version: this.version,
        timestamp: Date.now(),
        value,
      };
      store.setItem(fullKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Storage error setting ${key}:`, error);
      return false;
    }
  }

  get<T>(key: StorageKey, storage: 'local' | 'session' = 'local'): T | null {
    try {
      const store = storage === 'local' ? localStorage : sessionStorage;
      const fullKey = this.getKey(key);
      const item = store.getItem(fullKey);
      
      if (!item) return null;
      
      const data: StorageData<T> = JSON.parse(item);
      if (data.version !== this.version) {
        console.warn(`Storage version mismatch for ${key}`);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.error(`Storage error getting ${key}:`, error);
      return null;
    }
  }

  remove(key: StorageKey, storage: 'local' | 'session' = 'local'): boolean {
    try {
      const store = storage === 'local' ? localStorage : sessionStorage;
      const fullKey = this.getKey(key);
      store.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`Storage error removing ${key}:`, error);
      return false;
    }
  }

  clear(storage: 'local' | 'session' = 'local'): void {
    try {
      const store = storage === 'local' ? localStorage : sessionStorage;
      const keys = Object.keys(store);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          store.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage error clearing:', error);
    }
  }

  isExpired(key: StorageKey, maxAgeMs: number, storage: 'local' | 'session' = 'local'): boolean {
    try {
      const store = storage === 'local' ? localStorage : sessionStorage;
      const fullKey = this.getKey(key);
      const item = store.getItem(fullKey);
      
      if (!item) return true;
      
      const data: StorageData<unknown> = JSON.parse(item);
      const age = Date.now() - data.timestamp;
      return age > maxAgeMs;
    } catch (error) {
      return true;
    }
  }
}

export const storageManager = new StorageManager({ prefix: 'pms_', version: 1 });
export { STORAGE_KEYS, type StorageKey, type StorageData };