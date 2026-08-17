import { Messages, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import {
  DEFAULT_API_VERSION,
  assertInteractiveTty,
  isValidOrderValue,
  isWithinCustomMetadataNameLimit,
  resolveOutputBase,
  requireFlagValue,
  resolveFlagsInteractively,
  resolveProjectApiVersion,
} from '../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../aep/engine/engine.js';
import {
  apiVersionFlag,
  classNameFlag,
  descriptionFlag,
  dryRunFlag,
  interactiveFlag,
  orderFlag,
  outputPathFlag,
  processNameFlag,
  sobjectFlag,
  triggerOperationFlag,
} from '../../../aep/flags.js';
import { promptBoolean, promptOptionalText, promptText, promptTriggerOperation } from '../../../aep/prompting.js';
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
    interactive: interactiveFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const parsed = await this.parse(ApxGenerateAction);
    assertInteractiveTty(Boolean(parsed.flags.interactive));
    let flags = parsed.flags;
    if (flags.interactive) {
      const resolved = await resolveFlagsInteractively(
        parsed,
        [
          { key: 'sobject', prompt: async () => requireFlagValue(await promptText('SObject API name'), '--sobject') },
          { key: 'class-name', prompt: async () => requireFlagValue(await promptText('Class name'), '--class-name') },
          { key: 'trigger-operation', prompt: promptTriggerOperation },
          { key: 'order', prompt: () => promptText('Order', flags.order ?? '10.2') },
          { key: 'process-name', prompt: () => promptOptionalText('Process name', flags['process-name']) },
          { key: 'description', prompt: () => promptOptionalText('Description', flags.description) },
          {
            key: 'api-version',
            prompt: async () => promptOptionalText('API version', await resolveProjectApiVersion()),
          },
          { key: 'output-path', prompt: () => promptText('Output path', flags['output-path']) },
          { key: 'dry-run', prompt: () => promptBoolean('Dry run', Boolean(flags['dry-run'])) },
        ],
        {
          log: (message) => this.log(message),
          confirm: () => this.confirm({ message: 'Generate with these values?', defaultAnswer: false }),
        }
      );
      flags = resolved.flags;
      if (!resolved.confirmed) {
        const baseDir = await resolveOutputBase(requireFlagValue(flags['output-path'], '--output-path'));
        return { baseDir, created: [], skipped: [] };
      }
    }
    requireFlagValue(flags.sobject, '--sobject');
    requireFlagValue(flags['class-name'], '--class-name');
    const order = flags.order ?? '10.2';
    if (!isValidOrderValue(order)) throw new SfError(messages.getMessage('error.invalidOrder'));
    const bindingDeveloperName = domainProcessBindingDeveloperName({
      className: requireFlagValue(flags['class-name'], '--class-name'),
      processName: flags['process-name'],
      order,
      type: 'Action',
    });
    if (!isWithinCustomMetadataNameLimit(bindingDeveloperName))
      throw new SfError(messages.getMessage('error.bindingNameTooLong', [bindingDeveloperName]));
    const names = buildActionNames({
      className: requireFlagValue(flags['class-name'], '--class-name'),
      sobjectApiName: requireFlagValue(flags.sobject, '--sobject'),
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
    const baseDir = await resolveOutputBase(requireFlagValue(flags['output-path'], '--output-path'));
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
