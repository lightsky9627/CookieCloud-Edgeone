// EdgeOne 边缘中间件：请求路由与 SPA 回退
export function middleware(context) {
  const { request, next, rewrite } = context
  const { pathname } = new URL(request.url)
  const accept = request.headers.get("accept") || ""

  // 后端 API 路由：直通 cloud-functions/[[default]].js 处理
  const isBackend =
    pathname === "/health" ||
    pathname === "/update" ||
    /^\/(get|api)(\/|$)/.test(pathname)

  // 浏览器访问页面（非 API 且要求 text/html）透明回退到 /index.html 静态页
  if (
    !isBackend &&
    (request.method === "GET" || request.method === "HEAD") &&
    accept.includes("text/html")
  ) {
    return rewrite("/index.html")
  }

  return next()
}
