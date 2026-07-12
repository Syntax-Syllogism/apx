import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { DEFAULT_API_VERSION, resolveOutputBase } from '../../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../../aep/engine/engine.js';
import {
  apiVersionFlag,
  classNameFlag,
  dryRunFlag,
  outputPathFlag,
  selectorClassNameFlag,
  sobjectFlag,
} from '../../../../aep/flags.js';
import type { AepCommandResult } from '../../../../aep/model/types.js';
import { buildSelectorMethodNames } from '../../../../aep/naming/naming.js';
import { PathResolver } from '../../../../aep/paths/paths.js';
import { buildSelectorMethodPlan } from '../../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.selector.method');

export default class ApxGenerateSelectorMethod extends SfCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    sobject: sobjectFlag,
    'class-name': classNameFlag,
    'sobject-selector-class-name': selectorClassNameFlag,
    'api-version': apiVersionFlag,
    'output-path': outputPathFlag,
    'dry-run': dryRunFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const { flags } = await this.parse(ApxGenerateSelectorMethod);
    const names = buildSelectorMethodNames({
      className: flags['class-name'],
      sobjectApiName: flags.sobject,
      sobjectSelectorClassName: flags['sobject-selector-class-name'],
    });
    const plan = buildSelectorMethodPlan({
      names,
      flavor: 'at4dx',
      apiVersion: flags['api-version'] ?? DEFAULT_API_VERSION,
      paths: new PathResolver(),
    });
    const baseDir = await resolveOutputBase(flags['output-path']);
    const manifest = await GenerationEngine.execute(plan, {
      baseDir,
      overwrite: 'overwrite',
      dryRun: flags['dry-run'],
    });
    if (!this.jsonEnabled())
      this.log(messages.getMessage('info.created', [manifest.created.length, manifest.skipped.length]));
    return { baseDir, created: manifest.created, skipped: manifest.skipped, wouldCreate: manifest.wouldCreate };
  }
}
