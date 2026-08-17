import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import {
  assertInteractiveTty,
  describeTarget,
  requireExactlyOneFlavor,
  requireFlagValue,
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
  interactiveTargetOrgFlag,
  interactiveFlag,
  outputPathFlag,
  prefixFlag,
  resolveFlavor,
  sobjectFlag,
} from '../../../aep/flags.js';
import { promptBoolean, promptFlavor, promptOptionalText, promptText } from '../../../aep/prompting.js';
import type { AepCommandResult, GenerationManifest } from '../../../aep/model/types.js';
import { buildSObjectNames } from '../../../aep/naming/naming.js';
import { PathResolver } from '../../../aep/paths/paths.js';
import { buildSelectorPlan } from '../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.selector');

export default class ApxGenerateSelector extends SfCommand<AepCommandResult> {
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
    const parsed = await this.parse(ApxGenerateSelector);
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
    requireExactlyOneFlavor(flags);
    const flavor = resolveFlavor(flags);
    const { view, apiVersion } = await describeTarget(
      requireFlagValue(flags['target-org'], '--target-org'),
      flags['api-version'],
      requireFlagValue(flags.sobject, '--sobject')
    );
    const names = buildSObjectNames({ apiName: view.apiName, isCustom: view.isCustom, prefix: flags.prefix });
    const plan = buildSelectorPlan({
      names,
      view,
      flavor,
      apiVersion,
      paths: new PathResolver(),
      includeBinding: flavor === 'at4dx',
    });
    const baseDir = await resolveOutputBase(requireFlagValue(flags['output-path'], '--output-path'));
    const manifest: GenerationManifest = await GenerationEngine.execute(plan, {
      baseDir,
      overwrite: 'overwrite',
      dryRun: flags['dry-run'],
    });
    if (!this.jsonEnabled())
      this.log(messages.getMessage('info.created', [manifest.created.length, manifest.skipped.length]));
    return { baseDir, created: manifest.created, skipped: manifest.skipped, wouldCreate: manifest.wouldCreate };
  }
}
