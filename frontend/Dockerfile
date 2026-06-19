FROM node:20-alpine AS builder

WORKDIR /app
# Reproducible, integrity-checked install from the committed lockfile.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .

ARG CACHE_BUST
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_BUILD_STANDALONE=1
RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
