function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function buildContext(matches: any[]) {
  return matches
    .map((m, i) => {
      const md = m.metadata || {};

      return [
        `SOURCE ${i + 1}`,
        `TITLE: ${safeString(md.title)}`,
        `SUMMARY: ${safeString(md.summary)}`,
        `CATEGORY: ${safeString(md.category)}`,
        `SECTION: ${safeString(md.section)}`,
        `AUDIENCE: ${(md.audience || []).join(", ")}`,
        "",
        safeString(md.text),
      ].join("\n");
    })
    .join("\n\n---\n\n");
}