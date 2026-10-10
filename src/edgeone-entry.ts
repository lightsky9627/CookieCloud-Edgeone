import { handleRequest } from "./handler";
import { withRestoredBody } from "./utils/http";

export async function onRequest(context: any): Promise<Response> {
  const req = withRestoredBody(context) || context.request;
  return handleRequest(req, context.env);
}

export { handleRequest };
export default onRequest;
