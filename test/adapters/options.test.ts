import { SfError } from '@salesforce/core';
import {
  dead,
  generate,
  generateAction,
  generateCriteria,
  generateSelector,
  generateSelectorFieldInjection,
  renderDeadCodeReport,
  type DeadCodeResult,
} from '@syntax-syllogism/apx-core';
import { expect } from 'chai';
import { splitDeadReport } from '../../src/adapters/dead.js';
import { optionFlag, toOptions } from '../../src/adapters/options.js';
import { parseOptionsForCli } from '../../src/aep/errors.js';

const cliError = (run: () => unknown): Error => {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected an error');
};

describe('CLI option adapters', () => {
  it('maps camelCase option keys to kebab-case flags', () => {
    expect(optionFlag('sobjectSelectorClassName')).to.equal('sobject-selector-class-name');
    expect(optionFlag('outputPath')).to.equal('output-path');
  });

  it('maps the flavor booleans through the CLI rules', () => {
    const base = { sobject: 'Account', 'output-path': 'force-app' };
    expect(toOptions(generateSelector.descriptor, { ...base, at4dx: true })).to.include({ flavor: 'at4dx', sobject: 'Account' });
    expect(toOptions(generateSelector.descriptor, { ...base, fflib: true })).to.include({ flavor: 'fflib' });
    for (const flags of [base, { ...base, at4dx: true, fflib: true }]) {
      expect(cliError(() => toOptions(generateSelector.descriptor, flags)).message).to.equal(
        'Exactly one of the following must be provided: --at4dx, --fflib'
      );
    }
  });

  it('splits --fields and keeps the action order default', () => {
    expect(toOptions(generateSelectorFieldInjection.descriptor, { fields: ' Name, ,Industry ' }).fields).to.deep.equal([
      'Name',
      'Industry',
    ]);
    expect(toOptions(generateAction.descriptor, {}).order).to.equal('10.2');
    expect(toOptions(generateCriteria.descriptor, {}).order).to.equal(undefined);
  });

  const invalid: Array<{ name: string; parse: () => unknown; message: string }> = [
    {
      name: 'invalid order',
      parse: () =>
        parseOptionsForCli(
          generateAction.descriptor.optionsSchema,
          toOptions(generateAction.descriptor, { sobject: 'Account', 'class-name': 'A', order: 'x' })
        ),
      message: '`--order` must be a decimal-like value such as `10.1` or `10.2`.',
    },
    {
      name: 'binding name too long',
      parse: () =>
        parseOptionsForCli(
          generateCriteria.descriptor.optionsSchema,
          toOptions(generateCriteria.descriptor, { sobject: 'Account', 'class-name': 'AccountNameContainsFishCriteriaWithLongName' })
        ),
      message: 'is longer than the 40-character Salesforce limit.',
    },
    {
      name: 'empty fields',
      parse: () =>
        parseOptionsForCli(
          generateSelectorFieldInjection.descriptor.optionsSchema,
          toOptions(generateSelectorFieldInjection.descriptor, { sobject: 'Account', fields: ' , ' })
        ),
      message: 'At least one field must be provided in --fields.',
    },
    {
      name: 'fieldset name too long',
      parse: () =>
        parseOptionsForCli(
          generateSelectorFieldInjection.descriptor.optionsSchema,
          toOptions(generateSelectorFieldInjection.descriptor, {
            sobject: 'Account',
            fields: 'Name',
            'fieldset-name': 'A'.repeat(41),
          })
        ),
      message: `The generated field set name \`${'A'.repeat(41)}\` is longer than the 40-character Salesforce limit.`,
    },
    {
      name: 'nothing selected',
      parse: () =>
        parseOptionsForCli(generate.descriptor.optionsSchema, toOptions(generate.descriptor, { sobject: 'Account', fflib: true })),
      message: 'Select at least one artifact group: --selector, --domain, or --unit-of-work.',
    },
    {
      name: 'dead without --classes',
      parse: () => parseOptionsForCli(dead.descriptor.optionsSchema, toOptions(dead.descriptor, { 'destructive-manifest': true })),
      message: '--destructive-manifest requires --classes.',
    },
  ];

  for (const { name, parse, message } of invalid) {
    it(`reports ${name} as the CLI's SfError text`, () => {
      const error = cliError(parse);
      expect(error).to.be.instanceOf(SfError);
      expect(error.message).to.include(message);
    });
  }
});

describe('splitDeadReport', () => {
  const result = (overrides: Partial<DeadCodeResult> = {}): DeadCodeResult =>
    ({
      scanned: 1,
      rounds: 2,
      dead: [{ id: 'a', name: 'A', round: 1, reason: 'no references', referrers: [] }],
      testOnly: [],
      testOfDead: [],
      retained: [],
      suppressed: [],
      withoutSymbolTable: 1,
      bindingSources: [{ object: 'di_Binding__mdt', available: false, recordCount: 0 }],
      ...overrides,
    }) as unknown as DeadCodeResult;

  it('keeps multi-line warnings whole and logs every other line', () => {
    const blocks = splitDeadReport(renderDeadCodeReport(result()));
    const warnings = blocks.filter(({ warning }) => warning).map(({ text }) => text);
    expect(warnings).to.have.length(3);
    expect(warnings[0]).to.match(/^No AT4DX binding objects/);
    expect(warnings[1]).to.match(/^Class names held as strings[\s\S]*before deleting\.$/);
    expect(warnings[2]).to.match(/^1 classes have no symbol table[\s\S]*naming convention alone\.$/);
    const logged = blocks.filter(({ warning }) => !warning).map(({ text }) => text);
    expect(logged[0]).to.equal('Binding sources consulted:');
    expect(logged).to.include('DEAD');
    expect(logged.at(-1)).to.match(/^Scanned 1 classes/);
    expect(logged.some((line) => line.startsWith('Warning: '))).to.equal(false);
  });

  it('ends the warnings at the summary when there are no tables', () => {
    const blocks = splitDeadReport(renderDeadCodeReport(result({ dead: [], withoutSymbolTable: 0 })));
    expect(blocks.filter(({ warning }) => warning)).to.have.length(2);
    expect(blocks.at(-2)).to.include({ warning: false }).and.to.have.property('text').that.match(/^Scanned 1 classes/);
    expect(blocks.at(-1)).to.deep.equal({ warning: false, text: 'No dead classes found.' });
  });
});
