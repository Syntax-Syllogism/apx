import { expect } from 'chai';
import sinon from 'sinon';
import {
  assertInteractiveTty,
  flagWasSupplied,
  requireExactlyOneFlavor,
  requireFlagValue,
  resolveFlagsInteractively,
} from '../../src/aep/commandSupport.js';
import ApxGenerate from '../../src/commands/apx/generate.js';
import ApxGenerateAction from '../../src/commands/apx/generate/action.js';
import ApxGenerateCriteria from '../../src/commands/apx/generate/criteria.js';
import ApxGenerateDomain from '../../src/commands/apx/generate/domain.js';
import ApxGenerateSelector from '../../src/commands/apx/generate/selector.js';
import ApxGenerateFieldInjection from '../../src/commands/apx/generate/selector/field-injection.js';
import ApxGenerateMethod from '../../src/commands/apx/generate/selector/method.js';
import ApxGenerateService from '../../src/commands/apx/generate/service.js';
import ApxGenerateUnitOfWork from '../../src/commands/apx/generate/unitofwork.js';

describe('interactive generation support', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => sinon.restore());

  it('prompts for defaulted and missing values, summarizes them, and confirms', async () => {
    const logs: string[] = [];
    const parsed = {
      flags: { interactive: true, 'output-path': 'generated-files', at4dx: undefined },
      metadata: { flags: { 'output-path': { setFromDefault: true } } },
      raw: [],
    };
    const outputPrompt = sinon.stub().resolves('custom-output');
    const flavorPrompt = sinon.stub().resolves('at4dx');

    const result = await resolveFlagsInteractively(
      parsed,
      [
        { key: 'output-path', prompt: outputPrompt },
        { key: 'at4dx', prompt: flavorPrompt },
      ],
      { log: (message) => logs.push(message), confirm: async () => true }
    );

    expect(outputPrompt.calledOnce).to.equal(true);
    expect(flavorPrompt.calledOnce).to.equal(true);
    expect(result.confirmed).to.equal(true);
    expect(result.flags['output-path']).to.equal('custom-output');
    expect(logs.join('\n')).to.include('--output-path: custom-output');
  });

  it('recognizes command-line flags even when their values are false', () => {
    const parsed = { flags: { dryRun: false }, raw: [{ type: 'flag', flag: 'dryRun' }] };
    expect(flagWasSupplied(parsed, parsed.flags, ['dryRun'])).to.equal(true);
  });

  it('returns an empty result when confirmation is declined', async () => {
    const logs: string[] = [];
    const result = await resolveFlagsInteractively(
      { flags: { 'output-path': 'generated-files' }, metadata: { flags: {} }, raw: [] },
      [{ key: 'output-path', prompt: async () => 'unused' }],
      { log: (message) => logs.push(message), confirm: async () => false }
    );

    expect(result.confirmed).to.equal(false);
    expect(logs.at(-1)).to.equal('Generation cancelled; no files were written.');
  });

  it('replaces relaxed parser validation for required values and flavors', () => {
    expect(() => requireFlagValue(undefined, '--sobject')).to.throw('Missing required flag --sobject.');
    expect(() => requireFlagValue('  ', '--fields')).to.throw('Missing required flag --fields.');
    expect(requireFlagValue('Account', '--sobject')).to.equal('Account');
    expect(() => requireExactlyOneFlavor({})).to.throw('--at4dx');
    expect(() => requireExactlyOneFlavor({ at4dx: true, fflib: true })).to.throw('--fflib');
    expect(() => requireExactlyOneFlavor({ at4dx: true, fflib: false })).to.not.throw();
  });

  it('allows every generate command to inspect -i before required inputs are parsed', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    const commands = [
      ApxGenerate,
      ApxGenerateSelector,
      ApxGenerateDomain,
      ApxGenerateUnitOfWork,
      ApxGenerateService,
      ApxGenerateCriteria,
      ApxGenerateAction,
      ApxGenerateMethod,
      ApxGenerateFieldInjection,
    ];
    try {
      const errors = await Promise.all(
        commands.map(async (command) => {
          try {
            await command.run(['--interactive']);
            return undefined;
          } catch (error) {
            return String(error);
          }
        })
      );
      expect(errors).to.have.length(9);
      errors.forEach((error) => expect(error).to.include('requires an interactive terminal'));
    } finally {
      if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
      else delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
    }
  });

  it('rejects interactive mode without a TTY', () => {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    try {
      expect(() => assertInteractiveTty(true)).to.throw('requires an interactive terminal');
    } finally {
      if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
      else delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
    }
  });
});
