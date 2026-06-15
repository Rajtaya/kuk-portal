const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'employees' AND column_name IN ('category', 'categorySelection')
    `);

    const catCol = cols.find(c => c.column_name === 'category');
    if (!catCol) {
      console.log('MIGRATE: no category column found, skipping');
      return;
    }

    if (catCol.data_type === 'text') {
      console.log('MIGRATE: columns already TEXT, ensuring enum dropped');
      try { await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Category"`); } catch (e) { /* ok */ }
      return;
    }

    console.log('MIGRATE: converting enum columns to TEXT...');

    const steps = [
      `ALTER TABLE employees ALTER COLUMN category DROP DEFAULT`,
      `ALTER TABLE employees ALTER COLUMN "categorySelection" DROP DEFAULT`,
      `ALTER TABLE employees ALTER COLUMN category TYPE TEXT`,
      `ALTER TABLE employees ALTER COLUMN "categorySelection" TYPE TEXT`,
      `UPDATE employees SET category = 'UR' WHERE category IN ('GENERAL', 'ESM')`,
      `UPDATE employees SET category = 'DSC' WHERE category = 'SC'`,
      `UPDATE employees SET category = 'OSC' WHERE category = 'ST'`,
      `UPDATE employees SET "categorySelection" = 'UR' WHERE "categorySelection" IN ('GENERAL', 'ESM')`,
      `UPDATE employees SET "categorySelection" = 'DSC' WHERE "categorySelection" = 'SC'`,
      `UPDATE employees SET "categorySelection" = 'OSC' WHERE "categorySelection" = 'ST'`,
      `DROP TYPE IF EXISTS "Category"`,
    ];

    for (const sql of steps) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log('  OK:', sql.slice(0, 70));
      } catch (e) {
        console.log('  SKIP:', sql.slice(0, 70), '-', e.message.slice(0, 60));
      }
    }

    console.log('MIGRATE: done');
  } catch (e) {
    console.error('MIGRATE error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
