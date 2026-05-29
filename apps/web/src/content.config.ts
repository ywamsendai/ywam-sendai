import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";

const knowledge = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: new URL("../../../content/knowledge", import.meta.url)
  }),

  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),

    language: z.enum(["en", "ja"]).optional(),

    tags: z.array(z.string()).optional(),

    category: z.string().optional(),

    audience: z.array(z.string()).default([]),

    priority: z.number().default(0),

    status: z.enum([
      "draft",
      "review",
      "published",
      "archived",
    ]).default("published"),

    navigation: z.boolean().default(false),

    chatSuggestions: z.array(z.string()).default([]),
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