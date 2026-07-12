import { Messages, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import {
  DEFAULT_API_VERSION,
  isValidOrderValue,
  isWithinCustomMetadataNameLimit,
  resolveOutputBase,
} from '../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../aep/engine/engine.js';
import {
  apiVersionFlag,
  classNameFlag,
  descriptionFlag,
  dryRunFlag,
  orderFlag,
  outputPathFlag,
  processNameFlag,
  sobjectFlag,
  triggerOperationFlag,
} from '../../../aep/flags.js';
import type { AepCommandResult } from '../../../aep/model/types.js';
import { buildActionNames, domainProcessBindingDeveloperName } from '../../../aep/naming/naming.js';
import { PathResolver } from '../../../aep/paths/paths.js';
import { buildActionPlan } from '../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.action');

export default class ApxGenerateAction extends SfCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    sobject: sobjectFlag,
    'class-name': classNameFlag,
    'trigger-operation': triggerOperationFlag,
    order: orderFlag,
    'process-name': processNameFlag,
    description: descriptionFlag,
    'api-version': apiVersionFlag,
    'output-path': outputPathFlag,
    'dry-run': dryRunFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const { flags } = await this.parse(ApxGenerateAction);
    const order = flags.order ?? '10.2';
    if (!isValidOrderValue(order)) throw new SfError(messages.getMessage('error.invalidOrder'));
    const bindingDeveloperName = domainProcessBindingDeveloperName({
      className: flags['class-name'],
      processName: flags['process-name'],
      order,
      type: 'Action',
    });
    if (!isWithinCustomMetadataNameLimit(bindingDeveloperName))
      throw new SfError(messages.getMessage('error.bindingNameTooLong', [bindingDeveloperName]));
    const names = buildActionNames({
      className: flags['class-name'],
      sobjectApiName: flags.sobject,
      processName: flags['process-name'],
      order,
    });
    const plan = buildActionPlan({
      names,
      flavor: 'at4dx',
      apiVersion: flags['api-version'] ?? DEFAULT_API_VERSION,
      triggerOperation: flags['trigger-operation'] ?? 'Before_Insert',
      orderOfExecution: order,
      description: flags.description ?? `Review generated action binding for ${names.className}.`,
      paths: new PathResolver(),
    });
    const baseDir = await resolveOutputBase(flags['output-path']);
    const manifest = await GenerationEngine.execute(plan, {
      baseDir,
      overwrite: 'overwrite',
      dryRun: flags['dry-run'],
    });
    if (!this.jsonEnabled()) {
      this.log(messages.getMessage('info.created', [manifest.created.length, manifest.skipped.length]));
      this.log(messages.getMessage('info.reviewBinding'));
    }
    return { baseDir, created: manifest.created, skipped: manifest.skipped, wouldCreate: manifest.wouldCreate };
  }
}
