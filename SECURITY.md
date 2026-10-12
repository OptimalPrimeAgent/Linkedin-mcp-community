# Security

- All credentials and post drafts are stored outside the source repository in `~/.linkedin-mcp-community` (or `LINKEDIN_MCP_HOME`). Secret-containing files are created with mode 0600 and directories with mode 0700, where the OS supports POSIX modes.
- Do not expose the stdio MCP server directly on the Internet. This project does not provide an authenticated remote HTTP transport.
- LinkedIn tokens are bearer secrets. Treat host compromise as credential compromise. Revoke authorized applications in LinkedIn account settings if compromised.
- Publishing is gated by interactive approval in the local CLI. The MCP exposes **no approval tool**.
- Post approval binds to a SHA-256 fingerprint of exact text and visibility.
- On an ambiguous network failure, drafts enter `UNCERTAIN` and cannot automatically retry. Check LinkedIn before taking further action.
- The scheduler does not run by itself; `run-due` must be executed by a trusted job runner on the same host.
- Anyone with write access to your computer and its private draft folder could bypass these local-only controls. This is not a multi-user server.

Please report vulnerabilities privately to the repository maintainers; do not publish secrets or exploit details in a public issue.
