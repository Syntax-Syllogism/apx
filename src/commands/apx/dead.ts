import { Messages, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { resolveApiVersion, resolveOutputBase } from '../../aep/commandSupport.js';
import {
  apiVersionFlag,
  classesFlag,
  deadOnlyFlag,
  destructiveManifestFlag,
  dryRunFlag,
  ignoreFlag,
  includeSuppressedFlag,
  outputPathFlag,
  targetOrgFlag,
} from '../../aep/flags.js';
import { scanBindings } from '../../dead/bindings.js';
import { classifyClasses, MAX_ROUNDS } from '../../dead/classify.js';
import { fetchDependencyGraph } from '../../dead/dependencies.js';
import { writeDestructiveManifest } from '../../dead/destructiveManifest.js';
import { fetchClassInventory } from '../../dead/inventory.js';
import type { DeadCodeResult, DeadConnection } from '../../dead/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.dead');

const memberCount = (result: DeadCodeResult, deadOnly: boolean): number => {
  const findings = deadOnly ? result.dead : [...result.dead, ...result.testOnly, ...result.testOfDead];
  return new Set(findings.map((finding) => finding.id)).size;
};

export default class ApxDead extends SfCommand<DeadCodeResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-org': targetOrgFlag,
    classes: classesFlag,
    'destructive-manifest': destructiveManifestFlag,
    'dead-only': deadOnlyFlag,
    'include-suppressed': includeSuppressedFlag,
    ignore: ignoreFlag,
    'api-version': apiVersionFlag,
    'output-path': outputPathFlag,
    'dry-run': dryRunFlag,
  };

  public async run(): Promise<DeadCodeResult> {
    const { flags } = await this.parse(ApxDead);
    if (flags['destructive-manifest'] && !flags.classes)
      throw new SfError(messages.getMessage('error.manifestWithoutClasses'));
    if (!flags.classes) throw new SfError(messages.getMessage('error.nothingSelected'));

    const org = flags['target-org'];
    await org.refreshAuth();
    const conn = org.getConnection(flags['api-version']) as unknown as DeadConnection;
    const candidates = await fetchClassInventory(conn);
    const [bindingScan, dependencyGraph] = await Promise.all([
      scanBindings(conn),
      fetchDependencyGraph(
        conn,
        candidates.map((candidate) => candidate.id)
      ),
    ]);
    let result = classifyClasses({
      candidates,
      inbound: dependencyGraph.inbound,
      outbound: dependencyGraph.outbound,
      boundClasses: bindingScan.boundClasses,
      ignorePatterns: flags.ignore ?? [],
    });
    result = { ...result, bindingSources: bindingScan.reports };

    if (flags['destructive-manifest']) {
      const manifest = await writeDestructiveManifest(result, {
        outputBase: await resolveOutputBase(flags['output-path']),
        apiVersion: await resolveApiVersion(org, flags['api-version']),
        deadOnly: flags['dead-only'],
        dryRun: flags['dry-run'],
      });
      result = { ...result, ...manifest };
    }

    if (!this.jsonEnabled()) this.printHumanResult(result, flags['include-suppressed'], flags['dead-only'], org.getUsername());
    return result;
  }

  private printHumanResult(result: DeadCodeResult, includeSuppressed: boolean, deadOnly: boolean, username?: string): void {
    this.log(messages.getMessage('info.bindingSources'));
    for (const source of result.bindingSources) {
      this.log(
        source.available
          ? messages.getMessage('info.bindingSourceRow', [source.object, source.recordCount])
          : messages.getMessage('info.bindingSourceMissing', [source.object])
      );
    }
    if (result.bindingSources.every((source) => !source.available)) this.warn(messages.getMessage('warn.noBindingSources'));
    this.warn(messages.getMessage('warn.stringReferences'));

    const allFindings = [...result.dead, ...result.testOnly, ...result.testOfDead, ...result.retained];
    const cascaded = allFindings.filter((finding) => finding.round > 1).length;
    if (cascaded) this.warn(messages.getMessage('warn.cascade', [cascaded]));
    if (result.withoutSymbolTable) this.warn(messages.getMessage('warn.missingSymbolTable', [result.withoutSymbolTable]));
    if (result.rounds >= MAX_ROUNDS) this.warn(messages.getMessage('warn.maxRounds', [MAX_ROUNDS]));

    if (result.dead.length) {
      this.table({
        title: 'DEAD',
        data: result.dead.map((finding) => ({
          ROUND: finding.round,
          CLASS: finding.name,
          RISK: finding.risk ? 'DI?' : '',
          REASON: finding.riskDetail ?? finding.reason,
        })),
        columns: ['ROUND', 'CLASS', 'RISK', 'REASON'],
      });
    }
    if (result.testOnly.length) {
      this.table({
        title: 'TEST-ONLY',
        data: result.testOnly.map((finding) => ({
          ROUND: finding.round,
          CLASS: finding.name,
          TESTS: finding.referrers.map((ref) => ref.name).join(', '),
        })),
        columns: ['ROUND', 'CLASS', 'TESTS'],
      });
    }
    if (result.testOfDead.length) {
      this.table({
        title: 'TEST-OF-DEAD',
        data: result.testOfDead.map((finding) => ({
          ROUND: finding.round,
          CLASS: finding.name,
          'TEST OF': finding.subject?.name ?? '',
        })),
        columns: ['ROUND', 'CLASS', 'TEST OF'],
      });
    }
    if (result.retained.length) {
      this.table({
        title: 'RETAINED',
        data: result.retained.flatMap((finding) =>
          finding.referrers.map((test) => ({
            CLASS: finding.name,
            TEST: test.name,
            'ALSO COVERS': finding.blockedBy?.map((ref) => ref.name).join(', ') ?? '',
          }))
        ),
        columns: ['CLASS', 'TEST', 'ALSO COVERS'],
      });
    }
    if (includeSuppressed && result.suppressed.length) {
      const suppressed = [...result.suppressed].sort(
        (left, right) => Number(right.wouldBeDead ?? false) - Number(left.wouldBeDead ?? false) || left.name.localeCompare(right.name)
      );
      this.table({
        title: 'SUPPRESSED',
        data: suppressed.map((finding) => ({
          CLASS: finding.name,
          REASON: finding.reason,
          'WOULD BE DEAD': finding.wouldBeDead ? 'yes' : 'no',
        })),
        columns: ['CLASS', 'REASON', 'WOULD BE DEAD'],
      });
    }

    this.log(
      messages.getMessage('info.summary', [
        result.scanned,
        result.rounds,
        result.dead.length,
        result.testOnly.length,
        result.retained.length,
        result.suppressed.length,
      ])
    );
    const count = memberCount(result, deadOnly);
    if (result.manifestFiles && result.manifestDir) {
      this.log(messages.getMessage('info.manifestWritten', [count, result.manifestDir]));
      this.log(messages.getMessage('info.nextStep'));
      this.log(
        `sf project deploy start --target-org ${username ?? '<org>'} --manifest ${result.manifestDir}/package.xml --post-destructive-changes ${result.manifestDir}/destructiveChanges.xml`
      );
    } else if (result.wouldWrite && result.manifestDir) {
      this.log(messages.getMessage('info.dryRunManifest', [count, result.manifestDir]));
    } else if (!result.dead.length && !result.testOnly.length) {
      this.log(messages.getMessage('info.noResults'));
    }
  }
}
