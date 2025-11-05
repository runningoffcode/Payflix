<<<<<<< HEAD
FROM node:18-bullseye AS build
WORKDIR /app

COPY package*.json ./
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 build-essential && \
    rm -rf /var/lib/apt/lists/* && \
    npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:18-bullseye
=======
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
>>>>>>> 562b2e8 (Fix Docker build deps with legacy peer resolution)
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

<<<<<<< HEAD
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 5001

=======
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 5001
>>>>>>> 562b2e8 (Fix Docker build deps with legacy peer resolution)
CMD ["node", "dist/server/index.js"]
