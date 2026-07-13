import type { CodexReasoningEffortId } from './codexReasoningEfforts';

export const DEFAULT_CODEX_REASONING_EFFORT: CodexReasoningEffortId = 'default';

const DEFAULT_ONLY: CodexReasoningEffortId[] = [DEFAULT_CODEX_REASONING_EFFORT];
const LOW_TO_XHIGH: CodexReasoningEffortId[] = ['default', 'low', 'medium', 'high', 'xhigh'];
const GPT_56_REASONING_EFFORTS: CodexReasoningEffortId[] = [
  'default',
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

const MODEL_REASONING_SUPPORT: Record<string, CodexReasoningEffortId[]> = {
  'gpt-5.6': GPT_56_REASONING_EFFORTS,
  'gpt-5.6-terra': GPT_56_REASONING_EFFORTS,
  'gpt-5.6-luna': GPT_56_REASONING_EFFORTS,
  'gpt-5.5': LOW_TO_XHIGH,
  'gpt-5.4': LOW_TO_XHIGH,
  'gpt-5.3-codex': LOW_TO_XHIGH,
  'gpt-5.2-codex': LOW_TO_XHIGH,
  'gpt-5.2': LOW_TO_XHIGH,
  // Keep unknown / unverified models on default only instead of over-claiming support.
  'gpt-5.1-codex-max': DEFAULT_ONLY,
  'o3': DEFAULT_ONLY,
  'o4-mini': DEFAULT_ONLY,
};

export function getSupportedCodexReasoningEfforts(model: string): CodexReasoningEffortId[] {
  return MODEL_REASONING_SUPPORT[model] || DEFAULT_ONLY;
}

export function supportsExplicitCodexReasoningEffort(model: string): boolean {
  return getSupportedCodexReasoningEfforts(model).length > 1;
}

export function normalizeCodexReasoningEffort(
  model: string,
  effort: CodexReasoningEffortId,
): CodexReasoningEffortId {
  return getSupportedCodexReasoningEfforts(model).includes(effort)
    ? effort
    : DEFAULT_CODEX_REASONING_EFFORT;
}
