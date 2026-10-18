// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {parseValidationJson,readValidationRequestV1,readValidationCertificateV1,type ValidationCertificateV1,type ValidationTermination} from '../src/validation-certificate.js';

function certificate(): ValidationCertificateV1 {
 return {
  schemaVersion:1,runId:'5c525fe4-280f-4cff-929e-ab8709b0b839',
  request:{schemaVersion:1,campaignId:'campaign-a',candidate:'a'.repeat(40),purpose:'focused',coveredIds:['OBL-A','ACC-A','TEST-A'],
   commands:[{argv:['node','--test','tests/a.js'],testIds:['TEST-A']}],
   reviews:[{reviewer:'session-review',candidate:'a'.repeat(40),coveredIds:['OBL-A','ACC-A','TEST-A'],verdict:'adequate',reference:'host-review:verdict-1'}],recordFailure:false},
  startedAt:'2026-10-18T01:00:00.000Z',finishedAt:'2026-10-18T01:00:01.000Z',
  results:[{startedAt:'2026-10-18T01:00:00.000Z',finishedAt:'2026-10-18T01:00:01.000Z',termination:{kind:'exit',code:0}}],outcome:'passed',
 };
}

// Traceability: verifies ACC-CM-CERTIFICATES from unit-test TEST-CM-CERTIFICATE-ROUNDTRIP
test('certificate round trips its exact request, reviewed scope and observed result', () => {
 const validationCertificateV1: ValidationCertificateV1 = certificate();
 assert.deepEqual(readValidationCertificateV1(parseValidationJson(JSON.stringify(validationCertificateV1))),validationCertificateV1);
 assert.deepEqual(readValidationRequestV1(validationCertificateV1.request),validationCertificateV1.request);
});

// Traceability: verifies ACC-CM-CERTIFICATES from unit-test TEST-CM-CERTIFICATE-NO-FALSE-PASS
test('failed, signalled, unstarted or omitted commands cannot produce passing certificates', () => {
 const validationCertificateV1: ValidationCertificateV1 = certificate();
 const terminations: readonly ValidationTermination[] = [{kind:'exit',code:1},{kind:'signal',signal:'SIGTERM'},{kind:'error',message:'Executable not found'},{kind:'not-run'}];
 for (const validationTermination of terminations) {
  const results = [{startedAt:validationTermination.kind === 'not-run' ? null : validationCertificateV1.startedAt,
   finishedAt:validationTermination.kind === 'not-run' ? null : validationCertificateV1.finishedAt,termination:validationTermination}];
  assert.throws(() => readValidationCertificateV1({...validationCertificateV1,results}),/contradicts/);
  assert.throws(() => readValidationCertificateV1({...validationCertificateV1,results,outcome:'failed'}),/not requested/);
  assert.equal(readValidationCertificateV1({...validationCertificateV1,request:{...validationCertificateV1.request,recordFailure:true},results,outcome:'failed'}).outcome,'failed');
 }
 assert.throws(() => readValidationCertificateV1({...validationCertificateV1,results:[]}),/Every requested command/);
 assert.throws(() => readValidationCertificateV1({...validationCertificateV1,outcome:'failed'}),/contradicts/);
});

// Traceability: verifies ACC-CM-CERTIFICATES from unit-test TEST-CM-CERTIFICATE-REVIEW-SCOPE
test('passing certificates cannot borrow stale, partial or inadequate reviews', () => {
 const validationCertificateV1: ValidationCertificateV1 = certificate();
 const review = validationCertificateV1.request.reviews[0];
 assert.ok(review);
 for (const reviews of [[],[{...review,coveredIds:['OBL-A']}],[{...review,verdict:'inadequate'}],[{...review,candidate:'b'.repeat(40)}]]) {
  assert.throws(() => readValidationCertificateV1({...validationCertificateV1,request:{...validationCertificateV1.request,reviews}}),/review|Review/);
 }
 assert.throws(() => readValidationRequestV1({...validationCertificateV1.request,commands:[{argv:['node'],testIds:['TEST-UNCLAIMED']}]}),/coveredIds/);
});

// Traceability: verifies ACC-CM-CERTIFICATES from unit-test TEST-CM-CERTIFICATE-EXACT-CONTRACT
test('exact readers reject unsupported fields, malformed identities and incoherent timing', () => {
 const validationCertificateV1: ValidationCertificateV1 = certificate();
 for (const request of [
  {...validationCertificateV1.request,schemaVersion:2}, {...validationCertificateV1.request,extra:true},
  {...validationCertificateV1.request,candidate:'HEAD'}, {...validationCertificateV1.request,campaignId:'../other'},
  {...validationCertificateV1.request,coveredIds:['OBL-A','OBL-A']}, {...validationCertificateV1.request,commands:[]},
  {...validationCertificateV1.request,commands:[{argv:[],testIds:[]}]},
 ]) assert.throws(() => readValidationRequestV1(request));
 for (const value of [
  {...validationCertificateV1,extra:true}, {...validationCertificateV1,runId:'not-a-run'},
  {...validationCertificateV1,startedAt:'2026-02-30T01:00:00.000Z'},
  {...validationCertificateV1,finishedAt:'2026-10-18T00:59:00.000Z'},
  {...validationCertificateV1,results:[{startedAt:validationCertificateV1.startedAt,finishedAt:'2026-10-18T01:00:02.000Z',termination:{kind:'exit',code:0}}]},
 ]) assert.throws(() => readValidationCertificateV1(value));
});

// Traceability: verifies ACC-CM-CERTIFICATES from unit-test TEST-CM-CERTIFICATE-NUMBERS
test('raw validation JSON rejects numeric rounding and unsafe integer tokens', () => {
 for (const token of ['1.0000000000000001','9007199254740993','1e100','-1','0.1']) assert.throws(() => parseValidationJson(`{"schemaVersion":${token}}`),/Unsupported validation number/);
 assert.deepEqual(parseValidationJson('{"schemaVersion":1}'),{schemaVersion:1});
});
