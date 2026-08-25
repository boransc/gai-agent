"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  isAvailableModelId,
  type AvailableModelId,
} from "@/agent/lib/models";

const STORAGE_KEY = "quote-agent.model";

/**
 * The selected model, persisted across chats in localStorage so a switch
 * survives "New chat" rather than resetting every time.
 *
 * Starts at the default on the server and on first client render (this is
 * what SSR sees, so it must match to avoid a hydration mismatch), then
 * reads localStorage once mounted.
 *
 * Returns `ref` alongside `model` for a specific reason: useEveAgent reads
 * `headers` once, when it creates its internal store, and keeps that one
 * function instance for the life of the session. A closure over `model`
 * would therefore be pinned to the first render's value — the default —
 * and no dropdown change would ever be sent. Reading `ref.current` inside
 * that captured function gets the live value instead. Render `model`; send
 * `ref.current`.
 */
export function useSelectedModel() {
  const [model, setModel] = useState<AvailableModelId>(DEFAULT_MODEL_ID);
  const ref = useRef<AvailableModelId>(DEFAULT_MODEL_ID);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAvailableModelId(stored)) {
      setModel(stored);
      ref.current = stored;
    }
  }, []);

  const select = (next: AvailableModelId) => {
    setModel(next);
    // Updated here rather than during render so the captured header function
    // sees the new value immediately, without waiting for an effect.
    ref.current = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { model, ref, select };
}

export function ModelPicker({
  value,
  onChange,
}: {
  readonly value: AvailableModelId;
  readonly onChange: (value: AvailableModelId) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isAvailableModelId(next)) onChange(next);
      }}
    >
      <SelectTrigger aria-label="Model" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
