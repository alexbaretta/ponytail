// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import { type TaskletGraphV1, type TaskletGraphV2, type TaskletGraphV3, type TaskletGraphV4 } from './tasklet-metadata.js';
import { type TaskletStatus } from './tasklet-statuses.js';

export interface TaskletGraphDerivation {
  readonly reverse: ReadonlyMap<string, readonly string[]>;
  readonly descendants: ReadonlyMap<string, ReadonlySet<string>>;
  readonly depth: ReadonlyMap<string, number>;
  readonly unfinishedDescendants: ReadonlyMap<string, number>;
}
function fail(message: string): never { throw new Error(message); }
function graphValue<T>(map: ReadonlyMap<string, T>, id: string): T {
  const value = map.get(id);
  if (value === undefined) fail(`required tasklet graph value is absent: ${id}`);
  return value;
}

export function validateFeatureGraph(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4): void {
  if (graph.schemaVersion === 1) return;
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string, trail: readonly string[]): void => {
    if (visiting.has(id)) fail(`feature dependency cycle: ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`);
    if (visited.has(id)) return;
    const feature = graph.features.get(id);
    if (!feature) fail(`unknown feature dependency: ${id}`);
    visiting.add(id);
    for (const dependency of feature.depends_on) {
      if (dependency === id) fail(`feature ${id} cannot depend on itself`);
      walk(dependency, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.features.keys()) walk(id, []);
  for (const [featureId, feature] of graph.features) {
    const validation = graph.tasklets.get(feature.validation_tasklet);
    if (!validation || validation.feature !== featureId) fail(`feature ${featureId} has invalid validation_tasklet`);
    const members = [...graph.tasklets].filter(([, tasklet]) => tasklet.feature === featureId).map(([id]) => id);
    const missing = members.filter((id) => id !== feature.validation_tasklet && !validation.depends_on.includes(id));
    if (missing.length) fail(`validation tasklet ${feature.validation_tasklet} must directly depend on every other feature tasklet: ${missing.join(', ')}`);
    for (const id of members) {
      if (id !== feature.validation_tasklet && graphValue(graph.tasklets, id).planned_paths.length === 0) fail(`non-validation tasklet ${id} requires planned_paths`);
      for (const dependency of graphValue(graph.tasklets, id).depends_on) {
        const dependencyFeature = graph.tasklets.get(dependency)?.feature;
        if (dependencyFeature && dependencyFeature !== featureId && !feature.depends_on.includes(dependencyFeature)) {
          fail(`tasklet ${id} cross-feature dependency requires feature dependency: ${dependencyFeature}`);
        }
      }
    }
  }
}

export function effectiveDependencies(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4, id: string): readonly string[] {
  if (graph.schemaVersion === 1) return graphValue(graph.tasklets, id).depends_on;
  const featureTasklet = graphValue(graph.tasklets, id);
  return [...new Set([
    ...featureTasklet.depends_on,
    ...graphValue(graph.features, featureTasklet.feature).depends_on.map(feature => graph.features.get(feature)?.validation_tasklet ?? feature),
  ])];
}

export function validateTaskletGraph(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4, statuses: ReadonlyMap<string, TaskletStatus>): TaskletGraphDerivation {
  const ids = new Set(graph.tasklets.keys());
  if (ids.size !== statuses.size || [...ids].some((id) => !statuses.has(id))) fail('tasklet metadata and Markdown headings must contain exactly the same tasklet IDs');
  validateFeatureGraph(graph);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const reverse = new Map<string, string[]>([...ids].map(id => [id, []]));
  const walk = (id: string, trail: readonly string[]): void => {
    if (visiting.has(id)) fail(`tasklet dependency cycle: ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of effectiveDependencies(graph, id)) {
      if (!ids.has(dependency)) fail(`unknown tasklet dependency: ${dependency}`);
      if (dependency === id) fail(`tasklet ${id} cannot depend on itself`);
      if (statuses.get(dependency) === 'ERROR') fail(`tasklet ${id} depends on [ERROR] tasklet ${dependency}`);
      graphValue(reverse, dependency).push(id);
      walk(dependency, [...trail, id]);
    }
    if (statuses.get(id) === 'DONE' && effectiveDependencies(graph, id).some((dependency) => statuses.get(dependency) !== 'DONE')) fail(`completed tasklet ${id} depends on unfinished tasklet`);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) walk(id, []);
  const descendants = new Map<string, Set<string>>();
  const depth = new Map<string, number>();
  const derive = (id: string): void => {
    if (descendants.has(id)) return;
    const all = new Set<string>();
    let maxDepth = 0;
    for (const child of graphValue(reverse, id)) {
      derive(child);
      all.add(child);
      for (const descendant of graphValue(descendants, child)) all.add(descendant);
      maxDepth = Math.max(maxDepth, 1 + graphValue(depth, child));
    }
    descendants.set(id, all);
    depth.set(id, maxDepth);
  };
  for (const id of ids) derive(id);
  if (graph.schemaVersion !== 1) {
    const taskletIds = [...ids];
    for (let first = 0; first < taskletIds.length; first += 1) {
      const left = taskletIds[first];
      if (left === undefined) fail('tasklet path comparison lacks its left ID');
      const leftPaths = new Set(graphValue(graph.tasklets, left).planned_paths);
      for (let second = first + 1; second < taskletIds.length; second += 1) {
        const right = taskletIds[second];
        if (right === undefined) fail('tasklet path comparison lacks its right ID');
        const overlap = graphValue(graph.tasklets, right).planned_paths.find((candidate) => leftPaths.has(candidate));
        if (overlap && !graphValue(descendants, left).has(right) && !graphValue(descendants, right).has(left)) {
          fail(`unordered tasklet path overlap: ${left}, ${right}, ${overlap}`);
        }
      }
    }
  }
  const unfinishedDescendants = new Map([...ids].map((id) => [id, [...graphValue(descendants, id)].filter((descendant) => statuses.get(descendant) === 'PENDING').length]));
  return { reverse, descendants, depth, unfinishedDescendants };
}

export interface TaskletRankingCriteria {
  readonly risk: 'normal' | 'high';
  readonly affinity_overlap: number;
  readonly unfinished_descendants: number;
  readonly remaining_depth: number;
}
export interface TaskletBatch { readonly tasklets: string[]; readonly planned_paths: string[] }
export const MAX_BATCH_TASKLETS = 16;

export function rankedReadyTasklets(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4, statuses: ReadonlyMap<string, TaskletStatus>, taskletGraphDerivation: TaskletGraphDerivation, lastTasklet: string | null): readonly (readonly [string, TaskletRankingCriteria])[] {
  if (lastTasklet !== null && (!statuses.has(lastTasklet) || statuses.get(lastTasklet) !== 'DONE')) fail(`last completed tasklet must be a known [DONE] tasklet: ${lastTasklet}`);
  const ready = [...graph.tasklets.keys()].filter((id) => statuses.get(id) === 'PENDING' && effectiveDependencies(graph, id).every((dependency) => statuses.get(dependency) === 'DONE'));
  if (ready.length === 0) {
    if ([...statuses.values()].every((status) => status === 'DONE')) return [];
    fail('unfinished tasklet graph has no ready tasklet');
  }
  const overlap = (id: string): number => {
    if (lastTasklet === null) return 0;
    const prior = new Set(graphValue(graph.tasklets, lastTasklet).affinity);
    return graphValue(graph.tasklets, id).affinity.filter((tag) => prior.has(tag)).length;
  };
  ready.sort((left, right) => {
    const leftTaskletValue = graphValue(graph.tasklets, left); const rightTaskletValue = graphValue(graph.tasklets, right);
    return Number(rightTaskletValue.risk === 'high') - Number(leftTaskletValue.risk === 'high') || overlap(right) - overlap(left) || graphValue(taskletGraphDerivation.unfinishedDescendants, right) - graphValue(taskletGraphDerivation.unfinishedDescendants, left) || graphValue(taskletGraphDerivation.depth, right) - graphValue(taskletGraphDerivation.depth, left) || left.localeCompare(right);
  });
  return ready.map((id): readonly [string, TaskletRankingCriteria] => [id, { risk: graphValue(graph.tasklets, id).risk, affinity_overlap: overlap(id), unfinished_descendants: graphValue(taskletGraphDerivation.unfinishedDescendants, id), remaining_depth: graphValue(taskletGraphDerivation.depth, id) }]);
}

export function selectNextTasklet(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4, statuses: ReadonlyMap<string, TaskletStatus>, taskletGraphDerivation: TaskletGraphDerivation, lastTasklet: string | null = null): { readonly next: null } | { readonly next: string; readonly criteria: TaskletRankingCriteria } {
  const ranked = rankedReadyTasklets(graph, statuses, taskletGraphDerivation, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const first = ranked[0];
  if (first === undefined) fail('ranked tasklet selection lacks its first result');
  return { next: first[0], criteria: first[1] };
}

export function selectReadyTasklets(graph: TaskletGraphV1 | TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4, statuses: ReadonlyMap<string, TaskletStatus>, taskletGraphDerivation: TaskletGraphDerivation, lastTasklet: string | null = null): { readonly next: null } | { readonly next: string; readonly criteria: TaskletRankingCriteria } | { readonly next: readonly [string]; readonly criteria: Readonly<Record<string, TaskletRankingCriteria>> } | { readonly next: readonly [TaskletBatch]; readonly criteria: Readonly<Record<string, TaskletRankingCriteria>> } {
  if (graph.schemaVersion === 1) return selectNextTasklet(graph, statuses, taskletGraphDerivation, lastTasklet);
  if (graph.schemaVersion === 3 || graph.schemaVersion === 4) return selectReadyTaskletBatch(graph, statuses, taskletGraphDerivation, lastTasklet);
  const ranked = rankedReadyTasklets(graph, statuses, taskletGraphDerivation, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const first = ranked[0];
  if (first === undefined) fail('ranked tasklet selection lacks its first result');
  const [id, taskletRankingCriteria] = first;
  return { next: [id], criteria: { [id]: taskletRankingCriteria } };
}

export function selectReadyTaskletBatch(graph: TaskletGraphV2 | TaskletGraphV3 | TaskletGraphV4, statuses: ReadonlyMap<string, TaskletStatus>, taskletGraphDerivation: TaskletGraphDerivation, lastTasklet: string | null = null): { readonly next: null } | { readonly next: readonly [TaskletBatch]; readonly criteria: Readonly<Record<string, TaskletRankingCriteria>> } {
  const ranked = rankedReadyTasklets(graph, statuses, taskletGraphDerivation, lastTasklet);
  if (ranked.length === 0) return { next: null };
  const validationTasklets = new Set([...graph.features.values()].map(({ validation_tasklet: id }) => id));
  const first = ranked[0];
  if (first === undefined) fail('ranked tasklet selection lacks its first result');
  const [root, rootTaskletRankingCriteria] = first;
  const taskletBatch: TaskletBatch = {
    tasklets: [root],
    planned_paths: [...graphValue(graph.tasklets, root).planned_paths],
  };
  const criteria: Record<string, TaskletRankingCriteria> = { [root]: rootTaskletRankingCriteria };
  const completed = new Set([...statuses].filter(([, status]) => status === 'DONE').map(([id]) => id));
  completed.add(root);
  while (taskletBatch.tasklets.length < MAX_BATCH_TASKLETS) {
    const next = [...graph.tasklets.keys()].filter((id) => {
      if (statuses.get(id) !== 'PENDING' || completed.has(id) || validationTasklets.has(id)) return false;
      const dependencies = effectiveDependencies(graph, id);
      return dependencies.some((dependency) => completed.has(dependency) && taskletBatch.tasklets.includes(dependency))
        && dependencies.every((dependency) => completed.has(dependency));
    }).sort((left, right) => left.localeCompare(right))[0];
    if (!next) break;
    taskletBatch.tasklets.push(next);
    completed.add(next);
    for (const candidate of graphValue(graph.tasklets, next).planned_paths) {
      if (!taskletBatch.planned_paths.includes(candidate)) taskletBatch.planned_paths.push(candidate);
    }
    criteria[next] = {
      risk: graphValue(graph.tasklets, next).risk,
      affinity_overlap: 0,
      unfinished_descendants: graphValue(taskletGraphDerivation.unfinishedDescendants, next),
      remaining_depth: graphValue(taskletGraphDerivation.depth, next),
    };
  }
  return { next: [taskletBatch], criteria };
}
