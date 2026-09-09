#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_CONFIG_VERSION = 2;
const PROTOCOL_VERSION = 1;
const QUERY_TIMEOUT_MS = 30000;

class BuildImpactError extends Error {}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertObject(value, context) {
  if (!isObject(value)) throw new BuildImpactError(`${context} must be an object`);
}

function assertExactKeys(value, keys, context) {
  assertObject(value, context);
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new BuildImpactError(`${context} has unknown field: ${key}`);
  }
}

function assertVersion(value, expected, context) {
  if (value !== expected) throw new BuildImpactError(`${context}.version must be ${expected}`);
}

function assertString(value, context) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BuildImpactError(`${context} must be a nonempty string`);
  }
  if (value.includes('\0')) throw new BuildImpactError(`${context} contains a null byte`);
  return value;
}

function assertArray(value, context) {
  if (!Array.isArray(value)) throw new BuildImpactError(`${context} must be an array`);
  return value;
}

function parseInput(input, context, version) {
  assertExactKeys(input, ['kind', 'path'], context);
  const kinds = version === 1 ? ['file', 'directory'] : ['file', 'directory', 'glob'];
  if (!kinds.includes(input.kind)) {
    throw new BuildImpactError(`${context}.kind must be ${kinds.join(', ')}`);
  }
  return { kind: input.kind, path: normalizeConfiguredPath(input.path, `${context}.path`) };
}

function parseTarget(target, context, type, version) {
  const keys = ['name', 'buildCommand'];
  if (type === 'typescript') {
    keys.push('tsconfig', 'configurationInputs', 'additionalInputs');
  }
  assertExactKeys(target, keys, context);
  const current = {
    name: assertString(target.name, `${context}.name`),
    buildCommand: assertString(target.buildCommand, `${context}.buildCommand`),
  };
  if (type === 'typescript') {
    current.tsconfig = normalizeConfiguredPath(target.tsconfig, `${context}.tsconfig`);
    current.configurationInputs = assertArray(
      target.configurationInputs || [],
      `${context}.configurationInputs`,
    ).map((input, index) =>
      normalizeConfiguredPath(input, `${context}.configurationInputs[${index}]`));
    current.additionalInputs = assertArray(
      target.additionalInputs || [],
      `${context}.additionalInputs`,
    ).map((input, index) =>
      parseInput(input, `${context}.additionalInputs[${index}]`, version));
  }
  return current;
}

function parseAdapter(adapter, index, version) {
  const context = `ponytail.json.buildImpact.adapters[${index}]`;
  assertObject(adapter, context);
  if (adapter.type === 'typescript') {
    assertExactKeys(adapter, ['type', 'targets'], context);
  } else if (adapter.type === 'custom') {
    assertExactKeys(adapter, ['type', 'command', 'targets'], context);
  } else {
    throw new BuildImpactError(`${context}.type must be typescript or custom`);
  }
  const targets = assertArray(adapter.targets, `${context}.targets`)
    .map((target, targetIndex) =>
      parseTarget(target, `${context}.targets[${targetIndex}]`, adapter.type, version));
  if (targets.length === 0) throw new BuildImpactError(`${context}.targets must not be empty`);
  const current = { type: adapter.type, targets };
  if (adapter.type === 'custom') {
    current.command = assertArray(adapter.command, `${context}.command`)
      .map((part, commandIndex) => assertString(part, `${context}.command[${commandIndex}]`));
    if (current.command.length === 0) {
      throw new BuildImpactError(`${context}.command must not be empty`);
    }
  }
  return current;
}

function parseProjectConfigVersion(value, version) {
  assertExactKeys(value, ['version', 'buildImpact'], 'ponytail.json');
  assertVersion(value.version, version, 'ponytail.json');
  assertExactKeys(value.buildImpact, ['version', 'globalInputs', 'adapters'], 'ponytail.json.buildImpact');
  assertVersion(value.buildImpact.version, version, 'ponytail.json.buildImpact');
  const adapters = assertArray(value.buildImpact.adapters, 'ponytail.json.buildImpact.adapters')
    .map((adapter, index) => parseAdapter(adapter, index, version));
  if (adapters.length === 0) {
    throw new BuildImpactError('ponytail.json.buildImpact.adapters must not be empty');
  }
  const globalInputs = assertArray(
    value.buildImpact.globalInputs || [],
    'ponytail.json.buildImpact.globalInputs',
  ).map((input, index) =>
    parseInput(input, `ponytail.json.buildImpact.globalInputs[${index}]`, version));
  const targetNames = new Set();
  for (const adapter of adapters) {
    for (const target of adapter.targets) {
      if (targetNames.has(target.name)) {
        throw new BuildImpactError(`build target has multiple owners: ${target.name}`);
      }
      targetNames.add(target.name);
    }
  }
  return {
    version: PROJECT_CONFIG_VERSION,
    buildImpact: { version: PROJECT_CONFIG_VERSION, globalInputs, adapters },
  };
}

