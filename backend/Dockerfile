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

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
