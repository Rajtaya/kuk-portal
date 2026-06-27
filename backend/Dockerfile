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
# Schema sync on boot. The `category`/`categorySelection` columns are already the `Category`
# enum and match schema.prisma, so this db push is a no-op for them — no --accept-data-loss
# needed. (It was previously preceded by `node prisma/migrate-categories.js`, a ONE-TIME
# old->new enum migration. That script ran on EVERY boot, forcing an enum->TEXT->enum
# round-trip whose db push step reset every row's category to the `UR` default — silently
# wiping all category data on each deploy. The migration is long complete; the script is kept
# in prisma/ for reference only and must NOT be re-added to the boot command.)
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main"]
