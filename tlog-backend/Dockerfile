FROM node:20-slim AS base

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y \
    procps \
    htop \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm prisma

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm build

RUN pnpm install --prod --frozen-lockfile

RUN npx prisma generate

RUN groupadd -r nodejs && useradd -r -g nodejs nestjs
RUN chown -R nestjs:nodejs /app

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
