<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# OBL-41–43 existing native transport assessment

Source revision 4c9034a, clean checkout during execution. No product edits.
Canonical implementation, direct fixtures and live workflow are checked
TypeScript; unchanged compiler evidence is reused. Current unchanged TSTS and
runtime synchronization pass. Build-impact identifies no affected targets.

| Obligation | Complete observed condition |
| --- | --- |
| OBL-41 | Live native thread starts in the explicitly designated existing checkout, loads its instructions, reads its real file, and resumes the same thread/session and conversation after the owned App Server restarts. Typed protocol proof rejects mismatched resume identity. |
| OBL-42 | Protocol proof observes completed, failed and interrupted terminal turns, rejects closing a connected owned server with an active turn, then permits close after observed interruption. Live proof observes both completed turns before closing their servers and archives the fixture session. |
| OBL-43 | Request timeout retains UNKNOWN_OUTCOME and a late response is observed without retry; observation timeout does not assert stopped activity. Dropped and malformed transports reject affected requests without creating replacement workers. Source inspection confirms no automatic recreation path. |

This assesses the transport component only. Application allocation, suspension,
recovery, session-marker ownership, retirement and campaign orchestration remain
separate unresolved obligations. Transport disconnection cleanup does not prove
worker cessation. Existing plugin configuration may be loaded by the native
host; this transport itself uses the native App Server and requires no Ponytail
plugin API. Whole-project plugin removal remains unproven.

The initial sandboxed live attempt terminated at initialize with UNKNOWN_OUTCOME,
before thread creation. That failed attempt is not passing evidence. The
authorized run started exactly one fixture thread, resumed it, archived it and
removed its temporary Git fixture. Both test handles were observed terminal.

Native executable identity observed after the run:

```text
WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted (os error 1)
codex-cli 0.159.2
50ac633af64851511f9bbc71032cdae7f1ba20b3234c189687d61ba846c354c5  /Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex
```

This external host identity is an observation, not a repository file hash or a
guarantee about a future installed executable. Certificate inputs below identify
repository-owned protocol, fixture, runtime, configuration and acceptance inputs.

Command: `node --test dist/tests/rolling-codex.test.js`; exit 0, five tests, no skips/failures.

```text
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (43.306875ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (157.159542ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (39.6085ms)
  ✔ malformed (35.000209ms)
✔ lost or malformed responses reject all affected pending operations (75.028875ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 324.889042
```

Command: `node --test dist/tests/rolling-codex.integration.js`; exit 0, one live test, no skips/failures.

```text
✔ native App Server starts and resumes the same session in the designated existing checkout (21053.294709ms)
ℹ {"timestamp":"2026-10-11T07:00:23.840169Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T07:00:23.840209Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T07:00:24.121325Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T07:00:24.121356Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T07:00:24.456633Z","level":"WARN","fields":{"message":"state db discrepancy during find_thread_path_by_id_str_in_subdir: falling_back"},"target":"codex_rollout::list"}
ℹ native thread=01a129c3-3e7a-7431-8114-9b3cd1e93cda; session=01a129c3-3e7a-7431-8114-9b3cd1e93cda; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-cYkthI; resumed after App Server restart; model=gpt-6.1-sol
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 21101.0655
```

Current configured unchanged TSTS:

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 883 files: no violations found.
```
