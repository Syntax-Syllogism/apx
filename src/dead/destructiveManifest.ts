import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SfError } from '@salesforce/core';
import type { DeadClassFinding, DeadCodeResult } from './types.js';

export type ManifestOptions = {
  outputBase: string;
  apiVersion: string;
  deadOnly: boolean;
  dryRun: boolean;
};

export type ManifestResult = {
  manifestDir?: string;
  manifestFiles?: string[];
  wouldWrite?: string[];
};

const escapeXml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

const membersFor = (result: DeadCodeResult, deadOnly: boolean): DeadClassFinding[] => {
  const findings = deadOnly ? result.dead : [...result.dead, ...result.testOnly, ...result.testOfDead];
  const byId = new Map(findings.map((finding) => [finding.id, finding]));
  if (!deadOnly) {
    for (const finding of result.testOnly) {
      for (const test of finding.referrers) {
        if (!byId.has(test.id)) throw new SfError(`Test pairing invariant failed for ${finding.name}.`);
      }
    }
  }
  return [...new Map(findings.map((finding) => [finding.id, finding])).values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
};

export const renderDestructiveChanges = (members: string[], apiVersion: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
${members.map((member) => `        <members>${escapeXml(member)}</members>`).join('\n')}
        <name>ApexClass</name>
    </types>
    <version>${escapeXml(apiVersion)}</version>
</Package>
`;

export const renderEmptyPackage = (apiVersion: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <version>${escapeXml(apiVersion)}</version>
</Package>
`;

export const writeDestructiveManifest = async (
  result: DeadCodeResult,
  options: ManifestOptions
): Promise<ManifestResult> => {
  const findings = membersFor(result, options.deadOnly);
  if (!findings.length) return {};

  const dir = path.join(options.outputBase, 'dead-code');
  const files = [path.join(dir, 'destructiveChanges.xml'), path.join(dir, 'package.xml')];
  if (options.dryRun) return { manifestDir: dir, wouldWrite: files };

  await mkdir(dir, { recursive: true });
  await writeFile(files[0], renderDestructiveChanges(findings.map(({ name }) => name), options.apiVersion), 'utf8');
  await writeFile(files[1], renderEmptyPackage(options.apiVersion), 'utf8');
  return { manifestDir: dir, manifestFiles: files };
};
