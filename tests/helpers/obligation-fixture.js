// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from tests/helpers/obligation-fixture.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.git = git;
exports.fixture = fixture;
exports.certificateFixture = certificateFixture;
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const obligations_js_1 = require("../../skills/plan-execution/scripts/obligations.js");
function git(root, args) {
    const result = (0, node_child_process_1.spawnSync)('git', ['-C', root, ...args], { encoding: 'utf8' });
    strict_1.default.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
function fixture(testContext) {
    const root = node_fs_1.default.realpathSync(node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'ponytail-obligation-consumer-')));
    testContext.after(() => node_fs_1.default.rmSync(root, { recursive: true, force: true }));
    const documentPath = 'pm/plans/in_progress/pilot/obligations.json';
    const planPath = 'pm/plans/in_progress/pilot/plan.md';
    const sprintPath = 'pm/plans/in_progress/pilot/sprints/S01.md';
    node_fs_1.default.mkdirSync(node_path_1.default.join(root, node_path_1.default.dirname(sprintPath)), { recursive: true });
    node_fs_1.default.mkdirSync(node_path_1.default.join(root, '.agents/config/project'), { recursive: true });
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, '.agents/config/project/management.json'), node_fs_1.default.readFileSync(node_path_1.default.join(process.cwd(), '.agents/config/project/management.json')));
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, 'requirement.md'), 'approved observable behavior');
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, 'src.txt'), 'implementation input');
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, '.gitignore'), 'state/\ncandidate.json\n');
    const proofPath = 'pm/plans/in_progress/pilot/proof.txt';
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, proofPath), 'inspected category with no omitted responsibilities');
    const campaignPlanMetadataV3 = { schemaVersion: 3, id: 'pilot', parent_plan_id: null,
        depends_on: [], obligation_document: documentPath };
    const planText = `# Pilot\n\n- Plan ID: \`pilot\`\n- **Status:** \`in_progress\`\n\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV3)}\n-->\n`;
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, planPath), planText);
    const sprintMetadataV3 = { schemaVersion: 3, id: 'S01', planning: {
            status: 'APPROVED', depends_on: [], scope_roots: ['src.txt']
        }, execution: {
            status: 'IN_PROGRESS', depends_on: [], tasklets_reviewed: true
        } };
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, sprintPath), `# Sprint\n\n<!-- ponytail-plan-sprint\n${JSON.stringify(sprintMetadataV3)}\n-->\n\n### [ ] Tasklet S01-F01-T01: Edit input\n\n### [ ] Tasklet S01-F01-T02: Validate feature\n`);
    const taskletMetadataV4 = { schemaVersion: 4, sprint: 'S01', features: {
            'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T02' }
        }, tasklets: {
            'S01-F01-T01': { depends_on: [], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: ['src.txt'] },
            'S01-F01-T02': { depends_on: ['S01-F01-T01'], affinity: [], risk: 'normal', feature: 'S01-F01', planned_paths: [] }
        }, external_depends_on: {} };
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, sprintPath.replace('.md', '.tasklets.json')), JSON.stringify(taskletMetadataV4));
    const obligationBaseline = { id: 'B1', predecessorId: null,
        authority: { references: ['approved-CHNG'], assessors: ['coordinator'] }, requirements: [
            { id: 'REQ-PILOT', path: 'requirement.md', digest: (0, obligations_js_1.inputDigest)(root, 'requirement.md') }
        ],
        obligationIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'], inventoryIds: ['OBL-1', 'OBL-2', 'OBL-3', 'OBL-4', 'OBL-5', 'OBL-6'] };
    const categories = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'];
    const obligationDocumentV1 = { schemaVersion: 1, scopeId: 'pilot', baselines: [obligationBaseline],
        obligations: categories.map((category, index) => ({ id: `OBL-${index + 1}`, category, requirementIds: ['REQ-PILOT'],
            responsibilityId: `${category}-inventory`, condition: `Complete ${category} inventory`,
            criterion: 'Reviewed complete scope with justified exclusions', dependsOn: [], acceptanceGroups: ['pilot'], supersedes: null,
            execution: { sprintId: index === 0 ? 'S01' : null, taskletIds: index === 0 ? ['S01-F01-T01'] : [],
                plannedPaths: index === 0 ? ['src.txt'] : [], operations: ['inspect'], selection: [], target: null } })), certificates: [], checkpoints: [] };
    const candidateObligationDocumentV1 = { ...obligationDocumentV1, checkpoints: [{
                id: 'CP1', predecessorId: null, baselineId: 'B1', kind: 'initial', selectedIds: [],
                registeredIds: obligationBaseline.obligationIds, certificateIds: [], invalidatedIds: [], before: [1, 1, 1, 1, 1, 1], after: [1, 1, 1, 1, 1, 1],
                preparation: null, reason: 'Complete declared initial scope', assessor: 'coordinator'
            }] };
    const acceptedObligationDocumentV1 = (0, obligations_js_1.acceptCheckpoint)(obligationDocumentV1, candidateObligationDocumentV1, root);
    node_fs_1.default.writeFileSync(node_path_1.default.join(root, documentPath), JSON.stringify(acceptedObligationDocumentV1));
    git(root, ['init', '-b', 'main']);
    git(root, ['config', 'user.email', 'fixture@example.test']);
    git(root, ['config', 'user.name', 'Fixture']);
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'Initial scoped fixture']);
    const environment = { ...process.env, PONYTAIL_SESSION_ID: 'coordinator', PONYTAIL_CAMPAIGN_STATE_DIR: node_path_1.default.join(root, 'state') };
    return { root, documentPath, planPath, planText, sprintPath, document: acceptedObligationDocumentV1, proofPath, environment };
}
function certificateFixture(testContext) {
    const obligationFixture = fixture(testContext);
    const obligationCertificate = { id: 'CERT-ACTIVE', obligationIds: ['OBL-1'],
        inputs: (0, obligations_js_1.createObligationGitInputs)(obligationFixture.root, ['requirement.md', obligationFixture.proofPath]),
        artifacts: [obligationFixture.proofPath], assessor: 'coordinator', authority: ['approved-CHNG'], adequate: true,
        reason: 'Complete bounded inventory', disposition: null, evidence: [], inventoryIds: [] };
    const candidateObligationDocumentV1 = { ...obligationFixture.document, certificates: [obligationCertificate],
        checkpoints: [...obligationFixture.document.checkpoints, { id: 'CP2', predecessorId: 'CP1', baselineId: 'B1', kind: 'productive',
                selectedIds: ['OBL-1'], registeredIds: [], certificateIds: [obligationCertificate.id], invalidatedIds: [],
                before: [1, 1, 1, 1, 1, 1], after: [0, 1, 1, 1, 1, 1], preparation: null, reason: 'Accept inspected inventory', assessor: 'coordinator' }] };
    const acceptedObligationDocumentV1 = (0, obligations_js_1.acceptCheckpoint)(obligationFixture.document, candidateObligationDocumentV1, obligationFixture.root);
    node_fs_1.default.writeFileSync(node_path_1.default.join(obligationFixture.root, 'inactive-proof.txt'), 'inactive evidence');
    const inactiveObligationCertificate = { ...obligationCertificate, id: 'CERT-INACTIVE',
        inputs: [{ path: 'inactive-proof.txt', digest: (0, obligations_js_1.inputDigest)(obligationFixture.root, 'inactive-proof.txt') }], artifacts: ['inactive-proof.txt'] };
    const obligationDocumentV1 = { ...acceptedObligationDocumentV1, certificates: [...acceptedObligationDocumentV1.certificates, inactiveObligationCertificate] };
    node_fs_1.default.writeFileSync(node_path_1.default.join(obligationFixture.root, obligationFixture.documentPath), JSON.stringify(obligationDocumentV1));
    node_fs_1.default.writeFileSync(node_path_1.default.join(obligationFixture.root, 'ponytail-journal.json'), JSON.stringify({ schemaVersion: 1,
        projectId: '019c0000-0000-7000-8000-000000000001', projectName: 'fixture', database: { name: 'ponytail' } }));
    return { ...obligationFixture, document: obligationDocumentV1 };
}
