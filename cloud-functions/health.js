import { onRequest as handleRequest } from "../dist-server/edgeone-entry.js";

export function onRequest(context) {
  return handleRequest(context);
}

export default onRequest;
