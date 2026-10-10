import { CORS_HEADERS, jsonResponse, textResponse, methodNotAllowed, decompressGzip } from './utils/http';
import { cookieDecrypt, CryptoType } from './utils/crypto';
import { getStorageDriver, StorageDriver } from './storage/index';

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * 核心请求处理器，支持 EdgeOne Edge Functions 与 Node 云函数环境
 */
export async function handleRequest(request: Request, env: any = {}): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // CORS 跨域预检
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const storage = getStorageDriver(env);

  try {
    // 路由分发
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    // 1. GET /health 健康检查（兼容原版）
    if (pathname === '/health') {
      return jsonResponse({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: Math.round(performance.now() / 1000),
        storage: storage.name,
      });
    }

    // 2. POST /update 接收并保存加密数据（兼容原版，支持 gzip）
    if (pathname === '/update') {
      if (method !== 'POST') return methodNotAllowed();
      return await handleUpdate(request, storage);
    }

    // 3. /get/:uuid 或 /api/get/:uuid 获取或解密 Cookie（兼容原版 GET 与 POST + password）
    if (pathname.startsWith('/get/') || pathname.startsWith('/api/get/')) {
      if (method !== 'GET' && method !== 'POST') return methodNotAllowed();
      const prefix = pathname.startsWith('/get/') ? '/get/' : '/api/get/';
      const uuid = pathname.slice(prefix.length).trim();
      if (!uuid) return textResponse('Bad Request: Missing UUID', 400);
      return await handleGet(request, storage, uuid, url);
    }

    // 4. API 根路径或其它路径
    if (pathname === '/' || pathname === '/api') {
      return jsonResponse({
        message: `CookieCloud Server (EdgeOne)`,
        status: 'online',
        storage: storage.name,
        timestamp: new Date().toISOString(),
      });
    }

    // 404
    return jsonResponse(
      {
        error: 'Not Found',
        message: `The requested URL ${url.pathname} was not found on this server.`,
        path: url.pathname,
        method,
        timestamp: new Date().toISOString(),
      },
      404
    );
  } catch (err: any) {
    console.error('Unhandled server error:', err);
    return textResponse(`Internal Serverless Error: ${err?.message || err}`, 500);
  }
}

/**
 * 处理 POST /update
 */
async function handleUpdate(request: Request, storage: StorageDriver): Promise<Response> {
  let bodyBytes: ArrayBuffer;
  const contentEncoding = request.headers.get('Content-Encoding') || '';

  if (contentEncoding.includes('gzip')) {
    if (!request.body) {
      return textResponse('Bad Request: Empty gzip body', 400);
    }
    bodyBytes = await decompressGzip(request.body as ReadableStream<Uint8Array>);
  } else {
    bodyBytes = await request.arrayBuffer();
  }

  if (bodyBytes.byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ action: 'error', message: 'Request body too large (exceeds 10MB)' }, 413);
  }

  let body: any;
  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return textResponse('Bad Request: Invalid JSON', 400);
  }

  const { encrypted, uuid, crypto_type = 'legacy' } = body || {};

  if (!encrypted || !uuid) {
    return textResponse('Bad Request: Missing required fields (uuid or encrypted)', 400);
  }

  // 写入存储持久化
  await storage.put(uuid, {
    encrypted,
    crypto_type: (crypto_type === 'aes-128-cbc-fixed' ? 'aes-128-cbc-fixed' : 'legacy'),
    updated_at: new Date().toISOString(),
  });

  return jsonResponse({ action: 'done' });
}

/**
 * 处理 GET /get/:uuid 或 POST /get/:uuid（包含 password 解密支持）
 */
async function handleGet(
  request: Request,
  storage: StorageDriver,
  uuid: string,
  url: URL
): Promise<Response> {
  const method = request.method.toUpperCase();
  const queryCryptoType = url.searchParams.get('crypto_type') as CryptoType | null;

  // 1. 从存储中读取
  const record = await storage.get(uuid);
  if (!record) {
    return textResponse('Not Found', 404);
  }

  // 2. 检查是否有 POST 携带 password 要求服务端解密
  let password = '';
  if (method === 'POST') {
    try {
      const cloned = request.clone();
      const contentType = cloned.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const body = await cloned.json();
        password = body?.password || '';
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await cloned.text();
        const params = new URLSearchParams(text);
        password = params.get('password') || '';
      }
    } catch {
      // ignore body parsing error if empty
    }
  }

  // 如果传递了 password，执行服务端解密后返回明文 JSON（原版特性）
  if (password) {
    const useCryptoType: CryptoType = queryCryptoType || record.crypto_type || 'legacy';
    try {
      const decryptedData = cookieDecrypt(uuid, record.encrypted, password, useCryptoType);
      return jsonResponse(decryptedData);
    } catch (err: any) {
      console.warn(`[Decrypt] UUID=${uuid} failed:`, err?.message || err);
      return jsonResponse(
        { action: 'error', message: 'Decryption failed: incorrect password or invalid algorithm' },
        400
      );
    }
  }

  // 否则返回加密数据供客户端自行解密（标准端到端加密模式）
  return jsonResponse({
    encrypted: record.encrypted,
    crypto_type: record.crypto_type || 'legacy',
  });
}
