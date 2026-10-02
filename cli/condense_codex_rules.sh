#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2026 Alex Baretta. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root.
# Traceability: implements REQ-PONYTAIL-PROJECT-ISOLATION

main() {
  local python_source=''
  local status=0

  IFS= read -r -d '' python_source <<'PYTHON' || true
import argparse
import ast
import fcntl
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_POLICY = Path(".agents/config/codex-execpolicy.json")


def fail(message):
    raise ValueError(message)


def rule(pattern, decision, justification, source):
    return {"pattern": pattern, "decision": decision, "justification": justification, "sources": [source]}


def baseline(home):
    source = "ponytail:baseline-v1"
    values = [
        (["git", "add"], "allow", "Stage working-tree changes"),
        (["git", "apply", "--cached"], "allow", "Apply a patch only to the Git index"),
        (["git", "checkout-index", "-f", "--"], "allow", "Restore listed working-tree files from the index"),
        (["git", "commit"], "allow", "Create local commits"),
        (["git", "diff", "--cached", "--check"], "allow", "Check staged whitespace errors"),
        (["git", "diff", "--cached", "--stat"], "allow", "Summarize staged changes"),
        (["git", "reset", "--"], "allow", "Unstage explicitly listed paths"),
        (["git", "restore", "--staged", "--"], "allow", "Unstage explicitly listed paths"),
        (["git", "push", "--force"], "forbidden", "Use an explicitly reviewed --force-with-lease command"),
        (["git", "push", "-f"], "forbidden", "Use an explicitly reviewed --force-with-lease command"),
        (["git", "reset", "--hard"], "forbidden", "Preserve working-tree changes and use a path-scoped operation"),
        (["git", "rebase", "--exec"], "forbidden", "Run required commands separately under their own policy"),
        (["git", "rebase", "-x"], "forbidden", "Run required commands separately under their own policy"),
        ([str(home / ".local/bin/project_journal.sh"), ["init", "start", "over"]], "allow", "Allow fixed Ponytail journal database operations"),
    ]
    for options in (("-rf",), ("-fr",), ("--recursive", "--force"), ("--force", "--recursive")):
        for target in ("/", str(home), str(home) + "/", "~", "~/"):
            values.append((["rm", *options, target], "forbidden", "Never recursively force-delete the filesystem root or user home"))
    return [rule(*value, source) for value in values]


def exact_keys(value, expected, label):
    if not isinstance(value, dict) or set(value) != set(expected):
        fail(f"{label} must contain exactly: {', '.join(sorted(expected))}")


def pattern(value, label):
    if not isinstance(value, list) or not value:
        fail(f"{label} must be a nonempty array")
    normalized = []
    for index, token in enumerate(value):
        if isinstance(token, str) and token:
            normalized.append(token)
        elif isinstance(token, list) and token and all(isinstance(item, str) and item for item in token) and len(token) == len(set(token)):
            normalized.append(sorted(token))
        else:
            fail(f"{label}[{index}] must be a nonempty string or unique string array")
    return normalized


def proposal_entry(value, safe, source, label):
    expected = {"pattern", "justification"} if safe else {"pattern", "decision", "justification"}
    exact_keys(value, expected, label)
    decision = "allow" if safe else value["decision"]
    if decision not in ({"allow"} if safe else {"prompt", "forbidden"}):
        fail(f"{label}.decision is invalid")
    if not isinstance(value["justification"], str) or not value["justification"].strip():
        fail(f"{label}.justification must be a nonempty string")
    return rule(pattern(value["pattern"], f"{label}.pattern"), decision, value["justification"], source)


def read_project(root, canonical_root=None):
    root = root.expanduser().resolve()
    canonical_root = (canonical_root or root).expanduser().resolve()
    policy_path = root / PROJECT_POLICY
    if not root.is_dir() or path_has_symlink(policy_path) or not policy_path.is_file():
        fail(f"project policy must be a regular non-symlink file: {policy_path}")
    source_bytes = policy_path.read_bytes()
    value = json.loads(source_bytes)
    exact_keys(value, {"schemaVersion", "safe", "unsafe"}, str(policy_path))
    if value["schemaVersion"] != 1 or not isinstance(value["safe"], list) or not isinstance(value["unsafe"], list):
        fail(f"invalid V1 project policy: {policy_path}")
    source = f"project:{canonical_root}"
    rules = [proposal_entry(item, True, source, f"safe[{index}]") for index, item in enumerate(value["safe"])]
    rules += [proposal_entry(item, False, source, f"unsafe[{index}]") for index, item in enumerate(value["unsafe"])]
    return str(canonical_root), hashlib.sha256(source_bytes).hexdigest(), rules


def string_literal(node, label):
    if not isinstance(node, ast.Constant) or not isinstance(node.value, str):
        fail(f"{label} must be a string literal")
    return node.value


def ast_pattern(node):
    if not isinstance(node, (ast.List, ast.Tuple)):
        fail("prefix_rule pattern must be an array")
    value = []
    for token in node.elts:
        if isinstance(token, ast.Constant):
            value.append(string_literal(token, "pattern token"))
        elif isinstance(token, (ast.List, ast.Tuple)):
            value.append([string_literal(item, "pattern alternative") for item in token.elts])
        else:
            fail("unsupported prefix_rule pattern token")
    return pattern(value, "prefix_rule pattern")


def read_codex_file(path):
    try:
        module = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except SyntaxError as error:
        fail(f"invalid Codex rules file {path}: {error}")
    result = []
    for statement in module.body:
        call = statement.value if isinstance(statement, ast.Expr) else None
        if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Name) or call.func.id != "prefix_rule" or call.args:
            fail(f"unsupported Codex rule in {path} at line {statement.lineno}")
        keywords = {}
        for keyword in call.keywords:
            if keyword.arg is None or keyword.arg in keywords:
                fail(f"unsupported prefix_rule keyword in {path} at line {statement.lineno}")
            keywords[keyword.arg] = keyword.value
        if "pattern" not in keywords or set(keywords) - {"pattern", "decision", "justification", "match", "not_match"}:
            fail(f"unsupported prefix_rule fields in {path} at line {statement.lineno}")
        decision = string_literal(keywords["decision"], "decision") if "decision" in keywords else "allow"
        if decision not in {"allow", "prompt", "forbidden"}:
            fail(f"invalid decision in {path}: {decision}")
        justification = string_literal(keywords["justification"], "justification") if "justification" in keywords else "Imported existing Codex rule"
        result.append(rule(ast_pattern(keywords["pattern"]), decision, justification, f"codex-import:{path.name}"))
    return result


