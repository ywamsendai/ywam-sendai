import type { WorkerEnv } from "./types";

import { askHandler } from "./handlers/ask";
import { handleIngest } from "./handlers/ingest";
import { handleDeleteDocument } from "./handlers/deleteDocument";

export default {
  async fetch(
    request: Request,
    env: WorkerEnv
  ) {
    const url = new URL(request.url);

    if (
      url.pathname === "/ask" &&
      request.method === "POST"
    ) {
      return askHandler(request, env);
    }

    if (
      url.pathname === "/ingest" &&
      request.method === "POST"
    ) {
      return handleIngest(request, env);
    }

    if (
      url.pathname === "/delete-document" &&
      request.method === "POST"
    ) {
      return handleDeleteDocument(
        request,
        env
      );
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
};