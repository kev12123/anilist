FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN cd packages/db && pnpm generate
RUN cd apps/api && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN mkdir -p /app/data

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY packages/db/prisma ./packages/db/prisma

EXPOSE 4000 4001

CMD ["node", "dist/index.js"]
