// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {Pool} from 'pg';
import {parse} from 'lossless-json';
import {databaseOptions} from './project-index-database.js';
import {relativePath} from '../skills/plan-execution/scripts/obligations.js';
import {collectRollingGraph,loadRollingConfiguration,readRollingCampaignRequest,type RollingCampaignRequest} from './rolling-campaign.js';
import {resolveRollingManagedDirectory} from './rolling-worktrees.js';
import {RollingCampaignStore,readRollingBindingHistoryConfiguration,type RollingBindingHistoryConfiguration,type RollingCampaignRegistration,type RollingCampaignRegistrationResult,type RollingGraphReconciliation,type RollingCoordinatorSnapshot,type RollingAllocationResult,type RollingAction,type RollingStoredAssignment,type RollingPublicationStatus,type RollingAssignmentRelease} from './rolling-campaign-store.js';
import type {RollingStoredReview} from './rolling-review.js';
import {git,gitResult,publishRollingIncrement,reconcileRollingIncrementPublication,type RollingIncrementPublication} from './rolling-integration.js';

export interface RollingCampaignInitializationV1 {
 readonly schemaVersion:1;
 readonly coordinatorRoot:string;
 readonly documentPath:string;
 readonly bindingsPath:string;
 readonly bindingHistory:RollingBindingHistoryConfiguration | null;
 readonly configuration:RollingCampaignRequest;
}
function isRecord(value:unknown):value is Record<string,unknown> {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function record(value:unknown):Record<string,unknown> {
 if (!isRecord(value)) throw new Error('rolling campaign: expected an object');
 return value;
}
// Traceability: implements REQ-ROLLING-INTERFACES
export function readRollingCampaignInitializationV1(value:unknown):RollingCampaignInitializationV1 {
 const initialization = record(value);
 if (initialization.schemaVersion !== 1 || JSON.stringify(Object.keys(initialization).sort()) !== JSON.stringify(['schemaVersion','coordinatorRoot','documentPath','bindingsPath','bindingHistory','configuration'].sort())) throw new Error('rolling campaign: invalid initialization V1 fields');
 if (typeof initialization.coordinatorRoot !== 'string' || !path.isAbsolute(initialization.coordinatorRoot)) throw new Error('rolling campaign: initialization requires an absolute coordinator root');
 relativePath(initialization.documentPath);relativePath(initialization.bindingsPath);
 return {schemaVersion:1,coordinatorRoot:initialization.coordinatorRoot,documentPath:initialization.documentPath,bindingsPath:initialization.bindingsPath,
  bindingHistory:initialization.bindingHistory === null ? null : readRollingBindingHistoryConfiguration(initialization.bindingHistory),configuration:readRollingCampaignRequest(initialization.configuration)};
}
export const RollingCampaignInitializationReaders = {V1:readRollingCampaignInitializationV1};
function readJson(text:string):unknown {
 return parse(text,null,token=> {
  const number = Number(token);
  if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(number)) throw new Error('rolling campaign: JSON numbers must be exact nonnegative safe integers');
  return number;
 });
}
export function parseRollingCampaignInitialization(text:string):RollingCampaignInitializationV1 {return readRollingCampaignInitializationV1(readJson(text));}
export interface RollingReplenishment {
 readonly trigger:'event' | 'periodic';
 readonly graphDigest:string;
 readonly allocations:readonly RollingAllocationResult[];
 readonly snapshot:RollingCoordinatorSnapshot;
}
export interface RollingReconcileDecision {readonly kind:'reconcile';readonly expectedDigest:string;readonly observedDigest:string;}
export interface RollingWorkerDecision {readonly kind:'worker';readonly command:'provision-worker' | 'recover-worker' | 'resume-worker' | 'observe-resumption';readonly action:RollingAction;}
export interface RollingReviewDecision {readonly kind:'review';readonly command:'inspect-review';readonly review:RollingStoredReview;}
export interface RollingAssignmentDecision {readonly kind:'assignment';readonly command:'request-review' | 'dispatch-worker' | 'integrate' | 'retire-worker';readonly assignment:RollingStoredAssignment;}
export interface RollingPublicationDecision {readonly kind:'publication';readonly command:'prepare-publication' | 'observe-preparation' | 'observe-refresh' | 'inspect-publication-conflict' | 'run-publication-qa' | 'observe-publication-qa' | 'publish-mainline' | 'observe-mainline' | 'refresh-mainline' | 'synchronize-campaign';readonly publication:RollingPublicationStatus;}
export interface RollingReplenishDecision {readonly kind:'replenish';readonly graphDigest:string;}
// Discriminator: kind
export type RollingCoordinatorDecision = RollingReconcileDecision | RollingWorkerDecision | RollingReviewDecision | RollingAssignmentDecision | RollingPublicationDecision | RollingReplenishDecision;
export interface RollingCoordinatorActions {readonly snapshot:RollingCoordinatorSnapshot;readonly decisions:readonly RollingCoordinatorDecision[];}

