import fs from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import crypto from "crypto";

const WORKER_URL =
  process.env.WORKER_URL ||
  "https://api.ywamsendai.org";

const MIN_CHUNK_LENGTH = 120;
const MAX_CHUNK_LENGTH = 1800;

/* ----------------------------------------
   UTILITIES
---------------------------------------- */

function normalizeFilePath(file) {
  return file.replace(/\\/g, "/");
}

function getDocumentId(file) {
  const normalized = normalizeFilePath(file);

  return normalized
    .replace(/^.*\/content\/knowledge\/(en|ja)\//, "")
    .replace(/\.mdx?$/, "");
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ----------------------------------------
   FRONTMATTER NORMALISATION
---------------------------------------- */

function normalizeFrontmatter(data) {
  const language =
    data.language === "ja"
      ? "ja"
      : data.language === "en"
      ? "en"
      : null;

  if (!language) {
    throw new Error(
      `Invalid language "${data.language}". Must be "en" or "ja".`
    );
  }

  return {
    title: String(data.title || "Untitled").trim(),
    summary: String(data.summary || "").trim(),

    language,

    tags: Array.isArray(data.tags)
      ? data.tags
      : [],

    category: data.category || "general",

    audience: Array.isArray(data.audience)
      ? data.audience
      : [],

    status: data.status || "published",

    priority: Number(data.priority || 0),

    chatSuggestions: Array.isArray(
      data.chatSuggestions
    )
      ? data.chatSuggestions
      : [],

    lastReviewed:
      data.lastReviewed || null,
  };
}

/* ----------------------------------------
   CHUNKING
---------------------------------------- */

function splitByHeadings(content) {
  const lines = content.split("\n");
  const sections = [];

  let currentHeading = null;
  let currentBody = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.*)$/);

    if (match) {
      if (currentBody.length) {
        sections.push({
          heading: currentHeading || "Introduction",
          text: currentBody.join("\n").trim(),
        });
      }

      currentHeading = match[2].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentBody.length) {
    sections.push({
      heading: currentHeading || "Introduction",
      text: currentBody.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.text.length > 0);
}

function splitLargeSection(text) {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];

  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];

  let current = "";

  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;

    if (candidate.length > MAX_CHUNK_LENGTH && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

function mergeTinySections(sections) {
  const merged = [];

  for (const section of sections) {
    if (
      merged.length > 0 &&
      section.text.length < MIN_CHUNK_LENGTH
    ) {
      merged[merged.length - 1].text +=
        `\n\n${section.heading}\n${section.text}`;
    } else {
      merged.push(section);
    }
  }

  return merged;
}

/* ----------------------------------------
   PIPELINE STEP: BUILD CHUNKS
---------------------------------------- */

function buildChunks(documentId, frontmatter, content) {
  const sections = mergeTinySections(
    splitByHeadings(normalizeText(content))
  );

  const chunks = [];

  let globalIndex = 0;

  for (const section of sections) {
    const subchunks = splitLargeSection(section.text);

    subchunks.forEach((chunkText, i) => {
      const chunkId = crypto
        .createHash("sha1")
        .update(`${filePath}:${section.heading}:${i}`)
        .digest("hex");

      const chunk = {
        id: chunkId,

        documentId: getDocumentId(filePath),
        language: frontmatter.language,

        title: frontmatter.title,
        summary: frontmatter.summary,

        category: frontmatter.category,
        tags: frontmatter.tags,
        audience: frontmatter.audience,

        section: section.heading,
        chunkIndex: globalIndex++,

        text: chunkText,
      };

      chunks.push(chunk);
    });
  }

  return chunks;
}

/* ----------------------------------------
   EMBEDDING + UPLOAD
---------------------------------------- */

async function embedAndSend(chunk) {
  const response = await fetch(`${WORKER_URL}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: chunk.id,
      text: chunk.text,

      metadata: {
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,

        title: chunk.title,
        summary: chunk.summary,

        section: chunk.section,

        language: chunk.language,

        category: chunk.category,
        tags: chunk.tags,
        audience: chunk.audience,

        text: chunk.text,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ingest failed: ${err}`);
  }
}

/* ----------------------------------------
   DELETE OLD CHUNKS
---------------------------------------- */

async function deleteExisting(documentId, language) {
  await fetch(`${WORKER_URL}/delete-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, language }),
  });
}

/* ----------------------------------------
   FILE PROCESSING
---------------------------------------- */

async function processFile(file) {
  const filePath = normalizeFilePath(file);
  const raw = fs.readFileSync(filePath, "utf-8");

  const { data, content } = matter(raw);

  const documentId =
    getDocumentId(filePath);

  const frontmatter =
    normalizeFrontmatter(data);

  console.log(
    `📖 Processing: ${frontmatter.title} (${frontmatter.language})`
  );

  await deleteExisting(documentId, frontmatter.language);

  const chunks = buildChunks(documentId, frontmatter, content);

  for (const chunk of chunks) {
    await embedAndSend(chunk);
  }

  console.log(
    `✅ Done: ${frontmatter.title} (${chunks.length} chunks)`
  );
}

/* ----------------------------------------
   RUNNER
---------------------------------------- */

async function getFiles() {
  const cli = process.argv.slice(2);

  if (cli.length) return cli;

  return await glob(
    "../content/knowledge/**/*.{md,mdx}"
  );
}

async function run() {
  console.log("🚀 Starting ingestion pipeline...");

  const files = await getFiles();

  for (const file of files) {
    try {
      await processFile(file);
    } catch (e) {
      console.error(`❌ Error: ${file}`, e.message);
    }
  }

  console.log("✨ Pipeline complete");
}

run();