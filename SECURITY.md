# Security policy

FamilyOS holds a family's calendar, messages, documents and the keys to their AI providers.
Security reports are taken seriously and handled before anything else.

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through GitHub's security advisories:
go to the repository's **Security** tab and choose **Report a vulnerability**
(https://github.com/onurceri/family-os/security/advisories/new).

Include what you found, how to reproduce it, the version or commit, and what an attacker could
do with it. You will get an answer within a week. We will keep you informed while we fix it, and
credit you in the advisory unless you prefer otherwise. Please give us a reasonable time to
release a fix before you disclose the issue publicly.

## Supported versions

FamilyOS is in beta (0.x). Security fixes go to `main` and into the next release; only the latest
release is supported, so update to it. There are no back-ported fixes for older 0.x versions.
FamilyOS has not had an independent security audit.

## In scope

- **Authentication and sessions**: sign-in, password handling, session cookies, CSRF, the
  first-run setup code, rate limits.
- **PIN sign-in and trusted devices**: the profile picker and PIN sign-in must work only on
  devices an admin marked as family devices; anything that reveals member names or accepts a PIN
  elsewhere is a vulnerability.
- **Family displays**: a paired display must only read the `view` capabilities it was granted and
  must never run an action.
- **Access control**: a member doing or seeing something their role's capabilities do not allow,
  across routes, actions, the WebSocket, search, the assistant and MCP.
- **The AI acting without approval**: any way for a model (through shared content, a prompt
  injection, the assistant or an MCP client) to change data without a person approving a draft,
  to read an area that is off for the AI, to reach a non-local provider for a "local only" area,
  or to send data outside the household.
- **SSRF**: requests to addresses a user typed (calendar subscriptions, pack installs, the
  weather) reaching private, loopback or link-local addresses without the admin allowing it.
- **Secrets**: AI provider keys, bot tokens, mail passwords, calendar subscription URLs, app keys
  and backup passphrases must never be returned to the browser, logged, or stored unencrypted.
- **Language and theme packs**: a pack is data only; any way for an installed pack to run code,
  inject CSS or HTML, or load something from another server.
- **Uploaded files and email**: stored files served unsafely, metadata (such as photo location)
  not stripped, HTML mail rendered or remote content loaded.
- **Backups**: encrypted backups that leak content, or secrets that end up inside a backup.

## Out of scope

- Attacks that need an admin account or physical access to the server.
- Running FamilyOS over plain HTTP on an untrusted network; use HTTPS (see the
  [guide](docs/guide/https.md)).
- What a family chooses to send to a cloud AI provider; the provider's own handling of it.
- Denial of service through large volumes of traffic.
- Vulnerabilities in dependencies without a way to exploit them in FamilyOS (please still tell
  us, through a normal issue, if an update is needed).
