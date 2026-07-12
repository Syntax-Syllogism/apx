import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerate from '../../../src/commands/apx/generate.js';

describe('apx generate aggregate', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('describes once and writes combined artifact manifest', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-agg-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
    const describeSObject = sinon.stub().resolves({
      name: 'Account',
      custom: false,
      fields: [{ name: 'Id', type: 'id', filterable: true }],
    });
    const fakeOrg = {
      refreshAuth: sinon.stub().resolves(),
      getConnection: sinon.stub().returns({
        describeSObject,
        getApiVersion: (): string => '62.0',
      }),
    };

    sinon.stub(ApxGenerate.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'Account',
        at4dx: true,
        fflib: false,
        'api-version': undefined,
        'binding-sequence': '1000.0',
        'output-path': 'generated',
        prefix: undefined,
        selector: true,
        domain: true,
        'unit-of-work': true,
        'dry-run': false,
      },
    } as never);

    const result = await ApxGenerate.run(['--json']);
    expect(describeSObject.callCount).to.equal(1);
    expect(result.created.length).to.be.greaterThan(5);
    await rm(projectDir, { recursive: true, force: true });
  });
});
