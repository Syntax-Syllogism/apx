import type { ComponentRef, DeadConnection } from './types.js';

const BATCH_SIZE = 200;

type DependencyRow = {
  MetadataComponentId: string;
  MetadataComponentName: string;
  MetadataComponentType: string;
  RefMetadataComponentId: string;
  RefMetadataComponentName: string;
  RefMetadataComponentType: string;
};

export type DependencyGraph = {
  inbound: Map<string, ComponentRef[]>;
  outbound: Map<string, ComponentRef[]>;
};

const addRef = (map: Map<string, ComponentRef[]>, id: string, ref: ComponentRef): void => {
  const refs = map.get(id) ?? [];
  if (!refs.some((existing) => existing.id === ref.id && existing.type === ref.type)) refs.push(ref);
  map.set(id, refs);
};

export const fetchDependencyGraph = async (
  conn: DeadConnection,
  candidateIds: string[]
): Promise<DependencyGraph> => {
  const candidateSet = new Set(candidateIds);
  const inbound = new Map<string, ComponentRef[]>();
  const outbound = new Map<string, ComponentRef[]>();

  const batches = Array.from({ length: Math.ceil(candidateIds.length / BATCH_SIZE) }, (_, index) =>
    candidateIds.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE)
  ).filter((ids) => ids.length > 0);
  const results = await Promise.all(
    batches.map((ids) => {
      const escapedIds = ids.map((id) => `'${id.replaceAll("'", "\\'")}'`).join(', ');
      return conn.tooling.autoFetchQuery<DependencyRow>(
        `SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency WHERE RefMetadataComponentType = 'ApexClass' AND RefMetadataComponentId IN (${escapedIds})`
      );
    })
  );

  for (const result of results) {
    for (const row of result.records) {
      if (row.MetadataComponentId === row.RefMetadataComponentId) continue;
      const source: ComponentRef = {
        id: row.MetadataComponentId,
        name: row.MetadataComponentName,
        type: row.MetadataComponentType,
      };
      const target: ComponentRef = {
        id: row.RefMetadataComponentId,
        name: row.RefMetadataComponentName,
        type: row.RefMetadataComponentType,
      };
      addRef(inbound, target.id, source);
      if (candidateSet.has(source.id)) addRef(outbound, source.id, target);
    }
  }

  return { inbound, outbound };
};
