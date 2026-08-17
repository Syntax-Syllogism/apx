import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { SfError } from '@salesforce/core';
import { TRIGGER_OPERATION_OPTIONS } from './flags.js';

export const promptRuntime = { checkbox, confirm, input, select };

export const promptText = (message: string, defaultValue?: string): Promise<string> =>
  promptRuntime.input({ message, default: defaultValue });

export const promptOptionalText = async (message: string, defaultValue?: string): Promise<string | undefined> => {
  const value = await promptText(message, defaultValue);
  return value.trim() ? value : undefined;
};

export const promptBoolean = (message: string, defaultValue: boolean): Promise<boolean> =>
  promptRuntime.confirm({ message, default: defaultValue });

export const promptFlavor = (): Promise<'at4dx' | 'fflib'> =>
  promptRuntime.select({
    message: 'Flavor',
    choices: [
      { name: 'AT4DX', value: 'at4dx' },
      { name: 'fflib', value: 'fflib' },
    ],
  });

export const promptTriggerOperation = (): Promise<(typeof TRIGGER_OPERATION_OPTIONS)[number]> =>
  promptRuntime.select({
    message: 'Trigger operation',
    choices: TRIGGER_OPERATION_OPTIONS.map((value) => ({ name: value, value })),
  });

type ArtifactGroup = 'selector' | 'domain' | 'unitOfWork';

export const promptArtifactGroups = async (
  current: Partial<Record<ArtifactGroup, boolean>>,
  locked: Set<ArtifactGroup>,
  errorMessage: string
): Promise<ArtifactGroup[]> => {
  const choices: Array<{ name: string; value: ArtifactGroup; checked: boolean; disabled?: string }> = [
    { name: 'selector', value: 'selector', checked: locked.has('selector') ? Boolean(current.selector) : true },
    { name: 'domain', value: 'domain', checked: locked.has('domain') ? Boolean(current.domain) : true },
    {
      name: 'unit-of-work',
      value: 'unitOfWork',
      checked: locked.has('unitOfWork') ? Boolean(current.unitOfWork) : true,
    },
  ];
  for (const choice of choices) {
    if (locked.has(choice.value)) choice.disabled = 'provided on command line';
  }
  const selected = await promptRuntime.checkbox({
    message: 'Which artifact groups?',
    choices,
    validate: (values) => values.length > 0 || errorMessage,
  });
  if (!selected.length) throw new SfError(errorMessage);
  return selected;
};
