/**
 * Safe path resolution that prevents directory traversal.
 *
 * Tool calls from LLM agents may contain crafted paths like "/etc/passwd"
 * or "../../../etc/shadow". This module ensures every resolved path stays
 * within the designated project root, blocking prompt-injection attacks
 * that attempt to read or write files outside the workspace.
 */

import path from 'path';
import fs from 'fs';

/**
 * Resolve `userPath` relative to `allowedRoot` and verify the result
 * stays within `allowedRoot`.
 *
 * - Absolute paths are rejected (they would escape the root).
 * - `..` components that climb above the root are rejected.
 * - Symlinks are resolved via `realpathSync` when the target exists.
 *
 * @param {string} userPath  Path supplied by the tool call.
 * @param {string} allowedRoot  Project root directory.
 * @returns {string}  The resolved, validated absolute path.
 * @throws {Error}  If the path escapes `allowedRoot`.
 */
export function safePath(userPath, allowedRoot) {
  if (!userPath) return allowedRoot;

  // Reject absolute paths outright — they ignore the root entirely
  if (path.isAbsolute(userPath)) {
    throw new Error(
      `Path traversal blocked: absolute path "${userPath}" is not allowed. ` +
      `All paths must be relative to the project root.`
    );
  }

  const resolved = path.resolve(allowedRoot, userPath);

  // Resolve symlinks when the target exists
  let real;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    // Target doesn't exist yet (e.g. Write to new file) — use resolved
    real = resolved;
  }

  // Normalise the root for prefix comparison
  let normalizedRoot;
  try {
    normalizedRoot = fs.realpathSync(allowedRoot);
  } catch {
    normalizedRoot = path.resolve(allowedRoot);
  }

  // Ensure resolved path starts with root
  if (real !== normalizedRoot && !real.startsWith(normalizedRoot + path.sep)) {
    throw new Error(
      `Path traversal blocked: "${userPath}" resolves to "${real}" ` +
      `which is outside the project root "${normalizedRoot}".`
    );
  }

  return real;
}
