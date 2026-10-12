# Contributing

Thanks for helping build an independent, free LinkedIn MCP server.

1. Discuss changes in an issue, especially API scopes, OAuth or destructive actions.
2. Keep the base product focused on personal-profile text posts, drafts and safety.
3. Add behavioral tests before changing code (`npm test`).
4. Never include personal data, OAuth tokens, Client Secrets, or your live draft files.
5. Submit a pull request describing the behavior, API permissions used and tests.
6. Follow LinkedIn's official API terms: no scraping, cookie-based login, private API tricks or unsolicited bulk engagement.

## Good starter contributions

- Improved documentation and OS-specific setup walkthroughs
- Import of LinkedIn's official analytics export (offline CSV)
- A human-friendly local review interface
- Safe token rotation without exposing credentials

## Out of scope for v0.1

- Mass comments, growth bots or contact scraping
- Bulk messages or connection invitations
- Any automated posting that bypasses the human approval step