function publicationCommand(rollingPublicationStatus:RollingPublicationStatus):RollingPublicationDecision['command'] {
 switch (rollingPublicationStatus.state) {
  case 'FROZEN': return 'prepare-publication';
  case 'PREPARING': return rollingPublicationStatus.pendingRefreshId === null ? 'observe-preparation' : 'observe-refresh';
  case 'CONFLICT': return 'inspect-publication-conflict';
  case 'CANDIDATE': case 'QA_FAILED': return 'run-publication-qa';
  case 'QA_RUNNING': return 'observe-publication-qa';
  case 'QA_PASSED': return 'publish-mainline';
  case 'PUSHING': case 'UNCONFIRMED': return 'observe-mainline';
  case 'REBASE_REQUIRED': case 'PUSH_REJECTED': return 'refresh-mainline';
  case 'PUBLISHED': return 'synchronize-campaign';
 }
}

// Traceability: implements REQ-ROLLING-STATE
// Traceability: implements REQ-ROLLING-INTERFACES
export function projectRollingCoordinatorActions(rollingCoordinatorSnapshot:RollingCoordinatorSnapshot):RollingCoordinatorActions {
 if (rollingCoordinatorSnapshot.graphDigest !== rollingCoordinatorSnapshot.observedGraphDigest) return {snapshot:rollingCoordinatorSnapshot,
  decisions:[{kind:'reconcile',expectedDigest:rollingCoordinatorSnapshot.graphDigest,observedDigest:rollingCoordinatorSnapshot.observedGraphDigest}]};
 const decisions:RollingCoordinatorDecision[] = [];
 for (const publication of rollingCoordinatorSnapshot.publications) decisions.push({kind:'publication',command:publicationCommand(publication),publication});
 for (const review of rollingCoordinatorSnapshot.reviews) if (review.outcome === null) decisions.push({kind:'review',command:'inspect-review',review});
 for (const assignment of rollingCoordinatorSnapshot.assignments) if (['REVIEW','REWORK','INTEGRATING','RETIRING'].includes(assignment.state)
  && !rollingCoordinatorSnapshot.reviews.some(review=>review.request.assignmentId === assignment.id && review.outcome === null)) decisions.push({kind:'assignment',command:assignment.state === 'REVIEW' ? 'request-review' : assignment.state === 'REWORK' ? 'dispatch-worker' : assignment.state === 'INTEGRATING' ? 'integrate' : 'retire-worker',assignment});
 for (const action of rollingCoordinatorSnapshot.actions) decisions.push({kind:'worker',command:action.kind === 'START_WORKER' ? action.state === 'PENDING' ? 'provision-worker' : 'recover-worker' : action.state === 'PENDING' ? 'resume-worker' : 'observe-resumption',action});
 if (rollingCoordinatorSnapshot.scheduling.selected.length > 0) decisions.push({kind:'replenish',graphDigest:rollingCoordinatorSnapshot.graphDigest});
 return {snapshot:rollingCoordinatorSnapshot,decisions};
}

