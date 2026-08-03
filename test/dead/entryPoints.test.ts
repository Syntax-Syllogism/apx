import { expect } from 'chai';
import { describeDiShape, detectEntryPoint, isTestClass } from '../../src/dead/entryPoints.js';
import type { SymbolTable } from '../../src/dead/types.js';

const symbol = (overrides: Partial<SymbolTable> = {}): SymbolTable => ({
  tableDeclaration: { annotations: [], modifiers: [] },
  methods: [],
  interfaces: [],
  parentClass: '',
  innerClasses: [],
  ...overrides,
});

describe('entry-point heuristics', () => {
  it('recognizes annotations, interfaces, modifiers, and inner classes', () => {
    expect(detectEntryPoint(symbol({ methods: [{ name: 'run', annotations: [{ name: 'InvocableMethod' }], modifiers: [] }] }))).to.equal(
      '@InvocableMethod method run()'
    );
    expect(detectEntryPoint(symbol({ interfaces: ['Database.Batchable'] }))).to.equal('implements Database.Batchable');
    expect(detectEntryPoint(symbol({ tableDeclaration: { annotations: [{ name: 'RestResource' }], modifiers: [] } }))).to.equal(
      '@RestResource'
    );
    expect(detectEntryPoint(symbol({ innerClasses: [symbol({ methods: [{ name: 'call', annotations: [{ name: 'AuraEnabled' }], modifiers: [] }] })] }))).to.equal(
      '@AuraEnabled method call()'
    );
    expect(detectEntryPoint(symbol({ methods: [{ name: 'run', annotations: [], modifiers: ['webservice'] }] }))).to.equal(
      'webservice method run()'
    );
  });

  it('uses symbol annotations for tests and naming fallback for uncompiled classes', () => {
    expect(isTestClass(symbol({ tableDeclaration: { annotations: [{ name: 'IsTest' }], modifiers: [] } }), 'Helper')).to.equal(true);
    expect(isTestClass(null, 'TestLegacyClass')).to.equal(true);
    expect(isTestClass(null, 'ProductionClass')).to.equal(false);
  });

  it('describes DI shape without treating it as an entry point', () => {
    expect(describeDiShape(symbol({ interfaces: ['IAccountService'] }))).to.equal('implements IAccountService');
    expect(describeDiShape(symbol({ parentClass: 'DomainProcessAbstractAction' }))).to.equal('extends DomainProcessAbstractAction');
    expect(describeDiShape(symbol())).to.equal(null);
  });
});
