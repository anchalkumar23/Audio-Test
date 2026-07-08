# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# API URL is baked in at build time (browser calls it directly)
ARG NEXT_PUBLIC_API_URL=http://187.127.189.33:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 2: run
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# standalone output copies only what's needed
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
