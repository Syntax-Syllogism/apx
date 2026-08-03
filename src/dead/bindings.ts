import type { BindingSourceReport, DeadConnection } from './types.js';

export const BINDING_SOURCES = [
  { object: 'ApplicationFactory_ServiceBinding__mdt', fields: ['To__c', 'BindingInterface__c'] },
  { object: 'ApplicationFactory_SelectorBinding__mdt', fields: ['To__c'] },
  { object: 'ApplicationFactory_DomainBinding__mdt', fields: ['To__c'] },
  { object: 'DomainProcessBinding__mdt', fields: ['ClassToInject__c'] },
] as const;

type BindingRecord = { DeveloperName?: string } & Record<string, string | null | undefined>;

export type BindingScan = {
  boundClasses: Map<string, string>;
  reports: BindingSourceReport[];
};

const isMissingObject = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const details = error as { name?: string; code?: string; errorCode?: string; message?: string };
  const code = details.code ?? details.errorCode ?? details.name;
  return code === 'INVALID_TYPE' || /sobject type .* is not supported/i.test(details.message ?? '');
};

export const scanBindings = async (conn: DeadConnection): Promise<BindingScan> => {
  const boundClasses = new Map<string, string>();
  const scans = await Promise.all(BINDING_SOURCES.map(async (source) => {
    const fields = ['DeveloperName', ...source.fields].join(', ');
    try {
      const result = await conn.query<BindingRecord>(`SELECT ${fields} FROM ${source.object}`);
      const bound = new Map<string, string>();
      for (const record of result.records) {
        const label = `${source.object.replace(/__mdt$/, '')}.${record.DeveloperName ?? '(unnamed)'}`;
        for (const field of source.fields) {
          const value = record[field]?.trim();
          if (value) bound.set(value.toLowerCase(), label);
        }
      }
      return {
        bound,
        report: { object: source.object, available: true, recordCount: result.records.length },
      };
    } catch (error) {
      if (!isMissingObject(error)) throw error;
      return { bound: new Map<string, string>(), report: { object: source.object, available: false, recordCount: 0 } };
    }
  }));

  const reports: BindingSourceReport[] = [];
  for (const scan of scans) {
    for (const [name, label] of scan.bound) boundClasses.set(name, label);
    reports.push(scan.report);
  }

  return { boundClasses, reports };
};