def import_codex(codex_home, generated_path):
    rules_dir = codex_home / "rules"
    if not rules_dir.is_dir():
        return []
    result = []
    for path in sorted(rules_dir.glob("*.rules")):
        if path == generated_path:
            continue
        if path_has_symlink(path) or not path.is_file():
            fail(f"Codex input must be a regular non-symlink file: {path}")
        result.extend(read_codex_file(path))
    return result


def normalize(rules):
    by_key = {}
    for value in rules:
        key = json.dumps([value["pattern"], value["decision"]], sort_keys=True, separators=(",", ":"))
        current = by_key.get(key)
        if current is None:
            by_key[key] = {**value, "sources": sorted(set(value["sources"]))}
        else:
            current["sources"] = sorted(set(current["sources"] + value["sources"]))
            if len(value["justification"]) > len(current["justification"]):
                current["justification"] = value["justification"]
    values = list(by_key.values())
    kept = []
    for candidate in values:
        representatives = [other for other in values if other["decision"] == candidate["decision"] and subsumes(other["pattern"], candidate["pattern"])]
        representative = min(representatives, key=lambda value: (len(value["pattern"]), json.dumps(value["pattern"], separators=(",", ":"))))
        if representative is candidate:
            kept.append(candidate)
        else:
            representative["sources"] = sorted(set(representative["sources"] + candidate["sources"]))
    return sorted(kept, key=lambda value: json.dumps(value, sort_keys=True, separators=(",", ":")))


