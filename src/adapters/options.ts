import { useCases, type CommandDescriptor } from '@syntax-syllogism/apx-core';
import { requireExactlyOneFlavor } from '../aep/commandSupport.js';
import { resolveFlavor } from '../aep/flags.js';

export const optionFlag = (key: string): string => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Only descriptor fields cross the CLI boundary; consumer flags stay in the plugin. */
export const toOptions = (descriptor: CommandDescriptor, flags: Record<string, unknown>): Record<string, unknown> => {
  const schema = useCases[descriptor.id as keyof typeof useCases].descriptor.optionsSchema;
  const options: Record<string, unknown> = {};
  for (const key of Object.keys(schema.shape)) {
    options[key] = flags[optionFlag(key)];
  }
  if ('flavor' in options) {
    const flavorFlags = { at4dx: Boolean(flags.at4dx), fflib: Boolean(flags.fflib) };
    requireExactlyOneFlavor(flavorFlags);
    options.flavor = resolveFlavor(flavorFlags);
  }
  if (descriptor.id === 'generate-selector-field-injection') {
    options.fields = typeof flags.fields === 'string'
      ? flags.fields.split(',').map((field) => field.trim()).filter(Boolean)
      : [];
  }
  // The CLI action default predates the shared process schema's criteria default.
  if (descriptor.id === 'generate-action') options.order = flags.order ?? '10.2';
  return options;
};
