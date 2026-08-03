import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect } from 'chai';
import { writeDestructiveManifest } from '../../src/dead/destructiveManifest.js';
import type { DeadCodeResult } from '../../src/dead/types.js';

const result = (): DeadCodeResult => ({
  scanned: 5,
  rounds: 1,
  dead: [{ id: '1', name: 'OldHelper', bucket: 'dead', round: 1, reason: 'no inbound references', referrers: [] }],
  testOnly: [{
    id: '2',
    name: 'WeatherService',
    bucket: 'test-only',
    round: 1,
    reason: 'only referenced by tests',
    referrers: [{ id: '3', name: 'WeatherServiceTest', type: 'ApexClass' }],
  }],
  testOfDead: [{
    id: '3',
    name: 'WeatherServiceTest',
    bucket: 'test-of-dead',
    round: 1,
    reason: 'test for WeatherService',
    referrers: [],
    subject: { id: '2', name: 'WeatherService', type: 'ApexClass' },
  }],
  retained: [{ id: '4', name: 'Retained', bucket: 'retained', round: 0, reason: 'retained', referrers: [] }],
  suppressed: [{ id: '5', name: 'LiveEntry', bucket: 'suppressed', round: 0, reason: '@AuraEnabled', referrers: [] }],
  bindingSources: [],
  withoutSymbolTable: 0,
});

describe('writeDestructiveManifest', () => {
  it('writes sorted destructive and empty package manifests', async () => {
    const outputBase = mkdtempSync(join(tmpdir(), 'apx-dead-manifest-'));
    const written = await writeDestructiveManifest(result(), { outputBase, apiVersion: '60.0', deadOnly: false, dryRun: false });

    expect(written.manifestFiles).to.have.length(2);
    expect(readFileSync(written.manifestFiles![0], 'utf8')).to.include(
      '<members>OldHelper</members>\n        <members>WeatherService</members>'
    );
    expect(readFileSync(written.manifestFiles![1], 'utf8')).to.not.include('<types>');
    await rm(outputBase, { recursive: true, force: true });
  });

  it('honors dead-only and dry-run without writing files', async () => {
    const outputBase = mkdtempSync(join(tmpdir(), 'apx-dead-dry-'));
    const manifest = await writeDestructiveManifest(result(), { outputBase, apiVersion: '60.0', deadOnly: true, dryRun: true });

    expect(manifest.wouldWrite).to.have.length(2);
    expect(manifest.manifestFiles).to.equal(undefined);
    await rm(outputBase, { recursive: true, force: true });
  });
});
