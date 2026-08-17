import { existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Org, SfProject } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { expect } from 'chai';
import sinon from 'sinon';
import { promptRuntime } from '../../../src/aep/prompting.js';
import type { AepCommandResult } from '../../../src/aep/model/types.js';
import ApxGenerate from '../../../src/commands/apx/generate.js';
import ApxGenerateAction from '../../../src/commands/apx/generate/action.js';
import ApxGenerateCriteria from '../../../src/commands/apx/generate/criteria.js';
import ApxGenerateDomain from '../../../src/commands/apx/generate/domain.js';
import ApxGenerateService from '../../../src/commands/apx/generate/service.js';
import ApxGenerateUnitOfWork from '../../../src/commands/apx/generate/unitofwork.js';
import ApxGenerateSelector from '../../../src/commands/apx/generate/selector.js';
import ApxGenerateSelectorFieldInjection from '../../../src/commands/apx/generate/selector/field-injection.js';
import ApxGenerateSelectorMethod from '../../../src/commands/apx/generate/selector/method.js';

type GenerateCommand =
  | typeof ApxGenerate
  | typeof ApxGenerateAction
  | typeof ApxGenerateCriteria
  | typeof ApxGenerateDomain
  | typeof ApxGenerateService
  | typeof ApxGenerateUnitOfWork
  | typeof ApxGenerateSelector
  | typeof ApxGenerateSelectorFieldInjection
  | typeof ApxGenerateSelectorMethod;

const commands: Array<{ name: string; command: GenerateCommand }> = [
  { name: 'aggregate', command: ApxGenerate },
  { name: 'selector', command: ApxGenerateSelector },
  { name: 'domain', command: ApxGenerateDomain },
  { name: 'unit of work', command: ApxGenerateUnitOfWork },
  { name: 'service', command: ApxGenerateService },
  { name: 'criteria', command: ApxGenerateCriteria },
  { name: 'action', command: ApxGenerateAction },
  { name: 'selector method', command: ApxGenerateSelectorMethod },
  { name: 'selector field injection', command: ApxGenerateSelectorFieldInjection },
];

type CancelablePromise<T> = Promise<T> & { cancel: () => void };

const cancelable = <T>(value: T): CancelablePromise<T> =>
  Object.assign(Promise.resolve(value), { cancel: (): void => undefined });

const promptAnswer = (message: string, outputPath: string, commandName: string): string => {
  if (message.includes('Target org')) return commandName === 'service' ? '' : 'test-org';
  if (message === 'SObject API name') return 'Account';
  if (message === 'Service base name') return 'LimitMonitors';
  if (message === 'Class name') return commandName === 'selector method' ? 'AccountSelector' : 'AccountHandler';
  if (message === 'SObject selector class name') return 'AccountsSelector';
  if (message === 'Fields (comma-separated)') return 'Id, Name';
  if (message === 'Order') return '10.1';
  if (message === 'API version') return '62.0';
  if (message === 'Binding sequence') return '1000.0';
  if (message === 'Output path') return outputPath;
  return '';
};

const stubInteractiveInputs = (
  outputPath: string,
  commandName: string,
  apiVersionDefaults: Array<string | undefined>
): void => {
  sinon.stub(promptRuntime, 'input').callsFake(({ message, default: defaultValue }) => {
    if (message === 'API version') apiVersionDefaults.push(defaultValue);
    return cancelable(promptAnswer(message, outputPath, commandName));
  });
  sinon.stub(promptRuntime, 'select').callsFake(({ message }) => {
    if (message === 'Flavor') return cancelable('at4dx');
    return cancelable('Before_Insert');
  });
  sinon.stub(promptRuntime, 'checkbox').callsFake(() => cancelable(['selector', 'domain', 'unitOfWork']));
  sinon.stub(promptRuntime, 'confirm').callsFake(() => cancelable(false));
};

const stubOrg = (): void => {
  const describeSObject = sinon.stub().resolves({
    name: 'Account',
    custom: false,
    fields: [{ name: 'Id', type: 'id', filterable: true }],
  });
  const fakeOrg = {
    refreshAuth: sinon.stub().resolves(),
    getConnection: sinon.stub().returns({ describeSObject, getApiVersion: (): string => '62.0' }),
  } as unknown as Org;
  sinon.stub(Org, 'create').resolves(fakeOrg);
};

const runInteractive = async (
  commandCase: (typeof commands)[number],
  confirmed: boolean
): Promise<{ result: AepCommandResult; projectDir: string; apiVersionDefaults: Array<string | undefined> }> => {
  const projectDir = mkdtempSync(join(tmpdir(), 'apx-interactive-command-'));
  const outputPath = 'generated';
  const apiVersionDefaults: Array<string | undefined> = [];
  sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
  sinon.stub(SfProject, 'resolve').resolves({
    retrieveSfProjectJson: sinon.stub().resolves({ read: sinon.stub().resolves({ sourceApiVersion: '61.0' }) }),
  } as unknown as SfProject);
  stubOrg();
  stubInteractiveInputs(outputPath, commandCase.name, apiVersionDefaults);
  sinon.stub(SfCommand.prototype, 'confirm').resolves(confirmed);
  sinon.stub(commandCase.command.prototype as unknown as Record<string, unknown>, 'parse').resolves({
    flags: { interactive: true, json: true, 'api-version': '59.0' },
    metadata: { flags: { 'api-version': { setFromDefault: true } } },
    raw: [],
  } as never);

  const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
  try {
    return { result: await commandCase.command.run(['--interactive']), projectDir, apiVersionDefaults };
  } finally {
    if (ttyDescriptor) Object.defineProperty(process.stdin, 'isTTY', ttyDescriptor);
    else delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
  }
};

describe('interactive generation commands', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  for (const commandCase of commands) {
    it(`confirms and generates through ${commandCase.name}`, async () => {
      const { result, projectDir, apiVersionDefaults } = await runInteractive(commandCase, true);
      expect(result.created.length).to.be.greaterThan(0);
      expect(result.created.every((filePath: string) => existsSync(filePath))).to.equal(true);
      expect(apiVersionDefaults).to.deep.equal(commandCase.name === 'selector field injection' ? [] : ['61.0']);
      await rm(projectDir, { recursive: true, force: true });
    });

    it(`declines ${commandCase.name} without writing files`, async () => {
      const { result, projectDir } = await runInteractive(commandCase, false);
      expect(result.created).to.deep.equal([]);
      expect(result.skipped).to.deep.equal([]);
      expect(existsSync(join(projectDir, 'generated'))).to.equal(false);
      await rm(projectDir, { recursive: true, force: true });
    });
  }
});
