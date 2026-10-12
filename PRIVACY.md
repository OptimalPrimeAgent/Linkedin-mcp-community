# Privacy Policy — LinkedIn MCP Community

**Effective date:** 12 October 2026

LinkedIn MCP Community is an open-source, locally run tool for preparing and publishing LinkedIn posts. This policy describes **version 0.1** of the software, not a hosted service. The project is not affiliated with LinkedIn.

## What the software accesses

With your explicit LinkedIn authorization, the app requests the OAuth permissions `openid`, `profile`, `email`, and `w_member_social`. These permissions allow the app to identify your authenticated LinkedIn account and to publish approved content on your behalf.

## Where data is stored

This version runs locally. OAuth access tokens and locally created drafts, approvals, schedules, and publication receipts are stored on the computer where you run the application, under `~/.linkedin-mcp-community/` by default (or the location you configure using `LINKEDIN_MCP_HOME`). LinkedIn app credentials are supplied through local environment variables.

The project does not operate a centralized server to collect users' LinkedIn information or drafts. Your MCP client, computer, or hosting provider may have additional data-handling practices outside this software.

## When data is shared

During authorization, the app communicates with LinkedIn's authentication endpoints. When you explicitly publish an approved draft, the app sends that content to LinkedIn's official API. Published posts are subject to LinkedIn's own privacy settings and policies. This software does not sell user data.

## Retention and deletion

Data stays in the local storage location until you delete it, subject to any backups you maintain. You can revoke the app's LinkedIn permissions from LinkedIn's connected-app settings and delete the local data directory. Revoking access does not automatically delete already published LinkedIn posts.

## Security

Do not share your Client Secret, access tokens, local `.env` file, or private drafts in GitHub issues, screenshots, or public repositories. See [SECURITY.md](SECURITY.md) for security reporting guidance.

## Changes and contact

Future versions may introduce optional integrations or hosted components; this policy will be updated before those features are introduced. For privacy questions, open an issue in the project's [GitHub repository](https://github.com/OptimalPrimeAgent/Linkedin-mcp-community/issues), but **never include secrets or sensitive personal information** in a public issue.
