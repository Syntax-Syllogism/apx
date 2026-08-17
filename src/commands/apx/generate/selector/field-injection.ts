import { Messages, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import {
  assertInteractiveTty,
  isWithinCustomMetadataNameLimit,
  requireFlagValue,
  resolveFlagsInteractively,
  resolveOutputBase,
} from '../../../../aep/commandSupport.js';
import { GenerationEngine } from '../../../../aep/engine/engine.js';
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
import type { AepCommandResult } from '../../../../aep/model/types.js';
import { buildFieldInjectionNames } from '../../../../aep/naming/naming.js';
import { PathResolver } from '../../../../aep/paths/paths.js';
import { buildFieldInjectionPlan } from '../../../../aep/plan/planBuilders.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.generate.selector.field-injection');

const parseFields = (raw: string): string[] =>
  raw
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

export default class ApxGenerateSelectorFieldInjection extends SfCommand<AepCommandResult> {
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
    const fieldNames = parseFields(requireFlagValue(flags.fields, '--fields'));
    if (!fieldNames.length) throw new SfError('At least one field must be provided in --fields.');
    if (flags['fieldset-name']?.trim()?.length && !isWithinCustomMetadataNameLimit(flags['fieldset-name'].trim()))
      throw new SfError(messages.getMessage('error.fieldsetNameTooLong', [flags['fieldset-name'].trim()]));

    const names = buildFieldInjectionNames({
      sobjectApiName: requireFlagValue(flags.sobject, '--sobject'),
      fieldsetName: flags['fieldset-name'],
    });
    const label = flags.label ?? names.fieldsetName;
    const description = flags.description ?? `Generated selector field inclusion for ${names.sobjectApiName}.`;
    const plan = buildFieldInjectionPlan({
      names,
      flavor: 'at4dx',
      fieldNames,
      label,
      description,
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
