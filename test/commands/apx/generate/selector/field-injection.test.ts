import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerateSelectorFieldInjection from '../../../../../src/commands/apx/generate/selector/field-injection.js';

describe('apx generate selector field-injection', () => {
  let sandbox: sinon.SinonSandbox;
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
    sandbox = sinon.createSandbox();
    sfCommandStubs = stubSfCommandUx(sandbox);
  });

  afterEach(() => {
    sinon.restore();
    sandbox.restore();
  });

  it('writes fieldset and binding from comma-separated fields', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-field-injection-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateSelectorFieldInjection.run([
      '--json',
      '--sobject',
      'Account',
      '--fields',
      'Name, Industry',
      '--output-path',
      'generated',
    ]);

    const fieldSetPath = result.created.find((p) => p.endsWith('SelectorInclusion_AccountFields.fieldSet-meta.xml'));
    const bindingPath = result.created.find((p) =>
      p.endsWith('SelectorConfig_FieldSetInclusion.SelectorInclusion_AccountFields.md-meta.xml')
    );
    expect(fieldSetPath).to.not.equal(undefined);
    expect(bindingPath).to.not.equal(undefined);
    if (fieldSetPath) {
      const xml = readFileSync(fieldSetPath, 'utf8');
      expect(xml).to.include('<field>Name</field>');
      expect(xml).to.include('<field>Industry</field>');
    }
    await rm(projectDir, { recursive: true, force: true });
  });

  it('prints unmangled custom field API names in human binding review output', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-field-injection-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    await ApxGenerateSelectorFieldInjection.run([
      '--sobject',
      'Account',
      '--fields',
      'Name, Industry',
      '--output-path',
      'generated',
    ]);

    const output = sfCommandStubs.log
      .getCalls()
      .map((call) => call.args[0] as string)
      .join('\n');
    expect(output).to.include('BindingSObjectAlternate__c (nil)');
    expect(output).to.include('IsActive__c=true');
    expect(output).to.not.include('**c');
    expect(output).to.not.include('\\_\\_c');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('uses explicit --fieldset-name when provided', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-field-injection-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateSelectorFieldInjection.run([
      '--json',
      '--sobject',
      'Account',
      '--fields',
      'Name',
      '--fieldset-name',
      'AccountFieldsFromMarketing',
      '--output-path',
      'generated',
    ]);
    expect(result.created.some((p) => p.endsWith('AccountFieldsFromMarketing.fieldSet-meta.xml'))).to.equal(true);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('rejects overlong explicit --fieldset-name values', async () => {
    let caught: unknown;
    try {
      await ApxGenerateSelectorFieldInjection.run([
        '--json',
        '--sobject',
        'Account',
        '--fields',
        'Name',
        '--fieldset-name',
        'ThisFieldSetNameIsIntentionallyWayTooLongForSalesforceMetadata',
      ]);
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(Error);
    expect((caught as Error).message).to.contain('40-character Salesforce limit');
  });

  it('uses deploy-safe default fieldset name length for custom objects', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'apx-field-injection-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);

    const result = await ApxGenerateSelectorFieldInjection.run([
      '--json',
      '--sobject',
      'CKR_ChecklistInstance__c',
      '--fields',
      'Name',
      '--output-path',
      'generated',
    ]);
    expect(
      result.created.some((p) => p.endsWith('SelectorInclusion_CKRChecklistInstFields.fieldSet-meta.xml'))
    ).to.equal(true);
    expect(
      result.created.some((p) =>
        p.endsWith('SelectorConfig_FieldSetInclusion.SelectorInclusion_CKRChecklistInstFields.md-meta.xml')
      )
    ).to.equal(true);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('rejects empty --fields payloads', async () => {
    let caught: unknown;
    try {
      await ApxGenerateSelectorFieldInjection.run(['--json', '--sobject', 'Account', '--fields', ' , ']);
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).to.include('At least one field must be provided');
  });
});
