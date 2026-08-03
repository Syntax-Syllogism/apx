import type { CandidateClass, DeadConnection, SymbolTable } from './types.js';

const BATCH_SIZE = 200;

type ApexClassRow = {
  Id: string;
  Name: string;
  NamespacePrefix?: string | null;
  SymbolTable?: SymbolTable | null;
};

const quoteIds = (ids: string[]): string => ids.map((id) => `'${id.replaceAll("'", "\\'")}'`).join(', ');

export const fetchClassInventory = async (conn: DeadConnection): Promise<CandidateClass[]> => {
  const inventory = await conn.tooling.autoFetchQuery<ApexClassRow>(
    "SELECT Id, Name, NamespacePrefix FROM ApexClass WHERE NamespacePrefix = null AND Status = 'Active'"
  );
  const rows = inventory.records;
  const symbolTables = new Map<string, SymbolTable | null>();

  const batches = Array.from({ length: Math.ceil(rows.length / BATCH_SIZE) }, (_, index) =>
    rows.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE).map((row) => row.Id)
  ).filter((ids) => ids.length > 0);
  const symbolResults = await Promise.all(
    batches.map((ids) =>
      conn.tooling.autoFetchQuery<ApexClassRow>(
        `SELECT Id, SymbolTable FROM ApexClass WHERE Id IN (${quoteIds(ids)})`
      )
    )
  );
  for (const result of symbolResults) {
    for (const row of result.records) symbolTables.set(row.Id, row.SymbolTable ?? null);
  }

  return rows.map((row) => ({ id: row.Id, name: row.Name, symbolTable: symbolTables.get(row.Id) ?? null }));
};
