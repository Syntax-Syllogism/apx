import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateDomain from '../../../../src/commands/apx/generate/domain.js';

describe('apx generate domain', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('writes domain artifacts and returns manifest in json mode', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-domain-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
    const describeSObject = sinon.stub().resolves({
      name: 'Property__c',
      custom: true,
      fields: [{ name: 'Id', type: 'id', filterable: true }],
    });
    const fakeOrg = {
      refreshAuth: sinon.stub().resolves(),
      getConnection: sinon.stub().returns({
        describeSObject,
        getApiVersion: (): string => '62.0',
      }),
    };
    sinon.stub(ApxGenerateDomain.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'Property__c',
        at4dx: true,
        fflib: false,
        'api-version': undefined,
        'output-path': 'generated',
        prefix: undefined,
        'dry-run': false,
      },
    } as never);

    const result = await ApxGenerateDomain.run(['--json']);
    const triggerPath = result.created.find((p) => p.endsWith('Properties.trigger'));
    const bindingPath = result.created.find((p) => p.endsWith('ApplicationFactory_DomainBinding.Property.md-meta.xml'));
    expect(triggerPath).to.not.equal(undefined);
    expect(bindingPath).to.not.equal(undefined);
    if (triggerPath) expect(readFileSync(triggerPath, 'utf8')).to.include('trigger Properties on Property__c');
    expect(result.created.some((p) => p.endsWith('ApplicationFactory_DomainBinding.Property_c.md-meta.xml'))).to.equal(
      false
    );
    await rm(projectDir, { recursive: true, force: true });
  });
});
