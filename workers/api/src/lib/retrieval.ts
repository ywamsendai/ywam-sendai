import type { WorkerEnv } from "../types";
import {
  computeScore,
  detectIntent,
} from "./scoring";

export async function retrieveMatches(
  env: WorkerEnv,
  question: string,
  lang: string
) {
  const embedding = await env.AI.run(
    "@cf/baai/bge-m3",
    {
      text: question,
    }
  );

  const vector =
    (embedding as any)?.data?.[0];

  if (!Array.isArray(vector)) {
    return [];
  }

  const intent = detectIntent(question);

  const results = await env.VECTORIZE.query(
    vector,
    {
      topK: 8,
      returnMetadata: true,

      // IMPORTANT
      filter: {
        language: lang,
      },
    }
  );

  return (results.matches || [])
    .map((m: any) => ({
      ...m,
      rerankScore: computeScore(
        m,
        question,
        intent
      ),
    }))
    .sort(
      (a: any, b: any) =>
        b.rerankScore - a.rerankScore
    )
    .slice(0, 4);
}