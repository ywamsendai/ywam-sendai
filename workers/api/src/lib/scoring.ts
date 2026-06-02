import type { MatchMetadata } from "../types";

export type Intent =
  | "dts"
  | "dbs"
  | "apply"
  | "community"
  | "staff"
  | "students"
  | "general";

function normalizeQuestion(q: string) {
  return q.toLowerCase().trim();
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectIntent(q: string): Intent {
  const t = q.toLowerCase();

  if (t.includes("dts")) return "dts";
  if (t.includes("dbs")) return "dbs";

  if (
    t.includes("apply") ||
    t.includes("application") ||
    t.includes("応募") ||
    t.includes("申し込み")
  ) {
    return "apply";
  }

  if (
    t.includes("community") ||
    t.includes("housing") ||
    t.includes("living")
  ) {
    return "community";
  }

  if (t.includes("staff")) return "staff";

  if (t.includes("student")) return "students";

  return "general";
}

export function computeScore(
  match: any,
  question: string,
  intent: Intent
): number {
  const md = (match.metadata || {}) as MatchMetadata;

  let score = match.score || 0;

  const text = md.text || "";
  const words = normalizeQuestion(question)
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const w of words) {
    if (text.toLowerCase().includes(w)) {
      score += 0.02;
    }

    const regex = new RegExp(
      `\\b${escapeRegExp(w)}\\b`,
      "i"
    );

    if (regex.test(text)) {
      score += 0.03;
    }
  }

  if (intent === "dts" && md.category === "schools") {
    score += 0.12;
  }

  if (intent === "dbs" && md.category === "schools") {
    score += 0.12;
  }

  if (
    intent === "staff" &&
    md.audience?.includes("staff")
  ) {
    score += 0.1;
  }

  if (
    intent === "students" &&
    md.audience?.includes("students")
  ) {
    score += 0.1;
  }

  return score;
}