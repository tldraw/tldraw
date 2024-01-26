# Install dependencies only when needed
FROM node:18.17.0-alpine AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

RUN corepack enable
WORKDIR /app
COPY . .

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn \
    yarn workspaces focus @tldraw/monorepo huppy

ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /app/apps/huppy
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn build

# Production image, copy all the files and run next
FROM node:18.17.0-alpine AS runner

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

WORKDIR /app

RUN corepack enable

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app ./

USER nextjs

WORKDIR /app/apps/huppy
CMD ["yarn", "start"]

