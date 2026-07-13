import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CODEX_REASONING_EFFORT,
  getSupportedCodexReasoningEfforts,
  normalizeCodexReasoningEffort,
} from '../codexReasoningSupport';

describe('Codex reasoning effort support', () => {
  it('exposes every GPT-5.6 reasoning effort', () => {
    expect(getSupportedCodexReasoningEfforts('gpt-5.6')).toEqual([
      'default',
      'none',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
  });

  it('keeps legacy models on their verified subset', () => {
    expect(getSupportedCodexReasoningEfforts('gpt-5.5')).toEqual([
      'default',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
  });

  it('falls back safely when a saved effort is unsupported by the selected model', () => {
    expect(normalizeCodexReasoningEffort('gpt-5.6', 'minimal')).toBe(
      DEFAULT_CODEX_REASONING_EFFORT,
    );
    expect(normalizeCodexReasoningEffort('gpt-5.5', 'max')).toBe(
      DEFAULT_CODEX_REASONING_EFFORT,
    );
  });
});
