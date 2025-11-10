#!/usr/bin/env bash
# Mirror selected files into a sanitized public repo.

set -euo pipefail

PRIVATE_ROOT="${PRIVATE_ROOT:-$(pwd)}"
PUBLIC_REMOTE="${PUBLIC_REMOTE:-git@github.com:your-org/payflix-public.git}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo ">>> Copying safe paths to $TMP_DIR"
rsync -a \
  --exclude '.git' \
  "$PRIVATE_ROOT/src" \
  "$PRIVATE_ROOT/public" \
  "$PRIVATE_ROOT/docs" \
  "$PRIVATE_ROOT/package.json" \
  "$PRIVATE_ROOT/package-lock.json" \
  "$PRIVATE_ROOT/tsconfig*.json" \
  "$PRIVATE_ROOT/vite.config.ts" \
  "$PRIVATE_ROOT/README.public.md" \
  "$TMP_DIR/"

cd "$TMP_DIR"

# Rename README
if [ -f README.public.md ]; then
  mv README.public.md README.md
fi

echo ">>> Initializing git repo"
git init
git add .
PRIVATE_HASH="$(git -C "$PRIVATE_ROOT" rev-parse HEAD)"
git commit -m "Mirror of private commit $PRIVATE_HASH"

echo ">>> Pushing to public remote"
git remote add origin "$PUBLIC_REMOTE"
git branch -M main
git push --force origin main

echo "✓ Public mirror updated."
