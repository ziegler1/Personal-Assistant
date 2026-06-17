# Personal Assistant

## Memory
This project uses Memory Vault (Postgres-backed, via MCP) for persistent memory instead of native Claude Code memory files. Always use the `memory-vault` MCP tools (`remember`, `recall`) with `space: "personal-assistant"` to save and retrieve context across sessions — do not write to `.claude/projects/.../memory/*.md`.