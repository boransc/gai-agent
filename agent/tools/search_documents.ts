import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchDocuments } from "../lib/cloudflare-rag";

export default defineTool({
  description:
    "Search the business's reference document library — real trade guides, consumer-rights pages, and pricing guides — for passages relevant to a customer's question. This is informational only and is separate from the quote pipeline: it never supplies a price, service area, or business rule, and its results are never a substitute for lookup_postcode, calculate_quote, or check_job_eligibility. Returns the closest matching passages with a similarity score and the source document each came from, or an empty result if nothing in the library is relevant.",
  inputSchema: z.object({
    question: z
      .string()
      .min(1)
      .describe("The customer's question, in their own words."),
  }),
  async execute({ question }) {
    const matches = await searchDocuments(question, 5);

    if (matches.length === 0) {
      return {
        status: "no_matches" as const,
        query: question,
        matches: [] as {
          id: string;
          source: string;
          chunkIndex: number;
          score: number;
          text: string;
        }[],
        message:
          "Nothing relevant was found in the reference library. Tell the customer you don't have anything on that, rather than answering from general knowledge or guessing.",
      };
    }

    return {
      status: "matches_found" as const,
      query: question,
      matches,
      message:
        "Base your answer only on these passages, and cite the source document for whatever you use. If the passages don't actually answer the question, say you don't know rather than filling the gap with outside knowledge.",
    };
  },

  // The client renders id/chunkIndex too (so a person can see exactly which
  // chunk of which document backed an answer), but the model only needs
  // enough to answer and cite — trimming keeps its context smaller per call.
  toModelOutput(output) {
    return {
      type: "json",
      value: {
        status: output.status,
        matches: output.matches.map((match) => ({
          source: match.source,
          score: match.score,
          text: match.text,
        })),
        message: output.message,
      },
    };
  },
});
