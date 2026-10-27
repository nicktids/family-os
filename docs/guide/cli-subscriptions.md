# Codex and Claude Code subscriptions

This fork can run the official Codex and Claude Code CLIs as an optional Docker companion service. Each CLI uses the account you sign into inside that container. FamilyOS sends text requests to the bridge; it returns answers and proposed function calls. FamilyOS still performs permission checks and creates drafts for changes.

This is for a personal, self-hosted installation. Your provider's account eligibility, subscription limits and terms still apply. A subscription does not become an API key or guarantee unlimited usage. The CLIs run unmodified; credentials are neither extracted nor forwarded as API tokens.

## Start the containers

Use Docker Engine with Docker Compose v2. Build **this checkout**, including FamilyOS itself: the upstream image does not know the new provider kind or its privacy rules.

1. Create a private bridge key in `.env`. This is a new local service password, separate from either subscription:

   ```sh
   # Run once; if .env already exists, append only the new variable.
   (umask 077; printf '\nFAMOS_CLI_BRIDGE_KEY=%s\n' "$(openssl rand -hex 32)" >> .env)
   chmod 600 .env
   mkdir -p .secrets
   chmod 700 .secrets
   (umask 077; sed -n 's/^FAMOS_CLI_BRIDGE_KEY=//p' .env | tail -n 1 > .secrets/cli_bridge_key)
   chmod 444 .secrets/cli_bridge_key
   ```

   The secret is file-backed so it works with the bridge's read-only filesystem. The `.secrets` directory is private to your host user, while the mounted key file is readable by the container's non-root user. Both Git and the Docker build context exclude the directory. Keep the file and `FAMOS_CLI_BRIDGE_KEY` identical; recreate the file after changing the key. These commands expect the unquoted key line generated above.

   If you already created `.env`, skip key generation and run only the commands from `mkdir -p .secrets` onward.

2. Build and start:

   ```sh
   docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml up -d --build
   ```

3. Sign in to the CLIs you want to use. Each command is interactive and must be run by you; follow its own browser/device instructions:

   ```sh
   docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml exec cli-bridge codex login --device-auth
   docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml exec cli-bridge claude auth login
   ```

   For Claude, use the printed URL and paste the returned authorization code **into that terminal**, if asked. Do not put it in FamilyOS chat or a GitHub issue. If your organization disables device login, use the CLI's supported login flow for that account instead. Login URLs and codes are credentials.

4. Open **Settings → AI**. The server-managed **CLI subscriptions** provider is configured automatically. Its **Test connection** lists aliases for signed-in CLIs without running a model. Codex is the default for Smart and Fast. To use Claude instead, add this to `.env`, then repeat the `up -d` command:

   ```dotenv
   FAMOS_CLI_MODEL=claude/default
   ```

   The service restarts automatically after reboot. The `cli-auth` volume preserves logins across container recreation. Login renewal may still be required by the provider.

## Models and roles

`codex/default` and `claude/default` let each CLI choose its default model. The names are bridge aliases, not live discovery of your plan's model entitlements. To expose explicit model IDs, set comma-separated lists in `.env`:

```dotenv
# Replace the placeholders with model IDs available to your own account.
FAMOS_CODEX_MODELS=default,YOUR_CODEX_MODEL_ID
FAMOS_CLAUDE_MODELS=default,YOUR_CLAUDE_MODEL_ID
# Example selection after adding the corresponding ID above:
# FAMOS_CLI_MODEL=codex/YOUR_CODEX_MODEL_ID
```

Model access is checked by the native CLI when you ask it to run. No model is silently substituted by the bridge. To disable one backend, set its list to an empty string in the bridge service's environment (the Compose defaults use `default` for unset or empty interpolation values).

This version supports **text chat, text Quick add, structured JSON output and proposed function calls**. Replies arrive after the CLI finishes and are framed for the existing streaming client; this is not live token streaming. Each call gets a new ephemeral CLI session containing the conversation supplied by FamilyOS, so family members do not share native CLI conversation history.

