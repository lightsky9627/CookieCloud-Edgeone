import { onRequest as handleRequest } from "../dist-server/edgeone-entry.js";

/**
 * EdgeOne Node 云函数规范入口 (Keep tracked in Git for EdgeOne discovery)
 */
export function onRequest(context) {
  return handleRequest(context);
}

export default onRequest;
