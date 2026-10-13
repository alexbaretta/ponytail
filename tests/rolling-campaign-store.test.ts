// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readRollingConfigurationAmendmentRequestV1,readRollingConfigurationAmendmentV1,readRollingPublicationWithdrawalV1,
 type RollingConfigurationAmendmentRequestV1,type RollingConfigurationAmendmentV1,type RollingPublicationWithdrawalV1} from '../src/rolling-campaign-store.js';
import { readRollingAssignmentScopeV1, readRollingExecutionConfigV1, readRollingAssignmentScopeV2, readRollingExecutionConfigV2,
  RollingAssignmentScopeReaders, RollingExecutionConfigReaders, readRollingExecutionConfigV3, readRollingAssignmentScopeV3, parseRollingExecutionConfig, parseRollingAssignmentScope,
  type RollingAssignmentScopeV3, type RollingExecutionConfigV3, type RollingAssignmentScopeV1, type RollingExecutionConfigV1, type RollingAssignmentScopeV2, type RollingExecutionConfigV2 } from '../src/rolling-campaign-store.js';

// Traceability: verifies REQ-ROLLING-CONFIGURATION-AMENDMENT
// Traceability: verifies REQ-ROLLING-PUBLICATION-WITHDRAWAL
test('lifecycle contracts require exact versions, authority and optimistic configuration identities',()=> {
 const rollingConfigurationAmendmentRequestV1:RollingConfigurationAmendmentRequestV1={schemaVersion:1,id:'00000000-0000-0000-0000-000000000001',
  expected:{mainline:{remote:'origin',branch:'master'},incrementRef:'traceability',maxActiveWorkers:10,publicationSize:1},
  configuration:{mainline:{remote:'origin',branch:'uat-requirements'},incrementRef:'traceability',maxActiveWorkers:10,publicationSize:5},reason:'Human amendment',authority:['human']};
 assert.deepEqual(readRollingConfigurationAmendmentRequestV1(rollingConfigurationAmendmentRequestV1),rollingConfigurationAmendmentRequestV1);
 for(const value of [{...rollingConfigurationAmendmentRequestV1,schemaVersion:2},{...rollingConfigurationAmendmentRequestV1,id:'not-an-id'},{...rollingConfigurationAmendmentRequestV1,authority:[]},{...rollingConfigurationAmendmentRequestV1,expected:{...rollingConfigurationAmendmentRequestV1.expected,publicationSize:0}}])assert.throws(()=>readRollingConfigurationAmendmentRequestV1(value));
 const rollingConfigurationAmendmentV1:RollingConfigurationAmendmentV1={schemaVersion:1,id:rollingConfigurationAmendmentRequestV1.id,campaignId:'fixture',request:rollingConfigurationAmendmentRequestV1,
  previousConfiguration:{schemaVersion:3,...rollingConfigurationAmendmentRequestV1.expected,bindingHistory:null},
  configuration:{schemaVersion:3,mainline:{remote:'origin',branch:'uat-requirements'},incrementRef:'traceability',maxActiveWorkers:10,publicationSize:5,bindingHistory:null}};
 assert.deepEqual(readRollingConfigurationAmendmentV1(rollingConfigurationAmendmentV1),rollingConfigurationAmendmentV1);
 assert.throws(()=>readRollingConfigurationAmendmentV1({...rollingConfigurationAmendmentV1,id:'00000000-0000-0000-0000-000000000002'}),/differs from request/);
 const rollingPublicationWithdrawalV1:RollingPublicationWithdrawalV1={schemaVersion:1,id:rollingConfigurationAmendmentRequestV1.id,campaignId:'fixture',batchId:'00000000-0000-0000-0000-000000000003',reason:'Retarget',authority:['human']};
 assert.deepEqual(readRollingPublicationWithdrawalV1(rollingPublicationWithdrawalV1),rollingPublicationWithdrawalV1);
 for(const value of [{...rollingPublicationWithdrawalV1,batchId:'foreign'},{...rollingPublicationWithdrawalV1,authority:[]},{...rollingPublicationWithdrawalV1,reason:''},{...rollingPublicationWithdrawalV1,extra:true}])assert.throws(()=>readRollingPublicationWithdrawalV1(value));
});

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('stored execution contracts reject unresolved values, altered scopes and unsupported versions', () => {
  const rollingExecutionConfigV1: RollingExecutionConfigV1 = {
    schemaVersion: 1, mainline: { remote: 'origin', branch: 'main' },
    incrementRef: 'campaign/proof', maxActiveWorkers: 10, publicationSize: 1
  };
  assert.deepEqual(Object.keys(RollingExecutionConfigReaders), ['V1', 'V2', 'V3']);
  const configurationInput: unknown = JSON.parse(JSON.stringify(rollingExecutionConfigV1));
  assert.deepEqual(readRollingExecutionConfigV1(configurationInput), rollingExecutionConfigV1);
  const invalidConfigurations: readonly unknown[] = [
    { ...rollingExecutionConfigV1, schemaVersion: 2 },
    { ...rollingExecutionConfigV1, maxActiveWorkers: null },
    { ...rollingExecutionConfigV1, publicationSize: 0 },
    { ...rollingExecutionConfigV1, extra: true },
    { ...rollingExecutionConfigV1, incrementRef: 'main' }
  ];
  for (const invalidConfiguration of invalidConfigurations) assert.throws(() => readRollingExecutionConfigV1(invalidConfiguration));
  const rollingAssignmentScopeV1: RollingAssignmentScopeV1 = {
    schemaVersion: 1, plannedPaths: ['src'], exclusiveResources: ['database'],
    binding: { obligationId: 'OBL-1', implementationIds: [], sourcePaths: [], acceptances: [],
      unitTests: [], integrationTests: [], exclusiveResources: ['database'] }
  };
  assert.deepEqual(Object.keys(RollingAssignmentScopeReaders), ['V1', 'V2', 'V3']);
  const scopeInput: unknown = JSON.parse(JSON.stringify(rollingAssignmentScopeV1));
  assert.deepEqual(readRollingAssignmentScopeV1(scopeInput), rollingAssignmentScopeV1);
  const invalidScopes: readonly unknown[] = [
    { ...rollingAssignmentScopeV1, schemaVersion: 2 },
    { ...rollingAssignmentScopeV1, plannedPaths: ['../escape'] },
    { ...rollingAssignmentScopeV1, exclusiveResources: [] },
    { ...rollingAssignmentScopeV1, binding: { ...rollingAssignmentScopeV1.binding, obligationId: 'bad' } },
    { ...rollingAssignmentScopeV1, extra: true }
  ];
  for (const invalidScope of invalidScopes) assert.throws(() => readRollingAssignmentScopeV1(invalidScope));
});

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-GRAPH
test('stored V2 contracts retain explicit coordinator history and the complete frozen lease', () => {
  const rollingExecutionConfigV2: RollingExecutionConfigV2 = { schemaVersion: 2, mainline: { remote: 'origin', branch: 'main' },
    incrementRef: 'campaign/proof', maxActiveWorkers: 10, publicationSize: 1,
    bindingHistory: { path: 'pm/plan/bindings.json', assessor: 'coordinator', authority: ['approved scope'] } };
  const rollingAssignmentScopeV2: RollingAssignmentScopeV2 = { schemaVersion: 2, exclusiveResources: ['database'],
    binding: { obligationId: 'OBL-1', implementationIds: [], sourcePaths: [], acceptances: [], unitTests: [], integrationTests: [], exclusiveResources: ['database'] },
    lease: { schemaVersion: 1, scopeId: 'campaign', baselineId: 'BASELINE-1', graphDigest: 'a'.repeat(64), generation: 'generation-1', assessor: 'coordinator', authority: ['approved scope'],
      binding: { obligationId: 'OBL-1', revisionId: 'BIND-1', dependsOn: [], execution: { sprintId: null, taskletIds: [], plannedPaths: ['src/current.ts'], operations: ['edit', 'test'],
        selection: ['focused proof'], target: { identity: 'local', profile: 'focused' } } } } };
  const configurationInput: unknown = JSON.parse(JSON.stringify(rollingExecutionConfigV2));
  const scopeInput: unknown = JSON.parse(JSON.stringify(rollingAssignmentScopeV2));
  assert.deepEqual(readRollingExecutionConfigV2(configurationInput), rollingExecutionConfigV2);
  assert.deepEqual(readRollingAssignmentScopeV2(scopeInput), rollingAssignmentScopeV2);
  const invalidConfigurations: readonly unknown[] = [{ ...rollingExecutionConfigV2, schemaVersion: 1 },
    { ...rollingExecutionConfigV2, bindingHistory: { ...rollingExecutionConfigV2.bindingHistory, path: '../foreign' } },
    { ...rollingExecutionConfigV2, bindingHistory: { ...rollingExecutionConfigV2.bindingHistory, authority: [] } },
    { ...rollingExecutionConfigV2, bindingHistory: { ...rollingExecutionConfigV2.bindingHistory, extra: true } }];
  for (const invalidConfiguration of invalidConfigurations) assert.throws(() => readRollingExecutionConfigV2(invalidConfiguration));
  const invalidScopes: readonly unknown[] = [{ ...rollingAssignmentScopeV2, schemaVersion: 1 }, { ...rollingAssignmentScopeV2, plannedPaths: ['expanded'] },
    { ...rollingAssignmentScopeV2, exclusiveResources: [] },
    { ...rollingAssignmentScopeV2, binding: { ...rollingAssignmentScopeV2.binding, obligationId: 'OBL-2' } }];
  for (const invalidScope of invalidScopes) assert.throws(() => readRollingAssignmentScopeV2(invalidScope));
});


// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-CONFIGURATION
test('V3 configuration normalizes historical inputs without changing their bytes',()=> {
 const rollingExecutionConfigV1:RollingExecutionConfigV1={schemaVersion:1,mainline:{remote:'origin',branch:'main'},incrementRef:'campaign/proof',maxActiveWorkers:10,publicationSize:1};
 const rollingExecutionConfigV2:RollingExecutionConfigV2={...rollingExecutionConfigV1,schemaVersion:2,bindingHistory:{path:'history.json',assessor:'coordinator',authority:['approved scope']}};
 const unleasedRollingExecutionConfigV3:RollingExecutionConfigV3={...rollingExecutionConfigV1,schemaVersion:3,bindingHistory:null};
 const leasedRollingExecutionConfigV3:RollingExecutionConfigV3={...rollingExecutionConfigV2,schemaVersion:3};
 for(const [physical,expected] of [[rollingExecutionConfigV1,unleasedRollingExecutionConfigV3],[rollingExecutionConfigV2,leasedRollingExecutionConfigV3]] as const) {
  const bytes=JSON.stringify(physical);
  assert.deepEqual(parseRollingExecutionConfig(bytes),expected);assert.equal(JSON.stringify(physical),bytes);
 }
 assert.deepEqual(readRollingExecutionConfigV3(unleasedRollingExecutionConfigV3),unleasedRollingExecutionConfigV3);
 assert.deepEqual(parseRollingExecutionConfig(JSON.stringify(leasedRollingExecutionConfigV3)),leasedRollingExecutionConfigV3);
 assert.throws(()=>readRollingExecutionConfigV3(rollingExecutionConfigV1));
 assert.throws(()=>readRollingExecutionConfigV3({...unleasedRollingExecutionConfigV3,bindingHistory:undefined}));
 assert.throws(()=>readRollingExecutionConfigV3({...unleasedRollingExecutionConfigV3,extra:true}));
});

