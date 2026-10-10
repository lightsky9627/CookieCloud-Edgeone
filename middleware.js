// EdgeOne Makers 边缘中间件：API 路由定向与静态回退
//
// 1. 如果请求为 CookieCloud API (/update, /get/*, /health, /api/*)，放行到 Edge Functions / Cloud Functions 处理
// 2. 静态页面（/assets/*, /icon.png, / 等）直接返回静态发布目录 dist 中的资源

export function middleware(context) {
  const request = context.request;
  const url = new URL(request.url);
  const pathname = url.pathname;

  const isApi =
    pathname === '/health' ||
    pathname === '/update' ||
    pathname.startsWith('/get/') ||
    pathname.startsWith('/api/');

  // 非 API 且请求 HTML 根路径或静态资源时，直接放行静态托管
  return context.next();
}