// Traceability: implements REQ-ROLLING-INTERFACES
// Both transports invoke this layer; it never allocates through a Codex plugin.
export class RollingCampaignOperations {
 constructor(private readonly rollingCampaignStore:RollingCampaignStore) {}

 // Traceability: implements REQ-ROLLING-CONFIGURATION
 async initialize(rollingCampaignInitializationV1:RollingCampaignInitializationV1):Promise<RollingCampaignRegistrationResult> {
  readRollingCampaignInitializationV1(rollingCampaignInitializationV1);
  const {coordinatorRoot,documentPath,bindingsPath,bindingHistory} = rollingCampaignInitializationV1;
  const rollingResolvedConfiguration = loadRollingConfiguration(coordinatorRoot,rollingCampaignInitializationV1.configuration);
  if (git(coordinatorRoot,['status','--porcelain']).trim() !== '') throw new Error('rolling campaign: initialization requires a clean coordinator checkout');
  const mainlineRef = `refs/remotes/${rollingResolvedConfiguration.mainline.remote}/${rollingResolvedConfiguration.mainline.branch}`;
  git(coordinatorRoot,['fetch','--no-tags','--',rollingResolvedConfiguration.mainline.remote,`refs/heads/${rollingResolvedConfiguration.mainline.branch}:${mainlineRef}`]);
  const branch = gitResult(coordinatorRoot,['show-ref','--verify','--quiet',`refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
  if (branch.status === 1) git(coordinatorRoot,['branch',rollingResolvedConfiguration.incrementRef,mainlineRef]);
  else if (branch.status !== 0) throw new Error('rolling campaign: cannot inspect the campaign branch');
  git(coordinatorRoot,['switch',rollingResolvedConfiguration.incrementRef]);
  git(coordinatorRoot,['merge','--ff-only',mainlineRef]);
  const revision = git(coordinatorRoot,['rev-parse','HEAD']).trim();
  const rollingIncrementPublication:RollingIncrementPublication = {rootPath:coordinatorRoot,target:{remote:rollingResolvedConfiguration.mainline.remote,branch:rollingResolvedConfiguration.incrementRef},revision};
  if (revision === git(coordinatorRoot,['rev-parse',mainlineRef]).trim()) {
   const remote = gitResult(coordinatorRoot,['ls-remote','--exit-code','--heads','--',rollingResolvedConfiguration.mainline.remote,`refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
   if (remote.status === 2) gitResult(coordinatorRoot,['push','--porcelain','--',rollingResolvedConfiguration.mainline.remote,`${revision}:refs/heads/${rollingResolvedConfiguration.incrementRef}`]);
   else if (remote.status !== 0) throw new Error('rolling campaign: initial branch observation failed; retain the checkout');
  }
  const rollingIncrementPublicationResult = revision === git(coordinatorRoot,['rev-parse',mainlineRef]).trim()
   ? publishRollingIncrement(rollingIncrementPublication) : reconcileRollingIncrementPublication(rollingIncrementPublication);
  if (rollingIncrementPublicationResult.state !== 'PUBLISHED') throw new Error(`rolling campaign: initial campaign base ${rollingIncrementPublicationResult.state}; preserve the checkout and observe the remote`);
  git(coordinatorRoot,['merge','--ff-only',rollingIncrementPublicationResult.remoteRevision]);
  const rollingManagedDirectory = resolveRollingManagedDirectory(coordinatorRoot);
  const rollingGraph = collectRollingGraph(coordinatorRoot,documentPath,bindingsPath,bindingHistory?.path);
  const rollingCampaignRegistration:RollingCampaignRegistration = {
   id:rollingGraph.document.scopeId,coordinatorRoot:rollingGraph.coordinatorRoot,documentPath,bindingsPath,graphDigest:rollingGraph.digest,
   managedDirectory:rollingManagedDirectory.directory,configuration:rollingResolvedConfiguration,
   ...(bindingHistory === null ? {} : {bindingHistory})
  };
  return this.rollingCampaignStore.registerCampaign(rollingCampaignRegistration);
 }

 reconcile(campaignId:string):Promise<RollingGraphReconciliation> { return this.rollingCampaignStore.reconcileCoordinator(campaignId); }
 status(campaignId:string):Promise<RollingCoordinatorSnapshot> { return this.rollingCampaignStore.coordinatorSnapshot(campaignId); }
 async nextActions(campaignId:string):Promise<RollingCoordinatorActions> { return projectRollingCoordinatorActions(await this.status(campaignId)); }

 // Traceability: implements REQ-ROLLING-SCHEDULING
 // A missed event and the periodic poll run the same fenced allocation path.
 async replenish(campaignId:string,trigger:RollingReplenishment['trigger'],rollingAssignmentRelease:RollingAssignmentRelease | null = null):Promise<RollingReplenishment> {
  const rollingGraphReconciliation = await this.reconcile(campaignId);
  const initialRollingCoordinatorSnapshot = await this.status(campaignId);
  const allocations:RollingAllocationResult[] = [];
  for (let index=0;index<initialRollingCoordinatorSnapshot.configuration.maxActiveWorkers;index++) {
   const rollingAllocationResult = await this.rollingCampaignStore.allocate(campaignId,rollingGraphReconciliation.graphDigest,index === 0 && rollingAssignmentRelease !== null ? rollingAssignmentRelease : undefined);
   if (rollingAllocationResult.assignment === null) break;
   allocations.push(rollingAllocationResult);
  }
  return {trigger,graphDigest:rollingGraphReconciliation.graphDigest,allocations,snapshot:await this.status(campaignId)};
 }
}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function withRollingCampaignOperations<Result>(root:string,operation:(rollingCampaignOperations:RollingCampaignOperations)=>Promise<Result>):Promise<Result> {
 const journal = readJson(fs.readFileSync(path.join(root,'ponytail-journal.json'),'utf8'));
 const project = record(journal);
 if (project.schemaVersion !== 1 || typeof project.projectId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(project.projectId)) throw new Error('rolling campaign: invoking project journal has no valid V1 identity');
 const pool = new Pool(databaseOptions(root));
 try {return await operation(new RollingCampaignOperations(new RollingCampaignStore(pool,project.projectId)));}
 finally {await pool.end();}
}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function runRollingOperationCli(argv:readonly string[]):Promise<void> {
 const [command,argument] = argv;
 if (command === undefined || command === '--help') {
  process.stdout.write('Usage: rolling-operations <init request.json|reconcile campaign|status campaign|next-actions campaign|replenish campaign>\n');
  return;
 }
 if (argv.length !== 2 || argument === undefined || argument.trim() === '') throw new Error('rolling campaign: command requires exactly one request path or campaign ID');
 const root = fs.realpathSync(process.cwd());
 const result = await withRollingCampaignOperations(root,async rollingCampaignOperations=> {
  switch (command) {
   case 'init': {
    const rollingCampaignInitializationV1 = parseRollingCampaignInitialization(fs.readFileSync(argument,'utf8'));
    if (fs.realpathSync(rollingCampaignInitializationV1.coordinatorRoot) !== root) throw new Error('rolling campaign: initialization root differs from the invoking project');
    return rollingCampaignOperations.initialize(rollingCampaignInitializationV1);
   }
   case 'reconcile': return rollingCampaignOperations.reconcile(argument);
   case 'status': return rollingCampaignOperations.status(argument);
   case 'next-actions': return rollingCampaignOperations.nextActions(argument);
   case 'replenish': return rollingCampaignOperations.replenish(argument,'periodic');
   default: throw new Error(`rolling campaign: unknown operation ${command}`);
  }
 });
 process.stdout.write(JSON.stringify(result)+'\n');
}
if (require.main === module) runRollingOperationCli(process.argv.slice(2)).catch((error:unknown)=> {
 process.stderr.write((error instanceof Error ? error.message : String(error))+'\n');process.exitCode=1;
});
