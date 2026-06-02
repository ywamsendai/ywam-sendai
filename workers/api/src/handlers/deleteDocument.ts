import type {
  DeleteDocumentRequest,
  WorkerEnv,
} from "../types";

import {
  deleteChunksForDocument,
} from "../lib/manifest";

export async function handleDeleteDocument(
  request: Request,
  env: WorkerEnv
) {
  const body =
    (await request.json()) as DeleteDocumentRequest;

  const {
    documentId,
    language,
  } = body;

  const deleted =
    await deleteChunksForDocument(
      env,
      documentId,
      language
    );

  return Response.json({
    success: true,
    deleted,
  });
}