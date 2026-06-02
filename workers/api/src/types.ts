import type {
  VectorMetadata,
  Language,
  IngestRequest,
} from "../../../content/schema";

export interface WorkerEnv {
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  INGEST_MANIFEST: KVNamespace;
}

/* ----------------------------------------
   API REQUESTS
---------------------------------------- */

export interface AskRequest {
  question: string;
  lang: Language;
  history?: ChatMessage[];
}

export interface DeleteDocumentRequest {
  documentId: string;
  language: Language;
}

/* ----------------------------------------
   CHAT
---------------------------------------- */

export type ChatRole =
  | "system"
  | "user"
  | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/* ----------------------------------------
   MANIFEST
---------------------------------------- */

export interface ManifestRecord {
  chunkIds: string[];

  updatedAt: string;

  documentId: string;
  language: Language;
}

/* ----------------------------------------
   SOURCES
---------------------------------------- */

export interface SourceLink {
  title: string;
  path: string;
}

/* ----------------------------------------
   RETRIEVAL
---------------------------------------- */

export type MatchMetadata = VectorMetadata;