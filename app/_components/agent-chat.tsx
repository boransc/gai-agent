"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, BrainIcon, PlusIcon, SquareIcon } from "lucide-react";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MODEL_HEADER, type AvailableModelId } from "@/agent/lib/models";
import { activeBusiness } from "@/agent/lib/quote-agent/config";
import { AgentMessage } from "./agent-message";
import { toFriendlyError } from "./friendly-error";
import { ModelPicker, useSelectedModel } from "./model-picker";

const AGENT_NAME = activeBusiness.businessName;

/**
 * Shown on the empty chat so someone arriving cold knows what this is for and
 * what a useful first message looks like. Each one is a complete enquiry —
 * postcode, vehicle, symptom — because that is what gets to a quote fastest.
 */
const STARTERS = [
  "My battery's dead — I'm at CR0 2RF with a 2018 Ford Focus.",
  "My car won't start, I'm at CR0 2RF in a Ford Focus.",
  "I need new brake pads on my Vauxhall Corsa, CR0 2RF.",
] as const;

export function AgentChat({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const [cancellationError, setCancellationError] = useState<string>();
  const {
    model: selectedModel,
    ref: selectedModelRef,
    select: setSelectedModel,
  } = useSelectedModel();
  const agent = useEveAgent({
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    // The client calls this before every request, but it only ever holds the
    // instance captured when the store was created — so it must read the ref
    // rather than close over `selectedModel`, which would pin it to the
    // first render's default. Lets a mid-conversation switch (e.g. after
    // hitting a quota limit) apply to the very next message.
    headers: () => ({ [MODEL_HEADER]: selectedModelRef.current }),
    onSessionChange(session) {
      if (sessionId === undefined && session !== undefined) {
        // Next patches window.history to navigate, which would detach the active stream.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isRestoring = sessionId !== undefined && agent.events.length === 0 && isBusy;
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" || lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const turnFailure = isBusy ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const hasConversationContent = sessionless || !isEmpty || errorMessage !== undefined;
  const showConversationLayout = isRestoring || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isRestoring) return;

    setCancellationError(undefined);
    const options = isBusy ? { turnPolicy: "steer" as const } : undefined;

    if (message.files.length === 0) {
      await agent.send(text, options);
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send(parts, options);
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea disabled={isRestoring} placeholder="Send a message…" />
      {isBusy && !isRestoring ? (
        <PromptInputButton
          aria-label="Stop"
          className="absolute right-12 bottom-2.5 rounded-full"
          onClick={requestCancellation}
          variant="default"
        >
          <SquareIcon className="size-3 fill-current" />
        </PromptInputButton>
      ) : null}
      <PromptInputSubmit disabled={isRestoring} status={isBusy ? undefined : agent.status} />
    </PromptInput>
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {showConversationLayout ? (
        <ChatHeader
          canStartNewChat={activeSessionId !== undefined}
          onModelChange={setSelectedModel}
          selectedModel={selectedModel}
        />
      ) : null}

      {showConversationLayout ? (
        <Conversation
          className="min-h-0 flex-1"
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? "smooth" : "instant"}
          scrollRestorationKey={
            isEmpty || activeSessionId === undefined
              ? undefined
              : `eve:web-chat-scroll:${activeSessionId}`
          }
        >
          <ConversationTopFade className="top-14" />
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-20 pb-36 sm:px-6">
            {agent.data.messages.map((message, index) =>
              showPendingThinking &&
              isPendingAssistantShell &&
              message.id === lastMessage.id ? null : (
                <AgentMessage
                  canRespond={!isBusy}
                  isStreaming={
                    agent.status === "streaming" && index === agent.data.messages.length - 1
                  }
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => {
                    setCancellationError(undefined);
                    return agent.respond(inputResponses);
                  }}
                />
              ),
            )}
            {showPendingThinking ? <PendingThinking /> : null}
            {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          showConversationLayout
            ? "fixed bottom-0 left-1/2 z-20 max-w-3xl -translate-x-1/2 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6"
            : "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]",
        )}
      >
        {showConversationLayout ? null : (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="font-medium text-brand text-sm tracking-wide uppercase">
              {AGENT_NAME}
            </span>
            <h1 className="font-medium text-4xl tracking-tighter sm:text-5xl">
              Get a quote in a couple of minutes
            </h1>
            <p className="max-w-md text-balance text-muted-foreground">
              Tell me where the vehicle is, what it is, and what it&apos;s doing.
              You&apos;ll get an itemised price — or a straight answer if we
              can&apos;t help. We cover {activeBusiness.serviceRadiusMiles} miles
              around {activeBusiness.basePostcode}.
            </p>
          </div>
        )}
        <div className="w-full">{composer}</div>
        {showConversationLayout ? null : (
          <div className="flex w-full flex-wrap justify-center gap-2">
            {STARTERS.map((starter) => (
              <Button
                className="h-auto whitespace-normal py-1.5 text-left text-muted-foreground"
                key={starter}
                onClick={() => void agent.send(starter)}
                size="sm"
                type="button"
                variant="outline"
              >
                {starter}
              </Button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  // Raw provider text is never rendered: it is written for whoever operates
  // the agent, and can name internal files or billing state.
  const friendly = toFriendlyError(message);
  if (!friendly) return null;

  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className="flex w-full items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">{friendly.title}</p>
            <p className="mt-0.5 text-muted-foreground">{friendly.detail}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function ChatHeader({
  canStartNewChat,
  onModelChange,
  selectedModel,
}: {
  readonly canStartNewChat: boolean;
  readonly onModelChange: (model: AvailableModelId) => void;
  readonly selectedModel: AvailableModelId;
}) {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-20 h-14">
      <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center bg-background px-24">
        <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
        <div className="pointer-events-auto fixed top-2 left-6">
          <ModelPicker onChange={onModelChange} value={selectedModel} />
        </div>
        {canStartNewChat ? (
          <Button
            aria-label="Start a new chat"
            className="pointer-events-auto fixed top-2 right-6"
            onClick={() => window.location.assign("/s")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="mb-4 flex w-full items-center gap-2 text-muted-foreground text-sm">
          <BrainIcon className="size-4" />
          <Shimmer duration={1}>Thinking</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "The model is temporarily unavailable. Please try again."
        : event.data.message;
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
}
