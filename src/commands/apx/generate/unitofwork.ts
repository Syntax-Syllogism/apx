import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { describeTarget, resolveOutputBase } from '../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../aep/engine/engine.js';
import {
  apiVersionFlag,
  at4dxFlag,
  bindingSequenceFlag,
  dryRunFlag,
  fflibFlag,
  outputPathFlag,
  prefixFlag,
  resolveFlavor,
  sobjectFlag,
  targetOrgFlag,
} from '../../../aep/flags.js';
import type { AepCommandResult } from '../../../aep/model/types.js';
import { buildSObjectNames } from '../../../aep/naming/naming.js';
import { PathResolver } from '../../../aep/paths/paths.js';
import { buildUnitOfWorkPlan } from '../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.unitofwork');

export default class ApxGenerateUnitOfWork extends SfCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-org': targetOrgFlag,
    sobject: sobjectFlag,
    at4dx: at4dxFlag,
    fflib: fflibFlag,
    'api-version': apiVersionFlag,
    'binding-sequence': bindingSequenceFlag,
    'output-path': outputPathFlag,
    prefix: prefixFlag,
    'dry-run': dryRunFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const { flags } = await this.parse(ApxGenerateUnitOfWork);
    const flavor = resolveFlavor(flags);
    const { view } = await describeTarget(flags['target-org'], flags['api-version'], flags.sobject);
    const names = buildSObjectNames({ apiName: view.apiName, isCustom: view.isCustom, prefix: flags.prefix });
    if (flavor === 'fflib') {
      const manualSteps = [messages.getMessage('info.fflibSnippet'), `${view.apiName}.SObjectType`];
      if (!this.jsonEnabled()) {
        this.log(manualSteps[0]);
        this.log(`    ${manualSteps[1]}`);
      }
      const baseDir = await resolveOutputBase(flags['output-path']);
      return flags['dry-run']
        ? { baseDir, created: [], skipped: [], wouldCreate: [], manualSteps }
        : { baseDir, created: [], skipped: [], manualSteps };
    }

    const plan = buildUnitOfWorkPlan({
      names,
      flavor,
      paths: new PathResolver(),
      bindingSequenceValue: flags['binding-sequence'] ?? '1000.0',
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
