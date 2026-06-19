FROM node:20-alpine AS builder

WORKDIR /app
# Reproducible, integrity-checked install from the committed lockfile.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p ./uploads && chown node:node ./uploads

USER node
EXPOSE 4000
# `db push` (no --accept-data-loss): additive schema changes apply, but any destructive
# change ABORTS the deploy instead of silently dropping production columns/data.
CMD ["sh", "-c", "node prisma/migrate-categories.js; npx prisma db push --skip-generate && node dist/src/main"]
