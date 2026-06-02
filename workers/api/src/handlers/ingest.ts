import type {
  WorkerEnv,
} from "../types";

import type {
  IngestRequest,
} from "../../../../content/schema";

import { embed } from "../lib/embeddings";

import {
  getManifest,
  putManifest,
} from "../lib/manifest";

import { toVectorMetadata }
  from "../lib/vectorMetadata";

export async function handleIngest(
  request: Request,
  env: WorkerEnv
) {
  const body =
    (await request.json()) as IngestRequest;

  const {
    id,
    text,
    metadata,
  } = body;

  if (
    !id ||
    !text ||
    !metadata
  ) {
    return Response.json(
      {
        success: false,
        error: "Invalid payload",
      },
      { status: 400 }
    );
  }

  const vector = await embed(
    env,
    text
  );

  await env.VECTORIZE.upsert([
    {
      id,
      values: vector,
      metadata: toVectorMetadata(metadata),
    },
  ]);

  const existing =
    await getManifest(
      env,
      metadata.documentId,
      metadata.language
    );

  const ids = Array.from(
    new Set([
      ...(existing?.chunkIds ?? []),
      id,
    ])
  );

  await putManifest(
    env,
    metadata.documentId,
    metadata.language,
    ids
  );

  return Response.json({
    success: true,
    id,
  });
}