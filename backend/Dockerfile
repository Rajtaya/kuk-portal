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
# NOTE: --accept-data-loss is REQUIRED by this project's enum-migration pattern, not optional.
# prisma/migrate-categories.js converts the category enum columns to TEXT (remapping values)
# and drops the old enum; this db push then recreates them as the `Category` enum. Prisma
# reports that text->enum conversion as "data loss" even though the values are preserved, so
# without the flag db push aborts and the container never starts. Do NOT remove this flag
# unless you first replace db push with proper Prisma migrations (`prisma migrate deploy`).
CMD ["sh", "-c", "node prisma/migrate-categories.js; npx prisma db push --skip-generate --accept-data-loss && node dist/src/main"]
