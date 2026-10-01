import { readFileSync } from 'node:fs';
import { commandDescriptors } from '@syntax-syllogism/apx-core';
import { expect } from 'chai';
import ApxDead from '../../src/commands/apx/dead.js';
import ApxGenerate from '../../src/commands/apx/generate.js';
import ApxGenerateAction from '../../src/commands/apx/generate/action.js';
import ApxGenerateCriteria from '../../src/commands/apx/generate/criteria.js';
import ApxGenerateDomain from '../../src/commands/apx/generate/domain.js';
import ApxGenerateSelector from '../../src/commands/apx/generate/selector.js';
import ApxGenerateSelectorFieldInjection from '../../src/commands/apx/generate/selector/field-injection.js';
import ApxGenerateSelectorMethod from '../../src/commands/apx/generate/selector/method.js';
import ApxGenerateService from '../../src/commands/apx/generate/service.js';
import ApxGenerateUnitOfWork from '../../src/commands/apx/generate/unitofwork.js';
import { optionFlag } from '../../src/adapters/options.js';

const commands: Record<string, { flags: Record<string, unknown> }> = {
  'apx:dead': ApxDead,
  'apx:generate': ApxGenerate,
  'apx:generate:action': ApxGenerateAction,
  'apx:generate:criteria': ApxGenerateCriteria,
  'apx:generate:domain': ApxGenerateDomain,
  'apx:generate:selector': ApxGenerateSelector,
  'apx:generate:selector:field-injection': ApxGenerateSelectorFieldInjection,
  'apx:generate:selector:method': ApxGenerateSelectorMethod,
  'apx:generate:service': ApxGenerateService,
  'apx:generate:unitofwork': ApxGenerateUnitOfWork,
};

/** Consumer concerns, or flags the adapter maps to a differently named option. */
const CLI_ONLY_FLAGS = new Set(['interactive', 'dry-run', 'target-org', 'at4dx', 'fflib', 'json', 'flags-dir']);
const flagFor = (key: string): string[] => (key === 'flavor' ? ['at4dx', 'fflib'] : [optionFlag(key)]);

describe('core descriptor ↔ CLI flag parity', () => {
  it('has one descriptor for every command in the snapshot', () => {
    const snapshot = JSON.parse(readFileSync('command-snapshot.json', 'utf8')) as Array<{ command: string }>;
    expect(commandDescriptors.map(({ cliId }) => cliId).sort()).to.deep.equal(snapshot.map(({ command }) => command).sort());
    expect(Object.keys(commands).sort()).to.deep.equal(snapshot.map(({ command }) => command).sort());
  });

  for (const descriptor of commandDescriptors) {
    describe(descriptor.cliId, () => {
      const command = commands[descriptor.cliId];
      const schemaKeys = Object.keys((descriptor.optionsSchema as unknown as { shape: Record<string, unknown> }).shape);

      it('maps every schema key to a flag', () => {
        for (const key of schemaKeys) {
          for (const flag of flagFor(key)) expect(command.flags, `${key} → --${flag}`).to.have.property(flag);
        }
      });

      it('maps every option flag to a schema key', () => {
        const mapped = new Set(schemaKeys.flatMap(flagFor));
        for (const flag of Object.keys(command.flags)) {
          if (CLI_ONLY_FLAGS.has(flag)) continue;
          expect(mapped.has(flag), `--${flag} has no schema key`).to.equal(true);
        }
      });

      it('connects only when the use case can use an org', () => {
        expect(Boolean(command.flags['target-org'])).to.equal(descriptor.requiresOrg !== 'none');
      });
    });
  }
});
