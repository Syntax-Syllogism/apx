type DescribeFieldLike = { name: string; type?: string; filterable?: boolean };
type DescribeSObjectLike = { name: string; custom: boolean; fields: DescribeFieldLike[] };

export type SObjectDescribeView = { apiName: string; isCustom: boolean; fieldNames: string[] };

const includeField = (field: DescribeFieldLike): boolean =>
  field.name.toLowerCase() !== 'isdeleted' && field.type !== 'textarea' && field.filterable !== false;

export const toDescribeView = (describe: DescribeSObjectLike): SObjectDescribeView => ({
  apiName: describe.name,
  isCustom: describe.custom,
  fieldNames: describe.fields.filter(includeField).map((f) => f.name),
});