function parseProjectConfigV1(value) {
  return parseProjectConfigVersion(value, 1);
}

function parseProjectConfigV2(value) {
  return parseProjectConfigVersion(value, 2);
}

function parseProjectConfig(value) {
  assertObject(value, 'ponytail.json');
  if (value.version === 1) return parseProjectConfigV1(value);
  if (value.version === 2) return parseProjectConfigV2(value);
  throw new BuildImpactError('ponytail.json.version must be 1 or 2');
}

function normalizeConfiguredPath(value, context) {
  const configuredPath = assertString(value, context).replaceAll('\\', '/');
  if (path.posix.isAbsolute(configuredPath) || configuredPath === '..' || configuredPath.startsWith('../')) {
    throw new BuildImpactError(`${context} must be project-root-relative`);
  }
  const normalized = path.posix.normalize(configuredPath).replace(/^\.\//, '');
  if (normalized === '.' || normalized === '') {
    throw new BuildImpactError(`${context} must identify a project path`);
  }
  return normalized;
}

function normalizeChangedFile(projectRoot, value, context = 'changed file') {
  const changedPath = assertString(value, context);
  const absolute = path.isAbsolute(changedPath)
    ? path.resolve(changedPath)
    : path.resolve(projectRoot, changedPath);
  const relative = path.relative(projectRoot, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new BuildImpactError(`${context} is outside the project root: ${changedPath}`);
  }
  return relative.split(path.sep).join('/');
}

function inputMatches(input, changedFile) {
  if (input.kind === 'file') return input.path === changedFile;
  if (input.kind === 'glob') return path.matchesGlob(changedFile, input.path);
  return input.path === changedFile || changedFile.startsWith(`${input.path}/`);
}

function canBeTypescriptCompilerInput(changedFile) {
  return [
    '.cjs',
    '.cts',
    '.js',
    '.jsx',
    '.json',
    '.mjs',
    '.mts',
    '.ts',
    '.tsx',
  ].includes(path.posix.extname(changedFile));
}

function makeAffected(target, changedFiles) {
  return {
    name: target.name,
    buildCommand: target.buildCommand,
    changedFiles: [...new Set(changedFiles)].sort(),
  };
}

function makeIndeterminate(target, reason) {
  return { name: target.name, buildCommand: target.buildCommand, reason };
}

function resolveTypescript(projectRoot) {
  let packagePath;
  try {
    packagePath = require.resolve('typescript/package.json', { paths: [projectRoot] });
  } catch {
    throw new BuildImpactError(`TypeScript is not installed in ${projectRoot}`);
  }
  const compilerPath = path.join(path.dirname(packagePath), 'bin', 'tsc');
  if (!fs.existsSync(compilerPath) || !fs.statSync(compilerPath).isFile()) {
    throw new BuildImpactError(`TypeScript compiler not found: ${compilerPath}`);
  }
  return compilerPath;
}

function listTypescriptFiles(projectRoot, compilerPath, tsconfig) {
  const root = fs.realpathSync(projectRoot);
  const result = spawnSync(
    process.execPath,
    [compilerPath, '--project', tsconfig, '--listFilesOnly', '--pretty', 'false'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: QUERY_TIMEOUT_MS,
    },
  );
  if (result.error) throw new BuildImpactError(result.error.message);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new BuildImpactError(detail || `TypeScript exited with status ${result.status}`);
  }
  const files = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line) continue;
    const absolute = path.resolve(root, line);
    const relative = path.relative(root, absolute);
    if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
      files.add(relative.split(path.sep).join('/'));
    }
  }
  return files;
}

