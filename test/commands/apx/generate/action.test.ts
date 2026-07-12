import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateAction from '../../../../src/commands/apx/generate/action.js';

describe('apx generate action', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('parses argv and writes action files', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-action-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateAction.run([
      '--json',
      '--class-name',
      'DefaultAccountSloganBasedOnNameAction',
      '--sobject',
      'Account',
      '--output-path',
      'generated',
    ]);

    const normalized = result.created.map((pathValue) => pathValue.replaceAll('\\', '/'));
    expect(
      normalized.some((p) => p.endsWith('main/classes/actions/DefaultAccountSloganBasedOnNameAction.cls'))
    ).to.equal(true);
    expect(
      normalized.some((p) => p.endsWith('DomainProcessBinding.DefaultAccountSloganBasedOnNameAction.md-meta.xml'))
    ).to.equal(true);
    const classPath = result.created.find((p) => p.endsWith('DefaultAccountSloganBasedOnNameAction.cls'));
    if (classPath) expect(readFileSync(classPath, 'utf8')).to.include('extends DomainProcessAbstractAction');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('supports order default 10.2 in generated binding', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-action-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateAction.run([
      '--json',
      '-c',
      'DefaultAccountSloganBasedOnNameAction',
      '--sobject',
      'Account',
      '--output-path',
      'generated',
    ]);

    const bindingPath = result.created.find((p) =>
      p.endsWith('DomainProcessBinding.DefaultAccountSloganBasedOnNameAction.md-meta.xml')
    );
    expect(bindingPath).to.not.equal(undefined);
    if (bindingPath) expect(readFileSync(bindingPath, 'utf8')).to.include('<value xsi:type="xsd:double">10.2</value>');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('rejects invalid order values', async () => {
    let caught: unknown;
    try {
      await ApxGenerateAction.run([
        '--json',
        '--sobject',
        'Account',
        '--class-name',
        'DefaultAccountSloganBasedOnNameAction',
        '--order',
        'ten',
      ]);
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(Error);
    expect((caught as Error).message).to.contain('decimal-like value');
  });

  it('rejects overlong binding developer names', async () => {
    let caught: unknown;
    try {
      await ApxGenerateAction.run([
        '--json',
        '--sobject',
        'Account',
        '--class-name',
        'DefaultAccountSloganBasedOnNameAction',
        '--process-name',
        'ThisActionProcessNameIsIntentionallyWayTooLongForSalesforceMetadata',
        '--order',
        '10.20',
      ]);
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(Error);
    expect((caught as Error).message).to.contain('40-character Salesforce limit');
  });
});
