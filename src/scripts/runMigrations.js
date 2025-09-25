const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('Nenhuma migração encontrada.');
    await pool.end();
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Executando migração: ${file}`);
    await pool.query(sql);
  }

  console.log('Migrações executadas com sucesso.');
  await pool.end();
}

runMigrations().catch((error) => {
  console.error('Erro ao executar migrações:', error);
  pool.end().finally(() => process.exit(1));
});
