import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxDead from '../../../src/commands/apx/dead.js';

type Fixture = {
  classes: Array<{ Id: string; Name: string; NamespacePrefix: null }>;
  symbols: Record<string, unknown>;
  dependencies: Array<Record<string, string>>;
  bindings?: Array<Record<string, string | null>>;
  missingBindings?: boolean;
};

let activeProjectDir = '';
let resolveProjectPathStub: sinon.SinonStub | undefined;
let parseStub: sinon.SinonStub | undefined;
let outputStubs:
  | {
      log: sinon.SinonStub;
      warn: sinon.SinonStub;
      table: sinon.SinonStub;
    }
  | undefined;

const plainSymbol = (): Record<string, unknown> => ({
  tableDeclaration: { annotations: [], modifiers: [] },
  methods: [],
  interfaces: [],
  parentClass: '',
  innerClasses: [],
});

const testSymbol = (): Record<string, unknown> => ({
  ...plainSymbol(),
  tableDeclaration: { annotations: [{ name: 'IsTest' }], modifiers: [] },
});

const defaultFixture = (): Fixture => ({
  classes: [
    { Id: 'dead', Name: 'WeatherService', NamespacePrefix: null },
    { Id: 'test', Name: 'WeatherServiceTest', NamespacePrefix: null },
  ],
  symbols: { dead: plainSymbol(), test: testSymbol() },
  dependencies: [{
    MetadataComponentId: 'test',
    MetadataComponentName: 'WeatherServiceTest',
    MetadataComponentType: 'ApexClass',
    RefMetadataComponentId: 'dead',
    RefMetadataComponentName: 'WeatherService',
    RefMetadataComponentType: 'ApexClass',
  }],
  bindings: [],
});

const createHarness = (fixture: Fixture = defaultFixture()) => {
  const projectDir = mkdtempSync(join(tmpdir(), 'apx-dead-command-'));
  activeProjectDir = projectDir;
  resolveProjectPathStub ??= sinon.stub(SfProject, 'resolveProjectPath').callsFake(async () => activeProjectDir);
  const toolingQuery = sinon.stub();
  toolingQuery.callsFake(async (soql: string) => {
    if (soql.includes('NamespacePrefix')) return { records: fixture.classes };
    if (soql.includes('SymbolTable'))
      return { records: fixture.classes.map(({ Id }) => ({ Id, SymbolTable: fixture.symbols[Id] ?? null })) };
    return { records: fixture.dependencies };
  });
  const query = sinon.stub();
  query.callsFake(async () => {
    if (fixture.missingBindings) throw Object.assign(new Error('binding object unavailable'), { code: 'INVALID_TYPE' });
    return { records: fixture.bindings ?? [] };
  });
  const conn = { query, tooling: { autoFetchQuery: toolingQuery }, getApiVersion: (): string => '60.0' };
  const org = {
    refreshAuth: sinon.stub().resolves(),
    getConnection: sinon.stub().returns(conn),
    getUsername: (): string => 'scratch@example.com',
  };
  return { projectDir, org, query, toolingQuery };
};

const stubParse = (flags: Record<string, unknown>) => {
  parseStub ??= sinon.stub(ApxDead.prototype as unknown as Record<string, unknown>, 'parse');
  parseStub.resetHistory();
  parseStub.resolves({ flags } as never);
};

const flagsFor = (org: unknown, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  'target-org': org,
  classes: true,
  'destructive-manifest': false,
  'dead-only': false,
  'include-suppressed': false,
  ignore: [],
  'api-version': undefined,
  'output-path': 'generated-files',
  'dry-run': false,
  ...overrides,
});

const stubOutput = () => {
  outputStubs ??= {
    log: sinon.stub(ApxDead.prototype as unknown as Record<string, unknown>, 'log'),
    warn: sinon.stub(ApxDead.prototype as unknown as Record<string, unknown>, 'warn'),
    table: sinon.stub(ApxDead.prototype as unknown as Record<string, unknown>, 'table'),
  };
  outputStubs.log.resetHistory();
  outputStubs.warn.resetHistory();
  outputStubs.table.resetHistory();
  return outputStubs;
};

