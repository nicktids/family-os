# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim
WORKDIR /app
# Both CLIs and Zod are pinned with integrity hashes, including native platform packages.
COPY tools/cli-bridge/runtime/package.json tools/cli-bridge/runtime/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && node node_modules/@anthropic-ai/claude-code/install.cjs \
    && npm cache clean --force \
    && /app/node_modules/.bin/codex --version && /app/node_modules/.bin/claude --version
ENV PATH="/app/node_modules/.bin:${PATH}"
COPY tools/cli-bridge/src ./src
ENV HOME=/home/node CODEX_HOME=/home/node/.codex CLAUDE_CONFIG_DIR=/home/node/.claude DISABLE_AUTOUPDATER=1
RUN mkdir -p /home/node/.codex /home/node/.claude /work \
    && chown -R node:node /home/node /work
USER node
WORKDIR /work
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD ["node", "-e", "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "/app/src/main.ts"]
