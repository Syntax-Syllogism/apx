import { resolveOutputBase, resolveProjectApiVersion, generate, type AepCommandResult } from '@syntax-syllogism/apx-core';
import { Messages } from '@salesforce/core';
import { runGeneration } from '../../adapters/generation.js';
import { ApxCommand } from '../../aep/apxCommand.js';
import {
  assertInteractiveTty,
  flagWasSupplied,
  requireFlagValue,
  resolveFlagsInteractively,
  resolveOrg,
} from '../../aep/commandSupport.js';

import {
  apiVersionFlag,
  at4dxFlag,
  bindingSequenceFlag,
  domainToggleFlag,
  dryRunFlag,
  fflibFlag,
  interactiveTargetOrgFlag,
  outputPathFlag,
  prefixFlag,
  selectorToggleFlag,
  sobjectFlag,
  unitOfWorkToggleFlag,
  interactiveFlag,
} from '../../aep/flags.js';
import {
  promptArtifactGroups,
  promptBoolean,
  promptFlavor,
  promptOptionalText,
  promptText,
} from '../../aep/prompting.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate');

export default class ApxGenerate extends ApxCommand<AepCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-org': interactiveTargetOrgFlag,
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
    interactive: interactiveFlag,
  };

  public async run(): Promise<AepCommandResult> {
    const parsed = await this.parse(ApxGenerate);
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
          { key: 'binding-sequence', prompt: () => promptOptionalText('Binding sequence', flags['binding-sequence']) },
          { key: 'output-path', prompt: () => promptText('Output path', flags['output-path']) },
          { key: 'prefix', prompt: () => promptOptionalText('Class prefix', flags.prefix) },
          {
            key: 'artifact-groups',
            suppliedKeys: ['selector', 'domain', 'unit-of-work'],
            requireAllSupplied: true,
            prompt: () =>
              promptArtifactGroups(
                { selector: flags.selector, domain: flags.domain, unitOfWork: flags['unit-of-work'] },
                new Set(
                  ['selector', 'domain', 'unit-of-work'].filter((key) =>
                    flagWasSupplied(parsed, flags, [key])
                  ) as Array<'selector' | 'domain' | 'unitOfWork'>
                ),
                messages.getMessage('errorNothingSelected')
              ),
            assign: (_resolvedFlags, value): Record<string, unknown> => {
              const selected = value as string[];
              return {
                ...(flagWasSupplied(parsed, flags, ['selector']) ? {} : { selector: selected.includes('selector') }),
                ...(flagWasSupplied(parsed, flags, ['domain']) ? {} : { domain: selected.includes('domain') }),
                ...(flagWasSupplied(parsed, flags, ['unit-of-work'])
                  ? {}
                  : { 'unit-of-work': selected.includes('unitOfWork') }),
              };
            },
          },
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
    return runGeneration(generate, flags, this.jsonEnabled() ? undefined : (line): void => this.log(line));
  }
}
