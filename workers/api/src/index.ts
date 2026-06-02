import type { WorkerEnv } from "./types";

import { askHandler } from "./handlers/ask";
import { handleIngest } from "./handlers/ingest";
import { handleDeleteDocument } from "./handlers/deleteDocument";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(
    request: Request,
    env: WorkerEnv
  ) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    let response: Response;

    if (
      url.pathname === "/ask" &&
      request.method === "POST"
    ) {
      response = await askHandler(request, env);
    } else if (
      url.pathname === "/ingest" &&
      request.method === "POST"
    ) {
      response = await handleIngest(request, env);
    } else if (
      url.pathname === "/delete-document" &&
      request.method === "POST"
    ) {
      response = await handleDeleteDocument(
        request,
        env
      );
    } else {
      response = new Response("Not Found", {
        status: 404,
      });
    }

    const headers = new Headers(response.headers);

    Object.entries(corsHeaders).forEach(
      ([key, value]) => {
        headers.set(key, value);
      }
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};