describe('apx dead', () => {
  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
  });

  afterEach(() => {
    sinon.restore();
    activeProjectDir = '';
    resolveProjectPathStub = undefined;
    parseStub = undefined;
    outputStubs = undefined;
  });

  it('scans classes and writes a paired destructive manifest', async () => {
    const harness = createHarness();
    stubParse(flagsFor(harness.org, { 'destructive-manifest': true }));

    const result = await ApxDead.run(['--json']);

    expect(result.testOnly.map(({ name }) => name)).to.deep.equal(['WeatherService']);
    expect(result.testOfDead.map(({ name }) => name)).to.deep.equal(['WeatherServiceTest']);
    expect(harness.query.callCount).to.equal(4);
    expect(result.manifestFiles).to.have.length(2);
    expect(readFileSync(result.manifestFiles![0], 'utf8')).to.include('<members>WeatherServiceTest</members>');
    await rm(harness.projectDir, { recursive: true, force: true });
  });

  it('does not write files when --classes is used without a manifest flag', async () => {
    const harness = createHarness();
    stubParse(flagsFor(harness.org));

    const result = await ApxDead.run(['--json']);

    expect(result.manifestFiles).to.equal(undefined);
    expect(existsSync(join(harness.projectDir, 'generated-files'))).to.equal(false);
    await rm(harness.projectDir, { recursive: true, force: true });
  });

  it('reports manifest paths without writing them in dry-run mode', async () => {
    const harness = createHarness();
    stubParse(flagsFor(harness.org, { 'destructive-manifest': true, 'dry-run': true }));

    const result = await ApxDead.run(['--json']);

    expect(result.wouldWrite).to.have.length(2);
    expect(result.manifestFiles).to.equal(undefined);
    expect(existsSync(result.wouldWrite![0])).to.equal(false);
    await rm(harness.projectDir, { recursive: true, force: true });
  });

  it('limits a destructive manifest to dead classes with --dead-only', async () => {
    const fixture = defaultFixture();
    fixture.classes.push({ Id: 'orphan', Name: 'OldHelper', NamespacePrefix: null });
    fixture.symbols.orphan = plainSymbol();
    const harness = createHarness(fixture);
    stubParse(flagsFor(harness.org, { 'destructive-manifest': true, 'dead-only': true }));

    const result = await ApxDead.run(['--json']);
    const manifest = readFileSync(result.manifestFiles![0], 'utf8');

    expect(manifest).to.include('<members>OldHelper</members>');
    expect(manifest).to.not.include('<members>WeatherService</members>');
    expect(manifest).to.not.include('<members>WeatherServiceTest</members>');
    await rm(harness.projectDir, { recursive: true, force: true });
  });

  it('keeps suppressed classes out of manifests even when requested for display', async () => {
    const fixture = defaultFixture();
    fixture.classes.push(
      { Id: 'bound', Name: 'BoundImpl', NamespacePrefix: null },
      { Id: 'entry', Name: 'LiveEntry', NamespacePrefix: null },
      { Id: 'otherTest', Name: 'OtherTest', NamespacePrefix: null }
    );
    fixture.symbols.bound = { ...plainSymbol(), interfaces: ['IService'] };
    fixture.symbols.entry = {
      ...plainSymbol(),
      methods: [{ name: 'invoke', annotations: [{ name: 'AuraEnabled' }], modifiers: [] }],
    };
    fixture.symbols.otherTest = testSymbol();
    fixture.bindings = [{ DeveloperName: 'IService', 'To__c': 'BoundImpl', 'BindingInterface__c': null }];

    const first = createHarness(fixture);
    stubParse(flagsFor(first.org, { 'destructive-manifest': true }));
    const withoutFlag = await ApxDead.run(['--json']);
    const firstManifest = readFileSync(withoutFlag.manifestFiles![0], 'utf8');
    await rm(first.projectDir, { recursive: true, force: true });

    const second = createHarness(fixture);
    stubParse(flagsFor(second.org, { 'destructive-manifest': true, 'include-suppressed': true }));
    const withFlag = await ApxDead.run(['--json']);
    const secondManifest = readFileSync(withFlag.manifestFiles![0], 'utf8');

    expect(secondManifest).to.equal(firstManifest);
    expect(withFlag.testOnly.map(({ name }) => name)).to.deep.equal(['WeatherService']);
    expect(withFlag.suppressed.every(({ wouldBeDead }) => wouldBeDead === true)).to.equal(true);
    await rm(second.projectDir, { recursive: true, force: true });
  });

  it('renders the suppressed table with the would-be-dead audit column', async () => {
    const fixture = defaultFixture();
    fixture.classes = [{ Id: 'entry', Name: 'LiveEntry', NamespacePrefix: null }];
    fixture.symbols = {
      entry: {
        ...plainSymbol(),
        methods: [{ name: 'invoke', annotations: [{ name: 'AuraEnabled' }], modifiers: [] }],
      },
    };
    const harness = createHarness(fixture);
    const output = stubOutput();
    stubParse(flagsFor(harness.org, { 'include-suppressed': true }));

    await ApxDead.run([]);

    expect(output.table.calledOnce).to.equal(true);
    const tableOptions = output.table.firstCall.args[0] as { title?: string; columns?: string[] };
    expect(tableOptions).to.include({ title: 'SUPPRESSED' });
    expect(tableOptions.columns).to.include('WOULD BE DEAD');
    await rm(harness.projectDir, { recursive: true, force: true });
  });

  it('rejects a run without --classes', async () => {
    const harness = createHarness();
    stubParse(flagsFor(harness.org, { classes: false }));
    let error: unknown;
    try {
      await ApxDead.run([]);
    } catch (caught) {
      error = caught;
    }

    expect(error).to.have.property('message', 'Specify --classes.');
    await rm(harness.projectDir, { recursive: true, force: true });
  });

  it('prints binding-source rows and warns when every source is unavailable', async () => {
    const available = createHarness();
    const availableOutput = stubOutput();
    stubParse(flagsFor(available.org));
    await ApxDead.run([]);
    expect(availableOutput.log.args.some(([message]) => message === 'Binding sources consulted:')).to.equal(true);
    expect(availableOutput.warn.args.some(([message]) => String(message).includes('No AT4DX binding objects'))).to.equal(false);
    await rm(available.projectDir, { recursive: true, force: true });

    const missing = createHarness({ ...defaultFixture(), missingBindings: true });
    const missingOutput = stubOutput();
    stubParse(flagsFor(missing.org));
    await ApxDead.run([]);
    expect(missingOutput.warn.args.some(([message]) => String(message).includes('No AT4DX binding objects'))).to.equal(true);
    await rm(missing.projectDir, { recursive: true, force: true });
  });

  it('keeps JSON mode quiet and emits cascade warnings only for later rounds', async () => {
    const jsonHarness = createHarness();
    const jsonOutput = stubOutput();
    stubParse(flagsFor(jsonHarness.org));
    await ApxDead.run(['--json']);
    expect(jsonOutput.log.called).to.equal(false);
    expect(jsonOutput.warn.called).to.equal(false);
    await rm(jsonHarness.projectDir, { recursive: true, force: true });

    const fixture: Fixture = {
      classes: [
        { Id: 'a', Name: 'A', NamespacePrefix: null },
        { Id: 'b', Name: 'B', NamespacePrefix: null },
        { Id: 'c', Name: 'C', NamespacePrefix: null },
      ],
      symbols: { a: plainSymbol(), b: plainSymbol(), c: plainSymbol() },
      dependencies: [
        { MetadataComponentId: 'a', MetadataComponentName: 'A', MetadataComponentType: 'ApexClass', RefMetadataComponentId: 'b', RefMetadataComponentName: 'B', RefMetadataComponentType: 'ApexClass' },
        { MetadataComponentId: 'b', MetadataComponentName: 'B', MetadataComponentType: 'ApexClass', RefMetadataComponentId: 'c', RefMetadataComponentName: 'C', RefMetadataComponentType: 'ApexClass' },
      ],
    };
    const cascadeHarness = createHarness(fixture);
    const cascadeOutput = stubOutput();
    stubParse(flagsFor(cascadeHarness.org));
    const cascadeResult = await ApxDead.run([]);
    expect(cascadeResult.rounds).to.equal(3);
    expect(cascadeOutput.warn.args.some(([message]) => String(message).includes('round 2 or later'))).to.equal(true);
    await rm(cascadeHarness.projectDir, { recursive: true, force: true });
  });

  it('declares that --dead-only requires --destructive-manifest', () => {
    expect(ApxDead.flags['dead-only'].dependsOn).to.deep.equal(['destructive-manifest']);
  });
});
