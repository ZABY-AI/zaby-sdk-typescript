import type { ZabyCoreClient } from "../transport";
import type { RequestOptions } from "../types/public";
import { encodePath } from "../util";

const KBS = "/api/v1/tenant/knowledge-bases";
const KNOWLEDGE_LIBRARY = "/api/v1/tenant/knowledge-library";

export class KnowledgeBasesClient {
  constructor(private readonly core: ZabyCoreClient) {}

  create(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", KBS, { json: input, ...options });
  }

  uploadTextDocument(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/documents/text`, { json: input, ...options });
  }

  createLibraryTextDocument(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KNOWLEDGE_LIBRARY}/documents/text`, { json: input, ...options });
  }

  listLibraryDocuments(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${KNOWLEDGE_LIBRARY}/documents`, { query: query as any, ...options });
  }

  listLibraryDocumentFindings(libraryDocumentId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${KNOWLEDGE_LIBRARY}/documents/${encodePath(libraryDocumentId)}/findings`, {
      query: query as any,
      ...options,
    });
  }

  linkLibraryDocument(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/library-documents`, {
      json: input,
      ...options,
    });
  }

  projectLibraryDocument(knowledgeBaseId: string, selectionId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/library-documents/${encodePath(selectionId)}/project`, {
      json: input,
      ...options,
    });
  }

  retrieve(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/retrieve`, { json: input, ...options });
  }

  provisionalAnswer(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/provisional-answer`, { json: input, ...options });
  }

  listSourceGroups(knowledgeBaseId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${KBS}/${encodePath(knowledgeBaseId)}/source-groups`, { query: query as any, ...options });
  }

  createSourceGroup(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/source-groups`, { json: input, ...options });
  }

  updateSourceGroup(knowledgeBaseId: string, sourceGroupId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${KBS}/${encodePath(knowledgeBaseId)}/source-groups/${encodePath(sourceGroupId)}`, {
      json: input,
      ...options,
    });
  }

  listSources(knowledgeBaseId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${KBS}/${encodePath(knowledgeBaseId)}/sources`, { query: query as any, ...options });
  }

  createSource(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/sources`, { json: input, ...options });
  }

  updateSource(knowledgeBaseId: string, sourceId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${KBS}/${encodePath(knowledgeBaseId)}/sources/${encodePath(sourceId)}`, { json: input, ...options });
  }

  reprocessSource(knowledgeBaseId: string, sourceId: string, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/sources/${encodePath(sourceId)}/reprocess`, options);
  }

  linkSourceCredential(knowledgeBaseId: string, sourceId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/sources/${encodePath(sourceId)}/auth`, {
      json: input,
      ...options,
    });
  }

  listIngestionPolicies(knowledgeBaseId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${KBS}/${encodePath(knowledgeBaseId)}/ingestion-policies`, { query: query as any, ...options });
  }

  createIngestionPolicy(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/ingestion-policies`, { json: input, ...options });
  }

  updateIngestionPolicy(knowledgeBaseId: string, policyId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${KBS}/${encodePath(knowledgeBaseId)}/ingestion-policies/${encodePath(policyId)}`, {
      json: input,
      ...options,
    });
  }

  upsertGovernancePolicy(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/governance-policy`, { json: input, ...options });
  }

  listProfiles(knowledgeBaseId: string, options?: RequestOptions) {
    return this.core.request("GET", `${KBS}/${encodePath(knowledgeBaseId)}/profiles`, options);
  }

  createProfile(knowledgeBaseId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/profiles`, { json: input, ...options });
  }

  updateProfile(knowledgeBaseId: string, profileId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${KBS}/${encodePath(knowledgeBaseId)}/profiles/${encodePath(profileId)}`, { json: input, ...options });
  }

  listJobs(knowledgeBaseId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${KBS}/${encodePath(knowledgeBaseId)}/idocs-jobs`, { query: query as any, ...options });
  }

  getJob(knowledgeBaseId: string, jobId: string, options?: RequestOptions) {
    return this.core.request("GET", `${KBS}/${encodePath(knowledgeBaseId)}/idocs-jobs/${encodePath(jobId)}`, options);
  }

  cancelJob(knowledgeBaseId: string, jobId: string, options?: RequestOptions) {
    return this.core.request("POST", `${KBS}/${encodePath(knowledgeBaseId)}/idocs-jobs/${encodePath(jobId)}/cancel`, options);
  }
}
