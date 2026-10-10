// EdgeOne 在项目构建前扫描 Node 云函数入口。
// 实际后端由 scripts/build.mjs 打包输出到 dist-server/edgeone-entry.js。
import { onRequest as handleRequest } from "../dist-server/edgeone-entry.js"

export function onRequest(context) {
  return handleRequest(context)
}

export default onRequest
