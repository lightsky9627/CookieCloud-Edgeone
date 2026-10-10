import { handleRequest } from "../src/handler";
import { withRestoredBody } from "../src/utils/http";

/**
 * EdgeOne Edge Functions 入口规范
 * 导出的 onRequest 接收 context: { request, env, waitUntil, params, next }
 */
export async function onRequest(context: any): Promise<Response> {
  const req = withRestoredBody(context) || context.request;
  return handleRequest(req, context.env);
}

export default onRequest;
