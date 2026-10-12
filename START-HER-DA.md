# Start her – LinkedIn MCP Community (v0.1)

Dette er en **første, testet kodeversion** af en gratis MCP-server. Den er endnu ikke live-testet med din LinkedIn-konto og er nu publiceret i GitHub-repositoriet. OAuth og publicering mod en rigtig LinkedIn-konto mangler stadig at blive verificeret.

## Hvad du får

- Opret og læs lokale LinkedIn-kladder via MCP
- Rediger kladder, før du godkender dem
- Godkend præcis tekst fra en terminal, ikke via AI
- Udgiv godkendte tekst-opslag via LinkedIns officielle API
- Planlæg godkendte opslag med en lokal scheduler
- Automatisk testpakke og GitHub Actions CI
- MIT-licens, CONTRIBUTING og SECURITY til et offentligt repo

## Kom i gang lokalt

1. Installer **Node.js 22+**.
2. Åbn projektmappen i din terminal og kør `npm test`.
3. Opret en LinkedIn Developer-app på https://www.linkedin.com/developers/apps. Aktiver `Share on LinkedIn` og `Sign In with LinkedIn using OpenID Connect`.
4. Under appens OAuth-redirects tilføjes `http://localhost:8787/callback`.
5. Kopiér `.env.example` til `.env` og udfyld din Client ID og Client Secret **på din egen computer**. Del dem ikke med ChatGPT eller på GitHub.
6. Kør `node --env-file=.env src/index.mjs auth`. Åbn det LinkedIn-link, terminalen viser, og godkend forbindelsen.
7. Kør `node --env-file=.env src/index.mjs whoami` for at bekræfte, at du er logget ind.
8. Følg README for at oprette en kladde og teste publicering. Start eventuelt med et kort testopslag, som du selv godkender.

## Projektets GitHub-repository

Projektet ligger på GitHub under [OptimalPrimeAgent/Linkedin-mcp-community](https://github.com/OptimalPrimeAgent/Linkedin-mcp-community).

Bidrag er velkomne som issues eller pull requests. Du skal ikke lægge `.env`, OAuth-token eller private kladder i GitHub.

## Vigtigt om ChatGPT

Din nuværende ChatGPT Plus-Dot kan hjælpe med research og udkast, men vi kan ikke regne med, at den kan bruge en selvbygget MCP med skriveadgang direkte. Derfor er projektet lavet som en selvstændig lokal løsning, der også kan bruges af andre kompatible MCP-klienter.

## Næste tekniske milepæl

Verificer LinkedIn OAuth og det første opslag live på din egen konto. Derefter kan vi gøre MVP'en lettere at installere og bidrage til uden at tilføje unødige features.
