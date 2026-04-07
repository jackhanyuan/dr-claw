import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import os from 'os';
import { safePath } from '../safePath.js';

const ROOT = '/tmp/test-project';

describe('safePath', () => {
  it('resolves relative paths within root', () => {
    const result = safePath('src/index.js', ROOT);
    assert.equal(result, path.resolve(ROOT, 'src/index.js'));
  });

  it('returns root when path is empty/null', () => {
    assert.equal(safePath('', ROOT), ROOT);
    assert.equal(safePath(null, ROOT), ROOT);
    assert.equal(safePath(undefined, ROOT), ROOT);
  });

  it('blocks absolute paths', () => {
    assert.throws(
      () => safePath('/etc/passwd', ROOT),
      /Path traversal blocked.*absolute path/,
    );
  });

  it('blocks .. traversal above root', () => {
    assert.throws(
      () => safePath('../../../etc/shadow', ROOT),
      /Path traversal blocked/,
    );
  });

  it('blocks .. traversal disguised in deeper path', () => {
    assert.throws(
      () => safePath('src/../../../../../../etc/passwd', ROOT),
      /Path traversal blocked/,
    );
  });

  it('allows .. that stays within root', () => {
    const result = safePath('src/../lib/utils.js', ROOT);
    assert.equal(result, path.resolve(ROOT, 'lib/utils.js'));
  });

  it('blocks home directory references', () => {
    assert.throws(
      () => safePath(path.join('..', '..', os.homedir(), '.ssh', 'id_rsa'), ROOT),
      /Path traversal blocked/,
    );
  });
});
