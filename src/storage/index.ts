import { getStore } from '@edgeone/pages-blob';

export interface CookieRecord {
  encrypted: string;
  crypto_type: 'legacy' | 'aes-128-cbc-fixed';
  updated_at?: string;
}

export interface StorageDriver {
  name: string;
  get(uuid: string): Promise<CookieRecord | null>;
  put(uuid: string, record: CookieRecord): Promise<void>;
  delete?(uuid: string): Promise<void>;
}

const KV_KEY_PREFIX = 'cookie:';
const BLOB_STORE_NAME = 'cookiecloud';

/**
 * 校验对象是否具备 KV 绑定接口特征
 */
function isKvLike(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.get === 'function' &&
    typeof obj.put === 'function'
  );
}

/**
 * 解析 EdgeOne / Workers 环境中的 KV 命名空间绑定
 */
function resolveKvBinding(env: any): any | null {
  if (isKvLike(env?.COOKIE_DATA)) return env.COOKIE_DATA;
  if (isKvLike(env?.KV)) return env.KV;
  if (isKvLike((globalThis as any)?.COOKIE_DATA)) return (globalThis as any).COOKIE_DATA;
  if (isKvLike((globalThis as any)?.KV)) return (globalThis as any).KV;
  return null;
}

/**
 * 创建 KV 驱动
 */
function createKvDriver(kv: any): StorageDriver {
  return {
    name: 'EdgeOne KV',
    async get(uuid: string): Promise<CookieRecord | null> {
      const val = await kv.get(`${KV_KEY_PREFIX}${uuid}`, { type: 'text' });
      if (!val) return null;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    },
    async put(uuid: string, record: CookieRecord): Promise<void> {
      await kv.put(`${KV_KEY_PREFIX}${uuid}`, JSON.stringify(record));
    },
    async delete(uuid: string): Promise<void> {
      if (typeof kv.delete === 'function') {
        await kv.delete(`${KV_KEY_PREFIX}${uuid}`);
      }
    },
  };
}

/**
 * 创建 EdgeOne Pages Blob 驱动
 */
function createBlobDriver(env: any): StorageDriver {
  // EdgeOne Pages Functions 内自动鉴权；若通过环境变量配置 API Token 也支持
  const token = env?.PAGES_BLOB_TOKEN || env?.BLOB_TOKEN;
  const projectId = env?.PAGES_PROJECT_ID;

  let store: any;
  if (token && projectId) {
    store = getStore({
      name: BLOB_STORE_NAME,
      token,
      projectId,
      consistency: 'strong',
    });
  } else {
    store = getStore({
      name: BLOB_STORE_NAME,
      consistency: 'strong',
    });
  }

  return {
    name: 'EdgeOne Blob Storage',
    async get(uuid: string): Promise<CookieRecord | null> {
      try {
        const val = await store.get(`${KV_KEY_PREFIX}${uuid}`, { type: 'json' });
        if (!val) return null;
        if (typeof val === 'string') {
          return JSON.parse(val);
        }
        return val as CookieRecord;
      } catch (err: any) {
        // Blob 404 返回 null
        if (err?.status === 404) return null;
        console.warn(`[Blob] get key="${uuid}" error:`, err?.message || err);
        return null;
      }
    },
    async put(uuid: string, record: CookieRecord): Promise<void> {
      await store.setJSON(`${KV_KEY_PREFIX}${uuid}`, record);
    },
    async delete(uuid: string): Promise<void> {
      await store.delete(`${KV_KEY_PREFIX}${uuid}`);
    },
  };
}

/**
 * 内存回退驱动（本地单测或无云存储凭据开发时使用）
 */
class MemoryDriver implements StorageDriver {
  name = 'Memory Storage (Temporary)';
  private map = new Map<string, string>();

  async get(uuid: string): Promise<CookieRecord | null> {
    const raw = this.map.get(uuid);
    return raw ? JSON.parse(raw) : null;
  }

  async put(uuid: string, record: CookieRecord): Promise<void> {
    this.map.set(uuid, JSON.stringify(record));
  }

  async delete(uuid: string): Promise<void> {
    this.map.delete(uuid);
  }
}

const memoryDriverSingleton = new MemoryDriver();

/**
 * 根据环境变量与上下文自动选择存储后端
 * 优先级：
 * 1. 显式指定 STORAGE_DRIVER=kv 或 COOKIE_DATA / KV 绑定存在 -> 使用 KV
 * 2. 显式指定 STORAGE_DRIVER=blob 或 EdgeOne 默认环境 -> 使用 EdgeOne Pages Blob SDK
 * 3. 显式指定 STORAGE_DRIVER=memory 或回退 -> 内存
 */
export function getStorageDriver(env: any = {}): StorageDriver {
  const driverType = String(env?.STORAGE_DRIVER || '').toLowerCase();

  if (driverType === 'memory') {
    return memoryDriverSingleton;
  }

  const kv = resolveKvBinding(env);
  if (driverType === 'kv') {
    if (kv) return createKvDriver(kv);
    throw new Error('STORAGE_DRIVER is set to "kv" but no KV binding (COOKIE_DATA or KV) was found.');
  }

  if (kv) {
    return createKvDriver(kv);
  }

  try {
    return createBlobDriver(env);
  } catch (err) {
    console.warn('[Storage] Blob init fallback to memory:', err);
    return memoryDriverSingleton;
  }
}
