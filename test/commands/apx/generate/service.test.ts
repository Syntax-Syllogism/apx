import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateService from '../../../../src/commands/apx/generate/service.js';

describe('apx generate service', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('parses and executes with at4dx without requiring target-org', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-service-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
    const result = await ApxGenerateService.run([
      '--json',
      '--service-basename',
      'LimitMonitors',
      '--at4dx',
      '--output-path',
      'generated',
      '--dry-run',
    ]);
    expect(result.wouldCreate?.length).to.be.greaterThan(0);
    expect(
      result.wouldCreate?.some((p) => p.endsWith('ApplicationFactory_ServiceBinding.ILimitMonitorsService.md-meta.xml'))
    ).to.equal(true);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('enforces exactlyOne flavor flags during parse', async () => {
    try {
      await ApxGenerateService.run(['--json', '--service-basename', 'LimitMonitors', '--output-path', 'generated']);
      expect.fail('expected parser failure when no flavor flag supplied');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).to.include('--at4dx');
      expect(message).to.include('--fflib');
    }
  });
});
