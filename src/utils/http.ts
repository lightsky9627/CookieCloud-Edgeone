// ── CORS Headers ──
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

export function textResponse(message: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(message, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

export function methodNotAllowed(): Response {
  return textResponse('Method Not Allowed', 405);
}

/**
 * 解压 gzip 请求体（EdgeOne / Web API 标准 DecompressionStream）
 */
export async function decompressGzip(body: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('gzip');
  const decompressed = body.pipeThrough(ds);
  return new Response(decompressed).arrayBuffer();
}

/**
 * 兼容 EdgeOne 并发或预读丢失请求体（_rawBodyBuffer 兜底）
 */
export function withRestoredBody(context: any): Request {
  const request: any = context?.request;
  if (!request) return request;

  const buffer = request._rawBodyBuffer;
  const length = buffer?.byteLength ?? buffer?.length ?? 0;
  if (!buffer || length <= 0) return request;

  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return request;

  const headers = new Headers(request.headers);
  try {
    return new Request(request.url, {
      method,
      headers,
      body: buffer,
      redirect: request.redirect,
    });
  } catch {
    return request;
  }
}
