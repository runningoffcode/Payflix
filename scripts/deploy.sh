#!/usr/bin/env bash
set -euo pipefail

cd /home/deploy/payflix-core

echo "Pulling main..."
git fetch origin main
git reset --hard origin/main

echo "Building app..."
cd app
npm install --legacy-peer-deps
npm run build

echo "Restarting containers..."
cd ../infra
docker compose up -d --build
