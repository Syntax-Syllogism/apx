export type DeadBucket = 'dead' | 'test-only' | 'test-of-dead' | 'retained' | 'suppressed';

export type ComponentRef = { id: string; name: string; type: string };

export type SymbolAnnotation = { name: string };

export type SymbolMethod = {
  name: string;
  annotations: SymbolAnnotation[];
  modifiers: string[];
  location?: { line: number; column: number };
};

export type SymbolTable = {
  tableDeclaration: { annotations: SymbolAnnotation[]; modifiers: string[] };
  methods: SymbolMethod[];
  interfaces: string[];
  parentClass: string;
  innerClasses: SymbolTable[];
};

export type CandidateClass = {
  id: string;
  name: string;
  symbolTable: SymbolTable | null;
};

export type DeadClassFinding = {
  id: string;
  name: string;
  bucket: DeadBucket;
  round: number;
  reason: string;
  risk?: 'di';
  riskDetail?: string;
  /** Suppressed classes only: whether the final surviving graph has no inbound references. */
  wouldBeDead?: boolean;
  referrers: ComponentRef[];
  subject?: ComponentRef;
  blockedBy?: ComponentRef[];
};

export type BindingSourceReport = {
  object: string;
  available: boolean;
  recordCount: number;
};

export type DeadCodeResult = {
  scanned: number;
  rounds: number;
  dead: DeadClassFinding[];
  testOnly: DeadClassFinding[];
  testOfDead: DeadClassFinding[];
  retained: DeadClassFinding[];
  suppressed: DeadClassFinding[];
  bindingSources: BindingSourceReport[];
  withoutSymbolTable: number;
  manifestDir?: string;
  manifestFiles?: string[];
  wouldWrite?: string[];
};

export type QueryResult<T> = { records: T[] };

export type ToolingConnection = {
  autoFetchQuery<T>(soql: string): Promise<QueryResult<T>>;
};

export type DeadConnection = {
  tooling: ToolingConnection;
  query<T>(soql: string): Promise<QueryResult<T>>;
};
