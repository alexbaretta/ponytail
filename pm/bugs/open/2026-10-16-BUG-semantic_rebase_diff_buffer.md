<!-- Copyright (c) 2026 Alex Baretta. MIT License. -->
# Semantic rebase analysis cannot capture a large aggregate diff

Type: BUG
Status: open
Reported by: Gwen coordinator, 2026-10-16, original W21 session 01a143a8-5ea1-7e50-938e-e0008b499ea6.

The coordinator reports that canonical `ponytail rebase diff` on W21's single new
logging purpose against root ec7791f69f0a2b9312cd1bcbbfa5931bfb329613 refused before
replay with `git diff failed: spawnSync git ENOBUFS`. W21 restored its five held
journal files and staged binary patch exactly; no replay or candidate was created.
Reported evidence is in the original worker's ignored
`tmp/agents/q04-q15-proof-adequacy/` receipts. This report has not been reproduced
in the Ponytail repository. Diagnose the actual capture path and preserve the
canonical complete aggregate review; do not reduce scope, monkeypatch generated
runtime, bypass review or conflate this with source-range/stop-identity proposals.

Disposition: retained separately from the autonomous queue implementation. No
root-cause or repair acceptance is claimed by this issue record.
