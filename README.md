# LinkedIn MCP Community

**Open source · MIT · Free · Human-approved**

A lightweight, zero-dependency Node.js MCP server for creating LinkedIn drafts, reviewing them locally, and posting via LinkedIn's **official** API. Designed to work with any MCP client supporting **stdio**. No Metricool, browser scraping or paid scheduling platform is required.

> [!IMPORTANT]
> **Status: v0.1.0 starter / local beta.** The code is unit-tested with mocked HTTP responses, but live LinkedIn OAuth and posting have **not** been tested against a real account. Only plain-text posts are currently supported. This is a separate clean-room project inspired by existing MIT-licensed LinkedIn MCP implementations; it is **not** a fork of or a patch to any of those projects.

## Features

| Feature | v0.1 |
| --- | --- |
| LinkedIn OAuth for personal profiles | Implemented, requires live validation |
| Draft posts through MCP | Yes |
| List and read local drafts | Yes |
| Edit unapproved drafts | Yes |
| Manual approval of exact text | Yes, interactive CLI only |
| Publish approved text post | Implemented, requires live validation |
| Schedule approved posts | Yes, with local scheduler invocation |
| Read feed, messages or connections | No, restricted LinkedIn access |
| LinkedIn profile/post analytics | Not yet; official data export planned |
| MCP remote HTTP | Not in MVP; stdio only |

## Requirements

- Node.js **22 or later**
- A personal LinkedIn account
- A LinkedIn Developer application with **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn** products.
- LinkedIn OAuth permission `w_member_social` (and `openid profile email`).

### 1. Create your LinkedIn Developer application

Create an app at https://www.linkedin.com/developers/apps. LinkedIn may require associating it with a LinkedIn Page. Enable the two products above and add this exact OAuth redirect URL:

```
http://localhost:8787/callback
```

LinkedIn sharing docs: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin

### 2. Set credentials **locally**

```bash
cp .env.example .env
# Fill in LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env
```

Never commit `.env`. No need to send the client secret to an AI assistant or repo owner.

### 3. Authorize your own profile

```bash
node --env-file=.env src/index.mjs auth
```

Open the URL shown in your terminal and approve via LinkedIn. The short-lived OAuth callback listens only on `127.0.0.1:8787`. Your access token will be saved to a private local folder. If the token expires, run `auth` again. Do not store tokens in git.

### 4. Create, approve and publish a draft (terminal)

```bash
printf 'My first LinkedIn update\n' > example-post.txt
node src/index.mjs draft example-post.txt
node src/index.mjs list
node src/index.mjs show <DRAFT_ID>
node src/index.mjs approve <DRAFT_ID>
node --env-file=.env src/index.mjs publish <DRAFT_ID>
```

`approve` asks you to type `APPROVE <DRAFT_ID>` interactively. No AI tool can call `approve` through this MCP. Publication uses your own LinkedIn account and happens immediately after you run `publish` or invoke the publish MCP tool on an already approved post.

### 5. Connect a stdio MCP client

Example generic client configuration (adapt the key names to your MCP client):

```json
{
  "mcpServers": {
    "linkedin-community": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/linkedin-mcp-community/src/index.mjs", "mcp"],
      "env": {
        "LINKEDIN_MCP_HOME": "/ABSOLUTE/PRIVATE/DATA/DIRECTORY"
      }
    }
  }
}
```

The MCP server supports protocol initialization, listing tools, and invoking tools over stdio. It exposes `linkedin_create_draft`, `linkedin_edit_draft`, `linkedin_get_draft`, `linkedin_list_drafts`, `linkedin_schedule_approved_draft`, `linkedin_publish_approved_draft`, and `linkedin_connection_status`.

> **ChatGPT Plus restriction:** As of October 2026, direct custom MCP write integrations in ChatGPT are not generally available on Plus. You can run this MCP with other compatible local clients or use the CLI independently while ChatGPT drafts the content. Do not assume a ChatGPT Dot can invoke these write tools. OpenAI reference: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt

### 6. Schedule a manually approved draft

```bash
node src/index.mjs schedule <DRAFT_ID> 2026-11-02T09:00:00+01:00
node --env-file=.env src/index.mjs run-due
```

`run-due` publishes all approved posts whose time has passed. For automatic execution, you must create a trusted local cron or task-scheduler job. **No scheduler is running by default**, and your computer/server must be on at the scheduled time. Cron example (use *absolute* paths and handle timezones appropriately):

```cron
*/5 * * * * cd /absolute/path/linkedin-mcp-community && /absolute/path/to/node --env-file=.env src/index.mjs run-due
```

Do not commit cron logs or tokens. If a network failure makes the outcome uncertain, the system stops and requires manual reconciliation before any further attempt. This deliberately favors avoiding duplicate public posts.

## Architecture

```text
MCP client ──stdio JSON-RPC──► src/mcp.mjs ─► local drafts (private files)
                                              │
Human on terminal ──approve exact text────────┘
                                              │
CLI publish / run-due ─────────────────────────┴──► LinkedIn official REST Posts API
```

Identity is fetched from `GET /v2/userinfo` using the authenticated member's token, **not** from text supplied by the MCP client. Text and visibility are fingerprinted at approval. Publication response IDs are stored locally. Drafts are not sent to external services until approved and published.

## Development

```bash
npm test
node src/index.mjs help
```

Tests use Node's built-in test runner and mocked LinkedIn responses; no real posts are created. No `npm install` is required for the starter project.

## Roadmap

1. **v0.1** — plain-text drafts, interactive approvals, safe publication, manual scheduler (current)
2. **v0.2** — validate live OAuth/posts end-to-end, improve reliability and documentation
3. **v0.3** — optional analytics CSV import and per-post performance analysis (offline)
4. **Later** — images, link previews, friendlier local review UI, optional remote transport with real authentication

Analytics and feed reading via API require separate restricted LinkedIn permissions. No scraping workaround will be added.

## Community and attribution

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Inspired by the open-source ecosystem, including [vlpmedialtd/linkedin-mcp](https://github.com/vlpmedialtd/linkedin-mcp) (MIT) and [fredericbarthelet/linkedin-mcp-server](https://github.com/fredericbarthelet/linkedin-mcp-server). This implementation is original code, not copied from those repositories.

MIT-licensed. Not affiliated with or endorsed by LinkedIn, Microsoft, OpenAI or the original projects.
