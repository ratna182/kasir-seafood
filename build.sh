#!/bin/bash
set -e

# Run pending migrations
prisma db execute --file prisma/migrations/20260914053000_cashier_session_boundaries/migration.sql --schema prisma/schema.prisma
prisma db execute --file prisma/migrations/20260914_add_alamat_to_warung/migration.sql --schema prisma/schema.prisma
prisma db execute --file prisma/migrations/20260916000000_activity_logs/migration.sql --schema prisma/schema.prisma
prisma db execute --file prisma/migrations/20260918000000_transaction_cashier_ownership/migration.sql --schema prisma/schema.prisma

# Generate Prisma Client
prisma generate

# Build Next.js
next build
