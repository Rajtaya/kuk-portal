-- One-time migration: convert old category enum values before Prisma recreates the enum
-- Strategy: drop to TEXT (bypasses enum constraints), remap values, let prisma db push rebuild

-- Drop defaults so ALTER TYPE succeeds
ALTER TABLE employees ALTER COLUMN category DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN "categorySelection" DROP DEFAULT;

-- Convert enum columns to plain text (bypasses enum validation)
ALTER TABLE employees ALTER COLUMN category TYPE TEXT;
ALTER TABLE employees ALTER COLUMN "categorySelection" TYPE TEXT;

-- Remap old values to new
UPDATE employees SET category = 'UR' WHERE category IN ('GENERAL', 'ESM');
UPDATE employees SET category = 'DSC' WHERE category = 'SC';
UPDATE employees SET category = 'OSC' WHERE category = 'ST';

UPDATE employees SET "categorySelection" = 'UR' WHERE "categorySelection" IN ('GENERAL', 'ESM');
UPDATE employees SET "categorySelection" = 'DSC' WHERE "categorySelection" = 'SC';
UPDATE employees SET "categorySelection" = 'OSC' WHERE "categorySelection" = 'ST';

-- Drop the old enum type so prisma db push starts fresh
DROP TYPE IF EXISTS "Category";
