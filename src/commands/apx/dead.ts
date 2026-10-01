import {
  dead,
  renderDeadCodeReport,
  resolveOutputBase,
  type DeadCodeResult,
} from '@syntax-syllogism/apx-core';
import { Messages } from '@salesforce/core';
import { ApxCommand } from '../../aep/apxCommand.js';
import { parseOptionsForCli, writeDeadCodeManifestForCli } from '../../aep/errors.js';
import { toOptions } from '../../adapters/options.js';
import { splitDeadReport } from '../../adapters/dead.js';

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

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.dead');

export default class ApxDead extends ApxCommand<DeadCodeResult> {
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
    const options = parseOptionsForCli(dead.descriptor.optionsSchema, toOptions(dead.descriptor, flags));
    const org = flags['target-org'];
    await org.refreshAuth();
    const { manifest, ...analysis } = await dead.run(org.getConnection(flags['api-version']), options);
    const result: DeadCodeResult = options.destructiveManifest
      ? {
          ...analysis,
          ...(await writeDeadCodeManifestForCli(
            { ...analysis, manifest },
            await resolveOutputBase(options.outputPath),
            { dryRun: flags['dry-run'] }
          )),
        }
      : analysis;

    if (!this.jsonEnabled()) {
      const report = renderDeadCodeReport(result, {
        includeSuppressed: options.includeSuppressed,
        deadOnly: options.deadOnly,
        username: org.getUsername(),
      });
      for (const block of splitDeadReport(report)) {
        if (block.warning) this.warn(block.text);
        else this.log(block.text);
      }
    }
    return result;
  }
}
