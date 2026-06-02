// packages/shared/knowledge-schema.ts

export type Language = "en" | "ja";

export type Audience =
  | "public"
  | "staff"
  | "students"
  | "prospective";

export type Status =
  | "draft"
  | "review"
  | "published"
  | "archived";

export type Category =
  | "about"
  | "community"
  | "schools"
  | "staffing"
  | "operations"
  | "general";

export type Priority = 0 | 1 | 2;

export interface DocumentFrontmatter {
  title: string;
  summary?: string;

  language: Language;

  tags: string[];
  category: Category;

  audience: Audience[];

  status: Status;

  priority: Priority;

  chatSuggestions: string[];

  lastReviewed?: Date;
}

export interface KnowledgeChunk {
  id: string;

  documentId: string;

  language: Language;

  title: string;
  summary?: string;

  category: Category;
  tags: string[];
  audience: Audience[];

  section: string;
  chunkIndex: number;

  text: string;
}

export interface VectorMetadata {
  documentId: string;
  chunkIndex: number;
  documentTitle?: string;

  title: string;
  summary?: string;

  section: string;

  language: Language;

  category: Category;
  tags: string[];
  audience: Audience[];

  text: string;
}

export interface IngestRequest {
  id: string;
  text: string;

  chunk: KnowledgeChunk;

  metadata: VectorMetadata;
}