Keep **Vision**, **Speech to text** and **Search** on separate compatible providers. Images, PDFs and other files, transcription and embeddings are explicitly unsupported by the bridge. The Compose file sets only Smart and Fast and does not replace previously configured roles belonging to another provider. Native output-token and temperature settings are not mapped to CLI controls in this version; time, input size, output size and concurrent process counts are bounded instead. Subscription costs remain unknown in FamilyOS; use a **Model calls** limit rather than relying on a dollar budget.

## Privacy and isolation

Choose **CLI subscriptions**, not **OpenAI-compatible**, when adding the bridge by hand. The bridge address defaults to `http://cli-bridge:8787/v1`; its API key is your `FAMOS_CLI_BRIDGE_KEY`.

**Prompts leave home.** The bridge is on the Docker network but Codex and Claude use cloud inference. FamilyOS marks this provider as non-local for its settings, action catalogs and every model-call area check. **Local only** areas are refused, and **Off** areas remain closed. Do not reclassify a cloud-forwarding proxy as a local inference provider.

The companion service has no published host port and no mount of the FamilyOS database or files. It runs as a non-root user, with a read-only root filesystem, dropped Linux capabilities and temporary request workspaces. Shell execution, browsing, external MCP servers and other native agent integrations are disabled; proposed FamilyOS tools are returned as JSON for the existing action runner. Processes are stopped on timeout, disconnect or excessive output. There is no shell interpolation of messages, and prompts go over stdin rather than command arguments.

The bridge does not log prompts, responses, keys, login codes or raw CLI errors. The CLIs and providers have their own diagnostic, cache and retention behavior: treat the entire `cli-auth` volume as private. It is deliberately separate from FamilyOS backups; do not publish or casually copy it. Signing in here does not import your host's CLI configuration, MCP integrations or credentials.

## Check and maintain

Use the same three `-f` arguments for every Compose command:

```sh
docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml ps
docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml exec cli-bridge codex login status
docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml exec cli-bridge claude auth status
```

The container health check tests the bridge process, not subscription access. A provider's connection test checks login status; only an actual chat can verify model access. The connection test checks the bridge key separately from the native CLI logins: a key mismatch asks you to synchronize the provider key and secret file, while missing CLI logins ask you to sign in inside the bridge container. Host-machine CLI logins do not sign the container in. An expired login asks you to sign in again. An exhausted subscription reports a usage limit; temporary rate limits and a busy bridge can be retried. A network or native CLI failure returns a sanitized error.

CLI versions are pinned in `tools/cli-bridge/runtime/package.json` and its npm lockfile, including the native platform packages. To upgrade, change the pins deliberately, regenerate that lockfile (`npm install --package-lock-only --ignore-scripts --prefix tools/cli-bridge/runtime`), rebuild, then verify text chat, JSON output, tool proposals, login persistence and the absence of native tool execution with each CLI. `FAMOS_CLI_TIMEOUT_MS` can lower the bridge's 120-second ceiling; the FamilyOS job's own timeout can stop it earlier. The bridge permits two concurrent CLI processes by default.

To sign out, run `codex logout` or `claude auth logout` with `exec cli-bridge`. Removing the optional service does not delete its credentials. Avoid `docker compose down -v`: it would also delete your family's main data volume.

Provider references: [Codex non-interactive usage](https://learn.chatgpt.com/docs/noninteractive), [Codex authentication](https://learn.chatgpt.com/docs/auth), [Claude Code CLI](https://code.claude.com/docs/en/cli-reference), [Claude Code authentication](https://code.claude.com/docs/en/authentication).

### Device login cannot send its HTTPS request

If `codex login --device-auth` fails while requesting a code from `auth.openai.com`, it has not reached account sign-in yet. The bridge image must contain the system `ca-certificates` bundle for the native CLI; Node's own bundled certificates are separate. Rebuild the updated bridge image and recreate its container, keeping its login volume:

```sh
docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml build cli-bridge
docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.cli.yml up -d --force-recreate cli-bridge
```

Include your port override file too if you use one. Then retry login. If the error remains, check container DNS, outbound HTTPS, and whether your network requires a proxy or a custom CA. Do not disable certificate verification. A working HTTPS request in Node alone does not establish that the native CLI has a working trust store.
