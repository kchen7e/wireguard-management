# syntax=docker/dockerfile:1

FROM node:24-slim AS deps
WORKDIR /app
RUN npm install -g npm@12 pnpm@12 --no-update-notifier
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g npm@12 pnpm@12 --no-update-notifier
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV KUBECONFIG=/etc/wireguard/kubeconfig

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@12 pnpm@12 --no-update-notifier
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
# Template files are read from disk at runtime, so they must ship with the app.
COPY src/app/api/lib/templates ./src/app/api/lib/templates
COPY config/metallb.yaml /app/config/metallb.yaml

# Files copied from the build context keep the host's mode bits, and compose runs
# the container as an arbitrary UID, so make the runtime-read templates readable
# (a+rX adds execute to directories only, never to the template files).
RUN mkdir -p /etc/wireguard /app/config \
    && chown -R node:node /app /etc/wireguard \
    && chmod -R a+rX /app/src/app/api/lib/templates /app/config

USER node

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
