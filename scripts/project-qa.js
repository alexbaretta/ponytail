#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse: parseToml } = require('smol-toml');
const { parseDocument } = require('yaml');

function git(root, args, accepted = [0]) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (!accepted.includes(result.status)) throw new Error(result.stderr.trim() || `git ${args[0]} failed (${result.status})`);
  return result.stdout;
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function strings(value, label) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`${label} must contain strings`);
  return value;
}

function coordinate(manager, name) {
  if (manager === 'pnpm') manager = 'npm';
  if (manager === 'pip') name = name.toLowerCase().replace(/[-_.]+/g, '-');
  return `${manager}:${name}`;
}

function trackedText(root, file) {
  const entries = git(root, ['ls-files', '--stage', '-z', '--', `:(literal)${file}`]).split('\0').filter(Boolean);
  if (entries.length !== 1 || !/^100(644|755) [a-f0-9]+ 0\t/.test(entries[0])) throw new Error(`dependency manifest must be a tracked regular file: ${file}`);
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(`${root}${path.sep}`) || fs.realpathSync(absolute) !== absolute) throw new Error(`unsafe manifest path: ${file}`);
  return fs.readFileSync(absolute, 'utf8');
}

function requirementName(value) {
  const match = /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]+\])?\s*(?:[<>=!~;@].*)?$/.exec(value.trim());
  if (!match) throw new Error(`unsupported Python requirement: ${value}`);
  return match[1];
}

