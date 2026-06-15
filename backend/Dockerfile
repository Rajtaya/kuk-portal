FROM node:20-alpine AS builder

WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p ./uploads && chown node:node ./uploads

USER node
EXPOSE 4000
CMD ["sh", "-c", "node prisma/migrate-categories.js; npx prisma db push --skip-generate --accept-data-loss && node dist/src/main"]