// Traceability: verifies REQ-ROLLING-STATE
// Traceability: verifies REQ-ROLLING-GRAPH
test('V3 assignment execution is explicit and historical scopes normalize without widening authority',()=> {
 const rollingAssignmentScopeV1:RollingAssignmentScopeV1={schemaVersion:1,plannedPaths:['src/current.ts'],exclusiveResources:[],binding:{obligationId:'OBL-1',implementationIds:[],sourcePaths:[],acceptances:[],unitTests:[],integrationTests:[],exclusiveResources:[]}};
 const rollingAssignmentScopeV2:RollingAssignmentScopeV2={schemaVersion:2,binding:rollingAssignmentScopeV1.binding,exclusiveResources:[],lease:{schemaVersion:1,scopeId:'campaign',baselineId:'BASELINE-1',graphDigest:'a'.repeat(64),generation:'generation-1',assessor:'coordinator',authority:['approved scope'],binding:{obligationId:'OBL-1',revisionId:'BIND-1',dependsOn:[],execution:{sprintId:null,taskletIds:[],plannedPaths:['src/current.ts'],operations:['test'],selection:['focused'],target:null}}}};
 const unleasedRollingAssignmentScopeV3:RollingAssignmentScopeV3={schemaVersion:3,binding:rollingAssignmentScopeV1.binding,exclusiveResources:[],execution:{kind:'unleased',plannedPaths:rollingAssignmentScopeV1.plannedPaths}};
 const leasedRollingAssignmentScopeV3:RollingAssignmentScopeV3={schemaVersion:3,binding:rollingAssignmentScopeV2.binding,exclusiveResources:[],execution:{kind:'leased',lease:rollingAssignmentScopeV2.lease}};
 for(const [physical,expected] of [[rollingAssignmentScopeV1,unleasedRollingAssignmentScopeV3],[rollingAssignmentScopeV2,leasedRollingAssignmentScopeV3]] as const) {
  const bytes=JSON.stringify(physical);assert.deepEqual(parseRollingAssignmentScope(bytes),expected);assert.equal(JSON.stringify(physical),bytes);
 }
 assert.deepEqual(readRollingAssignmentScopeV3(unleasedRollingAssignmentScopeV3),unleasedRollingAssignmentScopeV3);
 assert.deepEqual(parseRollingAssignmentScope(JSON.stringify(leasedRollingAssignmentScopeV3)),leasedRollingAssignmentScopeV3);
 for(const execution of [{kind:'unknown'},{kind:'unleased',plannedPaths:['../escape']},{kind:'unleased',plannedPaths:['src/current.ts'],lease:rollingAssignmentScopeV2.lease},{kind:'leased',lease:rollingAssignmentScopeV2.lease,plannedPaths:[]}]) assert.throws(()=>readRollingAssignmentScopeV3({...leasedRollingAssignmentScopeV3,execution}));
});
