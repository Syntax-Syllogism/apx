import path from 'node:path';
import { Messages, Org, SfError, SfProject } from '@salesforce/core';
import { toDescribeView, type SObjectDescribeView } from './describe/describe.js';
import { MAX_CUSTOM_METADATA_RECORD_NAME_LENGTH } from './naming/naming.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@syntax-syllogism/apx', 'apx.flags');

export const DEFAULT_OUTPUT_PATH = 'generated-files';
export const DEFAULT_API_VERSION = '60.0';
export const ORDER_PATTERN = /^\d+(?:\.\d+)?$/;

export type DescribeTargetResult = { view: SObjectDescribeView; apiVersion: string };

export const resolveOutputBase = async (outputPath: string): Promise<string> =>
  path.join(await SfProject.resolveProjectPath(), outputPath);

export const describeTarget = async (
  org: Org,
  apiVersion: string | undefined,
  sobject: string
): Promise<DescribeTargetResult> => {
  await org.refreshAuth();
  const conn = org.getConnection(apiVersion);
  const describe = await conn.describeSObject(sobject);
  return {
    view: toDescribeView(describe),
    apiVersion: apiVersion ?? conn.getApiVersion(),
  };
};

export const resolveApiVersion = async (org: Org | undefined, apiVersionFlag: string | undefined): Promise<string> => {
  if (apiVersionFlag) return apiVersionFlag;
  if (!org) return DEFAULT_API_VERSION;
  await org.refreshAuth();
  return org.getConnection(undefined).getApiVersion();
};

export const resolveProjectApiVersion = async (): Promise<string | undefined> => {
  const project = await SfProject.resolve();
  const projectConfig = await (await project.retrieveSfProjectJson()).read();
  return projectConfig.sourceApiVersion;
};

export const isValidOrderValue = (value: string): boolean => ORDER_PATTERN.test(value);

export const isWithinCustomMetadataNameLimit = (value: string): boolean =>
  value.length <= MAX_CUSTOM_METADATA_RECORD_NAME_LENGTH;

export const assertInteractiveTty = (interactive: boolean): void => {
  if (interactive && !process.stdin.isTTY) throw new SfError(messages.getMessage('error.interactiveTty'));
};

export const requireFlagValue = <T>(value: T | undefined, flagName: string): T => {
  if (value === undefined || (typeof value === 'string' && !value.trim())) {
    throw new SfError(`Missing required flag ${flagName}.`);
  }
  return value;
};

export const requireExactlyOneFlavor = (flags: { at4dx?: boolean; fflib?: boolean }): void => {
  if (Boolean(flags.at4dx) === Boolean(flags.fflib)) {
    throw new SfError('Exactly one of the following must be provided: --at4dx, --fflib');
  }
};

export const resolveOrg = (aliasOrUsername: string): Promise<Org> => Org.create({ aliasOrUsername });

type InteractiveMetadata = {
  flags?: Record<string, { setFromDefault?: boolean }>;
};

type InteractiveRawToken = { type?: string; flag?: string };

type InteractiveParse<T extends Record<string, unknown>> = {
  flags: T;
  metadata?: InteractiveMetadata;
  raw?: InteractiveRawToken[];
};

export type InteractivePrompt = {
  key: string;
  suppliedKeys?: string[];
  requireAllSupplied?: boolean;
  prompt: () => Promise<unknown>;
  assign?: (flags: Record<string, unknown>, value: unknown) => Record<string, unknown> | void;
};

export const flagWasSupplied = <T extends Record<string, unknown>>(
  parsed: InteractiveParse<T>,
  flags: T,
  keys: string[]
): boolean => {
  const rawFlags = new Set(parsed.raw?.filter((token) => token.type === 'flag').map((token) => token.flag));
  if (keys.some((key) => rawFlags.has(key))) return true;
  if (keys.some((key) => parsed.metadata?.flags?.[key]?.setFromDefault === true)) return false;
  return keys.some((key) => flags[key] !== undefined);
};

const formatInteractiveValue = (value: unknown): string => {
  if (value === undefined || value === '') return '(none)';
  if (typeof value === 'object' && value !== null && 'getUsername' in value) {
    const username = (value as { getUsername: () => string | undefined }).getUsername();
    return username ?? '(none)';
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

export const resolveFlagsInteractively = async <T extends Record<string, unknown>>(
  parsed: InteractiveParse<T>,
  prompts: readonly InteractivePrompt[],
  options: { log: (message: string) => void; confirm: () => Promise<boolean> }
): Promise<{ flags: T; confirmed: boolean }> => {
  const flags = { ...parsed.flags };
  for (const descriptor of prompts) {
    const suppliedKeys = descriptor.suppliedKeys ?? [descriptor.key];
    const supplied = descriptor.requireAllSupplied
      ? suppliedKeys.every((key) => flagWasSupplied(parsed, flags, [key]))
      : flagWasSupplied(parsed, flags, suppliedKeys);
    if (supplied) continue;
    // Prompts must remain sequential so each answer is collected in a predictable order.
    // eslint-disable-next-line no-await-in-loop
    const value = await descriptor.prompt();
    if (descriptor.assign) {
      const assignment = descriptor.assign(flags, value);
      if (assignment) Object.assign(flags, assignment);
    } else (flags as Record<string, unknown>)[descriptor.key] = value;
  }

  options.log(messages.getMessage('interactive.summary'));
  for (const [key, value] of Object.entries(flags)) {
    if (key !== 'interactive' && key !== 'json') options.log(`  --${key}: ${formatInteractiveValue(value)}`);
  }
  const confirmed = await options.confirm();
  if (!confirmed) options.log(messages.getMessage('interactive.declined'));
  return { flags, confirmed };
};
