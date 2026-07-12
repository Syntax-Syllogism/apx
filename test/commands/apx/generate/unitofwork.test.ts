import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateUnitOfWork from '../../../../src/commands/apx/generate/unitofwork.js';

describe('apx generate unitofwork', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => {
    sinon.restore();
  });

  it('writes AT4DX binding metadata in json mode', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-uow-'));
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
    sinon.stub(ApxGenerateUnitOfWork.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'Account',
        at4dx: true,
        fflib: false,
        'api-version': undefined,
        'binding-sequence': '1000.0',
        'output-path': 'generated',
        prefix: undefined,
        'dry-run': false,
      },
    } as never);

    const result = await ApxGenerateUnitOfWork.run(['--json']);
    expect(result.created.some((p) => p.endsWith('ApplicationFactory_UnitOfWorkBinding.Account.md-meta.xml'))).to.equal(
      true
    );
    await rm(projectDir, { recursive: true, force: true });
  });

  it('omits _c suffix in custom-object AT4DX binding filename', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-uow-custom-'));
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
    sinon.stub(ApxGenerateUnitOfWork.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'CKR_ChecklistInstance__c',
        at4dx: true,
        fflib: false,
        'api-version': undefined,
        'binding-sequence': '1000.0',
        'output-path': 'generated',
        prefix: undefined,
        'dry-run': false,
      },
    } as never);

    const result = await ApxGenerateUnitOfWork.run(['--json']);
    expect(
      result.created.some((p) => p.endsWith('ApplicationFactory_UnitOfWorkBinding.CKR_ChecklistInstance.md-meta.xml'))
    ).to.equal(true);
    expect(
      result.created.some((p) => p.endsWith('ApplicationFactory_UnitOfWorkBinding.CKR_ChecklistInstance_c.md-meta.xml'))
    ).to.equal(false);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('returns empty manifest for fflib branch', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-uow-'));
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
    sinon.stub(ApxGenerateUnitOfWork.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'Account',
        at4dx: false,
        fflib: true,
        'api-version': undefined,
        'binding-sequence': undefined,
        'output-path': 'generated',
        prefix: undefined,
        'dry-run': false,
      },
    } as never);

    const result = await ApxGenerateUnitOfWork.run(['--json']);
    expect(result.created).to.deep.equal([]);
    expect(result.skipped).to.deep.equal([]);
    expect(result.manualSteps).to.deep.equal([
      'Please add the following binding to Application.cls (fflib_Application.UnitOfWorkFactory entry):',
      'Account.SObjectType',
    ]);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('returns manualSteps for fflib dry-run branch', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-uow-'));
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
    sinon.stub(ApxGenerateUnitOfWork.prototype as unknown as Record<string, unknown>, 'parse').resolves({
      flags: {
        'target-org': fakeOrg,
        sobject: 'Account',
        at4dx: false,
        fflib: true,
        'api-version': undefined,
        'binding-sequence': undefined,
        'output-path': 'generated',
        prefix: undefined,
        'dry-run': true,
      },
    } as never);

    const result = await ApxGenerateUnitOfWork.run(['--json']);
    expect(result.created).to.deep.equal([]);
    expect(result.skipped).to.deep.equal([]);
    expect(result.wouldCreate).to.deep.equal([]);
    expect(result.manualSteps).to.deep.equal([
      'Please add the following binding to Application.cls (fflib_Application.UnitOfWorkFactory entry):',
      'Account.SObjectType',
    ]);
    await rm(projectDir, { recursive: true, force: true });
  });
});