function declaredDependencies(root, project) {
  const dependencies = new Set();
  for (const manifest of project.manifests) {
    const source = trackedText(root, manifest.path);
    const add = name => dependencies.add(coordinate(manifest.manager, name));
    switch (manifest.manager) {
      case 'npm':
      case 'pnpm': {
        const value = object(JSON.parse(source), manifest.path);
        for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
          for (const [name, specifier] of Object.entries(object(value[field] ?? {}, field))) {
            if (typeof specifier !== 'string') throw new Error(`invalid dependency specifier: ${name}`);
            // npm alias dependencies declare their real package after npm:.
            const alias = /^npm:((?:@[^/]+\/)?[^@]+)(?:@.*)?$/.exec(specifier);
            add(alias ? alias[1] : name);
          }
        }
        break;
      }
      case 'cargo': {
        const value = parseToml(source);
        const collect = table => {
          for (const field of ['dependencies', 'dev-dependencies', 'build-dependencies']) {
            for (const [name, declaration] of Object.entries(object(table[field] ?? {}, field))) {
              if (typeof declaration !== 'string') object(declaration, name);
              if (declaration.workspace === true) throw new Error(`declare the workspace Cargo.toml instead of inherited dependency ${name}`);
              add(typeof declaration === 'object' && declaration.package !== undefined ? declaration.package : name);
            }
          }
        };
        collect(value);
        if (value.workspace) collect(object(value.workspace, 'workspace'));
        for (const target of Object.values(object(value.target ?? {}, 'target'))) collect(object(target, 'target configuration'));
        break;
      }
      case 'pip': {
        if (manifest.path.endsWith('.toml')) {
          const value = parseToml(source);
          const configuration = object(value.project ?? {}, 'project');
          for (const requirement of strings(configuration.dependencies ?? [], 'dependencies')) add(requirementName(requirement));
          for (const group of Object.values(object(configuration['optional-dependencies'] ?? {}, 'optional-dependencies'))) {
            for (const requirement of strings(group, 'optional dependency group')) add(requirementName(requirement));
          }
          if (value.tool?.poetry) throw new Error('Poetry dependency declarations are not supported; use PEP 621 or an exported requirements file');
        } else {
          for (const line of source.split(/\r?\n/)) {
            const requirement = line.replace(/\s+#.*$/, '').trim();
            if (requirement && !requirement.startsWith('#')) add(requirementName(requirement));
          }
        }
        break;
      }
      case 'brew': {
        for (const line of source.split(/\r?\n/)) {
          if (!line.trim() || line.trim().startsWith('#')) continue;
          const declaration = /^\s*(brew|cask|tap|mas|vscode)\s+["']([^"']+)["'](?:\s*,.*)?\s*(?:#.*)?$/.exec(line);
          if (!declaration) throw new Error(`unsupported Brewfile declaration: ${line}`);
          if (['brew', 'cask'].includes(declaration[1])) add(declaration[2]);
        }
        break;
      }
      case 'conda': {
        const document = parseDocument(source, { uniqueKeys: true });
        if (document.errors.length) throw new Error(document.errors[0].message);
        const value = object(document.toJS(), manifest.path);
        if (!Array.isArray(value.dependencies)) throw new Error('Conda environment must declare dependencies');
        for (const dependency of value.dependencies) {
          if (typeof dependency === 'string') {
            const match = /^(?:[^\s]+::)?([A-Za-z0-9_.-]+)(?:\s*[=<>!~].*)?$/.exec(dependency);
            if (!match) throw new Error(`unsupported Conda dependency: ${dependency}`);
            add(match[1]);
          } else {
            object(dependency, 'Conda pip dependencies');
            if (Object.keys(dependency).join() !== 'pip') throw new Error('unsupported Conda dependency mapping');
            for (const requirement of strings(dependency.pip, 'pip')) dependencies.add(coordinate('pip', requirementName(requirement)));
          }
        }
        break;
      }
      default: throw new Error(`unsupported package manager: ${manifest.manager}`);
    }
  }
  return dependencies;
}

function repositoryUrl(url) {
  return url.replace(/^git\+/, '').replace(/\.git\/?$/, '').replace(/\/$/, '').replace(/^git@([^:]+):/, 'https://$1/').replace(/^ssh:\/\/git@/, 'https://');
}

function submoduleUrls(root) {
  const index = git(root, ['ls-files', '--stage', '-z']).split('\0').filter(Boolean);
  const gitlinks = new Set(index.filter(entry => /^160000 [a-f0-9]+ 0\t/.test(entry)).map(entry => entry.split('\t').slice(1).join('\t')));
  if (!gitlinks.size) return new Set();
  trackedText(root, '.gitmodules');
  const modules = git(root, ['config', '-z', '-f', '.gitmodules', '--get-regexp', '^submodule\..*\.(path|url)$']);
  const entries = new Map();
  for (const record of modules.split('\0').filter(Boolean)) {
    const separator = record.indexOf('\n');
    const key = record.slice(0, separator);
    const field = key.endsWith('.path') ? 'path' : 'url';
    const name = key.slice(0, -(field.length + 1));
    if (!entries.has(name)) entries.set(name, {});
    if (entries.get(name)[field] !== undefined) throw new Error(`duplicate submodule ${field}: ${name}`);
    entries.get(name)[field] = record.slice(separator + 1);
  }
  const urls = new Set();
  for (const entry of entries.values()) {
    if (!gitlinks.has(entry.path) || !entry.url) throw new Error('submodule declaration must match an indexed gitlink and URL');
    gitlinks.delete(entry.path);
    let url = entry.url;
    if (/^\.\.?\//.test(url)) {
      const origin = git(root, ['remote', 'get-url', 'origin']).trim();
      const base = repositoryUrl(origin);
      url = /^[a-z]+:\/\//i.test(base) ? new URL(url, `${base}/`).href : path.resolve(base, url);
    }
    urls.add(repositoryUrl(url));
  }
  if (gitlinks.size) throw new Error('gitlink lacks a matching .gitmodules declaration');
  return urls;
}

function checkReferences(root, project, projects) {
  const dependencies = declaredDependencies(root, project);
  const submodules = submoduleUrls(root);
  const findings = [];
  const used = new Set();
  const metadataPath = '.agents/config/ponytail.json';
  const metadataSource = fs.readFileSync(path.join(root, metadataPath), 'utf8');
  const metadataDocument = parseDocument(metadataSource);
  const lineOffsets = [0];
  for (let index = 0; index < metadataSource.length; index++) if (metadataSource[index] === '\n') lineOffsets.push(index + 1);
  const exceptionRanges = project.exceptions.flatMap((exception, index) => ['project', 'name'].map(key => metadataDocument.getIn(['exceptions', index, key], true).range));
  for (const [foreignRoot, foreign] of Object.entries(projects)) {
    if (foreign.repositoryUrls.some(url => submodules.has(repositoryUrl(url))) || foreign.packages.some(item => dependencies.has(coordinate(item.manager, item.name)))) continue;
    const names = [...new Set([foreign.name, ...foreign.names, ...foreign.components, ...foreign.repositoryUrls, ...foreign.packages.map(item => item.name), foreignRoot])];
    for (const name of names) {
      const output = git(root, ['grep', '--no-recurse-submodules', '--no-textconv', '--no-color', '--no-column', '--no-heading', '--no-break', '-I', '-n', '-z', '-i', '-F', '-e', name, '--', '.'], [0, 1]);
      for (const match of output.matchAll(/([^\0]+)\0(\d+)\0([^\n]*)\n/g)) {
        const [, file, lineNumber, text] = match;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
        const occurrences = [...text.matchAll(pattern)];
        if (!occurrences.length) continue;
        if (file === metadataPath && occurrences.every(item => {
          const offset = lineOffsets[Number(lineNumber) - 1] + item.index;
          return exceptionRanges.some(([start, end]) => offset >= start && offset + item[0].length <= end);
        })) continue;
        const exceptionIndex = project.exceptions.findIndex(item => item.project === foreign.name && item.name === name && item.path === file);
        if (exceptionIndex >= 0) { used.add(exceptionIndex); continue; }
        findings.push({ file, line: Number(lineNumber), project: foreign.name, name });
      }
    }
  }
  for (const [index, exception] of project.exceptions.entries()) {
    if (!used.has(index)) process.stderr.write(`warning: unused reference exception ${index + 1} (${exception.path})\n`);
  }
  return findings;
}

if (require.main === module) {
  try {
    const { root, project, projects } = JSON.parse(fs.readFileSync(0, 'utf8'));
    const findings = checkReferences(root, project, projects);
    for (const finding of findings) process.stdout.write(`${finding.file}:${finding.line}: forbidden reference to ${JSON.stringify(finding.project)}: ${JSON.stringify(finding.name)}\n`);
    process.stdout.write(`references: ${findings.length} findings; ${Object.keys(projects).length} other registered projects checked\n`);
    process.exitCode = findings.length ? 4 : 0;
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { declaredDependencies, submoduleUrls, checkReferences };
