import { resolveOutputBase, resolveProjectApiVersion, generateService, type AepCommandResult } from '@syntax-syllogism/apx-core';
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
  interactiveFlag,
  optionalTargetOrgFlag,
  outputPathFlag,
  prefixFlag,
  serviceBaseNameFlag,
} from '../../../aep/flags.js';
import { promptBoolean, promptFlavor, promptOptionalText, promptText } from '../../../aep/prompting.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.service');

export default class ApxGenerateService extends ApxCommand<AepCommandResult> {
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
    interactive: interactiveFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const parsed = await this.parse(ApxGenerateService);
    assertInteractiveTty(Boolean(parsed.flags.interactive));
    let flags = parsed.flags;
    if (flags.interactive) {
      const resolved = await resolveFlagsInteractively(
        parsed,
        [
          {
            key: 'target-org',
            prompt: async (): Promise<import('@salesforce/core').Org | undefined> => {
              const alias = await promptOptionalText('Target org username or alias (leave blank to skip)');
              return alias ? resolveOrg(alias) : undefined;
            },
          },
          {
            key: 'service-basename',
            prompt: async () => requireFlagValue(await promptText('Service base name'), '--service-basename'),
          },
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
    requireFlagValue(flags['service-basename'], '--service-basename');
    return runGeneration(generateService, flags, this.jsonEnabled() ? undefined : (line): void => this.log(line));
  }
}
