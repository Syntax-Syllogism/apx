import { SfError, type Connection } from '@salesforce/core';
import {
  describeError,
  describeTarget,
  isApxError,
  writeDeadCodeManifest,
  type DeadUseCaseResult,
  type ManifestResult,
  type SObjectDescribeView,
} from '@syntax-syllogism/apx-core';

type Describer = Pick<Connection, 'describeSObject'>;

/**
 * Core omits the NOT_FOUND cause; run core work against a connection whose describe
 * failures are recorded, and rethrow the original API error for CLI error rendering.
 */
export const withCliDescribeErrors = async <C extends Describer | undefined, T>(
  conn: C,
  run: (conn: C) => Promise<T>
): Promise<T> => {
  if (!conn) return run(conn);
  let failure: unknown;
  let describeFailed = false;
  const tracked = new Proxy(conn, {
    get(target, property, receiver): unknown {
      if (property === 'describeSObject') {
        return async (name: string) => {
          try {
            return await target.describeSObject(name);
          } catch (error) {
            failure = error;
            describeFailed = true;
            throw error;
          }
        };
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
  try {
    return await run(tracked);
  } catch (error) {
    throw describeFailed ? failure : error;
  }
};

export const describeTargetForCli = (conn: Describer, sobject: string): Promise<SObjectDescribeView> =>
  withCliDescribeErrors(conn, (connection) => describeTarget(connection, sobject));

/** Manifest writes originally exposed filesystem errors directly in the CLI. */
export const writeDeadCodeManifestForCli = async (
  result: DeadUseCaseResult,
  outputBase: string,
  options: { dryRun: boolean }
): Promise<ManifestResult> => {
  try {
    return await writeDeadCodeManifest(result, outputBase, options);
  } catch (error) {
    if (
      isApxError(error) &&
      error.code === 'write-failed' &&
      typeof error.data === 'object' &&
      error.data !== null &&
      'cause' in error.data
    ) {
      throw error.data.cause;
    }
    throw error;
  }
};

/** Option validation moved into core schemas; keep the CLI's SfError with the first message. */
export const parseOptionsForCli = <T>(schema: { parse(input: unknown): T }, input: unknown): T => {
  try {
    return schema.parse(input);
  } catch (error) {
    // zod is core's dependency, not the plugin's; match its error by name.
    if (error instanceof Error && error.name === 'ZodError') throw new SfError(describeError(error).title);
    throw error;
  }
};

/** Preserve the CLI error names and codes from before the domain extraction. */
export const toCliError = (error: Error): Error => {
  if (!isApxError(error)) return error;
  if (error.code === 'test-pairing-invariant') return new SfError(error.message);
  if (error.code === 'sobject-not-found') return Object.assign(new Error(error.message), { name: 'NOT_FOUND' });
  if (
    error.code === 'describe-failed' &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'cause' in error.data &&
    error.data.cause instanceof Error
  ) {
    return error.data.cause;
  }
  return new Error(error.message);
};
