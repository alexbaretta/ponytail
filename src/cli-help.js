// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/cli-help.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliCommandRegistryV1 = exports.cliHelpCommands = void 0;
exports.renderCliHelp = renderCliHelp;
const rolling_cli_registry_js_1 = require("./rolling-cli-registry.js");
exports.cliHelpCommands = [
    { chapter: 'search', name: 'update-index', arguments: '[-j <n_workers>] [-n <commits_per_db_transaction>]', behavior: 'Fetch no remote data; index local Git history. -j controls workers; -n controls transaction checkpoint size. Interrupted updates resume completed checkpoints.' },
    { chapter: 'search', name: 'query', arguments: '<text> [--ref <ref> | --commit <commit-id> | --history <ref-or-commit>] [--path <path>] [-i|--ignore-case]', behavior: 'Search indexed file text at a ref, exact commit or throughout selected history. --path restricts paths; -i ignores case. No matches exits 1.' },
    { chapter: 'plan', name: 'search', arguments: '<query> [--lifecycle <lifecycle>] [--kind <kind>] [--plan <plan>] [--json]', behavior: 'Search project-managed plan records. Optional filters select lifecycle, record kind or owning plan; --json returns structured results.' },
    { chapter: 'plan', name: 'descendants', arguments: '<plan> [--direct] [--json]', behavior: 'Query descendants of the named plan. --direct restricts results to immediate children; --json returns structured results.' },
    { chapter: 'plan', name: 'ancestors', arguments: '<plan> [--json]', behavior: 'Query the named plan’s parent chain. --json returns structured results.' },
    { chapter: 'plan', name: 'roots', arguments: '[--json]', behavior: 'List root plans in the invoking project; --json returns structured results.' },
    { chapter: 'plan', name: 'stranded', arguments: '[--json]', behavior: 'Find plans whose parent lacks the required reciprocal membership link; --json returns structured results.' },
    { chapter: 'traceability', name: 'update-index', arguments: '[--batch-size <n>] [--rebuild] [--json]', behavior: 'Incrementally update project-owned traceability and plan indexes; unchanged rows are retained. --batch-size defaults to 10 files and controls durable parse checkpoints; --rebuild replaces the complete derived projection; --json reports structured results.' },
    { chapter: 'traceability', name: 'search', arguments: '<query> [--kind <kind>] [--role <role>] [--requirement <id>] [--path <path>] [--json]', behavior: 'Search indexed traceability relationships with artifact-kind, relationship-role, requirement and path filters.' },
    { chapter: 'traceability', name: 'validate', arguments: '[--plan <plan> | --campaign <plan>] [--json]', behavior: 'Validate traceability for the project or selected plan/campaign. The scope selectors are mutually exclusive; --json reports findings.' },
    { chapter: 'traceability', name: 'completeness', arguments: '[--campaign <name>] [--assessment-tag <tag> | --requirement <id> ...] [--json] [--verbose]', behavior: 'Display only the campaign completeness vector by default; --verbose adds unresolved IDs and findings. Early progress goes to stderr; --json emits the complete report without progress. Read committed V5 configuration and sources from the annotated assessment tag target. Explicit tags may assess older commits; automatic selection and unassessed requirement scope use HEAD. Local edits are excluded and preserved. No database or tracked ledger; zero remains provisional pending final QA.' },
    { chapter: 'plan-input', name: 'coordinate', arguments: '<plan>', behavior: 'Acquire the campaign coordinator’s input-queue ownership for the named plan.' },
    { chapter: 'plan-input', name: 'release', arguments: '<plan>', behavior: 'Release the invoking coordinator’s ownership of the named input queue.' },
    { chapter: 'plan-input', name: 'list', arguments: '<plan> [--json]', behavior: 'Inspect the coordinator’s pending input queue; --json returns structured entries.' },
    { chapter: 'plan-input', name: 'claim', arguments: '<plan> [--json]', behavior: 'Claim the next pending input as the authorized coordinator; --json returns its identity and instruction.' },
    { chapter: 'plan-input', name: 'complete', arguments: '<plan> <id> --record <pm-path>...', behavior: 'Complete the claimed input by its exact ID. Repeat --record for repository-relative management records recording its disposition.' },
    { chapter: 'worktree', name: 'reclaim', arguments: '[--dry-run] [--json]', behavior: 'Use the invoking project’s lifecycle adapter to reclaim proven abandoned checkouts. --dry-run reports without cleanup; --json returns structured findings.' },
    { chapter: 'rebase', name: 'diff', arguments: '<target> [--output <file>]', behavior: 'Freeze both branch tips and their merge base, then emit one aggregate final-state review stream with stable source and target change IDs. Performs no semantic inference or product validation.' },
    { chapter: 'rebase', name: 'run', arguments: '<target> --conflicts <selection-file>', behavior: 'Validate the frozen analysis and agent selection, then replay automatically until a selected contributor or unexpected Git conflict.' },
    { chapter: 'rebase', name: 'status', arguments: '', behavior: 'Report the worktree-local analysis or retained replay and reprint the current stop dossier.' },
    { chapter: 'rebase', name: 'continue', arguments: '', behavior: 'Continue the retained replay after review. A resolution outside the current selected lineage emits a residual review and remains stopped.' },
    { chapter: 'rebase', name: 'abort', arguments: '', behavior: 'Abort an active retained replay and verify restoration of the exact frozen source tip.' },
    { chapter: 'pm', name: 'pdf', arguments: '<collection|all> [--output-dir <path>]', behavior: 'Render the configured linked Markdown collections with Pandoc/XeLaTeX. --output-dir selects the destination; collection names come from project configuration.' },
    ...[
        ['register', '', 'Register the invoking Git repository in Ponytail’s user configuration.'],
        ['unregister', '<repository-root>', 'Remove the specified registered repository identity.'],
        ['list-projects', '', 'List registered projects.'],
        ['bless', '', 'Select the invoking checkout as its project’s blessed configuration owner.'],
        ['bless-worktree', '', 'Select the invoking checkout as its project’s blessed configuration owner.'],
        ['blessed', '', 'Display the project’s blessed checkout.'],
        ['blessed-worktree', '', 'Display the project’s blessed checkout.'],
        ['register-component', '<name>', 'Register a component owned by the invoking project.'],
        ['unregister-component', '<name>', 'Remove the named component registration.'],
        ['list-components', '', 'List components of the invoking project.'],
        ['register-dependency', '<project>', 'Register a dependency on the specified project.'],
        ['unregister-dependency', '<project>', 'Remove the specified project dependency.'],
        ['list-dependencies', '', 'List the invoking project’s registered dependencies.'],
        ['detect-components', '[--language typescript|javascript|auto]', 'Detect JavaScript/TypeScript components. --language selects the detector; auto detects either language.'],
        ['pre-commit', '', 'Install the project’s pre-commit QA hook.'],
        ['validate', '[--all]', 'Validate local setup. --all explicitly validates all registered projects; this does not run integration tests.'],
        ['qa', '[references]', 'Run local reference and policy QA. Optional references restrict the selection; no integration suite is run.'],
        ['update-skills', '[--check] [--dry-run]', 'Update installed Codex skills from the configured Ponytail source. --check checks installation; --dry-run previews actions.'],
        ['update-permissions', '[--accept <digest>] [--dry-run] [--check] [--restore]', 'Update project Codex permissions. --accept authorizes the exact proposal digest; --dry-run previews, --check validates, and --restore restores the retained policy. Project roots come from the invoking checkout.'],
        ['update', '', 'Update installed skills and project Codex permissions.']
    ].map(([name, arguments_, behavior]) => {
        if (name === undefined || arguments_ === undefined || behavior === undefined)
            throw new Error('invalid CLI help definition');
        return { chapter: '', name, arguments: arguments_, behavior };
    })
];
function cliHelpText(argv) {
    const separator = argv.indexOf('--');
    const args = (separator < 0 ? argv : argv.slice(0, separator)).filter(argument => argument !== '--help' && argument !== '-h');
    const [chapter, command] = args;
    if (chapter === 'campaign')
        return (0, rolling_cli_registry_js_1.rollingCampaignHelp)(rolling_cli_registry_js_1.rollingCommandDefinitions.some(item => item.cli && item.name === command) ? command : undefined);
    if (chapter === undefined || chapter === 'help') {
        const chapters = [...new Set(exports.cliHelpCommands.map(item => item.chapter).filter(Boolean))];
        return 'Usage: ponytail <chapter|command> [arguments]\n\nChapters:\n'
            + ['campaign', ...chapters].map(name => `  ponytail ${name} <command> --help`).join('\n')
            + '\n\nUtility commands:\n' + exports.cliHelpCommands.filter(item => item.chapter === '').map(item => `  ponytail ${item.name} ${item.arguments}`).join('\n')
            + '\n\nUse ponytail <chapter> --help or ponytail <command> --help for behavior and arguments.\n';
    }
    const chapterCommands = exports.cliHelpCommands.filter(item => item.chapter === chapter);
    if (chapterCommands.length > 0 && !chapterCommands.some(item => item.name === command))
        return `Usage: ponytail ${chapter} <command> [arguments]\n\n`
            + chapterCommands.map(item => `  ${item.name} ${item.arguments}\n    ${item.behavior}`).join('\n')
            + (chapter === 'plan-input' ? '\n\nEnqueue input: ponytail plan-input <plan> -- <instruction>\nThe instruction after -- is queued verbatim; help does not consume or modify the queue.' : '')
            + '\n\nUse each command’s --help for its arguments.\n';
    const cliHelpCommand = exports.cliHelpCommands.find(item => item.chapter === chapter && item.name === command
        || item.chapter === '' && item.name === chapter);
    if (!cliHelpCommand)
        return cliHelpText([]);
    return `Usage: ponytail ${cliHelpCommand.chapter ? cliHelpCommand.chapter + ' ' : ''}${cliHelpCommand.name} ${cliHelpCommand.arguments}\n\n${cliHelpCommand.behavior}\n\n--help, -h: Show this message without performing any command operation.\n`;
}
function renderCliHelp(argv, width = process.stdout.columns || process.stderr.columns || 80) {
    const columns = Number.isSafeInteger(width) && width > 0 ? width : 80;
    return cliHelpText(argv).split('\n').flatMap(line => {
        const leading = line.match(/^ */u)?.[0] ?? '';
        const indent = (line.startsWith('Usage:') ? '  ' : leading).slice(0, Math.max(0, columns - 1));
        const lines = [];
        let remaining = line;
        while (remaining.length > columns) {
            let split = remaining.lastIndexOf(' ', columns);
            if (split <= indent.length)
                split = columns;
            lines.push(remaining.slice(0, split).trimEnd());
            remaining = indent + remaining.slice(split).trimStart();
        }
        lines.push(remaining);
        return lines;
    }).join('\n');
}
exports.cliCommandRegistryV1 = { schemaVersion: 1,
    rootCommands: exports.cliHelpCommands.filter(item => item.chapter === '').map(item => item.name),
    chapters: { ...Object.fromEntries([...new Set(exports.cliHelpCommands.map(item => item.chapter).filter(Boolean))].map(chapter => [
            chapter, { commands: exports.cliHelpCommands.filter(item => item.chapter === chapter).map(item => item.name), freeform: chapter === 'plan-input' },
        ])), campaign: { commands: rolling_cli_registry_js_1.rollingCommandDefinitions.filter(item => item.cli).map(item => item.name), freeform: false } },
};
if (require.main === module)
    process.stdout.write(renderCliHelp(process.argv.slice(2)));
