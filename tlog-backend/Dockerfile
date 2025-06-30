# Multi-stage build
FROM node:20-alpine AS build
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM node:20-alpine AS production

ENV NODE_ENV=production

RUN npm install -g pnpm prisma

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma


RUN npx prisma generate

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
