import { describeDiShape, detectEntryPoint, isTestClass } from './entryPoints.js';
import type {
  CandidateClass,
  ComponentRef,
  DeadClassFinding,
  DeadCodeResult,
} from './types.js';

export const MAX_ROUNDS = 50;

type ClassificationInput = {
  candidates: CandidateClass[];
  inbound: Map<string, ComponentRef[]>;
  outbound: Map<string, ComponentRef[]>;
  boundClasses: Map<string, string>;
  ignorePatterns: string[];
};

type Analysis = CandidateClass & {
  isTest: boolean;
  entryPoint: string | null;
  diShape: string | null;
};

const uniqueRefs = (refs: ComponentRef[]): ComponentRef[] => {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    if (seen.has(ref.id)) return false;
    seen.add(ref.id);
    return true;
  });
};

const matchesIgnore = (name: string, patterns: string[]): boolean =>
  patterns.some((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
    return new RegExp(`^${escaped}$`, 'i').test(name);
  });

const asComponentRef = (candidate: CandidateClass): ComponentRef => ({
  id: candidate.id,
  name: candidate.name,
  type: 'ApexClass',
});

const findStronglyConnectedComponents = (
  ids: string[],
  outbound: Map<string, ComponentRef[]>,
  candidateIds: Set<string>,
  excluded: Set<string>
): string[][] => {
  const activeIds = ids.filter((id) => !excluded.has(id));
  const activeSet = new Set(activeIds);
  const indexById = new Map<string, number>();
  const lowLinkById = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let nextIndex = 0;

  const visit = (id: string): void => {
    indexById.set(id, nextIndex);
    lowLinkById.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    for (const ref of outbound.get(id) ?? []) {
      if (!candidateIds.has(ref.id) || !activeSet.has(ref.id)) continue;
      if (!indexById.has(ref.id)) {
        visit(ref.id);
        lowLinkById.set(id, Math.min(lowLinkById.get(id)!, lowLinkById.get(ref.id)!));
      } else if (onStack.has(ref.id)) {
        lowLinkById.set(id, Math.min(lowLinkById.get(id)!, indexById.get(ref.id)!));
      }
    }

    if (lowLinkById.get(id) !== indexById.get(id)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== id);
    components.push(component);
  };

  for (const id of activeIds) if (!indexById.has(id)) visit(id);
  return components.filter((component) => component.length > 1);
};

const sortFindings = (findings: DeadClassFinding[]): DeadClassFinding[] =>
  findings.sort((left, right) => left.name.localeCompare(right.name));

type ClassificationState = {
  analyses: Analysis[];
  byId: Map<string, Analysis>;
  candidateIds: Set<string>;
  testById: Map<string, boolean>;
  activeIds: string[];
  activeSet: Set<string>;
  inbound: Map<string, ComponentRef[]>;
  outbound: Map<string, ComponentRef[]>;
  removal: Set<string>;
};

type RoundPlan = {
  planned: Set<string>;
  dead: Array<{ analysis: Analysis; refs: ComponentRef[]; reason: string }>;
  testOnly: Array<{ analysis: Analysis; tests: ComponentRef[] }>;
  testOfDead: Array<{ test: Analysis; subject: ComponentRef }>;
};

const liveInbound = (state: ClassificationState, id: string, planned = new Set<string>()): ComponentRef[] =>
  uniqueRefs(
    (state.inbound.get(id) ?? []).filter(
      (ref) => ref.id !== id && !state.removal.has(ref.id) && !planned.has(ref.id)
    )
  );

const testBlockers = (state: ClassificationState, testId: string, planned: Set<string>): ComponentRef[] =>
  uniqueRefs(
    (state.outbound.get(testId) ?? []).filter(
      (ref) => state.candidateIds.has(ref.id) && !state.testById.get(ref.id) && !state.removal.has(ref.id) && !planned.has(ref.id)
    )
  );

const findZeroInbound = (state: ClassificationState, planned: Set<string>): RoundPlan['dead'] => {
  const findings: RoundPlan['dead'] = [];
  for (const id of state.activeIds) {
    if (state.removal.has(id)) continue;
    const refs = liveInbound(state, id);
    if (!refs.length) {
      findings.push({ analysis: state.byId.get(id)!, refs, reason: 'no inbound references' });
      planned.add(id);
    }
  }
  return findings;
};

