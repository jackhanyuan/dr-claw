import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { memoryDb } from '../database/db.js';

const MEMORY_SECTION_START = '<!-- DR-CLAW-MEMORY-START -->';
const MEMORY_SECTION_END = '<!-- DR-CLAW-MEMORY-END -->';

/**
 * Sanitizes memory content before injecting into system prompts.
 * Strips markdown headings that could confuse prompt structure.
 */
function sanitizeContent(content) {
  return content.replace(/^#+\s/gm, '').trim();
}

/**
 * Builds a memory block string to inject into system prompts (Option A: web UI).
 * Returns empty string if memory is disabled for this user or no enabled memories exist.
 * @param {number} userId - The authenticated user's ID
 * @returns {string} Formatted memory block or empty string
 */
export function buildMemoryBlock(userId) {
  if (!userId) return '';

  if (!memoryDb.getMemoryEnabled(userId)) return '';

  const memories = memoryDb.getEnabled(userId);
  if (!memories || memories.length === 0) return '';

  const lines = memories.map(m => `- ${sanitizeContent(m.content)}`).join('\n');
  return `\n\n# User Memories\nThe following are things the user has asked you to remember. Incorporate them naturally into your responses where relevant:\n${lines}\n`;
}

/**
 * Formats memories into MEMORY.md content.
 * @param {Array} memories - Array of memory objects
 * @returns {string} Formatted markdown content
 */
function formatMemoryMd(memories) {
  const lines = [
    '# User Memories',
    '',
    '> This file is auto-synced by Dr. Claw. You can also edit it manually.',
    '> Memories here are shared across all projects.',
    '',
  ];

  if (!memories || memories.length === 0) {
    lines.push('_No memories saved yet. Add them in Dr. Claw Settings > Memory._');
  } else {
    for (const m of memories) {
      const tag = m.category && m.category !== 'general' ? ` [${m.category}]` : '';
      lines.push(`- ${sanitizeContent(m.content)}${tag}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Syncs enabled memories to user-scoped files under ~/.claude/.
 * Files are namespaced by userId to avoid multi-user conflicts on shared servers.
 * Call this whenever memories are created, updated, deleted, or toggled.
 * @param {number} userId - The authenticated user's ID
 */
export async function syncMemoryFiles(userId) {
  if (!userId) return;

  const claudeDir = path.join(os.homedir(), '.claude');

  try {
    await fs.mkdir(claudeDir, { recursive: true });
  } catch {
    // directory likely exists
  }

  const isEnabled = memoryDb.getMemoryEnabled(userId);
  const memories = isEnabled ? memoryDb.getEnabled(userId) : [];

  // 1. Write user-scoped ~/.claude/MEMORY-{userId}.md
  const memoryMdPath = path.join(claudeDir, `MEMORY-${userId}.md`);
  const memoryMdContent = formatMemoryMd(memories);
  try {
    await fs.writeFile(memoryMdPath, memoryMdContent, 'utf-8');
  } catch (err) {
    console.warn('[memory-sync] Failed to write MEMORY.md:', err.message);
  }

  // 2. Manage delimited section in ~/.claude/CLAUDE.md
  // Uses start/end markers to avoid clobbering existing content
  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  const memorySection = buildClaudeMdSection(memories);

  try {
    let existing = '';
    try {
      existing = await fs.readFile(claudeMdPath, 'utf-8');
    } catch {
      // file doesn't exist yet
    }

    const startIdx = existing.indexOf(MEMORY_SECTION_START);
    const endIdx = existing.indexOf(MEMORY_SECTION_END);

    let updated;
    if (startIdx !== -1 && endIdx !== -1) {
      // Replace existing section
      updated = existing.slice(0, startIdx) + memorySection + existing.slice(endIdx + MEMORY_SECTION_END.length);
    } else {
      // Append section
      updated = existing.trimEnd() + '\n\n' + memorySection + '\n';
    }

    await fs.writeFile(claudeMdPath, updated, 'utf-8');
  } catch (err) {
    console.warn('[memory-sync] Failed to update CLAUDE.md:', err.message);
  }
}

/**
 * Builds the delimited memory section for CLAUDE.md.
 */
function buildClaudeMdSection(memories) {
  const lines = [MEMORY_SECTION_START];

  if (memories.length > 0) {
    lines.push('# User Memories');
    lines.push('The following are things the user has asked you to remember. Incorporate them naturally into your responses where relevant:');
    for (const m of memories) {
      lines.push(`- ${sanitizeContent(m.content)}`);
    }
  }

  lines.push(MEMORY_SECTION_END);
  return lines.join('\n');
}
