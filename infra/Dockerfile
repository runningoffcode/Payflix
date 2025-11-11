# ---- Build stage ----
FROM node:18-bullseye AS builder
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:18-bullseye AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 5001
CMD ["node", "dist/server/index.js"]