const findTestOnly = (
  state: ClassificationState,
  planned: Set<string>
): { testOnly: RoundPlan['testOnly']; testOfDead: RoundPlan['testOfDead'] } => {
  const testOnly: RoundPlan['testOnly'] = [];
  const testOfDead = new Map<string, RoundPlan['testOfDead'][number]>();
  const candidates = state.activeIds
    .filter((id) => !state.removal.has(id) && !planned.has(id))
    .map((id) => ({ analysis: state.byId.get(id)!, refs: liveInbound(state, id) }))
    .filter(({ refs }) => refs.length > 0 && refs.every((ref) => state.testById.get(ref.id) === true));

  for (const { analysis, refs } of candidates) {
    const tests = uniqueRefs(refs);
    if (!tests.every((test) => testBlockers(state, test.id, new Set([...planned, analysis.id])).length === 0)) continue;
    testOnly.push({ analysis, tests });
    planned.add(analysis.id);
  }
  for (const { analysis, tests } of testOnly) {
    for (const test of tests) {
      if (state.removal.has(test.id)) continue;
      testOfDead.set(test.id, { test: state.byId.get(test.id)!, subject: asComponentRef(analysis) });
      planned.add(test.id);
    }
  }
  return { testOnly, testOfDead: [...testOfDead.values()] };
};

const findOrphanCycles = (
  state: ClassificationState,
  planned: Set<string>
): { dead: RoundPlan['dead']; testOfDead: RoundPlan['testOfDead'] } => {
  const dead: RoundPlan['dead'] = [];
  const testOfDead = new Map<string, RoundPlan['testOfDead'][number]>();
  const cycleCandidates = state.activeIds.filter((id) => !state.removal.has(id) && !planned.has(id));
  for (const component of findStronglyConnectedComponents(cycleCandidates, state.outbound, state.activeSet, planned)) {
    const componentSet = new Set(component);
    const externalRefs = uniqueRefs(
      component.flatMap((id) => liveInbound(state, id, new Set([...planned, ...componentSet])))
    );
    if (externalRefs.some((ref) => !state.testById.get(ref.id))) continue;
    const tests = externalRefs.filter((ref) => state.testById.get(ref.id));
    if (tests.some((test) => testBlockers(state, test.id, new Set([...planned, ...componentSet])).length > 0)) continue;
    for (const id of component) {
      dead.push({ analysis: state.byId.get(id)!, refs: externalRefs, reason: 'orphaned dependency cycle' });
      planned.add(id);
    }
    for (const test of tests) {
      if (state.removal.has(test.id)) continue;
      testOfDead.set(test.id, { test: state.byId.get(test.id)!, subject: asComponentRef(state.byId.get(component[0])!) });
      planned.add(test.id);
    }
  }
  return { dead, testOfDead: [...testOfDead.values()] };
};

const planRound = (state: ClassificationState): RoundPlan | null => {
  const planned = new Set<string>();
  const dead = findZeroInbound(state, planned);
  const testOnly = findTestOnly(state, planned);
  const cycles = findOrphanCycles(state, planned);
  dead.push(...cycles.dead);
  const testOfDead = [...testOnly.testOfDead, ...cycles.testOfDead];
  return planned.size ? { planned, dead, testOnly: testOnly.testOnly, testOfDead } : null;
};

const addDeadFinding = (findings: DeadClassFinding[], analysis: Analysis, round: number, reason: string, refs: ComponentRef[]): void => {
  const finding: DeadClassFinding = {
    id: analysis.id,
    name: analysis.name,
    bucket: 'dead',
    round,
    reason,
    referrers: uniqueRefs(refs),
  };
  if (analysis.diShape) {
    finding.risk = 'di';
    finding.riskDetail = `${analysis.diShape}, no binding found`;
  }
  findings.push(finding);
};

