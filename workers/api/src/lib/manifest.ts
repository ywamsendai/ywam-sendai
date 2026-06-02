import type {
  WorkerEnv,
  ManifestRecord,
} from "../types";

function manifestKey(
  documentId: string,
  language: string
) {
  return `manifest:${language}:${documentId}`;
}

export async function getManifest(
  env: WorkerEnv,
  documentId: string,
  language: string
): Promise<ManifestRecord | null> {
  const raw =
    await env.INGEST_MANIFEST.get(
      manifestKey(documentId, language)
    );

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function putManifest(
  env: WorkerEnv,
  documentId: string,
  language: string,
  chunkIds: string[]
) {
  const record: ManifestRecord = {
    chunkIds,

    updatedAt: new Date().toISOString(),

    documentId,
    language: language as any,
  };

  await env.INGEST_MANIFEST.put(
    manifestKey(documentId, language),
    JSON.stringify(record)
  );
}

export async function deleteManifest(
  env: WorkerEnv,
  documentId: string,
  language: string
) {
  await env.INGEST_MANIFEST.delete(
    manifestKey(documentId, language)
  );
}

export async function deleteChunksForDocument(
  env: WorkerEnv,
  documentId: string,
  language: string
): Promise<number> {
  const manifest = await getManifest(
    env,
    documentId,
    language
  );

  if (!manifest) {
    return 0;
  }

  const ids = manifest.chunkIds;

  if (ids.length) {
    await (env.VECTORIZE as any).deleteByIds(
      ids
    );
  }

  await deleteManifest(
    env,
    documentId,
    language
  );

  return ids.length;
}