// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {parseValidationJson,readValidationRequestV1,readValidationCertificateV1,readValidationRevocationV1,type ValidationRequestV1,type ValidationCertificateV1,type ValidationRevocationV1,type ValidationCommand,type ValidationCommandResult} from './validation-certificate.js';

export interface ValidationTag {
 readonly name: string;
 readonly objectId: string;
 readonly certificate: ValidationCertificateV1;
}
export interface ValidationRevocationTag {
 readonly name: string;
 readonly objectId: string;
 readonly revocation: ValidationRevocationV1;
}
export interface ValidationTagInspection {
 readonly tag: ValidationTag;
 readonly revocations: readonly ValidationRevocationTag[];
}
export interface ValidationRun {
 readonly runId: string;
 readonly startedAt: string;
 readonly finishedAt: string;
 readonly results: readonly ValidationCommandResult[];
 readonly outcome: 'passed' | 'failed' | 'cancelled';
 readonly outputDirectory: string;
 readonly tag: ValidationTag | null;
}
function git(root: string, argv: readonly string[], input?: string): string {
 const result = spawnSync('git',['-C',root,...argv],{encoding:'utf8',maxBuffer:64*1024*1024,...(input === undefined ? {} : {input})});
 if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.trim() || `git ${argv[0]} failed`);
 return result.stdout;
}
function repositoryRoot(root: string): string {
 const realRoot = fs.realpathSync(root);
 if (fs.realpathSync(git(realRoot,['rev-parse','--show-toplevel']).trim()) !== realRoot) throw new Error('Validation requires the invoking repository root');
 return realRoot;
}
function assertCandidate(root: string, candidate: string): void {
 if (git(root,['rev-parse','HEAD']).trim() !== candidate || git(root,['cat-file','-t',candidate]).trim() !== 'commit') throw new Error('Validation candidate is not the current HEAD commit');
 if (git(root,['ls-files','-v','-z']).split('\0').some(line => line && line[0] !== 'H')) throw new Error('Validation refuses hidden or unmerged index entries');
 if (git(root,['status','--porcelain=v1','--untracked-files=all','--ignore-submodules=none']).length) throw new Error('Validation requires a clean index and worktree, including untracked source');
}
function certificateTagName(validationCertificateV1: ValidationCertificateV1): string {
 return `ponytail/validation/${validationCertificateV1.request.campaignId}/${validationCertificateV1.runId}`;
}
function tagName(name: string): string {
 if (!/^ponytail\/validation\/[a-z0-9][a-z0-9-]*\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(name)) throw new Error('Invalid validation tag name');
 return name;
}

