import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateSelector from '../../../../src/commands/apx/generate/selector.js';

describe('apx generate selector', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('writes selector artifacts and returns a manifest in json mode', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-selector-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
    const describeSObject = sinon.stub().resolves({
      name: 'Account',
      custom: false,
      fields: [
        { name: 'Id', type: 'id', filterable: true },
        { name: 'Name', type: 'string', filterable: true },
      ],
    });
    const fakeOrg = {
      refreshAuth: sinon.stub().resolves(),
      getConnection: sinon.stub().returns({
        describeSObject,
        getApiVersion: (): string => '62.0',
      }),
    };

    sinon.stub(ApxGenerateSelector.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'Account',
        at4dx: true,
        fflib: false,
        'api-version': undefined,
        'output-path': 'generated',
        prefix: undefined,
      },
    } as never);

    const result = await ApxGenerateSelector.run(['--json']);
    expect(describeSObject.calledOnce).to.equal(true);
    expect(result.created.length).to.be.greaterThan(0);
    const selectorPath = result.created.find((p) => p.endsWith('AccountsSelector.cls'));
    expect(selectorPath).to.not.equal(undefined);
    if (selectorPath) expect(readFileSync(selectorPath, 'utf8')).to.include('class AccountsSelector');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('omits _c suffix in custom-object selector binding filename', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-selector-custom-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
    const describeSObject = sinon.stub().resolves({
      name: 'CKR_ChecklistInstance__c',
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

    sinon.stub(ApxGenerateSelector.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'CKR_ChecklistInstance__c',
        at4dx: true,
        fflib: false,
        'api-version': undefined,
        'output-path': 'generated',
        prefix: undefined,
        'dry-run': false,
      },
    } as never);

    const result = await ApxGenerateSelector.run(['--json']);
    expect(
      result.created.some((p) => p.endsWith('ApplicationFactory_SelectorBinding.CKR_ChecklistInstance.md-meta.xml'))
    ).to.equal(true);
    expect(
      result.created.some((p) => p.endsWith('ApplicationFactory_SelectorBinding.CKR_ChecklistInstance_c.md-meta.xml'))
    ).to.equal(false);
    await rm(projectDir, { recursive: true, force: true });
  });
});
