import { resolveOutputBase, resolveProjectApiVersion, generateCriteria, type AepCommandResult } from '@syntax-syllogism/apx-core';
import { Messages } from '@salesforce/core';
import { runGeneration } from '../../../adapters/generation.js';
import { ApxCommand } from '../../../aep/apxCommand.js';
import { assertInteractiveTty, requireFlagValue, resolveFlagsInteractively } from '../../../aep/commandSupport.js';

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

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.criteria');

export default class ApxGenerateCriteria extends ApxCommand<AepCommandResult> {
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
    const parsed = await this.parse(ApxGenerateCriteria);
    assertInteractiveTty(Boolean(parsed.flags.interactive));
    let flags = parsed.flags;
    if (flags.interactive) {
      const resolved = await resolveFlagsInteractively(
        parsed,
        [
          { key: 'sobject', prompt: async () => requireFlagValue(await promptText('SObject API name'), '--sobject') },
          { key: 'class-name', prompt: async () => requireFlagValue(await promptText('Class name'), '--class-name') },
          { key: 'trigger-operation', prompt: promptTriggerOperation },
          { key: 'order', prompt: () => promptText('Order', flags.order ?? '10.1') },
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
    return runGeneration(generateCriteria, flags, this.jsonEnabled() ? undefined : (line): void => this.log(line));
  }
}