function queryTypescriptAdapter(adapter, projectRoot, changedFiles) {
  let compilerPath;
  let compilerError;
  const affected = [];
  const indeterminate = [];
  for (const target of adapter.targets) {
    try {
      const fixedInputs = new Set([target.tsconfig, ...target.configurationInputs]);
      const configuredMatches = changedFiles.filter((changedFile) =>
        fixedInputs.has(changedFile)
        || target.additionalInputs.some((input) => inputMatches(input, changedFile)));
      if (configuredMatches.length > 0) {
        affected.push(makeAffected(target, configuredMatches));
        continue;
      }
      const compilerCandidates = changedFiles.filter(canBeTypescriptCompilerInput);
      if (compilerCandidates.length === 0) continue;
      if (compilerPath === undefined && compilerError === undefined) {
        try {
          compilerPath = resolveTypescript(projectRoot);
        } catch (error) {
          compilerError = error;
        }
      }
      if (compilerError !== undefined) throw compilerError;
      const compilerInputs = listTypescriptFiles(projectRoot, compilerPath, target.tsconfig);
      const compilerMatches = compilerCandidates.filter((changedFile) =>
        compilerInputs.has(changedFile));
      const unmatchedMissing = compilerCandidates.filter((changedFile) =>
        !compilerMatches.includes(changedFile)
        && !fs.existsSync(path.join(projectRoot, changedFile)));
      if (unmatchedMissing.length > 0) {
        indeterminate.push(makeIndeterminate(
          target,
          `cannot determine whether missing paths were prior TypeScript inputs: ${unmatchedMissing.join(', ')}`,
        ));
      } else if (compilerMatches.length > 0) {
        affected.push(makeAffected(target, compilerMatches));
      }
    } catch (error) {
      indeterminate.push(makeIndeterminate(target, error.message));
    }
  }
  return { affected, indeterminate };
}

function parseAdapterResult(value, adapter) {
  assertExactKeys(
    value,
    ['version', 'status', 'affectedTargets', 'indeterminateTargets', 'error'],
    'custom adapter response',
  );
  assertVersion(value.version, PROTOCOL_VERSION, 'custom adapter response');
  if (!['ok', 'indeterminate'].includes(value.status)) {
    throw new BuildImpactError('custom adapter response.status must be ok or indeterminate');
  }
  if (value.error !== null && typeof value.error !== 'string') {
    throw new BuildImpactError('custom adapter response.error must be a string or null');
  }
  const owned = new Map(adapter.targets.map((target) => [target.name, target]));
  const seen = new Set();
  const affected = assertArray(value.affectedTargets, 'custom adapter response.affectedTargets')
    .map((entry, index) => {
      const context = `custom adapter response.affectedTargets[${index}]`;
      assertExactKeys(entry, ['name', 'changedFiles'], context);
      const name = assertString(entry.name, `${context}.name`);
      if (!owned.has(name)) throw new BuildImpactError(`custom adapter returned unowned target: ${name}`);
      if (seen.has(name)) throw new BuildImpactError(`custom adapter returned duplicate target: ${name}`);
      seen.add(name);
      const changedFiles = assertArray(entry.changedFiles, `${context}.changedFiles`)
        .map((file, fileIndex) => assertString(file, `${context}.changedFiles[${fileIndex}]`));
      if (changedFiles.length === 0) {
        throw new BuildImpactError(`${context}.changedFiles must not be empty`);
      }
      return makeAffected(owned.get(name), changedFiles);
    });
  const indeterminate = assertArray(
    value.indeterminateTargets,
    'custom adapter response.indeterminateTargets',
  ).map((entry, index) => {
    const context = `custom adapter response.indeterminateTargets[${index}]`;
    assertExactKeys(entry, ['name', 'reason'], context);
    const name = assertString(entry.name, `${context}.name`);
    if (!owned.has(name)) throw new BuildImpactError(`custom adapter returned unowned target: ${name}`);
    if (seen.has(name)) throw new BuildImpactError(`custom adapter returned duplicate target: ${name}`);
    seen.add(name);
    return makeIndeterminate(owned.get(name), assertString(entry.reason, `${context}.reason`));
  });
  if (value.status === 'ok' && (indeterminate.length > 0 || value.error !== null)) {
    throw new BuildImpactError('custom adapter ok response contains an indeterminate result');
  }
  if (value.status === 'indeterminate' && indeterminate.length === 0 && value.error === null) {
    throw new BuildImpactError('custom adapter indeterminate response has no reason');
  }
  return { affected, indeterminate };
}

