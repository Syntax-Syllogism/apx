import { expect } from 'chai';
import { classifyClasses } from '../../src/dead/classify.js';
import type { CandidateClass, ComponentRef, SymbolTable } from '../../src/dead/types.js';

const plainSymbol = (overrides: Partial<SymbolTable> = {}): SymbolTable => ({
  tableDeclaration: { annotations: [], modifiers: [] },
  methods: [],
  interfaces: [],
  parentClass: '',
  innerClasses: [],
  ...overrides,
});

const candidate = (id: string, name = id, symbolTable: SymbolTable | null = plainSymbol()): CandidateClass => ({
  id,
  name,
  symbolTable,
});

const ref = (id: string, name = id, type = 'ApexClass'): ComponentRef => ({ id, name, type });

const classify = (args: {
  candidates: CandidateClass[];
    inbound?: Array<[string, ComponentRef[]]>;
  outbound?: Array<[string, ComponentRef[]]>;
  boundClasses?: Array<[string, string]>;
  ignorePatterns?: string[];
}) =>
  classifyClasses({
    candidates: args.candidates,
    inbound: new Map(args.inbound),
    outbound: new Map(args.outbound),
    boundClasses: new Map(args.boundClasses),
    ignorePatterns: args.ignorePatterns ?? [],
  });

describe('classifyClasses', () => {
  it('finds an unreferenced class and keeps Apex and non-Apex references alive', () => {
    const result = classify({
      candidates: [candidate('dead'), candidate('apexLive'), candidate('lwcLive')],
      inbound: [
        ['apexLive', [ref('caller')]],
        ['lwcLive', [ref('bundle', 'GuestExperience', 'LightningComponentBundle')]],
      ],
    });

    expect(result.dead.map(({ name }) => name)).to.deep.equal(['dead']);
  });

  it('ignores self references and suppresses test classes by default', () => {
    const result = classify({
      candidates: [
        candidate('dead', 'DeadClass'),
        candidate('test', 'DeadClassTest', plainSymbol({ tableDeclaration: { annotations: [{ name: 'IsTest' }], modifiers: [] } })),
      ],
      inbound: [['dead', [ref('dead')]]],
    });

    expect(result.dead.map(({ name }) => name)).to.deep.equal(['DeadClass']);
    expect(result.suppressed[0]).to.include({ name: 'DeadClassTest', reason: 'test class' });
  });

  it('keeps suppressed classes out of classification regardless of presentation flags', () => {
    const result = classify({
      candidates: [
        candidate('entry', 'LiveEntry', plainSymbol({
          methods: [{ name: 'invoke', annotations: [{ name: 'AuraEnabled' }], modifiers: [] }],
        })),
        candidate('test', 'LiveEntryTest', plainSymbol({
          tableDeclaration: { annotations: [{ name: 'IsTest' }], modifiers: [] },
        })),
      ],
    });

    expect(result.dead).to.deep.equal([]);
    expect(result.testOnly).to.deep.equal([]);
    expect(result.testOfDead).to.deep.equal([]);
    expect(result.suppressed.map(({ name, wouldBeDead }) => ({ name, wouldBeDead }))).to.deep.equal([
      { name: 'LiveEntry', wouldBeDead: true },
      { name: 'LiveEntryTest', wouldBeDead: true },
    ]);
  });

  it('pairs a test-only subject with its test', () => {
    const result = classify({
      candidates: [candidate('subject', 'WeatherService'), candidate('test', 'WeatherServiceTest', plainSymbol({
        tableDeclaration: { annotations: [{ name: 'IsTest' }], modifiers: [] },
      }))],
      inbound: [['subject', [ref('test', 'WeatherServiceTest')]]],
      outbound: [['test', [ref('subject', 'WeatherService')]]],
    });

    expect(result.testOnly.map(({ name }) => name)).to.deep.equal(['WeatherService']);
    expect(result.testOfDead[0]).to.include({ name: 'WeatherServiceTest' });
    expect(result.testOfDead[0].subject?.name).to.equal('WeatherService');
  });

  it('retains a test-only subject when the test covers surviving code', () => {
    const result = classify({
      candidates: [candidate('subject', 'WeatherService'), candidate('live', 'PricingEngine'), candidate('test', 'WeatherServiceTest', plainSymbol({
        tableDeclaration: { annotations: [{ name: 'IsTest' }], modifiers: [] },
      }))],
      inbound: [
        ['subject', [ref('test', 'WeatherServiceTest')]],
        ['live', [ref('controller', 'PricingController')]],
      ],
      outbound: [['test', [ref('subject', 'WeatherService'), ref('live', 'PricingEngine')]]],
    });

    expect(result.testOnly).to.have.length(0);
    expect(result.retained[0].blockedBy?.map(({ name }) => name)).to.deep.equal(['PricingEngine']);
  });

  it('cascades removals to a fixpoint and reports rounds', () => {
    const result = classify({
      candidates: [candidate('a'), candidate('b'), candidate('c')],
      inbound: [
        ['b', [ref('a')]],
        ['c', [ref('b')]],
      ],
      outbound: [
        ['a', [ref('b')]],
        ['b', [ref('c')]],
      ],
    });

    expect(result.rounds).to.equal(3);
    expect(result.dead.map(({ name, round }) => [name, round])).to.deep.equal([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('resolves DI bindings without suppressing an unbound implementation', () => {
    const implementation = plainSymbol({ interfaces: ['IAccountService'] });
    const result = classify({
      candidates: [candidate('bound', 'AccountServiceImpl', implementation), candidate('orphan', 'AccountServiceImplV2', implementation)],
      boundClasses: [['accountserviceimpl', 'ApplicationFactory_ServiceBinding.IAccountService']],
    });

    expect(result.suppressed[0]).to.include({
      name: 'AccountServiceImpl',
      reason: 'bound: ApplicationFactory_ServiceBinding.IAccountService',
    });
    expect(result.dead[0]).to.include({ name: 'AccountServiceImplV2', risk: 'di' });
    expect(result.dead[0].riskDetail).to.include('IAccountService');
  });

  it('matches ignored names literally and supports wildcard patterns', () => {
    const result = classify({
      candidates: [candidate('one', 'Foo.Bar'), candidate('two', 'LegacyTwo'), candidate('three', 'Keep')],
      ignorePatterns: ['Foo.Bar', 'Legacy*'],
    });

    expect(result.scanned).to.equal(1);
    expect(result.dead.map(({ name }) => name)).to.deep.equal(['Keep']);
  });

  it('removes an otherwise orphaned dependency cycle', () => {
    const result = classify({
      candidates: [candidate('a'), candidate('b')],
      inbound: [
        ['a', [ref('b')]],
        ['b', [ref('a')]],
      ],
      outbound: [
        ['a', [ref('b')]],
        ['b', [ref('a')]],
      ],
    });

    expect(result.dead.map(({ name }) => name)).to.deep.equal(['a', 'b']);
  });
});
