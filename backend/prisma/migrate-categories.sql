-- One-time migration: rename old category enum values before Prisma drops them
-- GENERAL → UR, SC → DSC, ST → OSC, ESM → UR

UPDATE employees SET category = 'UR' WHERE category = 'GENERAL';
UPDATE employees SET category = 'DSC' WHERE category = 'SC';
UPDATE employees SET category = 'OSC' WHERE category = 'ST';
UPDATE employees SET category = 'UR' WHERE category = 'ESM';

UPDATE employees SET "categorySelection" = 'UR' WHERE "categorySelection" = 'GENERAL';
UPDATE employees SET "categorySelection" = 'DSC' WHERE "categorySelection" = 'SC';
UPDATE employees SET "categorySelection" = 'OSC' WHERE "categorySelection" = 'ST';
UPDATE employees SET "categorySelection" = 'UR' WHERE "categorySelection" = 'ESM';

UPDATE sanctioned_posts SET category = 'UR' WHERE category = 'GENERAL';
UPDATE sanctioned_posts SET category = 'DSC' WHERE category = 'SC';
UPDATE sanctioned_posts SET category = 'OSC' WHERE category = 'ST';
UPDATE sanctioned_posts SET category = 'UR' WHERE category = 'ESM';
