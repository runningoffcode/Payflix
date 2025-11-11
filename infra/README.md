# PayFlix Infrastructure

This folder contains the Docker deployment used in production:

- `docker-compose.yml` – builds the app image from `../app` and runs Redis + Traefik.
- `traefik/` – TLS + routing config (certs stored under `acme/`).
- `redis/`, `postgres/`, `storage/` – data directories (empty placeholders in git).

## Usage
1. Copy `app/.env.example` to `app/.env` and fill in secrets.
2. From this directory run:
   ```bash
   docker compose pull    # optional, to fetch base images
   docker compose up -d --build
   ```
3. Traefik listens on ports 80/443; adjust `docker-compose.yml` labels for your domains.

The `.gitkeep` files ensure empty folders are tracked; runtime data (Redis snapshots, certs) remain on the server only.
