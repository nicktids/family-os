# Disclaimer

FamilyOS is free software that you run yourself. Please read this before you rely on it.

**No warranty.** FamilyOS is provided "as is", without warranty of any kind, as set out in the
[GNU Affero General Public License](LICENSE) (sections 15 and 16). The authors and contributors
are not liable for any loss or damage that comes from using it, including lost data, missed
appointments, reminders that did not arrive, or deadlines that passed.

**Beta software, no compatibility guarantee before 1.0.** FamilyOS is in beta. Until version
1.0, any 0.x release may change the data format, the API, the tools offered to AI agents and the
format of language and theme packs. Upgrades migrate the data automatically, and changes that
need a manual step are listed under "Breaking changes" in the release notes, but an upgrade can
still go wrong: make a backup before every upgrade and keep a copy you can restore.

**Self-hosted means your responsibility.** There is no FamilyOS service and nobody else operates
your installation. Whoever runs it is responsible for the server, its updates, its network
exposure, HTTPS, access to it, and its backups. Keep backups somewhere other than the server, and
keep the server's secret and any backup passphrase in a safe place: without them, saved keys and
encrypted backups cannot be recovered.

**Security.** FamilyOS has not had an independent security audit. It holds personal data about
your family, including children, so expose it as little as possible: reach it over a VPN (such as
Tailscale or WireGuard) or, if it must be reachable from the internet, only through HTTPS with
strong passwords, and keep the server and FamilyOS up to date. Report a vulnerability privately as
described in the [security policy](SECURITY.md).

**AI apps you connect act with your access.** An app key lets an AI agent or app read what you
may see (and, unless the key is read-only, suggest changes for you to approve). The agent, the
model behind it and the provider that runs it are outside FamilyOS: what they do with what they
read is up to them and their terms. Give a key only to software you trust, prefer read-only keys,
let keys expire, and revoke a key you no longer use.

**Your family's data is yours.** It stays on your server. FamilyOS sends nothing anywhere except
to services you configure yourself: an AI provider, Telegram, an email mailbox, backup storage,
calendar subscriptions and the weather service. What those services do with the data is governed
by their own terms. FamilyOS collects no telemetry.

**Check what the AI suggests.** AI models make mistakes: wrong dates, wrong people, things that
were never there. FamilyOS never lets a model change your data on its own; every suggestion waits
for a person to approve it, and it is shown so that you can check it first. Read suggestions
before approving them, and do not rely on FamilyOS or its AI for medical, legal, financial or
safety decisions, or as the only record of something important.

**Not for emergencies.** Do not rely on FamilyOS for anything where a missed notification could
cause harm. Notifications depend on your server, your network, your phone's settings and third
parties, any of which can fail.
