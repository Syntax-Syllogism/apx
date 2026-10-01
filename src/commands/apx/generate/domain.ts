import { resolveOutputBase, resolveProjectApiVersion, generateDomain, type AepCommandResult } from '@syntax-syllogism/apx-core';
import { Messages } from '@salesforce/core';
import { runGeneration } from '../../../adapters/generation.js';
import { ApxCommand } from '../../../aep/apxCommand.js';
import {
  assertInteractiveTty,
  requireFlagValue,
  resolveFlagsInteractively,
  resolveOrg,
} from '../../../aep/commandSupport.js';

import {
  apiVersionFlag,
  at4dxFlag,
  dryRunFlag,
  fflibFlag,
  interactiveTargetOrgFlag,
  interactiveFlag,
  outputPathFlag,
  prefixFlag,
  sobjectFlag,
} from '../../../aep/flags.js';
import { promptBoolean, promptFlavor, promptOptionalText, promptText } from '../../../aep/prompting.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.domain');

export default class ApxGenerateDomain extends ApxCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-org': interactiveTargetOrgFlag,
    sobject: sobjectFlag,
    at4dx: at4dxFlag,
    fflib: fflibFlag,
    'api-version': apiVersionFlag,
    'output-path': outputPathFlag,
    prefix: prefixFlag,
    'dry-run': dryRunFlag,
    interactive: interactiveFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const parsed = await this.parse(ApxGenerateDomain);
    assertInteractiveTty(Boolean(parsed.flags.interactive));
    let flags = parsed.flags;
    if (flags.interactive) {
      const resolved = await resolveFlagsInteractively(
        parsed,
        [
          {
            key: 'target-org',
            prompt: async () =>
              resolveOrg(requireFlagValue(await promptText('Target org username or alias'), '--target-org')),
          },
          { key: 'sobject', prompt: async () => requireFlagValue(await promptText('SObject API name'), '--sobject') },
          {
            key: 'flavor',
            suppliedKeys: ['at4dx', 'fflib'],
            prompt: promptFlavor,
            assign: (_resolvedFlags, value): Record<string, unknown> => ({
              at4dx: value === 'at4dx',
              fflib: value === 'fflib',
            }),
          },
          {
            key: 'api-version',
            prompt: async () => promptOptionalText('API version', await resolveProjectApiVersion()),
          },
          { key: 'output-path', prompt: () => promptText('Output path', flags['output-path']) },
          { key: 'prefix', prompt: () => promptOptionalText('Class prefix', flags.prefix) },
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
    requireFlagValue(flags['target-org'], '--target-org');
    requireFlagValue(flags.sobject, '--sobject');
    return runGeneration(generateDomain, flags, this.jsonEnabled() ? undefined : (line): void => this.log(line));
  }
}