const appendRoundFindings = (
  result: { dead: DeadClassFinding[]; testOnly: DeadClassFinding[]; testOfDead: DeadClassFinding[] },
  plan: RoundPlan,
  round: number
): void => {
  for (const { analysis, refs, reason } of plan.dead) addDeadFinding(result.dead, analysis, round, reason, refs);
  for (const { analysis, tests } of plan.testOnly) {
    result.testOnly.push({
      id: analysis.id,
      name: analysis.name,
      bucket: 'test-only',
      round,
      reason: 'only referenced by tests',
      referrers: tests,
    });
  }
  for (const { test, subject } of plan.testOfDead) {
    result.testOfDead.push({
      id: test.id,
      name: test.name,
      bucket: 'test-of-dead',
      round,
      reason: `test for ${subject.name}`,
      referrers: [],
      subject,
    });
  }
};

export const classifyClasses = ({
  candidates,
  inbound,
  outbound,
  boundClasses,
  ignorePatterns,
}: ClassificationInput): DeadCodeResult => {
  const considered = candidates.filter((candidate) => !matchesIgnore(candidate.name, ignorePatterns));
  const analyses: Analysis[] = considered.map((candidate) => ({
    ...candidate,
    isTest: isTestClass(candidate.symbolTable, candidate.name),
    entryPoint: detectEntryPoint(candidate.symbolTable),
    diShape: describeDiShape(candidate.symbolTable),
  }));
  const byId = new Map(analyses.map((analysis) => [analysis.id, analysis]));
  const candidateIds = new Set(analyses.map((analysis) => analysis.id));
  const testById = new Map(analyses.map((analysis) => [analysis.id, analysis.isTest]));
  const removal = new Set<string>();
  const dead: DeadClassFinding[] = [];
  const testOnly: DeadClassFinding[] = [];
  const testOfDead: DeadClassFinding[] = [];
  const retained: DeadClassFinding[] = [];
  const suppressed: DeadClassFinding[] = [];

  const suppressedIds = new Set<string>();
  for (const analysis of analyses) {
    const reason = boundClasses.get(analysis.name.trim().toLowerCase())
      ? `bound: ${boundClasses.get(analysis.name.trim().toLowerCase())}`
      : analysis.entryPoint ?? (analysis.isTest ? 'test class' : null);
    if (!reason) continue;
    suppressedIds.add(analysis.id);
    suppressed.push({
      id: analysis.id,
      name: analysis.name,
      bucket: 'suppressed',
      round: 0,
      reason,
      referrers: uniqueRefs(inbound.get(analysis.id) ?? []),
    });
  }

  const activeIds = analyses.filter(({ id }) => !suppressedIds.has(id)).map(({ id }) => id);
  const state: ClassificationState = {
    analyses,
    byId,
    candidateIds,
    testById,
    activeIds,
    activeSet: new Set(activeIds),
    inbound,
    outbound,
    removal,
  };

  let rounds = 0;
  while (rounds < MAX_ROUNDS) {
    const round = rounds + 1;
    const plan = planRound(state);
    if (!plan) break;
    rounds = round;
    for (const id of plan.planned) removal.add(id);
    appendRoundFindings({ dead, testOnly, testOfDead }, plan, round);
  }

  for (const id of activeIds) {
    if (removal.has(id)) continue;
    const analysis = byId.get(id)!;
    const refs = liveInbound(state, id);
    if (!refs.length || !refs.every((ref) => testById.get(ref.id) === true)) continue;
    const blockers = uniqueRefs(refs.flatMap((test) => testBlockers(state, test.id, new Set([id]))));
    retained.push({
      id: analysis.id,
      name: analysis.name,
      bucket: 'retained',
      round: 0,
      reason: 'test also covers surviving code',
      referrers: refs,
      blockedBy: blockers,
    });
  }

  const result: DeadCodeResult = {
    scanned: considered.length,
    rounds,
    dead: sortFindings(dead),
    testOnly: sortFindings(testOnly),
    testOfDead: sortFindings(testOfDead),
    retained: sortFindings(retained),
    suppressed: sortFindings(
      suppressed
        .filter((finding) => !removal.has(finding.id))
        .map((finding) => ({ ...finding, wouldBeDead: liveInbound(state, finding.id).length === 0 }))
    ),
    bindingSources: [],
    withoutSymbolTable: considered.filter(({ symbolTable }) => symbolTable === null).length,
  };
  return result;
};
