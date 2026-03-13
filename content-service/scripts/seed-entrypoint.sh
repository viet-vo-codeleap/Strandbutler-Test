#!/bin/bash
set -e

echo "Content Seeder: Starting..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "${CONTENT_DB_HOST:-content-postgres}" -p "${CONTENT_DB_PORT:-5432}" -U "${CONTENT_DB_USERNAME:-postgres}" 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping 2s"
  sleep 2
done

echo "PostgreSQL is ready!"

# Give it a moment to fully initialize
sleep 3

# Run the seeding script
echo "Running database seeder..."
cd /usr/src/app/apps/content-service
npx ts-node scripts/populate-db.ts

echo "Content Seeder: Complete!"
