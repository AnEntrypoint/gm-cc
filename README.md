# gm-cc (deprecated)

This package has been consolidated into the canonical universal harness at [gm-skill](https://github.com/AnEntrypoint/gm-skill).

All 15 platform-specific gm-<platform> packages (gm-cc, gm-oc, gm-vscode, etc.) shared identical orchestration logic and have been merged into a single package. gm-skill works across every supported host (Claude Code, OpenCode, VS Code, Cursor, Zed, JetBrains, Codex, Copilot CLI, and more).

## Migration

Replace any install of `gm-cc` with:
```
bun x skills add AnEntrypoint/gm-skill
```

This repo is archived and will not receive further updates.
