<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail for Hermes installed

Enable it if you did not install with `--enable`:

```bash
hermes plugins enable ponytail
```

Restart Hermes or the gateway after enabling.

In shared gateways, restrict `/ponytail` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

Commands:

- `/ponytail [lite|full|ultra|off]`
- `/ponytail-review [target]`
- `/ponytail-audit [target]`
- `/ponytail-debt`
- `/ponytail-help`

Bundled skills are available as `ponytail:ponytail`, `ponytail:ponytail-review`, `ponytail:ponytail-audit`, and `ponytail:ponytail-debt`. `/ponytail-help` remains a command rather than a skill.
