import { resolveOutputBase, resolveProjectApiVersion, generateSelectorMethod, type AepCommandResult } from '@syntax-syllogism/apx-core';
import { Messages } from '@salesforce/core';
import { runGeneration } from '../../../../adapters/generation.js';
import { ApxCommand } from '../../../../aep/apxCommand.js';
import { assertInteractiveTty, requireFlagValue, resolveFlagsInteractively } from '../../../../aep/commandSupport.js';

import {
  apiVersionFlag,
  classNameFlag,
  dryRunFlag,
  interactiveFlag,
  outputPathFlag,
  selectorClassNameFlag,
  sobjectFlag,
} from '../../../../aep/flags.js';
import { promptBoolean, promptOptionalText, promptText } from '../../../../aep/prompting.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.selector.method');

export default class ApxGenerateSelectorMethod extends ApxCommand<AepCommandResult> {
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
    interactive: interactiveFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const parsed = await this.parse(ApxGenerateSelectorMethod);
    assertInteractiveTty(Boolean(parsed.flags.interactive));
    let flags = parsed.flags;
    if (flags.interactive) {
      const resolved = await resolveFlagsInteractively(
        parsed,
        [
          { key: 'sobject', prompt: async () => requireFlagValue(await promptText('SObject API name'), '--sobject') },
          { key: 'class-name', prompt: async () => requireFlagValue(await promptText('Class name'), '--class-name') },
          {
            key: 'sobject-selector-class-name',
            prompt: async () =>
              requireFlagValue(await promptText('SObject selector class name'), '--sobject-selector-class-name'),
          },
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
    requireFlagValue(flags['sobject-selector-class-name'], '--sobject-selector-class-name');
    return runGeneration(generateSelectorMethod, flags, this.jsonEnabled() ? undefined : (line): void => this.log(line));
  }
}
