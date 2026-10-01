import type { Connection, Org } from '@salesforce/core';
import {
  renderGenerationResult,
  type AepCommandResult,
  type CommandDescriptor,
  type GenerationApplyContext,
  type GenerationPreview,
} from '@syntax-syllogism/apx-core';
import { parseOptionsForCli, withCliDescribeErrors } from '../aep/errors.js';
import { toOptions } from './options.js';

type GenerationUseCase<O> = {
  descriptor: CommandDescriptor & { optionsSchema: { parse(input: unknown): O } };
  plan(conn: Connection | undefined, options: O): Promise<GenerationPreview>;
  apply(conn: Connection | undefined, preview: GenerationPreview, ctx?: GenerationApplyContext): Promise<AepCommandResult>;
};

/** Connect only when the use case can use an org; service skips auth when --api-version is explicit. */
const connectionFor = async (descriptor: CommandDescriptor, flags: Record<string, unknown>): Promise<Connection | undefined> => {
  const org = flags['target-org'] as Org | undefined;
  const apiVersion = flags['api-version'] as string | undefined;
  if (descriptor.requiresOrg === 'none' || !org) return undefined;
  if (descriptor.requiresOrg === 'optional' && apiVersion) return undefined;
  await org.refreshAuth();
  return org.getConnection(apiVersion);
};

/** The CLI path for every generator: flags → options → plan → dry-run or overwrite apply → render. */
export const runGeneration = async <O>(
  useCase: GenerationUseCase<O>,
  flags: Record<string, unknown>,
  log?: (line: string) => void
): Promise<AepCommandResult> => {
  const options = parseOptionsForCli(useCase.descriptor.optionsSchema, toOptions(useCase.descriptor, flags));
  const conn = await connectionFor(useCase.descriptor, flags);
  const preview = await withCliDescribeErrors(conn, (connection) => useCase.plan(connection, options));
  const result: AepCommandResult = flags['dry-run']
    ? {
        baseDir: preview.baseDir,
        created: [],
        skipped: [],
        wouldCreate: preview.files.map((file) => file.absolutePath),
        ...(preview.manualSteps ? { manualSteps: preview.manualSteps } : {}),
      }
    : await useCase.apply(conn, preview, { overwrite: 'overwrite' });
  for (const line of renderGenerationResult(result, { commandId: useCase.descriptor.id })) log?.(line);
  // Only unitofwork has ever returned manualSteps in --json; the aggregate printed them for humans only.
  if (useCase.descriptor.id === 'generate-unitofwork' && result.manualSteps) return result;
  return { baseDir: result.baseDir, created: result.created, skipped: result.skipped, wouldCreate: result.wouldCreate };
};
