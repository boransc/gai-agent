import { ChevronDownIcon, FileTextIcon, SearchXIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * The payload returned by the search_documents tool. Mirrored rather than
 * imported so this stays a pure view over whatever the tool actually sent,
 * and can reject anything malformed.
 */
export type RetrievedMatch = {
  id?: string;
  source: string;
  chunkIndex?: number;
  score: number;
  text: string;
};

export type RetrievedSourcesPayload = {
  status: "matches_found" | "no_matches";
  query: string;
  matches: RetrievedMatch[];
};

export function isRetrievedSourcesPayload(
  value: unknown,
): value is RetrievedSourcesPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RetrievedSourcesPayload>;
  return (
    (candidate.status === "matches_found" || candidate.status === "no_matches") &&
    Array.isArray(candidate.matches)
  );
}

function scorePercent(score: number) {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

export function RetrievedSources({
  payload,
}: {
  readonly payload: RetrievedSourcesPayload;
}) {
  if (payload.status === "no_matches") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        <SearchXIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium text-foreground">No matching documents</p>
          <p className="mt-0.5">
            Nothing in the reference library was close enough to
            &ldquo;{payload.query}&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Collapsible className="rounded-lg border border-border bg-card text-sm">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground outline-none hover:bg-muted/40">
        <FileTextIcon className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">
          {payload.matches.length} passage
          {payload.matches.length === 1 ? "" : "s"} retrieved for &ldquo;
          {payload.query}&rdquo;
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border">
        <div className="divide-y divide-border">
          {payload.matches.map((match, index) => (
            <div
              className="px-3 py-2.5"
              key={match.id ?? `${match.source}-${match.chunkIndex ?? index}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {match.source}
                  {match.chunkIndex !== undefined ? `#${match.chunkIndex}` : ""}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {scorePercent(match.score)} match
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-muted-foreground">{match.text}</p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
