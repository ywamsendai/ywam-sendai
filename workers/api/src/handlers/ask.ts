import type {
  AskRequest,
  ChatMessage,
  WorkerEnv,
} from "../types";

import { retrieveMatches } from "../lib/retrieval";
import { buildContext } from "../lib/context";
import { buildPrompt } from "../lib/prompts";

export async function askHandler(
  request: Request,
  env: WorkerEnv
) {
  const {
    question,
    lang,
    history = [],
  } = (await request.json()) as AskRequest;

  const matches = await retrieveMatches(
    env,
    question,
    lang
  );

  if (!matches.length) {
    return Response.json({
      answer:
        lang === "ja"
          ? "申し訳ありません。その情報は見つかりませんでした。"
          : "Sorry, I couldn't find that information.",
      sources: [],
    });
  }

  const context = buildContext(matches);

  const prompt = buildPrompt(
    lang,
    context
  );

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: prompt,
    },
    ...history.slice(-4),
    {
      role: "user",
      content: question,
    },
  ];

  const ai = await env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages,
      max_tokens: 900,
    }
  );

  return Response.json({
    answer:
      (ai as any)?.response ??
      "No answer generated.",
    sources: matches.map((m: any) => ({
      title: m.metadata?.title,
      path: m.metadata?.documentId,
    })),
  });
}