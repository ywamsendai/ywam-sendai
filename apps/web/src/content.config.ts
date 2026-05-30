import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";
import type { DocumentFrontmatter } from "../../../content/schema";

const knowledge = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: new URL("../../../content/knowledge", import.meta.url)
  }),

  schema: z.object({
  title: z.string(),
  summary: z.string().optional(),

  language: z.enum(["en", "ja"]),

  tags: z.array(z.string()).default([]),

  category: z.enum([
    "about",
    "community",
    "academic-tracks",
    "theology",
    "operations",
    "general",
  ]),

  audience: z.array(z.enum([
    "public",
    "staff",
    "students",
    "prospective",
  ])),

  status: z.enum(["draft", "review", "published", "archived"]),

  priority: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),

  chatSuggestions: z.array(z.string()).default([]),

  lastReviewed: z.string().optional(),
}),
});

const site = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: new URL("../../../content/site", import.meta.url)
  }),

  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    hero: z.boolean().optional(),
  }),
});

export const collections = {
  knowledge,
  site,
};