/**
 * REST client for the Cloudflare Workers AI + Vectorize index built in the
 * separate gai-rag-skeleton project. Mirrors that project's scripts/cf.ts
 * deliberately closely: same embedding model, same no-SDK fetch calls, same
 * API shapes. A model mismatch between ingest-time and query-time embedding
 * would not error — it would silently return meaningless nearest-neighbours
 * in the wrong vector space — so the model id is copied verbatim rather than
 * re-derived.
 */

// Must match EMBED_MODEL in gai-rag-skeleton/scripts/cf.ts exactly.
const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";

export interface RetrievedChunk {
  id: string;
  score: number;
  source: string;
  chunkIndex: number;
  text: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. This deployment needs the same CF_ACCOUNT_ID, CF_API_TOKEN and CF_VECTORIZE_INDEX as the gai-rag-skeleton ingest project.`,
    );
  }
  return value;
}

async function embedQuestion(question: string): Promise<number[]> {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const apiToken = requireEnv("CF_API_TOKEN");

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBED_MODEL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      // Same request shape as cf.ts's embed(): batched, one string here.
      body: JSON.stringify({ text: [question] }),
    },
  );
  const json = (await res.json()) as {
    success: boolean;
    result?: { data: number[][] };
    errors?: unknown;
  };
  if (!res.ok || !json.success || !json.result) {
    throw new Error(`Workers AI ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.result.data[0];
}

/**
 * Embeds `question` and returns the closest `topK` chunks from the
 * Vectorize index, each with its similarity score and source filename.
 * Empty array means the index genuinely has nothing close, not an error.
 */
export async function searchDocuments(
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const apiToken = requireEnv("CF_API_TOKEN");
  const index = requireEnv("CF_VECTORIZE_INDEX");

  const vector = await embedQuestion(question);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${index}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ vector, topK, returnMetadata: "all" }),
    },
  );
  const json = (await res.json()) as {
    success: boolean;
    result?: {
      matches: {
        id: string;
        score: number;
        metadata?: Record<string, string | number>;
      }[];
    };
    errors?: unknown;
  };
  if (!res.ok || !json.success || !json.result) {
    throw new Error(`Vectorize query ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  }

  return json.result.matches.map((match) => ({
    id: match.id,
    score: match.score,
    source: String(match.metadata?.source ?? "unknown"),
    chunkIndex: Number(match.metadata?.chunkIndex ?? 0),
    text: String(match.metadata?.text ?? ""),
  }));
}
