import type { ProviderId } from '@/types/tree';
import { GATEWAY_DEFAULT_MODEL } from '@/lib/agent/gateway';

export interface ModelOption {
  id: string;
  label: string;
}

// Curated model lists per provider. Sources: KB ai.pricing / ai.models
// (2026-05-19) for Gemini; CLAUDE.md SSOT for the OpenAI default.
// Model ids churn fast — TopBar's "Custom…" option covers anything missing.
export const MODEL_CATALOG: Record<ProviderId, ModelOption[]> = {
  default: [{ id: GATEWAY_DEFAULT_MODEL, label: 'GPT-5.4-mini (Demo)' }],
  gemini: [
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  openai: [{ id: 'gpt-5', label: 'GPT-5' }],
};

export const DEFAULT_MODEL: Record<ProviderId, string> = {
  default: GATEWAY_DEFAULT_MODEL,
  gemini: 'gemini-3.1-flash-lite',
  openai: 'gpt-5',
};
