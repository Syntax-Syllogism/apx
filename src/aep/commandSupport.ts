import path from 'node:path';
import { Org, SfProject } from '@salesforce/core';
import { toDescribeView, type SObjectDescribeView } from './describe/describe.js';
import { MAX_CUSTOM_METADATA_RECORD_NAME_LENGTH } from './naming/naming.js';

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

export const isValidOrderValue = (value: string): boolean => ORDER_PATTERN.test(value);

export const isWithinCustomMetadataNameLimit = (value: string): boolean =>
  value.length <= MAX_CUSTOM_METADATA_RECORD_NAME_LENGTH;
