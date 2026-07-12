import { Messages, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { describeTarget, resolveOutputBase } from '../../aep/commandSupport.js';
import { GenerationEngine } from '../../aep/engine/engine.js';
import {
  apiVersionFlag,
  at4dxFlag,
  bindingSequenceFlag,
  domainToggleFlag,
  dryRunFlag,
  fflibFlag,
  outputPathFlag,
  prefixFlag,
  resolveFlavor,
  selectorToggleFlag,
  sobjectFlag,
  targetOrgFlag,
  unitOfWorkToggleFlag,
} from '../../aep/flags.js';
import type { AepCommandResult } from '../../aep/model/types.js';
import { buildSObjectNames } from '../../aep/naming/naming.js';
import { PathResolver } from '../../aep/paths/paths.js';
import {
  buildDomainPlan,
  buildSelectorPlan,
  buildUnitOfWorkPlan,
  combinePlans,
} from '../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate');

export default class ApxGenerate extends SfCommand<AepCommandResult> {
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
    selector: selectorToggleFlag,
    domain: domainToggleFlag,
    'unit-of-work': unitOfWorkToggleFlag,
    'dry-run': dryRunFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const { flags } = await this.parse(ApxGenerate);
    if (!flags.selector && !flags.domain && !flags['unit-of-work'])
      throw new SfError(messages.getMessage('errorNothingSelected'));
    const flavor = resolveFlavor(flags);
    const { view, apiVersion } = await describeTarget(flags['target-org'], flags['api-version'], flags.sobject);
    const names = buildSObjectNames({ apiName: view.apiName, isCustom: view.isCustom, prefix: flags.prefix });
    const paths = new PathResolver();

    const selectorPlan = flags.selector
      ? buildSelectorPlan({ names, view, flavor, apiVersion, paths, includeBinding: flavor === 'at4dx' })
      : { artifacts: [] };
    const domainPlan = flags.domain
      ? buildDomainPlan({ names, view, flavor, apiVersion, paths, includeBinding: flavor === 'at4dx' })
      : { artifacts: [] };
    const unitOfWorkPlan = flags['unit-of-work']
      ? buildUnitOfWorkPlan({
          names,
          flavor,
          paths,
          bindingSequenceValue: flags['binding-sequence'] ?? '1000.0',
        })
      : { artifacts: [] };

    if (flags['unit-of-work'] && flavor === 'fflib' && !this.jsonEnabled()) {
      this.log(messages.getMessage('info.fflibSnippet'));
      this.log(`    ${view.apiName}.SObjectType`);
    }

    const plan = combinePlans(selectorPlan, domainPlan, unitOfWorkPlan);
    const baseDir = await resolveOutputBase(flags['output-path']);
    const manifest = await GenerationEngine.execute(plan, {
      baseDir,
      overwrite: 'overwrite',
      dryRun: flags['dry-run'],
    });
    if (!this.jsonEnabled()) {
      const createdCount = manifest.created.length;
      const skippedCount = manifest.skipped.length;
      const dryCount = manifest.wouldCreate?.length ?? 0;
      this.log(
        flags['dry-run']
          ? messages.getMessage('info.dryRunSummary', [dryCount])
          : messages.getMessage('info.summary', [createdCount, skippedCount])
      );
    }
    return { baseDir, created: manifest.created, skipped: manifest.skipped, wouldCreate: manifest.wouldCreate };
  }
}
