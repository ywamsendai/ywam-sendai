import type {
  VectorMetadata,
} from "../../../../content/schema";

export function toVectorMetadata(
  metadata: VectorMetadata
) {
  return {
    documentId: metadata.documentId,

    chunkIndex: metadata.chunkIndex,

    title: metadata.title,

    summary: metadata.summary ?? "",

    section: metadata.section,

    language: metadata.language,

    category: metadata.category,

    tags: metadata.tags ?? [],

    audience: metadata.audience ?? [],

    text: metadata.text,
  };
}