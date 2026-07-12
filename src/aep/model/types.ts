export type Flavor = 'fflib' | 'at4dx';

export type ArtifactId =
  | 'selectorClass'
  | 'selectorInterface'
  | 'selectorUnitTest'
  | 'selectorBinding'
  | 'criteriaClass'
  | 'criteriaUnitTest'
  | 'actionClass'
  | 'actionUnitTest'
  | 'domainProcessBinding'
  | 'selectorInclusionFieldSet'
  | 'selectorConfigFieldSetInclusionBinding'
  | 'domainClass'
  | 'domainInterface'
  | 'domainUnitTest'
  | 'domainTrigger'
  | 'domainBinding'
  | 'serviceFacade'
  | 'serviceInterface'
  | 'serviceImpl'
  | 'serviceException'
  | 'serviceUnitTest'
  | 'serviceBinding'
  | 'unitOfWorkBinding'
  | 'selectorMethodClass'
  | 'selectorMethodUnitTest'
  | 'apexClassMeta'
  | 'triggerMeta';

export type PlannedArtifact = { id: ArtifactId; relativePath: string; content: string };
export type GenerationPlan = { artifacts: PlannedArtifact[] };

export type OverwritePolicy = 'error' | 'skip' | 'overwrite';
export type EngineOptions = { baseDir: string; dryRun?: boolean; overwrite?: OverwritePolicy };

export type GenerationManifest = {
  created: string[];
  skipped: string[];
  wouldCreate?: string[];
};

export type AepCommandResult = {
  baseDir: string;
  created: string[];
  skipped: string[];
  wouldCreate?: string[];
  manualSteps?: string[];
};
