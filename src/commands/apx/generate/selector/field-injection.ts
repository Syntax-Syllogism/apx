import { resolveOutputBase, generateSelectorFieldInjection, type AepCommandResult } from '@syntax-syllogism/apx-core';
import { Messages } from '@salesforce/core';
import { runGeneration } from '../../../../adapters/generation.js';
import { ApxCommand } from '../../../../aep/apxCommand.js';
import { assertInteractiveTty, requireFlagValue, resolveFlagsInteractively } from '../../../../aep/commandSupport.js';

import {
  descriptionFlag,
  dryRunFlag,
  fieldsFlag,
  fieldsetNameFlag,
  interactiveFlag,
  labelFlag,
  outputPathFlag,
  sobjectFlag,
} from '../../../../aep/flags.js';
import { promptBoolean, promptOptionalText, promptText } from '../../../../aep/prompting.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.selector.field-injection');

export default class ApxGenerateSelectorFieldInjection extends ApxCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    sobject: sobjectFlag,
    fields: fieldsFlag,
    'fieldset-name': fieldsetNameFlag,
    label: labelFlag,
    description: descriptionFlag,
    'output-path': outputPathFlag,
    'dry-run': dryRunFlag,
    interactive: interactiveFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const parsed = await this.parse(ApxGenerateSelectorFieldInjection);
    assertInteractiveTty(Boolean(parsed.flags.interactive));
    let flags = parsed.flags;
    if (flags.interactive) {
      const resolved = await resolveFlagsInteractively(
        parsed,
        [
          { key: 'sobject', prompt: async () => requireFlagValue(await promptText('SObject API name'), '--sobject') },
          {
            key: 'fields',
            prompt: async () => requireFlagValue(await promptText('Fields (comma-separated)'), '--fields'),
          },
          { key: 'fieldset-name', prompt: () => promptOptionalText('Fieldset name', flags['fieldset-name']) },
          { key: 'label', prompt: () => promptOptionalText('Label', flags.label) },
          { key: 'description', prompt: () => promptOptionalText('Description', flags.description) },
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
    requireFlagValue(flags.fields, '--fields');
    return runGeneration(generateSelectorFieldInjection, flags, this.jsonEnabled() ? undefined : (line): void => this.log(line));
  }
}
