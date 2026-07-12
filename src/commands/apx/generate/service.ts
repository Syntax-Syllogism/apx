import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { resolveApiVersion, resolveOutputBase } from '../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../aep/engine/engine.js';
import {
  apiVersionFlag,
  at4dxFlag,
  dryRunFlag,
  fflibFlag,
  optionalTargetOrgFlag,
  outputPathFlag,
  prefixFlag,
  resolveFlavor,
  serviceBaseNameFlag,
} from '../../../aep/flags.js';
import type { AepCommandResult } from '../../../aep/model/types.js';
import { buildServiceNames } from '../../../aep/naming/naming.js';
import { PathResolver } from '../../../aep/paths/paths.js';
import { buildServicePlan } from '../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.service');

export default class ApxGenerateService extends SfCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-org': optionalTargetOrgFlag,
    'service-basename': serviceBaseNameFlag,
    at4dx: at4dxFlag,
    fflib: fflibFlag,
    'api-version': apiVersionFlag,
    'output-path': outputPathFlag,
    prefix: prefixFlag,
    'dry-run': dryRunFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const { flags } = await this.parse(ApxGenerateService);
    const flavor = resolveFlavor(flags);
    const apiVersion = await resolveApiVersion(flags['target-org'], flags['api-version']);
    const names = buildServiceNames({ basename: flags['service-basename'], prefix: flags.prefix });
    const plan = buildServicePlan({
      names,
      flavor,
      apiVersion,
      paths: new PathResolver(),
      includeBinding: flavor === 'at4dx',
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
