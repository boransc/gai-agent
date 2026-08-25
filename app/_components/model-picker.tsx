"use client";

import { useEffect, useState } from "react";
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
 */
export function useSelectedModel() {
  const [model, setModel] = useState<AvailableModelId>(DEFAULT_MODEL_ID);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAvailableModelId(stored)) setModel(stored);
  }, []);

  const select = (next: AvailableModelId) => {
    setModel(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return [model, select] as const;
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