def subsumes(broad, narrow):
    if len(broad) > len(narrow):
        return False
    for index, broad_token in enumerate(broad):
        broad_values = set(broad_token if isinstance(broad_token, list) else [broad_token])
        narrow_token = narrow[index]
        narrow_values = set(narrow_token if isinstance(narrow_token, list) else [narrow_token])
        if not broad_values.issuperset(narrow_values):
            return False
    return True


def render(rules):
    lines = ["# Generated by Ponytail. Edit source policy, not this file."]
    for value in rules:
        lines.append("prefix_rule(pattern={}, decision={}, justification={})".format(
            json.dumps(value["pattern"], separators=(",", ":")),
            json.dumps(value["decision"]),
            json.dumps(value["justification"]),
        ))
    return "\n".join(lines) + "\n"


def atomic_write(path, content):
    if path_has_symlink(path) or (path.exists() and not path.is_file()):
        fail(f"refusing to replace non-regular or symlink path: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def validate_digest(value, label):
    if not isinstance(value, str) or len(value) != 64 or any(character not in "0123456789abcdef" for character in value):
        fail(f"{label} must be a lowercase SHA-256 value")


def validate_rules(value, label):
    if not isinstance(value, list):
        fail(f"{label} must be an array")
    for index, item in enumerate(value):
        exact_keys(item, {"pattern", "decision", "justification", "sources"}, f"{label}[{index}]")
        pattern(item["pattern"], f"{label}[{index}].pattern")
        if item["decision"] not in {"allow", "prompt", "forbidden"} or not isinstance(item["justification"], str) or not item["justification"]:
            fail(f"{label}[{index}] has invalid decision or justification")
        if not isinstance(item["sources"], list) or not item["sources"] or item["sources"] != sorted(set(item["sources"])) or any(not isinstance(source, str) or not source for source in item["sources"]):
            fail(f"{label}[{index}].sources must contain sorted unique strings")


def selected_legacy_rules(value, project_root, label):
    if not isinstance(value, list):
        fail(f"{label} must be an array")
    source = f"project:{project_root}"
    selected = []
    for item in value:
        if not isinstance(item, dict) or not isinstance(item.get("sources"), list) or source not in item["sources"]:
            continue
        candidate = {**item, "sources": [source]}
        validate_rules([candidate], label)
        selected.append(candidate)
    return normalize(selected)


def read_state_v1(value, path, project_root):
    exact_keys(value, {"schemaVersion", "projects", "projectDigests", "importedRules", "acceptedRules", "proposalDigest"}, str(path))
    if value["schemaVersion"] != 1:
        fail(f"invalid V1 accepted state: {path}")
    validate_rules(value["importedRules"], "state.importedRules")
    legacy_rules = selected_legacy_rules(value["acceptedRules"], project_root, "state.acceptedRules")
    return {"schemaVersion": 1, "projectPolicies": {}, "legacyRules": legacy_rules,
            "importedRules": value["importedRules"], "acceptedRules": value["acceptedRules"]}


def read_state_v2(value, path, project_root):
    exact_keys(value, {"schemaVersion", "projectPolicies", "legacyProjectDigests", "legacyRules", "importedRules", "acceptedRules", "proposalDigest"}, str(path))
    if value["schemaVersion"] != 2:
        fail(f"invalid V2 accepted state: {path}")
    if not isinstance(value["projectPolicies"], dict):
        fail("state.projectPolicies must be an object")
    selected_policies = {}
    policy = value["projectPolicies"].get(project_root)
    if policy is not None:
        exact_keys(policy, {"digest", "rules"}, f"state.projectPolicies[{project_root}]")
        validate_digest(policy["digest"], f"state.projectPolicies[{project_root}].digest")
        validate_rules(policy["rules"], f"state.projectPolicies[{project_root}].rules")
        if any(rule_value["sources"] != [f"project:{project_root}"] for rule_value in policy["rules"]):
            fail(f"state.projectPolicies[{project_root}].rules must have the canonical project source")
        selected_policies[project_root] = policy
    validate_rules(value["importedRules"], "state.importedRules")
    legacy_rules = selected_legacy_rules(value["legacyRules"], project_root, "state.legacyRules")
    return {"schemaVersion": 2, "projectPolicies": selected_policies,
            "legacyRules": legacy_rules, "importedRules": value["importedRules"],
            "acceptedRules": value["acceptedRules"]}


def read_state_v3(value, path, project_root):
    exact_keys(value, {"schemaVersion", "importedRules", "acceptedRules", "proposalDigest"}, str(path))
    if value["schemaVersion"] != 3:
        fail(f"invalid V3 accepted state: {path}")
    validate_digest(value["proposalDigest"], "state.proposalDigest")
    validate_rules(value["importedRules"], "state.importedRules")
    validate_rules(value["acceptedRules"], "state.acceptedRules")
    if any(source.startswith("project:") for item in value["acceptedRules"] for source in item["sources"]):
        fail("V3 accepted state must not contain project rules")
    return value


CodexExecpolicyAcceptedStateReaders = {1: read_state_v1, 2: read_state_v2, 3: read_state_v3}


def read_state(path, project_root):
    if not path.exists():
        return None
    if path_has_symlink(path) or not path.is_file():
        fail(f"accepted state must be a regular non-symlink file: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        fail(f"accepted state must be an object: {path}")
    reader = CodexExecpolicyAcceptedStateReaders.get(value.get("schemaVersion"))
    if reader is None:
        fail(f"unsupported accepted state schemaVersion: {value.get('schemaVersion')}")
    return reader(value, path, project_root)


def state_text(imported, accepted, digest):
    return json.dumps({
        "schemaVersion": 3,
        "importedRules": imported,
        "acceptedRules": accepted,
        "proposalDigest": digest,
    }, indent=2, sort_keys=True) + "\n"


def digest_for(*values):
    return hashlib.sha256(json.dumps(values, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def project_state_text(project_root, proposal_digest, accepted_rules):
    return json.dumps({"schemaVersion": 1, "projectRoot": project_root,
                       "proposalDigest": proposal_digest, "acceptedRules": accepted_rules},
                      indent=2, sort_keys=True) + "\n"


def read_project_state_v1(value, path):
    exact_keys(value, {"schemaVersion", "projectRoot", "proposalDigest", "acceptedRules"}, str(path))
    if value["schemaVersion"] != 1 or not isinstance(value["projectRoot"], str) or not Path(value["projectRoot"]).is_absolute():
        fail(f"invalid V1 project accepted state: {path}")
    validate_digest(value["proposalDigest"], "project state.proposalDigest")
    validate_rules(value["acceptedRules"], "project state.acceptedRules")
    source = f"project:{value['projectRoot']}"
    if any(item["sources"] != [source] for item in value["acceptedRules"]):
        fail("project accepted rules must have only their canonical project source")
    return value


CodexExecpolicyProjectAcceptedStateReaders = {1: read_project_state_v1}


def read_project_state(path):
    if not path.exists():
        return None
    if path_has_symlink(path) or not path.is_file():
        fail(f"project accepted state must be a regular non-symlink file: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    reader = CodexExecpolicyProjectAcceptedStateReaders.get(value.get("schemaVersion")) if isinstance(value, dict) else None
    if reader is None:
        fail(f"unsupported project accepted state schemaVersion: {value.get('schemaVersion') if isinstance(value, dict) else None}")
    return reader(value, path)


def global_rules(rules):
    values = []
    for item in rules:
        sources = [source for source in item["sources"] if not source.startswith("project:")]
        if sources:
            values.append({**item, "sources": sources})
    return normalize(values)


def migrated_project_rules(state, project_root):
    if state is None or state.get("schemaVersion") == 3:
        return []
    policy = state.get("projectPolicies", {}).get(project_root)
    if policy is not None:
        return policy["rules"]
    source = f"project:{project_root}"
    values = []
    for item in state.get("legacyRules", []):
        if source in item["sources"]:
            values.append({**item, "sources": [source]})
    return normalize(values)


def describe(value):
    return f"{value['decision']} {json.dumps(value['pattern'], separators=(',', ':'))} [{', '.join(value['sources'])}]"


def show_diff(previous, candidate, digest):
    old = {json.dumps(value, sort_keys=True, separators=(",", ":")): value for value in previous}
    new = {json.dumps(value, sort_keys=True, separators=(",", ":")): value for value in candidate}
    print("Codex execpolicy proposal:", file=sys.stderr)
    for key in sorted(old.keys() - new.keys()):
        print(f"- {describe(old[key])}", file=sys.stderr)
    for key in sorted(new.keys() - old.keys()):
        print(f"+ {describe(new[key])}", file=sys.stderr)
    print(f"proposal digest: {digest}", file=sys.stderr)


def install(path, rules):
    atomic_write(path, render(rules))
    print(f"installed accepted policy: {path}")


def path_has_symlink(path):
    current = path
    while current != current.parent:
        if current.is_symlink():
            return True
        current = current.parent
    return False


def validate_codex(rules):
    executable_value = os.environ.get("PONYTAIL_CODEX_EXECUTABLE")
    if not executable_value:
        return
    executable = Path(executable_value)
    if not executable.is_absolute() or executable.is_symlink() or not executable.is_file() or not os.access(executable, os.X_OK):
        fail("PONYTAIL_CODEX_EXECUTABLE must be an absolute executable non-symlink file")
    descriptor, temporary = tempfile.mkstemp(prefix="ponytail-execpolicy-", suffix=".rules")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write(render(rules))
        result = subprocess.run([str(executable), "execpolicy", "check", "--rules", temporary, "ponytail-policy-validation"], capture_output=True, text=True)
        if result.returncode != 0:
            fail(f"Codex rejected generated policy: {result.stderr.strip()}")
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def run():
    parser = argparse.ArgumentParser(description="Compile, approve, install, and restore Ponytail-managed Codex execpolicy")
    parser.add_argument("--validate-project", metavar="ROOT", help="Validate a project proposal without reading or writing accepted policy")
    parser.add_argument("--home")
    parser.add_argument("--codex-home")
    parser.add_argument("--project")
    parser.add_argument("--project-root")
    parser.add_argument("--accept", metavar="DIGEST")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--restore", action="store_true")
    arguments = parser.parse_args()
    if arguments.validate_project:
        read_project(Path(arguments.validate_project))
        return 0
    if not arguments.project:
        parser.error("--project is required")
    if sum((arguments.dry_run, arguments.check, arguments.restore)) > 1 or arguments.accept and (arguments.dry_run or arguments.check or arguments.restore):
        parser.error("incompatible mode options")
    home_value = arguments.home or os.environ.get("HOME")
    if not home_value:
        parser.error("HOME or --home is required")
    home = Path(home_value).expanduser().resolve()
    codex_home = Path(arguments.codex_home).expanduser().resolve() if arguments.codex_home else home / ".codex"
    state_path = home / ".ponytail/codex-execpolicy/state.json"
    generated_path = codex_home / "rules/ponytail.rules"
    try:
        lock_name = hashlib.sha256(str(home).encode()).hexdigest()
        lock = open(Path(tempfile.gettempdir()) / f"ponytail-execpolicy-{lock_name}.lock", "a+", encoding="utf-8")
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        project_path = Path(arguments.project).expanduser().resolve()
        canonical_path = Path(arguments.project_root).expanduser().resolve() if arguments.project_root else project_path
        project_root, project_digest, project_rules = read_project(project_path, canonical_path)
        state = read_state(state_path, project_root)
        project_state_path = home / ".ponytail/codex-execpolicy/projects" / f"{hashlib.sha256(project_root.encode()).hexdigest()}.json"
        project_generated_path = project_path / ".codex/rules/ponytail.rules"
        project_state = read_project_state(project_state_path)
        if arguments.restore:
            if state is None or state.get("schemaVersion") != 3:
                fail("accepted global state requires isolated migration; run update-permissions")
            if project_state is None or project_state["projectRoot"] != project_root:
                fail(f"accepted project state not found: {project_state_path}")
            install(generated_path, state["acceptedRules"])
            install(project_generated_path, project_state["acceptedRules"])
            return 0

        imported = state["importedRules"] if state else import_codex(codex_home, generated_path)
        candidate = normalize(baseline(home) + global_rules(imported))
        validate_codex(candidate)
        validate_codex(project_rules)
        global_digest = digest_for(imported, candidate)
        digest = digest_for(global_digest, project_root, project_digest, project_rules)
        previous_global = (state["acceptedRules"] if state and state.get("schemaVersion") == 3
                           else normalize(baseline(home) + global_rules(imported)))
        previous_project = project_state["acceptedRules"] if project_state else migrated_project_rules(state, project_root)
        changed = (state is None or state.get("schemaVersion") != 3 or candidate != previous_global or
                   (state.get("proposalDigest") != global_digest if state else True) or
                   project_state is None or project_state["projectRoot"] != project_root or
                   project_state["proposalDigest"] != project_digest or project_rules != previous_project)
        if arguments.check:
            if changed:
                fail("current proposals do not match accepted state")
            if generated_path.is_symlink() or not generated_path.is_file() or generated_path.read_text(encoding="utf-8") != render(state["acceptedRules"]):
                fail(f"installed Codex policy differs from accepted state: {generated_path}")
            if project_generated_path.is_symlink() or not project_generated_path.is_file() or project_generated_path.read_text(encoding="utf-8") != render(project_state["acceptedRules"]):
                fail(f"installed project Codex policy differs from accepted state: {project_generated_path}")
            print("accepted state and installed global and project Codex policies match")
            return 0
        if changed:
            show_diff(normalize(previous_global + previous_project), normalize(candidate + project_rules), digest)
            if arguments.dry_run:
                return 0
            if arguments.accept != digest:
                if arguments.accept:
                    fail(f"proposal digest mismatch: expected {digest}")
                print("Accept this policy change? [y/N] ", end="", file=sys.stderr, flush=True)
                if sys.stdin.readline().strip().lower() not in {"y", "yes"}:
                    print("policy unchanged", file=sys.stderr)
                    return 2
            global_changed = (state is None or state.get("schemaVersion") != 3 or candidate != previous_global or
                              imported != state["importedRules"] or state.get("proposalDigest") != global_digest)
            if global_changed:
                atomic_write(state_path, state_text(imported, candidate, global_digest))
            atomic_write(project_state_path, project_state_text(project_root, project_digest, project_rules))
            state = read_state(state_path, project_root)
            project_state = read_project_state(project_state_path)
            print(f"accepted policy state: {state_path}")
        elif arguments.dry_run:
            print("no policy changes")
            return 0
        install(generated_path, state["acceptedRules"])
        install(project_generated_path, project_state["acceptedRules"])
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        parser.error(str(error))


# Traceability: supports REQ-CLI-INTERRUPTION
try:
    sys.exit(run())
except KeyboardInterrupt:
    sys.exit(130)
PYTHON

  trap ':' INT
  python3 -c "${python_source}" "$@" || status="$?"
  exit "${status}"
}

main "$@"
