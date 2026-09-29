# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app
RUN npm install -g pnpm@12
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@12
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV KUBECONFIG=/etc/wireguard/kubeconfig

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/app/api/lib/templates ./src/app/api/lib/templates

RUN mkdir -p /etc/wireguard /app/config \
    && chown -R node:node /app /etc/wireguard

USER node

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
