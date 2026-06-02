import type { WorkerEnv } from "../types";

export const EMBEDDING_MODEL =
  "@cf/baai/bge-m3";

export async function embed(
  env: WorkerEnv,
  text: string
): Promise<number[]> {
  const response = (await env.AI.run(
    EMBEDDING_MODEL,
    {
      text,
    }
  )) as any;

  const vector =
    response?.data?.[0] ??
    response?.data;

  if (!Array.isArray(vector)) {
    throw new Error(
      "Failed to generate embedding"
    );
  }

  return vector;
}