import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateSelectorMethod from '../../../../../src/commands/apx/generate/selector/method.js';

describe('apx generate selector method', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('parses real argv and writes selector method files', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-selector-method-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateSelectorMethod.run([
      '--json',
      '--class-name',
      'SelectBySloganMethod',
      '--sobject-selector-class-name',
      'AccountsSelector',
      '--sobject',
      'Account',
      '--output-path',
      'generated',
    ]);

    const methodPath = result.created.find((p) => p.endsWith('SelectBySloganMethod.cls'));
    expect(methodPath).to.not.equal(undefined);
    if (methodPath) expect(readFileSync(methodPath, 'utf8')).to.include('class SelectBySloganMethod');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('supports -c short flag for class-name without collisions', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-selector-method-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateSelectorMethod.run([
      '--json',
      '-c',
      'SelectBySloganMethod',
      '--sobject-selector-class-name',
      'AccountsSelector',
      '--sobject',
      'Account',
      '--output-path',
      'generated',
      '--dry-run',
    ]);

    expect(result.wouldCreate?.some((p) => p.endsWith('SelectBySloganMethod.cls'))).to.equal(true);
    await rm(projectDir, { recursive: true, force: true });
  });
});