function readAnnotatedTag(root: string, name: string): {readonly objectId:string;readonly candidate:string;readonly payload:unknown} {
 const ref = `refs/tags/${name}`;
 const objectId = git(root,['rev-parse','--verify',ref]).trim();
 if (git(root,['cat-file','-t',objectId]).trim() !== 'tag') throw new Error('Validation certificate requires an annotated tag');
 const text = git(root,['cat-file','tag',objectId]);
 const separator = text.indexOf('\n\n');
 if (separator < 0) throw new Error('Malformed annotated validation tag');
 const headers = text.slice(0,separator).split('\n');
 const candidate = headers[0]?.slice('object '.length);
 if (!headers[0]?.startsWith('object ') || !candidate || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(candidate)
  || headers[1] !== 'type commit' || headers[2] !== `tag ${name}` || headers.length !== 4 || !headers[3]?.startsWith('tagger ')) throw new Error('Malformed annotated validation tag headers');
 if (git(root,['cat-file','-t',candidate]).trim() !== 'commit') throw new Error('Validation tag target is not a commit');
 return {objectId,candidate,payload:parseValidationJson(text.slice(separator+2))};
}
function readCertificateTag(root: string, name: string): ValidationTag {
 const annotatedTag = readAnnotatedTag(root,tagName(name));
 const validationCertificateV1 = readValidationCertificateV1(annotatedTag.payload);
 if (annotatedTag.candidate !== validationCertificateV1.request.candidate || certificateTagName(validationCertificateV1) !== name) throw new Error('Validation tag target, name and payload identity disagree');
 const objectId = annotatedTag.objectId;
 return {name,objectId,certificate:validationCertificateV1};
}
function namesInCampaign(root: string, campaignId: string): readonly string[] {
 if (!/^[a-z0-9][a-z0-9-]*$/u.test(campaignId)) throw new Error('Invalid campaign ID');
 return git(root,['for-each-ref','--format=%(refname:strip=2)',`refs/tags/ponytail/validation/${campaignId}/`]).trim().split('\n')
  .filter(Boolean);
}
function readRevocationTag(root: string, name: string): ValidationRevocationTag {
 const annotatedTag = readAnnotatedTag(root,name);
 const validationRevocationV1 = readValidationRevocationV1(annotatedTag.payload);
 if (name !== `ponytail/validation/${validationRevocationV1.campaignId}/revocations/${validationRevocationV1.revocationId}` || annotatedTag.candidate !== validationRevocationV1.candidate) throw new Error('Revocation tag target, name and payload identity disagree');
 const validationTag = readCertificateTag(root,validationRevocationV1.revokedTag);
 if (validationTag.objectId !== validationRevocationV1.revokedObjectId || validationTag.certificate.request.candidate !== validationRevocationV1.candidate) throw new Error('Revocation does not bind the original certificate object and candidate');
 return {name,objectId:annotatedTag.objectId,revocation:validationRevocationV1};
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation inspectValidationTag
export function inspectValidationTag(root: string, name: string): ValidationTagInspection {
 const validationTag = readCertificateTag(root,name);
 const campaignId = validationTag.certificate.request.campaignId;
 const revocations = namesInCampaign(root,campaignId).filter(candidate => candidate.startsWith(`ponytail/validation/${campaignId}/revocations/`))
  .map(candidate => readRevocationTag(root,candidate)).filter(tag => tag.revocation.revokedTag === name);
 return {tag:validationTag,revocations};
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation readValidationTag
export function readValidationTag(root: string, name: string): ValidationTag {
 const validationTagInspection = inspectValidationTag(root,name);
 if (validationTagInspection.revocations.length) throw new Error(`Validation certificate is revoked: ${name}`);
 return validationTagInspection.tag;
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation listValidationTags
export function listValidationTags(root: string, campaignId: string): readonly ValidationTagInspection[] {
 return namesInCampaign(root,campaignId).filter(name => !name.startsWith(`ponytail/validation/${campaignId}/revocations/`))
  .map(name => inspectValidationTag(root,name));
}
function createAnnotatedTag(root: string, name: string, candidate: string, payload: string, verificationRef: string, expectedObject: string): void {
 const tagger = git(root,['var','GIT_COMMITTER_IDENT']).trim();
 const objectId = git(root,['mktag'],`object ${candidate}\ntype commit\ntag ${name}\ntagger ${tagger}\n\n${payload}\n`).trim();
 if (verificationRef === 'HEAD') assertCandidate(root,expectedObject);
 git(root,['update-ref','--stdin'],`start\nverify ${verificationRef} ${expectedObject}\ncreate refs/tags/${name} ${objectId}\nprepare\ncommit\n`);
}
function publishValidationTag(root: string, validationCertificateV1: ValidationCertificateV1): ValidationTag {
 const checkedValidationCertificateV1 = readValidationCertificateV1(validationCertificateV1);
 const name = certificateTagName(checkedValidationCertificateV1);
 const candidate = checkedValidationCertificateV1.request.candidate;
 createAnnotatedTag(root,name,candidate,JSON.stringify(checkedValidationCertificateV1),'HEAD',candidate);
 return readValidationTag(root,name);
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation revokeValidationTag
export function revokeValidationTag(root: string, name: string, reason: string): ValidationRevocationTag {
 root = repositoryRoot(root);
 const validationTag = readCertificateTag(root,name);
 const validationRevocationV1 = readValidationRevocationV1({schemaVersion:1,revocationId:randomUUID(),campaignId:validationTag.certificate.request.campaignId,
  candidate:validationTag.certificate.request.candidate,revokedTag:name,revokedObjectId:validationTag.objectId,reason,createdAt:new Date().toISOString()});
 const revocationName = `ponytail/validation/${validationRevocationV1.campaignId}/revocations/${validationRevocationV1.revocationId}`;
 createAnnotatedTag(root,revocationName,validationRevocationV1.candidate,JSON.stringify(validationRevocationV1),`refs/tags/${name}`,validationTag.objectId);
 return readRevocationTag(root,revocationName);
}
function signalProcess(pid: number, signal: NodeJS.Signals): void {
 try { process.kill(process.platform === 'win32' ? pid : -pid,signal); }
 catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error; }
}
async function runCommand(root: string, validationCommand: ValidationCommand, output: string, abortSignal?: AbortSignal): Promise<ValidationCommandResult> {
 if (abortSignal?.aborted) return {startedAt:null,finishedAt:null,termination:{kind:'not-run'}};
 const executable = validationCommand.argv[0];
 if (!executable) throw new Error('Missing validation executable');
 const startedAt = new Date().toISOString();
 const descriptor = fs.openSync(output,'wx');
 try {
  const childProcess = spawn(executable,validationCommand.argv.slice(1),{cwd:root,detached:process.platform !== 'win32',stdio:['ignore',descriptor,descriptor]});
  let errorMessage: string | null = null;
  let cancellation: Promise<void> | null = null;
  const abort = (): void => {
   const pid = childProcess.pid;
   if (pid === undefined || cancellation !== null) return;
   signalProcess(pid,'SIGTERM');
   cancellation = new Promise(resolve => { setTimeout(() => { signalProcess(pid,'SIGKILL');resolve(); },1000); });
  };
  abortSignal?.addEventListener('abort',abort,{once:true});
  if (abortSignal?.aborted) abort();
  const validationCommandResult = await new Promise<ValidationCommandResult>(resolve => {
   childProcess.on('error',error => { errorMessage=error.message; });
   childProcess.on('close',(code,signal) => {
    const finishedAt = new Date().toISOString();
    if (errorMessage !== null) resolve({startedAt,finishedAt,termination:{kind:'error',message:errorMessage}});
    else if (signal !== null) resolve({startedAt,finishedAt,termination:{kind:'signal',signal}});
    else if (code !== null) resolve({startedAt,finishedAt,termination:{kind:'exit',code}});
    else resolve({startedAt,finishedAt,termination:{kind:'error',message:'Command closed without exit or signal'}});
   });
  });
  abortSignal?.removeEventListener('abort',abort);
  await cancellation;
  return validationCommandResult;
 } finally { fs.closeSync(descriptor); }
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation runValidation
export async function runValidation(root: string, request: ValidationRequestV1, abortSignal?: AbortSignal): Promise<ValidationRun> {
 const validationRequestV1 = readValidationRequestV1(request);
 root = repositoryRoot(root);
 assertCandidate(root,validationRequestV1.candidate);
 const runId = randomUUID();
 const outputDirectory = path.join(git(root,['rev-parse','--absolute-git-dir']).trim(),'ponytail-validation',runId);
 fs.mkdirSync(outputDirectory,{recursive:true});
 const startedAt = new Date().toISOString();
 const results: ValidationCommandResult[] = [];
 for (const [index,validationCommand] of validationRequestV1.commands.entries()) {
  results.push(await runCommand(root,validationCommand,path.join(outputDirectory,`${index+1}.log`),abortSignal));
  assertCandidate(root,validationRequestV1.candidate);
 }
 const finishedAt = new Date().toISOString();
 const outcome = abortSignal?.aborted ? 'cancelled' : results.every(result => result.termination.kind === 'exit' && result.termination.code === 0) ? 'passed' : 'failed';
 let validationTag: ValidationTag | null = null;
 if (outcome === 'passed' || (outcome === 'failed' && validationRequestV1.recordFailure)) {
  validationTag = publishValidationTag(root,{schemaVersion:1,runId,request:validationRequestV1,startedAt,finishedAt,results,outcome});
 }
 return {runId,startedAt,finishedAt,results,outcome,outputDirectory,tag:validationTag};
}