function parseCustomRequest(value) {
  assertExactKeys(value, ['version', 'projectRoot', 'changedFiles'], 'custom adapter request');
  assertVersion(value.version, PROTOCOL_VERSION, 'custom adapter request');
  const projectRoot = assertString(value.projectRoot, 'custom adapter request.projectRoot');
  const changedFiles = assertArray(value.changedFiles, 'custom adapter request.changedFiles')
    .map((file, index) => assertString(file, `custom adapter request.changedFiles[${index}]`));
  return { version: PROTOCOL_VERSION, projectRoot, changedFiles };
}

function parseQueryResult(value) {
  assertExactKeys(
    value,
    ['version', 'status', 'affectedTargets', 'indeterminateTargets', 'error'],
    'build-impact query result',
  );
  assertVersion(value.version, PROTOCOL_VERSION, 'build-impact query result');
  if (!['ok', 'indeterminate'].includes(value.status)) {
    throw new BuildImpactError('build-impact query result.status must be ok or indeterminate');
  }
  if (value.error !== null && typeof value.error !== 'string') {
    throw new BuildImpactError('build-impact query result.error must be a string or null');
  }
  const seen = new Set();
  const affectedTargets = assertArray(
    value.affectedTargets,
    'build-impact query result.affectedTargets',
  ).map((entry, index) => {
    const context = `build-impact query result.affectedTargets[${index}]`;
    assertExactKeys(entry, ['name', 'buildCommand', 'changedFiles'], context);
    const name = assertString(entry.name, `${context}.name`);
    if (seen.has(name)) throw new BuildImpactError(`duplicate query target: ${name}`);
    seen.add(name);
    return {
      name,
      buildCommand: assertString(entry.buildCommand, `${context}.buildCommand`),
      changedFiles: assertArray(entry.changedFiles, `${context}.changedFiles`)
        .map((file, fileIndex) => assertString(file, `${context}.changedFiles[${fileIndex}]`)),
    };
  });
  const indeterminateTargets = assertArray(
    value.indeterminateTargets,
    'build-impact query result.indeterminateTargets',
  ).map((entry, index) => {
    const context = `build-impact query result.indeterminateTargets[${index}]`;
    assertExactKeys(entry, ['name', 'buildCommand', 'reason'], context);
    const name = assertString(entry.name, `${context}.name`);
    if (seen.has(name)) throw new BuildImpactError(`duplicate query target: ${name}`);
    seen.add(name);
    return {
      name,
      buildCommand: assertString(entry.buildCommand, `${context}.buildCommand`),
      reason: assertString(entry.reason, `${context}.reason`),
    };
  });
  if (value.status === 'ok' && (indeterminateTargets.length > 0 || value.error !== null)) {
    throw new BuildImpactError('ok query result contains an indeterminate result');
  }
  if (value.status === 'indeterminate' && indeterminateTargets.length === 0 && value.error === null) {
    throw new BuildImpactError('indeterminate query result has no reason');
  }
  return {
    version: PROTOCOL_VERSION,
    status: value.status,
    affectedTargets,
    indeterminateTargets,
    error: value.error,
  };
}

function queryCustomAdapter(adapter, projectRoot, changedFiles) {
  const command = [...adapter.command];
  if (command[0].includes('/') || command[0].includes('\\')) {
    command[0] = path.resolve(projectRoot, command[0]);
  }
  const request = JSON.stringify(parseCustomRequest({
    version: PROTOCOL_VERSION,
    projectRoot,
    changedFiles,
  }));
  const result = spawnSync(command[0], command.slice(1), {
    cwd: projectRoot,
    encoding: 'utf8',
    input: request,
    maxBuffer: 16 * 1024 * 1024,
    timeout: QUERY_TIMEOUT_MS,
  });
  const failAll = (reason) => ({
    affected: [],
    indeterminate: adapter.targets.map((target) => makeIndeterminate(target, reason)),
  });
  if (result.error) return failAll(result.error.message);
  if (result.status !== 0) {
    return failAll((result.stderr || '').trim() || `custom adapter exited with status ${result.status}`);
  }
  try {
    const parsed = parseAdapterResult(JSON.parse(result.stdout), adapter);
    const intended = new Set(changedFiles);
    for (const target of parsed.affected) {
      for (const changedFile of target.changedFiles) {
        if (!intended.has(changedFile)) {
          throw new BuildImpactError(
            `custom adapter returned an unintended changed file: ${changedFile}`,
          );
        }
      }
    }
    return parsed;
  } catch (error) {
    return failAll(error instanceof Error ? error.message : String(error));
  }
}

