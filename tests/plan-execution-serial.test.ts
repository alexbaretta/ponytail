#!/usr/bin/env node
// Copyright (c) Ponytail contributors.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import test from 'node:test';
import versionedContracts from '../versioned-data-contracts.json';
import { SprintMetadataReaders } from '../skills/plan-execution/scripts/sprint-metadata.js';
import { TaskletMetadataReaders } from '../skills/plan-execution/scripts/tasklet-metadata.js';
import { CampaignReportReaders } from '../src/campaign-inventory.js';

interface PhysicalReaderOwner {
  readonly module: string; readonly readerRegistryExport: string;
  readonly readers: typeof SprintMetadataReaders | typeof TaskletMetadataReaders | typeof CampaignReportReaders;
}

test('orchestration metadata retains every immutable reader', () => {
  const expected = new Map<string, PhysicalReaderOwner>([
    ['parallel-sprint-metadata', { module: 'skills/plan-execution/scripts/sprint-metadata.ts', readerRegistryExport: 'SprintMetadataReaders', readers: SprintMetadataReaders }],
    ['parallel-tasklet-scheduling-metadata', { module: 'skills/plan-execution/scripts/tasklet-metadata.ts', readerRegistryExport: 'TaskletMetadataReaders', readers: TaskletMetadataReaders }],
    ['campaign-census-report', { module: 'src/campaign-inventory.ts', readerRegistryExport: 'CampaignReportReaders', readers: CampaignReportReaders }],
  ]);
  const families = versionedContracts.families.filter(({ id }) => expected.has(id));
  assert.equal(families.length, expected.size);
  for (const family of families) {
    const versions = family.id === 'parallel-tasklet-scheduling-metadata' ? ['V1', 'V2', 'V3', 'V4'] : ['V1', 'V2', 'V3'];
    assert.equal(family.currentVersion, versions.at(-1));
    assert.deepEqual(family.versions, versions);
    assert.deepEqual(family.supportedReadVersions, versions);
    assert.deepEqual(family.supportedDowngradeVersions, []);
    const physicalReaderOwner = expected.get(family.id);
    assert.ok(physicalReaderOwner);
    assert.equal(family.implementation.module, physicalReaderOwner.module);
    assert.equal(family.implementation.readerRegistryExport, physicalReaderOwner.readerRegistryExport);
    assert.deepEqual(Object.keys(physicalReaderOwner.readers), family.supportedReadVersions);
    for (const reader of Object.values(physicalReaderOwner.readers)) {
      assert.equal(typeof reader, 'function');
    }
  }
});
