#!/usr/bin/env bash
set -euo pipefail

docker compose up -d --build
docker compose ps
echo "App started at http://localhost:8000"
