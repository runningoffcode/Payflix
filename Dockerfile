FROM node:18-bullseye AS build
WORKDIR /app

COPY package*.json ./
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 build-essential && \
    rm -rf /var/lib/apt/lists/* && \
    npm ci
COPY . .
RUN npm run build

FROM node:18-bullseye
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 5001

CMD ["node", "dist/server/index.js"]
