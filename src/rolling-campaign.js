// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

const { parse } = require('lossless-json');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function requireRollingCondition(condition, message) {
  if (!condition) throw new Error(`rolling campaign: ${message}`);
}

function requireRollingRecord(value, keys, label) {
  requireRollingCondition(value !== null && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  `${label} must contain exactly ${keys.join(', ')}`);
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function readRollingProjectConfigV1(value) {
  requireRollingRecord(value, ['schemaVersion', 'mainline', 'managedWorktrees',
    'maxActiveWorkers', 'publicationSize', 'setupCommands', 'qa'], 'project configuration V1');
  requireRollingCondition(value.schemaVersion === 1, 'unsupported project configuration version');
  if (value.mainline !== null) {
    requireRollingRecord(value.mainline, ['remote', 'branch'], 'mainline');
    for (const key of ['remote', 'branch']) {
      requireRollingCondition(typeof value.mainline[key] === 'string'
        && value.mainline[key].trim() === value.mainline[key] && value.mainline[key].length > 0
        && !value.mainline[key].startsWith('-'), `invalid mainline ${key}`);
    }
  }
  requireRollingRecord(value.managedWorktrees, ['directory', 'anchor'], 'managed worktrees');
  requireRollingCondition(value.managedWorktrees.anchor === 'main', 'managed directory anchor must be main');
  requireRollingCondition(typeof value.managedWorktrees.directory === 'string'
    && value.managedWorktrees.directory.trim() === value.managedWorktrees.directory
    && value.managedWorktrees.directory.length > 0, 'managed directory must be nonempty');
  for (const key of ['maxActiveWorkers', 'publicationSize']) {
    requireRollingCondition(value[key] === null || Number.isSafeInteger(value[key]) && value[key] > 0,
      `${key} must be null or a positive safe integer`);
  }
  requireRollingRecord(value.qa, ['focused', 'publication'], 'QA');
  for (const [label, commands] of [['setupCommands', value.setupCommands],
    ['focused QA', value.qa.focused], ['publication QA', value.qa.publication]]) {
    requireRollingCondition(Array.isArray(commands), `${label} must be an array`);
    for (const argv of commands) {
      requireRollingCondition(Array.isArray(argv) && argv.length > 0
        && argv.every(argument => typeof argument === 'string' && !argument.includes('\0'))
        && argv[0].length > 0, `${label} commands must be nonempty executable argument arrays`);
    }
  }
  requireRollingCondition(value.qa.publication.length > 0, 'publication QA must be configured');
  return value;
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function parseRollingProjectConfig(text) {
  return readRollingProjectConfigV1(parse(text, null, token => {
    requireRollingCondition(/^(0|[1-9][0-9]*)$/.test(token)
      && Number.isSafeInteger(Number(token)), `unsupported JSON number token: ${token}`);
    return Number(token);
  }));
}

const RollingProjectConfigReaders = { V1: readRollingProjectConfigV1 };

// Traceability: implements REQ-ROLLING-CONFIGURATION
function resolveRollingConfiguration(rollingProjectConfig, request, gitDefaultBranch) {
  readRollingProjectConfigV1(rollingProjectConfig);
  requireRollingRecord(request, ['mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize'], 'campaign request');
  const mainline = request.mainline ?? rollingProjectConfig.mainline
    ?? { remote: 'origin', branch: gitDefaultBranch };
  const maxActiveWorkers = request.maxActiveWorkers ?? rollingProjectConfig.maxActiveWorkers ?? 10;
  const publicationSize = request.publicationSize ?? rollingProjectConfig.publicationSize ?? 1;
  readRollingProjectConfigV1({ ...rollingProjectConfig, mainline, maxActiveWorkers, publicationSize });
  for (const [label, ref] of [['mainline branch', mainline.branch], ['increment branch', request.incrementRef]]) {
    requireRollingCondition(typeof ref === 'string' && ref.length > 0 && !ref.startsWith('-')
      && spawnSync('git', ['check-ref-format', `refs/heads/${ref}`]).status === 0, `invalid ${label}`);
  }
  requireRollingCondition(mainline.branch !== request.incrementRef, 'increment and mainline branches must differ');
  return { mainline: { ...mainline }, incrementRef: request.incrementRef, maxActiveWorkers, publicationSize };
}

// Traceability: implements REQ-ROLLING-CONFIGURATION
function loadRollingConfiguration(coordinatorRoot, request) {
  const root = fs.realpathSync(coordinatorRoot);
  const repository = spawnSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  requireRollingCondition(repository.status === 0 && fs.realpathSync(repository.stdout.trim()) === root,
    'coordinator root must identify the exact Git checkout');
  const configurationPath = path.join(root, '.agents/config/project/rolling-campaigns.json');
  requireRollingCondition(fs.lstatSync(configurationPath).isFile()
    && fs.realpathSync(configurationPath) === configurationPath,
  'project configuration must be a regular non-symlink file without symlink ancestors');
  const rollingProjectConfig = parseRollingProjectConfig(fs.readFileSync(configurationPath, 'utf8'));
  const gitDefault = spawnSync('git', ['-C', root, 'config', '--get', 'init.defaultBranch'], { encoding: 'utf8' });
  requireRollingCondition(gitDefault.status === 0 || gitDefault.status === 1, 'cannot read effective Git default branch');
  return resolveRollingConfiguration(rollingProjectConfig, request, gitDefault.status === 0 ? gitDefault.stdout.trim() : null);
}

module.exports = { readRollingProjectConfigV1, parseRollingProjectConfig,
  RollingProjectConfigReaders, resolveRollingConfiguration, loadRollingConfiguration };