function queryBuildImpact(config, projectRoot, intendedFiles) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const changedFiles = [...new Set(intendedFiles.map((file, index) =>
    normalizeChangedFile(root, file, `changedFiles[${index}]`)))].sort();
  const targets = config.buildImpact.adapters.flatMap((adapter) => adapter.targets);
  const globalChanges = changedFiles.filter((changedFile) =>
    config.buildImpact.globalInputs.some((input) => inputMatches(input, changedFile)));
  if (globalChanges.length > 0) {
    return makeResponse(targets.map((target) => makeAffected(target, globalChanges)), []);
  }
  const affected = [];
  const indeterminate = [];
  for (const adapter of config.buildImpact.adapters) {
    const result = adapter.type === 'typescript'
      ? queryTypescriptAdapter(adapter, root, changedFiles)
      : queryCustomAdapter(adapter, root, changedFiles);
    affected.push(...result.affected);
    indeterminate.push(...result.indeterminate);
  }
  return makeResponse(affected, indeterminate);
}

function makeResponse(affectedTargets, indeterminateTargets, error = null) {
  return {
    version: PROTOCOL_VERSION,
    status: error !== null || indeterminateTargets.length > 0 ? 'indeterminate' : 'ok',
    affectedTargets,
    indeterminateTargets,
    error,
  };
}

function parseArguments(argv) {
  let projectRoot = process.cwd();
  let configPath = 'ponytail.json';
  const files = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--project' || argument === '--config' || argument === '--file') {
      const value = argv[index + 1];
      if (value === undefined) throw new BuildImpactError(`${argument} requires a value`);
      index += 1;
      if (argument === '--project') projectRoot = value;
      else if (argument === '--config') configPath = value;
      else files.push(value);
    } else if (argument === '--help') {
      return { help: true };
    } else {
      throw new BuildImpactError(`unknown argument: ${argument}`);
    }
  }
  return { help: false, projectRoot: path.resolve(projectRoot), configPath, files };
}

function printUsage() {
  process.stdout.write(
    'Usage: build-impact.js [--project <directory>] [--config <path>] [--file <path>]...\n',
  );
}

function run(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      printUsage();
      return 0;
    }
    const configuredPath = path.isAbsolute(options.configPath)
      ? options.configPath
      : path.resolve(options.projectRoot, options.configPath);
    const absoluteConfig = fs.realpathSync(configuredPath);
    const config = parseProjectConfig(JSON.parse(fs.readFileSync(absoluteConfig, 'utf8')));
    const response = queryBuildImpact(
      config,
      options.projectRoot,
      options.files,
    );
    process.stdout.write(`${JSON.stringify(response)}\n`);
    return response.status === 'ok' ? 0 : 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify(makeResponse([], [], message))}\n`);
    return 2;
  }
}

const BuildImpactProjectConfigReaders = { V1: parseProjectConfigV1, V2: parseProjectConfigV2 };
const BuildImpactCustomResultReaders = { V1: parseAdapterResult };
const BuildImpactCustomRequestReaders = { V1: parseCustomRequest };
const BuildImpactQueryResultReaders = { V1: parseQueryResult };
const BuildImpactQueryResultWriters = { V1: makeResponse };

module.exports = {
  BuildImpactCustomRequestReaders,
  BuildImpactCustomResultReaders,
  BuildImpactError,
  BuildImpactProjectConfigReaders,
  BuildImpactQueryResultReaders,
  BuildImpactQueryResultWriters,
  inputMatches,
  listTypescriptFiles,
  normalizeChangedFile,
  parseAdapterResult,
  parseArguments,
  parseCustomRequest,
  parseProjectConfig,
  parseQueryResult,
  queryBuildImpact,
  run,
};

if (require.main === module) process.exitCode = run();
