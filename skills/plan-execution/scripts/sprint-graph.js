// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from skills/plan-execution/scripts/sprint-graph.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDependencies = validateDependencies;
exports.validatePathOwnership = validatePathOwnership;
exports.validateV3PathOwnership = validateV3PathOwnership;
const tasklet_metadata_js_1 = require("./tasklet-metadata.js");
function fail(message) { throw new Error(message); }
function validateGraph(sprints, lifecycle) {
    const map = new Map(sprints.map(sprint => [sprint.id, sprint]));
    const visiting = new Set();
    const visited = new Set();
    const walk = (id, trail) => {
        if (visiting.has(id)) {
            const start = trail.indexOf(id);
            fail(`${lifecycle} dependency cycle: ${[...trail.slice(start), id].join(' -> ')}`);
        }
        if (visited.has(id))
            return;
        const sprint = map.get(id);
        if (!sprint)
            fail(`unknown ${lifecycle} dependency: ${id}`);
        visiting.add(id);
        const dependencies = sprint[lifecycle]?.depends_on ?? [];
        for (const dependency of dependencies) {
            if (dependency === id)
                fail(`${lifecycle} sprint ${id} cannot depend on itself`);
            walk(dependency, [...trail, id]);
        }
        visiting.delete(id);
        visited.add(id);
    };
    for (const sprint of sprints)
        walk(sprint.id, []);
    return map;
}
function validateDependencies(sprints) {
    const map = validateGraph(sprints, 'planning');
    validateGraph(sprints, 'execution');
    return map;
}
function executionReachability(sprintById) {
    const reachability = new Map();
    const reachable = (id) => {
        const cached = reachability.get(id);
        if (cached !== undefined)
            return cached;
        const result = new Set();
        const sprint = sprintById.get(id);
        if (sprint?.execution)
            for (const dependency of sprint.execution.depends_on) {
                result.add(dependency);
                for (const ancestor of reachable(dependency))
                    result.add(ancestor);
            }
        reachability.set(id, result);
        return result;
    };
    return reachable;
}
function pathValues(paths, id) {
    const values = paths.get(id);
    if (values === undefined)
        fail(`sprint path ownership is absent: ${id}`);
    return values;
}
function validatePathPairs(sprints, paths, reachable) {
    for (let first = 0; first < sprints.length; first += 1) {
        const left = sprints[first];
        if (left === undefined)
            fail('sprint path comparison lacks its left sprint');
        if (!left.execution)
            continue;
        for (let second = first + 1; second < sprints.length; second += 1) {
            const right = sprints[second];
            if (right === undefined)
                fail('sprint path comparison lacks its right sprint');
            if (!right.execution || reachable(left.id).has(right.id) || reachable(right.id).has(left.id))
                continue;
            const rightPaths = new Set(pathValues(paths, right.id));
            const overlap = pathValues(paths, left.id).find(candidate => rightPaths.has(candidate));
            if (overlap)
                fail(`unordered sprint path overlap: ${left.id}, ${right.id}, ${overlap}`);
        }
    }
}
function validatePathOwnership(sprints, sprintById) {
    const reachable = executionReachability(sprintById);
    for (const sprint of sprints)
        reachable(sprint.id);
    const paths = new Map();
    for (const sprint of sprints)
        if (sprint.execution)
            paths.set(sprint.id, sprint.execution.planned_paths);
    validatePathPairs(sprints, paths, reachable);
}
function readV3PlannedPaths(sprintV3) {
    const graph = (0, tasklet_metadata_js_1.readTaskletGraph)(sprintV3.filePath);
    if (graph.schemaVersion !== 3 && graph.schemaVersion !== 4)
        fail(`${graph.filePath} must contain V3 or V4 tasklet metadata for ${sprintV3.id}`);
    const paths = [];
    for (const tasklet of graph.tasklets.values())
        paths.push(...tasklet.planned_paths);
    return [...new Set(paths)];
}
function validateV3PathOwnership(sprints, sprintById) {
    const reachable = executionReachability(sprintById);
    const paths = new Map(sprints.filter(({ execution }) => execution).map(sprint => [sprint.id, readV3PlannedPaths(sprint)]));
    validatePathPairs(sprints, paths, reachable);
}
