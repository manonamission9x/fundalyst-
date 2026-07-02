#!/usr/bin/env bash
# Run Prisma migration with real database password
export DATABASE_URL="postgresql://fundalyst:***@localhost:5432/fundalyst"
cd "$(dirname "$0")"
npx prisma migrate dev --name init
