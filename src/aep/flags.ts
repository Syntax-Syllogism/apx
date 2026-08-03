import { Messages } from '@salesforce/core';
import { Flags } from '@salesforce/sf-plugins-core';
import type { Flavor } from './model/types.js';
import { DEFAULT_OUTPUT_PATH } from './commandSupport.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.flags');

export const targetOrgFlag = Flags.requiredOrg({
  char: 'o',
  summary: messages.getMessage('flags.target-org.summary'),
});

export const optionalTargetOrgFlag = Flags.optionalOrg({
  char: 'o',
  summary: messages.getMessage('flags.target-org.summary'),
});

export const sobjectFlag = Flags.string({
  char: 's',
  required: true,
  summary: messages.getMessage('flags.sobject.summary'),
});

export const at4dxFlag = Flags.boolean({
  summary: messages.getMessage('flags.at4dx.summary'),
  exactlyOne: ['at4dx', 'fflib'],
});

export const fflibFlag = Flags.boolean({
  summary: messages.getMessage('flags.fflib.summary'),
  exactlyOne: ['at4dx', 'fflib'],
});

export const apiVersionFlag = Flags.orgApiVersion({
  char: 'a',
  summary: messages.getMessage('flags.api-version.summary'),
});

export const outputPathFlag = Flags.directory({
  char: 'p',
  exists: false,
  default: DEFAULT_OUTPUT_PATH,
  summary: messages.getMessage('flags.output-path.summary'),
});

export const prefixFlag = Flags.string({
  summary: messages.getMessage('flags.prefix.summary'),
});

export const classNameFlag = Flags.string({
  char: 'c',
  required: true,
  summary: messages.getMessage('flags.class-name.summary'),
});

export const selectorClassNameFlag = Flags.string({
  required: true,
  summary: messages.getMessage('flags.sobject-selector-class-name.summary'),
});

export const processNameFlag = Flags.string({
  summary: messages.getMessage('flags.process-name.summary'),
});

export const orderFlag = Flags.string({
  summary: messages.getMessage('flags.order.summary'),
});

export const descriptionFlag = Flags.string({
  summary: messages.getMessage('flags.description.summary'),
});

export const labelFlag = Flags.string({
  summary: messages.getMessage('flags.label.summary'),
});

export const fieldsetNameFlag = Flags.string({
  summary: messages.getMessage('flags.fieldset-name.summary'),
});

export const fieldsFlag = Flags.string({
  required: true,
  summary: messages.getMessage('flags.fields.summary'),
});

export const TRIGGER_OPERATION_OPTIONS = [
  'Before_Insert',
  'Before_Update',
  'Before_Delete',
  'After_Insert',
  'After_Update',
  'After_Delete',
  'After_Undelete',
] as const;

export const triggerOperationFlag = Flags.string({
  options: [...TRIGGER_OPERATION_OPTIONS],
  summary: messages.getMessage('flags.trigger-operation.summary'),
});

export const bindingSequenceFlag = Flags.string({
  char: 'b',
  summary: messages.getMessage('flags.binding-sequence.summary'),
});

export const serviceBaseNameFlag = Flags.string({
  required: true,
  summary: messages.getMessage('flags.service-basename.summary'),
});

export const selectorToggleFlag = Flags.boolean({
  char: 'r',
  default: false,
  summary: messages.getMessage('flags.selector.summary'),
});

export const domainToggleFlag = Flags.boolean({
  char: 'd',
  default: false,
  summary: messages.getMessage('flags.domain.summary'),
});

export const unitOfWorkToggleFlag = Flags.boolean({
  char: 'u',
  default: false,
  summary: messages.getMessage('flags.unit-of-work.summary'),
});

export const dryRunFlag = Flags.boolean({
  default: false,
  summary: messages.getMessage('flags.dry-run.summary'),
});

export const classesFlag = Flags.boolean({
  char: 'c',
  default: false,
  summary: messages.getMessage('flags.classes.summary'),
});

export const destructiveManifestFlag = Flags.boolean({
  default: false,
  summary: messages.getMessage('flags.destructive-manifest.summary'),
});

export const deadOnlyFlag = Flags.boolean({
  default: false,
  summary: messages.getMessage('flags.dead-only.summary'),
  dependsOn: ['destructive-manifest'],
});

export const includeSuppressedFlag = Flags.boolean({
  default: false,
  summary: messages.getMessage('flags.include-suppressed.summary'),
});

export const ignoreFlag = Flags.string({
  multiple: true,
  summary: messages.getMessage('flags.ignore.summary'),
});

export const resolveFlavor = (flags: { at4dx?: boolean; fflib?: boolean }): Flavor => (flags.fflib ? 'fflib' : 'at4dx');
