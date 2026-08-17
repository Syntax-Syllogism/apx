import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import {
  assertInteractiveTty,
  requireExactlyOneFlavor,
  requireFlagValue,
  resolveApiVersion,
  resolveFlagsInteractively,
  resolveOrg,
  resolveOutputBase,
  resolveProjectApiVersion,
} from '../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../aep/engine/engine.js';
import {
  apiVersionFlag,
  at4dxFlag,
  dryRunFlag,
  fflibFlag,
  interactiveFlag,
  optionalTargetOrgFlag,
  outputPathFlag,
  prefixFlag,
  resolveFlavor,
  serviceBaseNameFlag,
} from '../../../aep/flags.js';
import { promptBoolean, promptFlavor, promptOptionalText, promptText } from '../../../aep/prompting.js';
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
    requireExactlyOneFlavor(flags);
    const flavor = resolveFlavor(flags);
    const apiVersion = await resolveApiVersion(flags['target-org'], flags['api-version']);
    const names = buildServiceNames({
      basename: requireFlagValue(flags['service-basename'], '--service-basename'),
      prefix: flags.prefix,
    });
    const plan = buildServicePlan({
      names,
      flavor,
      apiVersion,
      paths: new PathResolver(),
      includeBinding: flavor === 'at4dx',
    });
    const baseDir = await resolveOutputBase(requireFlagValue(flags['output-path'], '--output-path'));
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
