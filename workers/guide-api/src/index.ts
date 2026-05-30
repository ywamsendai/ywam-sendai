import { z } from "zod";
import type { VectorMetadata } from "../../../content/schema";

/* ----------------------------------------
   ENV
---------------------------------------- */

interface Env {
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  INGEST_MANIFEST: KVNamespace;
}

/* ----------------------------------------
   TYPES
---------------------------------------- */

type Intent =
  | "dts"
  | "dbs"
  | "apply"
  | "community"
  | "staff"
  | "students"
  | "general";

type MatchMetadata = VectorMetadata & {
  text?: string;
  section?: string;
};

/* ----------------------------------------
   UTILS
---------------------------------------- */

function safeString(v: any): string {
  return typeof v === "string" ? v : "";
}

function normalizeQuestion(q: string) {
  return q.toLowerCase().trim();
}

/* ----------------------------------------
   INTENT DETECTION
---------------------------------------- */

function detectIntent(q: string): Intent {
  const t = q.toLowerCase();

  if (t.includes("dts")) return "dts";
  if (t.includes("dbs")) return "dbs";

  if (
    t.includes("apply") ||
    t.includes("application") ||
    t.includes("申し込み") ||
    t.includes("応募")
  ) {
    return "apply";
  }

  if (
    t.includes("community") ||
    t.includes("housing") ||
    t.includes("living") ||
    t.includes("生活")
  ) {
    return "community";
  }

  if (t.includes("staff") || t.includes("スタッフ")) return "staff";

  if (t.includes("student") || t.includes("students") || t.includes("学生"))
    return "students";

  return "general";
}

/* ----------------------------------------
   RETRIEVAL STRATEGY
---------------------------------------- */

function getStrategy(intent: Intent) {
  switch (intent) {
    case "dts":
      return { topK: 10, category: "schools", boostAudience: null };

    case "dbs":
      return { topK: 10, category: "schools", boostAudience: null };

    case "apply":
      return { topK: 12, category: "operations", boostAudience: null };

    case "community":
      return { topK: 8, category: "community", boostAudience: null };

    case "staff":
      return { topK: 8, category: null, boostAudience: ["staff"] };

    case "students":
      return { topK: 8, category: null, boostAudience: ["students"] };

    default:
      return { topK: 6, category: null, boostAudience: null };
  }
}

/* ----------------------------------------
   KEYWORD SCORING (HYBRID LAYER)
---------------------------------------- */

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordScore(question: string, text: string): number {
  const q = normalizeQuestion(question);
  const t = text.toLowerCase();

  const words = q.split(/\s+/).filter((w) => w.length > 2);

  let score = 0;

  for (const w of words) {
    if (t.includes(w)) score += 0.02;

    const regex = new RegExp(`\\b${escapeRegExp(w)}\\b`, "i");
    if (regex.test(text)) score += 0.03;
  }

  return Math.min(score, 0.25);
}

/* ----------------------------------------
   INTENT SCORING (DOMAIN BOOST)
---------------------------------------- */

function intentScore(
  intent: Intent,
  md: MatchMetadata,
  question: string
): number {
  let score = 0;

  const category = md.category;
  const audience = md.audience || [];
  const q = normalizeQuestion(question);

  if (intent === "dts" && category === "schools") score += 0.12;
  if (intent === "dbs" && category === "schools") score += 0.12;

  if (intent === "apply" && category === "operations") score += 0.12;

  if (intent === "community" && category === "community") score += 0.12;

  if (intent === "staff" && audience.includes("staff")) score += 0.1;

  if (intent === "students" && audience.includes("students")) score += 0.1;

  if (intent === "dts" && q.includes("lecture")) score += 0.05;
  if (intent === "dbs" && q.includes("weeks")) score += 0.05;

  return score;
}

/* ----------------------------------------
   FINAL RERANK SCORE
---------------------------------------- */

function computeScore(
  match: any,
  question: string,
  intent: Intent
): number {
  const md = match.metadata || {};

  const vector = match.score || 0;
  const text = md.text || "";

  const k = keywordScore(question, text);
  const i = intentScore(intent, md, question) * 0.01;

  return vector + k + i;
}

/* ----------------------------------------
   CONTEXT BUILDER
---------------------------------------- */

function buildContext(matches: any[]) {
  return matches
    .map((m, i) => {
      const md = m.metadata || {};

      return [
        `SOURCE ${i + 1}`,
        `TITLE: ${safeString(md.title)}`,
        `CATEGORY: ${safeString(md.category)}`,
        `AUDIENCE: ${(md.audience || []).join(", ")}`,
        `SECTION: ${safeString(md.section)}`,
        ``,
        safeString(md.text),
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

/* ----------------------------------------
   SYSTEM PROMPT
---------------------------------------- */

function buildPrompt(lang: string, context: string) {
  if (lang === "ja") {
    return `
あなたはYWAM Sendaiの案内アシスタントです。

ルール:
- 提供された情報のみ使用
- 推測しない
- コンテキストに言及しない
- Markdownで回答

情報:
${context}
`;
  }

  return `
You are a YWAM Sendai assistant.

Rules:
- Use only provided information
- Do not guess
- Do not mention sources or context
- Respond in Markdown

INFORMATION:
${context}
`;
}

/* ----------------------------------------
   MAIN HANDLER
---------------------------------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname !== "/ask") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const body = (await request.json()) as any;

      const question = body?.question;
      const lang = body?.lang;
      const history = body?.history ?? [];

      if (!question || !lang) {
        return new Response(
          JSON.stringify({
            answer: "Missing question or lang",
            sources: [],
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      const intent = detectIntent(question);
      const strategy = getStrategy(intent);

      const embedding = (await env.AI.run("@cf/baai/bge-m3", {
        text: question,
      })) as any;

      const vector =
        embedding?.data?.[0] ??
        embedding?.data ??
        null;

      if (!Array.isArray(vector)) {
        return new Response(
          JSON.stringify({
            answer: "Embedding failed",
            sources: [],
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      /* ----------------------------------------
         3. VECTOR SEARCH
      ---------------------------------------- */

      const results = await env.VECTORIZE.query(vector, {
        topK: strategy.topK,
        returnMetadata: true,
        filter: { lang },
      });

      const matches = results.matches || [];

      /* ----------------------------------------
         4. HYBRID RERANK
      ---------------------------------------- */

      const reranked = matches
        .map((m: any) => ({
          ...m,
          rerankScore: computeScore(m, question, intent),
        }))
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, 4);

      const hasMatches =
        reranked.length > 0 &&
        reranked[0].rerankScore > 0.22;

      const context = hasMatches ? buildContext(reranked) : "";

      /* ----------------------------------------
         5. FALLBACK
      ---------------------------------------- */

      if (!context) {
        return Response.json({
          answer:
            lang === "ja"
              ? "申し訳ありません。その情報は見つかりませんでした。"
              : "Sorry, I couldn't find that information.",
          sources: [],
        });
      }

      /* ----------------------------------------
         6. LLM
      ---------------------------------------- */

      const prompt = buildPrompt(lang, context);

      const messages = [
        { role: "system", content: prompt },
        ...history.slice(-4),
        { role: "user", content: question },
      ];

      const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages,
        max_tokens: 900,
      });

      const answer =
        ai?.response ||
        ai?.answer ||
        "No response generated.";

      return Response.json({
        answer,
        sources: reranked.map((m: any) => ({
          title: m.metadata?.title,
          path: m.metadata?.documentId,
        })),
      });
    } catch (e: any) {
      return Response.json({
        answer: "Server error",
        sources: [],
      });
    }
  },
};