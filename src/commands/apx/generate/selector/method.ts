import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import {
  DEFAULT_API_VERSION,
  assertInteractiveTty,
  requireFlagValue,
  resolveFlagsInteractively,
  resolveOutputBase,
  resolveProjectApiVersion,
} from '../../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../../aep/engine/engine.js';
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
import type { AepCommandResult } from '../../../../aep/model/types.js';
import { buildSelectorMethodNames } from '../../../../aep/naming/naming.js';
import { PathResolver } from '../../../../aep/paths/paths.js';
import { buildSelectorMethodPlan } from '../../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.selector.method');

export default class ApxGenerateSelectorMethod extends SfCommand<AepCommandResult> {
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
    const names = buildSelectorMethodNames({
      className: requireFlagValue(flags['class-name'], '--class-name'),
      sobjectApiName: requireFlagValue(flags.sobject, '--sobject'),
      sobjectSelectorClassName: requireFlagValue(flags['sobject-selector-class-name'], '--sobject-selector-class-name'),
    });
    const plan = buildSelectorMethodPlan({
      names,
      flavor: 'at4dx',
      apiVersion: flags['api-version'] ?? DEFAULT_API_VERSION,
      paths: new PathResolver(),
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
